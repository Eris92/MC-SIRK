"use strict";

var httpClient = require("./http-client.js");
var shared = require("./shared.js");

var USER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
var ASSET_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
var USER_PAGE_SIZE = 100;
var MAX_USERS = 10000;
var USER_CACHE_VERSION = 2;
var ASSET_PAGE_SIZE = 500;
var DEFAULT_ASSET_OPTION_LIMIT = 1000;
var MAX_ASSET_OPTION_LIMIT = 5000;
var MAX_ASSET_SCAN_PAGES = 100;
var ASSET_PAGE_CONCURRENCY = 3;
var ASSET_REFRESH_MAX_MS = 180000;
var ASSET_CACHE_VERSION = 4;

function text(value, limit) {
    return shared.cleanText(value == null ? "" : value, limit || 4000).trim();
}

function object(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function array(value) {
    return Array.isArray(value) ? value : [];
}

function lower(value) {
    return text(value, 2000).toLowerCase();
}

function normalizeUser(value) {
    value = object(value);
    var accountId = text(value.accountId || value.key || value.name, 500);
    var email = text(value.emailAddress, 500);
    var displayName = text(value.displayName || value.name || email || accountId, 500);
    var stable = accountId || email;
    if (!stable) return null;
    return {
        value: stable,
        label: displayName + (email && lower(email) !== lower(displayName) ? " (" + email + ")" : ""),
        accountId: accountId,
        displayName: displayName,
        emailAddress: email,
        active: value.active !== false
    };
}

function responseItems(value) {
    if (Array.isArray(value)) return value;
    value = object(value);
    if (Array.isArray(value.values)) return value.values;
    if (Array.isArray(value.objectEntries)) return value.objectEntries;
    if (value.results && Array.isArray(value.results.objectEntries)) return value.results.objectEntries;
    if (value.results && Array.isArray(value.results.values)) return value.results.values;
    return [];
}

function collectStrings(value, result, depth) {
    result = result || [];
    depth = Number(depth) || 0;
    if (depth > 5 || value == null) return result;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        var item = text(value, 2000);
        if (item) result.push(item);
        return result;
    }
    if (Array.isArray(value)) {
        value.slice(0, 200).forEach(function (item) { collectStrings(item, result, depth + 1); });
        return result;
    }
    if (typeof value === "object") {
        Object.keys(value).slice(0, 100).forEach(function (key) {
            if (/^(avatar|icon|url|self)$/i.test(key)) return;
            collectStrings(value[key], result, depth + 1);
        });
    }
    return result;
}

function attributeMap(entry) {
    var result = Object.create(null);
    array(entry && entry.attributes).forEach(function (attribute) {
        var name = text(
            attribute && attribute.objectTypeAttribute && attribute.objectTypeAttribute.name ||
            attribute && attribute.name,
            300
        );
        if (!name) return;
        var compactValues = array(attribute && attribute.values).map(function (value) { return text(value, 2000); }).filter(Boolean);
        var values = compactValues.length ? compactValues : array(attribute && attribute.objectAttributeValues).map(function (value) {
            return text(value && (value.displayValue || value.value || value.searchValue) || value, 2000);
        }).filter(Boolean);
        if (values.length) result[lower(name)] = values;
    });
    return result;
}

