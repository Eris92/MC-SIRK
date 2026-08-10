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
    return Array.isArray(value.values) ? value.values : [];
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
        value.verifyTls = value.verifyTls !== false;
        return value;
    }

    function authHeader(config) {
        return "Basic " + Buffer.from(String(config.email) + ":" + String(config.token), "utf8").toString("base64");
    }

    function siteRequest(config, relative, prefix) {
        return requestJson({
            url: config.url + relative,
            method: "GET",
            headers: { Authorization: authHeader(config), Accept: "application/json" },
            verifyTls: config.verifyTls,
            timeoutMs: 30000,
            maxBytes: 8 * 1024 * 1024,
            errorPrefix: prefix || "Jira"
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
            return siteRequest(config, endpoint + separator + "startAt=" + startAt + "&maxResults=" + USER_PAGE_SIZE, "Jira users").then(function (response) {
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

    return {
        cachePath: cachePath,
        listUsers: listUsers,
        optionsFor: function (variable, values, force) {
            variable = object(variable);
            if (lower(variable.control) === "user") return listUsers(force === true);
            return Promise.resolve({ items: [] });
        }
    };
};
