"use strict";

var httpClient = require("./http-client.js");
var shared = require("./shared.js");

var USER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
var USER_PAGE_SIZE = 100;
var MAX_USERS = 1000;

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
    if (value.active === false) return null;
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
        emailAddress: email
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
        var values = array(attribute && attribute.objectAttributeValues).map(function (value) {
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
    var usersInFlight = null;

    function jiraConfig() {
        var value = integrations.get("jira") || {};
        var endpoint;
        try { endpoint = new URL(String(value.url || "")); }
        catch (error) { throw new Error("Jira URL is not configured."); }
        if (endpoint.protocol !== "https:") throw new Error("Jira URL must use HTTPS.");
        if (!value.email || !value.token) throw new Error("Jira credentials are not configured.");
        value.url = endpoint.href.replace(/\/$/, "");
        value.maxResults = Math.max(10, Math.min(500, Number(value.maxResults) || 100));
        value.aql = text(value.aql, 4000) || "objectType = Computer";
        value.hostnameAttribute = text(value.hostnameAttribute, 200) || "Hostname";
        value.verifyTls = value.verifyTls !== false;
        return value;
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
        try {
            var parsed = JSON.parse(fs.readFileSync(cachePath, "utf8"));
            if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.users)) return null;
            return {
                fetchedAt: Number(parsed.fetchedAt) || 0,
                users: parsed.users.slice(0, MAX_USERS).map(normalizeUser).filter(Boolean)
            };
        } catch (error) {
            return null;
        }
    }

    function writeCache(users) {
        var temp = cachePath + ".tmp-" + process.pid + "-" + Date.now();
        fs.writeFileSync(temp, JSON.stringify({
            version: 1,
            fetchedAt: Date.now(),
            users: users.slice(0, MAX_USERS)
        }, null, 2), { encoding: "utf8", mode: 384 });
        try {
            fs.renameSync(temp, cachePath);
        } catch (error) {
            try { fs.unlinkSync(cachePath); } catch (ignore) {}
            fs.renameSync(temp, cachePath);
        }
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

    function listUsers(force) {
        var cached = readCache();
        if (!force && cached && cached.fetchedAt > Date.now() - USER_CACHE_TTL_MS) {
            return Promise.resolve({ items: cached.users, stale: false, fetchedAt: cached.fetchedAt });
        }
        if (usersInFlight) return usersInFlight;
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
        return usersInFlight;
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

    function entryMatchesUser(entry, identities) {
        if (!identities.length) return false;
        var strings = collectStrings(array(entry && entry.attributes), [], 0).map(lower);
        return identities.some(function (identity) { return strings.indexOf(identity) >= 0; });
    }

    function normalizeAsset(entry, config) {
        entry = object(entry);
        var attributes = attributeMap(entry);
        var hostnameValues = attributes[lower(config.hostnameAttribute)] || [];
        var hostname = text(hostnameValues[0] || entry.label || entry.objectKey || entry.id, 500);
        if (!hostname) return null;
        var model = text((attributes.model || attributes["model name"] || [])[0], 300);
        var serial = text((attributes["serial number"] || attributes.serial || [])[0], 300);
        var inventory = text((attributes["inventory number"] || attributes.inventory || [])[0], 300);
        var details = [model, serial, inventory].filter(Boolean);
        return {
            value: hostname,
            label: hostname + (details.length ? " — " + details.join(" / ") : ""),
            objectId: text(entry.id, 200),
            objectKey: text(entry.objectKey, 200),
            hostname: hostname,
            model: model,
            serialNumber: serial,
            inventoryNumber: inventory
        };
    }

    function listAssets(userValue) {
        userValue = text(userValue, 500);
        if (!userValue) return Promise.resolve({ items: [] });
        var config = jiraConfig();
        return Promise.all([listUsers(false), discoverCloudId(config), discoverWorkspaceId(config)]).then(function (parts) {
            var identities = selectedUserIdentity(userValue, parts[0].items);
            var endpoint = "https://api.atlassian.com/ex/jira/" + encodeURIComponent(parts[1]) +
                "/jsm/assets/workspace/" + encodeURIComponent(parts[2]) +
                "/v1/object/aql?startAt=0&maxResults=" + config.maxResults + "&includeAttributes=true";
            return requestJson({
                url: endpoint,
                method: "POST",
                headers: { Authorization: authHeader(config), Accept: "application/json", "Content-Type": "application/json" },
                json: { qlQuery: config.aql },
                verifyTls: config.verifyTls,
                timeoutMs: 30000,
                maxBytes: 16 * 1024 * 1024,
                errorPrefix: "Jira Assets"
            }).then(function (response) {
                var seen = Object.create(null);
                var items = responseItems(response).filter(function (entry) {
                    return entryMatchesUser(entry, identities);
                }).map(function (entry) {
                    return normalizeAsset(entry, config);
                }).filter(function (item) {
                    if (!item) return false;
                    var key = lower(item.value);
                    if (!key || seen[key]) return false;
                    seen[key] = true;
                    return true;
                }).sort(function (a, b) { return a.label.localeCompare(b.label); });
                return { items: items };
            });
        });
    }

    return {
        cachePath: cachePath,
        listAssets: listAssets,
        listUsers: listUsers,
        optionsFor: function (variable, values, force) {
            variable = object(variable);
            values = object(values);
            if (lower(variable.control) === "user") return listUsers(force === true);
            if (lower(variable.control) === "asset") return listAssets(values.JiraUser || values.jiraUser || "");
            return Promise.resolve({ items: [] });
        }
    };
};
