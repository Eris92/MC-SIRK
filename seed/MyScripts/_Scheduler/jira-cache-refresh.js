"use strict";

var fs = require("fs");
var path = require("path");

function cleanError(error) {
    return String(error && error.message || error || "Unknown Jira cache refresh error.").slice(0, 1000);
}

function headerValue(source, name) {
    var expression = new RegExp("^\\s*#\\s*" + name + "\\s*:\\s*(.+?)\\s*$", "im");
    var match = expression.exec(String(source || ""));
    return match ? String(match[1] || "").trim() : "";
}

function existingDirectory(value, label) {
    var resolved = path.resolve(String(value || ""));
    try {
        if (fs.statSync(resolved).isDirectory()) return resolved;
    } catch (error) {}
    throw new Error(label + " does not exist: " + resolved);
}

function refresh(options) {
    options = options || {};
    var dataRoot = existingDirectory(options.dataRoot, "SIRK data root");
    var pluginRoot = existingDirectory(options.pluginRoot || path.resolve(__dirname, "..", "..", ".."), "MC-SIRK plugin root");
    var settingsFactory = require(path.join(pluginRoot, "server", "core", "settings-store.js"));
    var secretsFactory = require(path.join(pluginRoot, "server", "core", "secret-store.js"));
    var integrationFactory = require(path.join(pluginRoot, "server", "core", "integration-service.js"));
    var jiraFactory = require(path.join(pluginRoot, "server", "core", "jira-asset-service.js"));
    var fallbackSettings = options.fallbackSettings != null
        ? String(options.fallbackSettings)
        : (process.env.PROGRAMDATA
            ? path.join(process.env.PROGRAMDATA, "SIRK Management Platform", "settings.json")
            : "");
    var settings = settingsFactory.createSettingsStore({
        fs: fs,
        path: path,
        filePath: path.join(dataRoot, "settings.json"),
        fallbackPath: fallbackSettings,
        defaults: {}
    });
    var secrets = secretsFactory.createSecretStore({
        fs: fs,
        path: path,
        dataPath: path.join(dataRoot, "secrets.json"),
        keyPath: path.join(dataRoot, ".secret.key")
    });
    var integrations = integrationFactory.createIntegrationService({ settings: settings, secrets: secrets, parent: {} });
    var jira = jiraFactory.createJiraAssetService({
        fs: fs,
        path: path,
        dataRoot: dataRoot,
        integrations: integrations,
        requestJson: options.requestJson
    });
    var assetScriptPath = path.join(path.resolve(__dirname, ".."), "settings", "Jira", "Cache Assets.ps1");
    var assetScript = fs.readFileSync(assetScriptPath, "utf8");
    var aql = headerValue(assetScript, "SirkJiraAssetAql");
    var labelAttribute = headerValue(assetScript, "SirkJiraAssetLabelAttribute") || "Nazwa_sieciowa";
    if (!aql) throw new Error("Jira Assets cache AQL is missing from " + assetScriptPath);

    return jira.listUsers(true, true).then(function (users) {
        if (users.stale === true) throw new Error("Jira users refresh returned only stale cache data.");
        return jira.listAssets("", {
            control: "asset",
            jiraAsset: { aql: aql, labelAttribute: labelAttribute, maxResults: 5000, userVariable: "" }
        }, true).then(function (assets) {
            if (assets.stale === true) throw new Error("Jira Assets refresh returned only stale cache data.");
            return {
                ok: true,
                refreshedAt: new Date().toISOString(),
                users: Array.isArray(users.items) ? users.items.length : 0,
                assets: Array.isArray(assets.items) ? assets.items.length : 0,
                userCachePath: jira.cachePath,
                assetCachePath: jira.assetCachePath
            };
        });
    });
}

module.exports = { refresh: refresh };

if (require.main === module) {
    refresh({ dataRoot: process.argv[2], pluginRoot: process.argv[3] }).then(function (result) {
        process.stdout.write(JSON.stringify(result) + "\n");
    }).catch(function (error) {
        process.stderr.write(JSON.stringify({ ok: false, error: cleanError(error) }) + "\n");
        process.exitCode = 1;
    });
}
