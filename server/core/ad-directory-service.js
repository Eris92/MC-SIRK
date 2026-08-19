"use strict";

var childProcess = require("child_process");
var shared = require("./shared.js");

var MAX_MATCH_UPNS = 10000;
var INLINE_UPNS_JSON_MAX = 8000;
var MATCH_TIMEOUT_MS = 15000;
var FALLBACK_TIMEOUT_MS = 30000;

module.exports.createAdDirectoryService = function (options) {
    options = options || {};
    var context = options.context;
    var jiraAssets = options.jiraAssets || null;
    var execFile = options.execFile || childProcess.execFile;
    var queryScriptPath = options.queryScriptPath || context.nativePath.join(__dirname, "ad-directory-query.ps1");

    function powershellPath() {
        if (process.platform !== "win32") return "pwsh";
        var configured = String(process.env.SIRK_PLATFORM_POWERSHELL || "").trim();
        if (configured) return configured;
        return process.env.SystemRoot ? context.nativePath.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : "powershell.exe";
    }

    function upn(value) {
        return shared.cleanText(value == null ? "" : value, 500).trim().toLowerCase();
    }

    function requestedUpns(jiraUsers) {
        var seen = Object.create(null);
        return (Array.isArray(jiraUsers) ? jiraUsers : []).map(function (item) {
            return upn(item && item.emailAddress);
        }).filter(function (value) {
            if (!value || seen[value]) return false;
            seen[value] = true;
            return true;
        }).slice(0, MAX_MATCH_UPNS);
    }

    function parseBridgePayload(stdout) {
        var raw = String(stdout || "").trim();
        if (!raw) return null;
        try {
            var payload = JSON.parse(raw);
            return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : null;
        } catch (error) {
            return null;
        }
    }

    function processFailure(error, payload) {
        var message = payload && shared.cleanText(payload.error || "", 1000).trim();
        if (message) return new Error(message);
        if (error && (error.killed === true || error.signal || /timed?\s*out/i.test(String(error.message || "")))) {
            return new Error("Active Directory user lookup timed out.");
        }
        return new Error("Active Directory user lookup failed.");
    }

    function listDirectoryUsers(jiraUsers) {
        var ad = context.integrations.get("ad");
        if (!ad.domain || !ad.login || !ad.password) return Promise.reject(new Error("Active Directory integration is not configured."));
        var matchUpns = Array.isArray(jiraUsers) ? requestedUpns(jiraUsers) : null;
        if (matchUpns && !matchUpns.length) return Promise.resolve([]);
        var matchJson = matchUpns ? JSON.stringify(matchUpns) : "";
        var inlineMatchJson = matchJson.length <= INLINE_UPNS_JSON_MAX ? matchJson : "";

        return new Promise(function (resolve, reject) {
            var settled = false;
            var child;
            function finish(error, stdout) {
                if (settled) return;
                settled = true;
                var payload = parseBridgePayload(stdout);
                if (error) {
                    reject(processFailure(error, payload));
                    return;
                }
                if (!payload || payload.ok !== true || !Array.isArray(payload.rows)) {
                    reject(new Error("Active Directory returned invalid user data."));
                    return;
                }
                resolve(payload.rows.filter(function (item) { return item && item.value; }));
            }
            try {
                child = execFile(powershellPath(), ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", queryScriptPath], {
                    windowsHide: true,
                    encoding: "utf8",
                    timeout: matchUpns ? MATCH_TIMEOUT_MS : FALLBACK_TIMEOUT_MS,
                    maxBuffer: 8 * 1024 * 1024,
                    env: Object.assign({}, process.env, {
                        SIRK_AD_DOMAIN: String(ad.domain),
                        SIRK_AD_LOGIN: String(ad.login),
                        SIRK_AD_PASSWORD: String(ad.password),
                        SIRK_AD_MATCH_MODE: matchUpns ? "upn" : "all",
                        SIRK_AD_UPNS_JSON: inlineMatchJson
                    })
                }, finish);
                if (matchUpns && !inlineMatchJson && child && child.stdin && typeof child.stdin.end === "function") {
                    if (typeof child.stdin.on === "function") child.stdin.on("error", function (error) { finish(error, ""); });
                    child.stdin.end(matchJson, "utf8");
                }
            } catch (error) {
                finish(error, "");
            }
        });
    }

    function matchJiraUsers(jiraUsers, directoryUsers) {
        var byUpn = Object.create(null);
        (Array.isArray(directoryUsers) ? directoryUsers : []).forEach(function (item) {
            var key = upn(item && item.upn);
            if (key && !byUpn[key]) byUpn[key] = item;
        });
        var seen = Object.create(null);
        return (Array.isArray(jiraUsers) ? jiraUsers : []).map(function (jiraUser) {
            var key = upn(jiraUser && jiraUser.emailAddress);
            var directoryUser = key && byUpn[key];
            var value = shared.cleanText(directoryUser && directoryUser.value, 500).trim();
            if (!directoryUser || !value || seen[value.toLowerCase()]) return null;
            seen[value.toLowerCase()] = true;
            return {
                value: value,
                label: shared.cleanText(jiraUser.label || jiraUser.displayName || jiraUser.emailAddress || directoryUser.label || value, 1000),
                displayName: shared.cleanText(jiraUser.displayName || directoryUser.displayName || "", 500),
                email: shared.cleanText(jiraUser.emailAddress || directoryUser.email || "", 500),
                upn: shared.cleanText(directoryUser.upn || "", 500),
                active: jiraUser.active !== false && directoryUser.active !== false
            };
        }).filter(Boolean);
    }

    function listUsers() {
        if (!jiraAssets || typeof jiraAssets.listUsers !== "function") return listDirectoryUsers(null);
        return jiraAssets.listUsers(false, false).then(function (result) {
            var jiraUsers = result && Array.isArray(result.items) ? result.items : [];
            return listDirectoryUsers(jiraUsers).then(function (directoryUsers) {
                return matchJiraUsers(jiraUsers, directoryUsers);
            });
        });
    }

    function locations() {
        var settings = context.integrations.readSettings();
        return ((settings.ad && settings.ad.userLocations) || []).map(function (item) {
            return { value: String(item.dn || ""), label: String(item.name || item.dn || "") };
        }).filter(function (item) { return item.value && item.label; });
    }

    return { listUsers: listUsers, locations: locations, matchJiraUsers: matchJiraUsers };
};