module.exports.createJiraAssetService = function (options) {
    options = options || {};
    var fs = options.fs;
    var path = options.path;
    var dataRoot = options.dataRoot;
    var integrations = options.integrations;
    var requestJson = options.requestJson || httpClient.requestJson;
    var cachePath = path.join(dataRoot, "jira-users-cache.json");
    var assetCachePath = path.join(dataRoot, "jira-assets-cache.json");
    var usersInFlight = null;
    var assetsInFlight = Object.create(null);
    var userCacheLoaded = false;
    var userCacheMemory = null;
    var assetCacheLoaded = false;
    var assetCacheMemory = null;

    function assetCacheFileHasCurrentVersion() {
        var descriptor = null;
        try {
            descriptor = fs.openSync(assetCachePath, "r");
            var buffer = Buffer.alloc(64);
            var length = fs.readSync(descriptor, buffer, 0, buffer.length, 0);
            return new RegExp('^\\s*\\{\\s*"version"\\s*:\\s*' + ASSET_CACHE_VERSION + '(?:\\D|$)').test(buffer.toString("utf8", 0, length));
        } catch (error) {
            return false;
        } finally {
            if (descriptor !== null) try { fs.closeSync(descriptor); } catch (ignore) {}
        }
    }

    function jiraConfig() {
        var value = integrations.get("jira") || {};
        var endpoint;
        try { endpoint = new URL(String(value.url || "")); }
        catch (error) { throw new Error("Jira URL is not configured."); }
        if (endpoint.protocol !== "https:") throw new Error("Jira URL must use HTTPS.");
        if (!value.email || !value.token) throw new Error("Jira credentials are not configured.");
        value.url = endpoint.href.replace(/\/$/, "");
        value.verifyTls = value.verifyTls !== false;
        return value;
    }

    function assetPolicy(variable) {
        var value = object(variable && variable.jiraAsset);
        var aql = text(value.aql, 4000);
        if (!aql) throw new Error("Jira asset query is not configured for this script.");
        var requested = Number(value.maxResults);
        var maxResults = isFinite(requested) && requested > 0 ? Math.floor(requested) : DEFAULT_ASSET_OPTION_LIMIT;
        var userVariable = text(value.userVariable, 200).replace(/^[\s$%]+/, "");
        if (userVariable && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(userVariable)) userVariable = "";
        return {
            aql: aql,
            labelAttribute: text(value.labelAttribute, 200) || "Hostname",
            maxResults: Math.max(10, Math.min(MAX_ASSET_OPTION_LIMIT, maxResults)),
            userVariable: userVariable
        };
    }

    function authHeader(config) {
        return "Basic " + Buffer.from(String(config.email) + ":" + String(config.token), "utf8").toString("base64");
    }

    function siteRequest(config, relative, requestOptions) {
        requestOptions = requestOptions || {};
        return requestJson({
            url: config.url + relative,
            method: requestOptions.method || "GET",
            headers: Object.assign({ Authorization: authHeader(config), Accept: "application/json" }, requestOptions.headers || {}),
            json: requestOptions.json,
            verifyTls: config.verifyTls,
            timeoutMs: 30000,
            maxBytes: 8 * 1024 * 1024,
            errorPrefix: requestOptions.errorPrefix || "Jira"
        });
    }

    function readCache() {
        if (userCacheLoaded) return userCacheMemory;
        userCacheLoaded = true;
        try {
            var parsed = JSON.parse(fs.readFileSync(cachePath, "utf8"));
            if (!parsed || parsed.version !== USER_CACHE_VERSION || !Array.isArray(parsed.users)) return null;
            userCacheMemory = {
                fetchedAt: Number(parsed.fetchedAt) || 0,
                users: parsed.users.slice(0, MAX_USERS).map(normalizeUser).filter(Boolean)
            };
            return userCacheMemory;
        } catch (error) {
            return null;
        }
    }

    function writeCache(users) {
        var temp = cachePath + ".tmp-" + process.pid + "-" + Date.now();
        fs.writeFileSync(temp, JSON.stringify({
            version: USER_CACHE_VERSION,
            fetchedAt: Date.now(),
            users: users.slice(0, MAX_USERS)
        }, null, 2), { encoding: "utf8", mode: 384 });
        try {
            fs.renameSync(temp, cachePath);
        } catch (error) {
            try { fs.unlinkSync(cachePath); } catch (ignore) {}
            fs.renameSync(temp, cachePath);
        }
        userCacheLoaded = true;
        userCacheMemory = { fetchedAt: Date.now(), users: users.slice(0, MAX_USERS).map(normalizeUser).filter(Boolean) };
    }

    function readAssetCache(aql) {
        try {
            if (!assetCacheLoaded) {
                assetCacheLoaded = true;
                if (!assetCacheFileHasCurrentVersion()) return null;
                assetCacheMemory = JSON.parse(fs.readFileSync(assetCachePath, "utf8"));
            }
            var parsed = assetCacheMemory;
            var entry = parsed && parsed.version === ASSET_CACHE_VERSION && parsed.queries && parsed.queries[aql];
            if (!entry || !Array.isArray(entry.entries)) return null;
            return { fetchedAt: Number(entry.fetchedAt) || 0, entries: entry.entries.slice(0, ASSET_PAGE_SIZE * MAX_ASSET_SCAN_PAGES) };
        } catch (error) { return null; }
    }

    function compactAssetEntry(entry) {
        entry = object(entry);
        return {
            id: text(entry.id, 200),
            objectKey: text(entry.objectKey, 200),
            label: text(entry.label || entry.name, 500),
            objectType: {
                id: text(entry.objectType && entry.objectType.id, 100),
                name: text(entry.objectType && entry.objectType.name || entry.objectTypeName, 300)
            },
            attributes: array(entry.attributes).map(function (attribute) {
                var name = text(attribute && attribute.objectTypeAttribute && attribute.objectTypeAttribute.name || attribute && attribute.name, 300);
                if (!name) return null;
                var rawValues = array(attribute && attribute.objectAttributeValues);
                var values = array(attribute && attribute.values).map(function (value) { return text(value, 2000); }).filter(Boolean);
                if (!values.length) values = rawValues.map(function (value) {
                    return text(value && (value.displayValue || value.value || value.searchValue) || value, 2000);
                }).filter(Boolean);
                var matchValues = array(attribute && attribute.matchValues).map(lower).filter(Boolean);
                if (!matchValues.length) {
                    var allowPlain = assignmentAttribute({ name: name });
                    rawValues.forEach(function (value) {
                        matchValues = matchValues.concat(referenceStrings(value, allowPlain));
                    });
                }
                return { name: name, values: values, matchValues: Array.from(new Set(matchValues)) };
            }).filter(Boolean)
        };
    }

    function writeAssetCache(aql, entries) {
        var value = { version: ASSET_CACHE_VERSION, queries: {} };
        if (!assetCacheLoaded) readAssetCache(aql);
        var current = assetCacheMemory;
        if (current && current.version === ASSET_CACHE_VERSION && current.queries && typeof current.queries === "object") value = current;
        var compactEntries = entries.slice(0, ASSET_PAGE_SIZE * MAX_ASSET_SCAN_PAGES).map(compactAssetEntry);
        value.queries[aql] = { fetchedAt: Date.now(), entries: compactEntries };
        var temp = assetCachePath + ".tmp-" + process.pid + "-" + Date.now();
        fs.writeFileSync(temp, JSON.stringify(value), { encoding: "utf8", mode: 384 });
        try { fs.renameSync(temp, assetCachePath); }
        catch (error) { try { fs.unlinkSync(assetCachePath); } catch (ignore) {} fs.renameSync(temp, assetCachePath); }
        assetCacheLoaded = true;
        assetCacheMemory = value;
        return compactEntries;
    }

    function fetchUsersFrom(config, endpoint) {
        var result = [];
        var startAt = 0;
        function next() {
            if (startAt >= MAX_USERS) return Promise.resolve(result);
            var separator = endpoint.indexOf("?") >= 0 ? "&" : "?";
            return siteRequest(config, endpoint + separator + "startAt=" + startAt + "&maxResults=" + USER_PAGE_SIZE, { errorPrefix: "Jira users" }).then(function (response) {
                var page = responseItems(response);
                page.forEach(function (item) {
                    var normalized = normalizeUser(item);
                    if (normalized) result.push(normalized);
                });
                startAt += page.length;
                if (!page.length || page.length < USER_PAGE_SIZE || startAt >= MAX_USERS) return result;
                return next();
            });
        }
        return next();
    }

    function dedupeUsers(users) {
        var seen = Object.create(null);
        return users.filter(function (item) {
            var key = lower(item.value);
            if (!key || seen[key]) return false;
            seen[key] = true;
            return true;
        }).sort(function (a, b) { return a.label.localeCompare(b.label); });
    }

    function fetchUsers(config) {
        var endpoints = ["/rest/api/3/users/search", "/rest/api/2/users/search", "/rest/api/2/users"];
        var lastError = null;
        function attempt(index) {
            if (index >= endpoints.length) return Promise.reject(lastError || new Error("Jira users are unavailable."));
            return fetchUsersFrom(config, endpoints[index]).catch(function (error) {
                lastError = error;
                return attempt(index + 1);
            });
        }
        return attempt(0).then(dedupeUsers);
    }

    function filterUsers(result, includeInactive) {
        var value = Object.assign({}, result || {});
        value.items = (result && Array.isArray(result.items) ? result.items : []).filter(function (item) {
            return includeInactive === true || item.active !== false;
        });
        return value;
    }

    function listUsers(force, includeInactive) {
        var cached = readCache();
        if (!force && cached && cached.fetchedAt > Date.now() - USER_CACHE_TTL_MS) {
            return Promise.resolve(filterUsers({ items: cached.users, stale: false, fetchedAt: cached.fetchedAt }, includeInactive));
        }
        if (usersInFlight) return usersInFlight.then(function (result) { return filterUsers(result, includeInactive); });
        var config = jiraConfig();
        usersInFlight = fetchUsers(config).then(function (users) {
            writeCache(users);
            return { items: users, stale: false, fetchedAt: Date.now() };
        }).catch(function (error) {
            if (cached && cached.users.length) {
                return { items: cached.users, stale: true, fetchedAt: cached.fetchedAt, warning: text(error.message || error, 1000) };
            }
            throw error;
        }).then(function (result) {
            usersInFlight = null;
            return result;
        }, function (error) {
            usersInFlight = null;
            throw error;
        });
        return usersInFlight.then(function (result) { return filterUsers(result, includeInactive); });
    }

    function discoverCloudId(config) {
        if (text(config.cloudId, 200)) return Promise.resolve(text(config.cloudId, 200));
        return requestJson({
            url: config.url + "/_edge/tenant_info",
            method: "GET",
            headers: { Accept: "application/json" },
            verifyTls: config.verifyTls,
            timeoutMs: 15000,
            maxBytes: 1024 * 1024,
            errorPrefix: "Jira cloud discovery"
        }).then(function (response) {
            var cloudId = text(response && (response.cloudId || response.cloudID), 200);
            if (!cloudId) throw new Error("Jira cloudId discovery returned no cloudId.");
            return cloudId;
        });
    }

    function discoverWorkspaceId(config) {
        if (text(config.workspaceId, 200)) return Promise.resolve(text(config.workspaceId, 200));
        return siteRequest(config, "/rest/servicedeskapi/assets/workspace?start=0&limit=50", { errorPrefix: "Jira Assets workspace discovery" }).then(function (response) {
            var values = responseItems(response);
            var workspaceId = values.length ? text(values[0] && values[0].workspaceId, 200) : "";
            if (!workspaceId) throw new Error("Jira Assets workspace discovery returned no workspaceId.");
            return workspaceId;
        });
    }

    function selectedUserIdentity(userValue, users) {
        var wanted = lower(userValue);
        if (!wanted) return [];
        var found = (users || []).filter(function (item) {
            return lower(item.value) === wanted || lower(item.accountId) === wanted || lower(item.emailAddress) === wanted;
        })[0] || null;
        var values = [userValue];
        if (found) values.push(found.value, found.accountId, found.emailAddress, found.displayName);
        var seen = Object.create(null);
        return values.map(lower).filter(function (item) {
            if (!item || seen[item]) return false;
            seen[item] = true;
            return true;
        });
    }

    function assignmentAttribute(attribute) {
        var name = lower(attribute && attribute.objectTypeAttribute && attribute.objectTypeAttribute.name || attribute && attribute.name);
        return /(owner|user|assigned|employee|responsible|pracownik|uzytk|użytk|przypis|odpowiedzialn|wlasciciel|właściciel)/i.test(name);
    }

    function referenceStrings(value, allowPlain) {
        value = object(value);
        var result = [];
        if (value.user) collectStrings(value.user, result, 0);
        if (value.referencedObject) {
            var referenced = object(value.referencedObject);
            collectStrings({
                id: referenced.id,
                label: referenced.label,
                objectKey: referenced.objectKey,
                name: referenced.name,
                attributes: referenced.attributes
            }, result, 0);
        }
        if (value.referencedType === true || allowPlain === true) {
            collectStrings(value.value, result, 0);
            collectStrings(value.searchValue, result, 0);
            collectStrings(value.displayValue, result, 0);
        }
        return result.map(lower);
    }

    function identityObjectType(entry) {
        var typeName = lower(entry && entry.objectType && entry.objectType.name || entry && entry.objectTypeName);
        return /(user|users|person|people|employee|pracowni|uzytk|użytk|osob)/i.test(typeName);
    }

    function identityObjectMatchesUser(entry, identities) {
        if (!identityObjectType(entry) || !identities.length) return false;
        var ownValues = [entry && entry.label, entry && entry.name].map(lower).filter(Boolean);
        if (identities.some(function (identity) { return ownValues.indexOf(identity) >= 0; })) return true;
        return array(entry && entry.attributes).some(function (attribute) {
            var candidates = array(attribute && attribute.matchValues).concat(array(attribute && attribute.values)).map(lower).filter(Boolean);
            if (!candidates.length) {
                array(attribute && attribute.objectAttributeValues).forEach(function (value) {
                    candidates = candidates.concat(referenceStrings(value, true));
                });
            }
            return identities.some(function (identity) { return candidates.indexOf(identity) >= 0; });
        });
    }

    function expandUserIdentityAliases(entries, identities) {
        var seen = Object.create(null);
        var result = identities.slice();
        result.forEach(function (identity) { seen[identity] = true; });
        entries.forEach(function (entry) {
            if (!identityObjectMatchesUser(entry, identities)) return;
            [entry && entry.id, entry && entry.objectKey, entry && entry.label, entry && entry.name].map(lower).filter(Boolean).forEach(function (value) {
                if (seen[value]) return;
                seen[value] = true;
                result.push(value);
            });
        });
        return result;
    }

    function entryMatchesUser(entry, identities) {
        if (!identities.length) return true;
        var ownLabel = lower(entry && (entry.label || entry.name));
        if (ownLabel && identities.indexOf(ownLabel) >= 0) return false;
        return array(entry && entry.attributes).some(function (attribute) {
            var allowPlain = assignmentAttribute(attribute);
            var compactMatches = array(attribute && attribute.matchValues).map(lower);
            if (compactMatches.length) {
                return identities.some(function (identity) { return compactMatches.indexOf(identity) >= 0; });
            }
            return array(attribute && attribute.objectAttributeValues).some(function (value) {
                var strings = referenceStrings(value, allowPlain);
                return identities.some(function (identity) { return strings.indexOf(identity) >= 0; });
            });
        });
    }

    function normalizeAsset(entry, policy) {
        entry = object(entry);
        var attributes = attributeMap(entry);
        var labelValues = attributes[lower(policy.labelAttribute)] || [];
        var hostname = text(labelValues[0] || entry.label || entry.objectKey || entry.id, 500);
        if (!hostname) return null;
        var objectType = text(entry.objectType && entry.objectType.name || entry.objectTypeName, 300);
        var model = text((attributes.model || attributes["model name"] || attributes["model urządzenia"] || [])[0], 300);
        var manufacturer = text((attributes.manufacturer || attributes.producent || attributes.vendor || attributes.marka || [])[0], 300);
        var serial = text((attributes["serial number"] || attributes.serial || attributes["numer seryjny"] || attributes["s/n"] || attributes.sn || attributes["service tag"] || [])[0], 300);
        var inventory = text((attributes["inventory number"] || attributes.inventory || attributes["numer inwentarzowy"] || attributes.numer_inwentarzowy || attributes["asset tag"] || attributes.tag || attributes.inwentarz || attributes["nr inv"] || attributes["nr. inv"] || attributes["nr inwentarzowy"] || [])[0], 300);
        var details = [objectType, model, serial, inventory].filter(function (value, index, all) {
            return value && lower(value) !== lower(hostname) && all.map(lower).indexOf(lower(value)) === index;
        });
        return {
            value: hostname,
            label: hostname + (details.length ? " — " + details.join(" / ") : ""),
            objectId: text(entry.id, 200),
            objectKey: text(entry.objectKey, 200),
            objectType: objectType,
            hostname: hostname,
            manufacturer: manufacturer,
            model: model,
            serialNumber: serial,
            inventoryNumber: inventory
        };
    }

    function pageHasMore(response, startAt, pageLength) {
        response = object(response);
        if (response.hasMoreResults === true) return true;
        if (response.isLast === true) return false;
        var total = Number(response.totalFilterCount != null ? response.totalFilterCount : response.total);
        if (isFinite(total) && total >= 0) return startAt + pageLength < total;
        return pageLength >= ASSET_PAGE_SIZE;
    }

    function responseTotal(response) {
        response = object(response);
        var total = Number(response.totalFilterCount != null ? response.totalFilterCount : response.total);
        return isFinite(total) && total >= 0 ? total : -1;
    }

    function listAssets(userValue, variable, force) {
        userValue = text(userValue, 500);
        var config = jiraConfig();
        var policy;
        try { policy = assetPolicy(variable); }
        catch (error) { return Promise.reject(error); }

        var usersPromise = userValue ? listUsers(false, true) : Promise.resolve({ items: [] });
        return Promise.all([usersPromise, discoverCloudId(config), discoverWorkspaceId(config)]).then(function (parts) {
            var identities = selectedUserIdentity(userValue, parts[0].items);
            var workspaceBase = "https://api.atlassian.com/ex/jira/" + encodeURIComponent(parts[1]) +
                "/jsm/assets/workspace/" + encodeURIComponent(parts[2]) + "/v1";
            var baseUrl = workspaceBase + "/object/aql";
            var cached = readAssetCache(policy.aql);
            var responseAttributeNames = Object.create(null);

            function applyResponseAttributeNames(response, entries) {
                response = object(response);
                var definitions = array(response.objectTypeAttributes);
                if (!definitions.length) definitions = array(response.results && response.results.objectTypeAttributes);
                definitions.forEach(function (definition) {
                    var id = text(definition && definition.id, 100);
                    var name = text(definition && definition.name, 300);
                    if (id && name) responseAttributeNames[id] = name;
                });
                entries.forEach(function (entry) {
                    array(entry && entry.attributes).forEach(function (attribute) {
                        var id = text(attribute && attribute.objectTypeAttributeId, 100);
                        if (!id || !responseAttributeNames[id]) return;
                        attribute.objectTypeAttribute = Object.assign({}, object(attribute.objectTypeAttribute), {
                            name: responseAttributeNames[id]
                        });
                    });
                });
                return entries;
            }

            function missingAttributeNames(entries) {
                return entries.some(function (entry) { return array(entry && entry.attributes).some(function (attribute) {
                    return !text(attribute && attribute.objectTypeAttribute && attribute.objectTypeAttribute.name || attribute && attribute.name, 300);
                }); });
            }

            function enrichAttributeNames(entries) {
                var typeIds = [], seenTypes = Object.create(null);
                entries.forEach(function (entry) {
                    var missing = array(entry && entry.attributes).some(function (attribute) {
                        return !text(attribute && attribute.objectTypeAttribute && attribute.objectTypeAttribute.name || attribute && attribute.name, 300);
                    });
                    var typeId = text(entry && entry.objectType && entry.objectType.id, 100);
                    if (missing && typeId && !seenTypes[typeId]) { seenTypes[typeId] = true; typeIds.push(typeId); }
                });
                var cursor = 0;
                function worker() {
                    if (cursor >= typeIds.length) return Promise.resolve();
                    var typeId = typeIds[cursor++];
                    return requestJson({
                        url: workspaceBase + "/objecttype/" + encodeURIComponent(typeId) + "/attributes",
                        method: "GET", headers: { Authorization: authHeader(config), Accept: "application/json" },
                        verifyTls: config.verifyTls, timeoutMs: 30000, maxBytes: 4 * 1024 * 1024,
                        errorPrefix: "Jira Assets attributes"
                    }).then(function (definitions) {
                        var names = Object.create(null);
                        array(definitions).forEach(function (definition) {
                            var id = text(definition && definition.id, 100), name = text(definition && definition.name, 300);
                            if (id && name) names[id] = name;
                        });
                        entries.forEach(function (entry) {
                            if (text(entry && entry.objectType && entry.objectType.id, 100) !== typeId) return;
                            array(entry.attributes).forEach(function (attribute) {
                                var id = text(attribute && (attribute.objectTypeAttributeId || attribute.id), 100);
                                if (names[id]) attribute.objectTypeAttribute = { name: names[id] };
                            });
                        });
                    }).catch(function () {}).then(worker);
                }
                var workers = [];
                var workerCount = Math.min(ASSET_PAGE_CONCURRENCY, typeIds.length);
                for (var index = 0; index < workerCount; index++) workers.push(worker());
                return Promise.all(workers).then(function () { return entries; });
            }

            function fetchEntries() {
                if (!force && cached && cached.fetchedAt > Date.now() - ASSET_CACHE_TTL_MS) {
                    if (!missingAttributeNames(cached.entries)) return Promise.resolve({ entries: cached.entries, stale: false });
                    return enrichAttributeNames(cached.entries).then(function (entries) {
                        return { entries: writeAssetCache(policy.aql, entries), stale: false };
                    });
                }
                if (!force && cached && cached.entries.length && assetsInFlight[policy.aql]) {
                    return Promise.resolve({
                        entries: cached.entries,
                        stale: true,
                        warning: "Jira Assets cache refresh is still running; using the previous snapshot."
                    });
                }
                if (assetsInFlight[policy.aql]) return assetsInFlight[policy.aql];
                var entries = [], truncated = false;
                var refreshDeadline = Date.now() + ASSET_REFRESH_MAX_MS;

                function requestPage(startAt) {
                    if (Date.now() >= refreshDeadline) {
                        return Promise.reject(new Error("Jira Assets refresh exceeded the 180 second safety bound."));
                    }
                    var endpoint = baseUrl + "?startAt=" + startAt + "&maxResults=" + ASSET_PAGE_SIZE + "&includeAttributes=true";
                    return requestJson({
                        url: endpoint, method: "POST",
                        headers: { Authorization: authHeader(config), Accept: "application/json", "Content-Type": "application/json" },
                        json: { qlQuery: policy.aql }, verifyTls: config.verifyTls,
                        timeoutMs: 30000, maxBytes: 16 * 1024 * 1024, errorPrefix: "Jira Assets"
                    }).then(function (response) {
                        var page = applyResponseAttributeNames(response, responseItems(response));
                        var count = page.length;
                        var more = pageHasMore(response, startAt, count);
                        var total = responseTotal(response);
                        var prepared = missingAttributeNames(page) ? enrichAttributeNames(page) : Promise.resolve(page);
                        return prepared.then(function (enriched) {
                            return {
                                count: count,
                                more: more,
                                total: total,
                                entries: enriched.map(compactAssetEntry)
                            };
                        });
                    });
                }

                function fetchConcurrent(starts) {
                    var cursor = 0;
                    var stopped = false;
                    var firstError = null;
                    var lastStartAt = -1;
                    var lastPage = null;
                    function worker() {
                        if (stopped || cursor >= starts.length) return Promise.resolve();
                        if (Date.now() >= refreshDeadline) {
                            stopped = true;
                            firstError = new Error("Jira Assets refresh exceeded the 180 second safety bound.");
                            return Promise.resolve();
                        }
                        var startAt = starts[cursor++];
                        return requestPage(startAt).then(function (page) {
                            entries = entries.concat(page.entries);
                            if (startAt > lastStartAt) { lastStartAt = startAt; lastPage = page; }
                        }, function (error) {
                            stopped = true;
                            if (!firstError) firstError = error;
                        }).then(worker);
                    }
                    var workers = [];
                    var workerCount = Math.min(ASSET_PAGE_CONCURRENCY, starts.length);
                    for (var index = 0; index < workerCount; index++) workers.push(worker());
                    return Promise.all(workers).then(function () {
                        if (firstError) throw firstError;
                        return { lastStartAt: lastStartAt, lastPage: lastPage };
                    });
                }

                function fetchSequential(startAt, pageCount) {
                    if (pageCount >= MAX_ASSET_SCAN_PAGES) {
                        truncated = true;
                        return Promise.resolve();
                    }
                    return requestPage(startAt).then(function (page) {
                        entries = entries.concat(page.entries);
                        if (!page.more || !page.count) return null;
                        return fetchSequential(startAt + page.count, pageCount + 1);
                    });
                }

                assetsInFlight[policy.aql] = requestPage(0).then(function (firstPage) {
                    entries = entries.concat(firstPage.entries);
                    if (!firstPage.more || !firstPage.count) return null;
                    var maxEntries = ASSET_PAGE_SIZE * MAX_ASSET_SCAN_PAGES;
                    if (firstPage.total >= 0 && firstPage.count === ASSET_PAGE_SIZE) {
                        var upperBound = Math.min(firstPage.total, maxEntries);
                        var starts = [];
                        for (var startAt = ASSET_PAGE_SIZE; startAt < upperBound; startAt += ASSET_PAGE_SIZE) starts.push(startAt);
                        return fetchConcurrent(starts).then(function (tail) {
                            // Jira can report a totalFilterCount/total that is capped well
                            // below the real result count. Trusting it to bound pagination
                            // silently drops every object beyond the cap (e.g. most non-
                            // Komputer equipment types). Keep paging sequentially past the
                            // reported total as long as the last page we actually fetched
                            // still signals more results are available.
                            if (!tail || !tail.lastPage || !tail.lastPage.more || !tail.lastPage.count) {
                                if (firstPage.total > maxEntries) truncated = true;
                                return null;
                            }
                            var nextStartAt = tail.lastStartAt + tail.lastPage.count;
                            if (nextStartAt >= maxEntries) { truncated = true; return null; }
                            return fetchSequential(nextStartAt, Math.ceil(nextStartAt / ASSET_PAGE_SIZE));
                        });
                    }
                    return fetchSequential(firstPage.count, 1);
                }).then(function () {
                    return { entries: writeAssetCache(policy.aql, entries), stale: false, truncated: truncated };
                }).catch(function (error) {
                    if (cached && cached.entries.length) return { entries: cached.entries, stale: true, warning: text(error.message || error, 1000) };
                    throw error;
                }).then(function (result) { delete assetsInFlight[policy.aql]; return result; }, function (error) {
                    delete assetsInFlight[policy.aql]; throw error;
                });
                return assetsInFlight[policy.aql];
            }

            return fetchEntries().then(function (source) {
                var resolvedIdentities = expandUserIdentityAliases(source.entries, identities);
                var seen = Object.create(null), items = [];
                source.entries.filter(function (entry) {
                    return !identityObjectMatchesUser(entry, identities) && entryMatchesUser(entry, resolvedIdentities);
                }).map(function (entry) {
                    return normalizeAsset(entry, policy);
                }).filter(Boolean).forEach(function (item) {
                    var key = lower(item.value);
                    if (!key || seen[key] || items.length >= policy.maxResults) return;
                    seen[key] = true; items.push(item);
                });
                items.sort(function (a, b) { return a.label.localeCompare(b.label); });
                return { items: items, stale: source.stale === true, truncated: source.truncated === true || items.length >= policy.maxResults, warning: source.warning || "" };
            });
        });
    }

    return {
        cachePath: cachePath,
        assetCachePath: assetCachePath,
        listAssets: listAssets,
        listUsers: listUsers,
        optionsFor: function (variable, values, force) {
            variable = object(variable);
            values = object(values);
            if (lower(variable.control) === "user") {
                return listUsers(force === true, variable.name === "JiraUser" || lower(values.JiraUserFilter) === "all");
            }
            if (lower(variable.control) === "asset") {
                var policy = object(variable.jiraAsset);
                var userVariable = text(policy.userVariable, 200).replace(/^[\s$%]+/, "");
                var userValue = userVariable ? values[userVariable] : "";
                if (userVariable && !text(userValue, 500)) return Promise.resolve({ items: [] });
                return listAssets(userValue, variable, force === true);
            }
            return Promise.resolve({ items: [] });
        }
    };
};
