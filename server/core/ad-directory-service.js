"use strict";

var childProcess = require("child_process");
var shared = require("./shared.js");

module.exports.createAdDirectoryService = function (options) {
    options = options || {};
    var context = options.context;
    var jiraAssets = options.jiraAssets || null;
    var execFile = options.execFile || childProcess.execFile;

    function powershellPath() {
        if (process.platform !== "win32") return "pwsh";
        var configured = String(process.env.SIRK_PLATFORM_POWERSHELL || "").trim();
        if (configured) return configured;
        return process.env.SystemRoot ? context.nativePath.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : "powershell.exe";
    }

    function upn(value) {
        return shared.cleanText(value == null ? "" : value, 500).trim().toLowerCase();
    }

    function listDirectoryUsers() {
        var ad = context.integrations.get("ad");
        if (!ad.domain || !ad.login || !ad.password) return Promise.reject(new Error("Active Directory integration is not configured."));
        var script = [
            "$ErrorActionPreference='Stop'", "Import-Module ActiveDirectory -ErrorAction Stop",
            "$sec=ConvertTo-SecureString $env:SIRK_AD_PASSWORD -AsPlainText -Force",
            "$cred=[pscredential]::new($env:SIRK_AD_LOGIN,$sec)",
            "$rows=Get-ADUser -Server $env:SIRK_AD_DOMAIN -Credential $cred -Filter * -Properties DisplayName,Mail,Enabled,UserPrincipalName | Sort-Object DisplayName,SamAccountName | Select-Object -First 10000 | ForEach-Object {[ordered]@{value=[string]$_.SamAccountName;label=(([string]$_.DisplayName)+' ('+([string]$_.SamAccountName)+')');displayName=[string]$_.DisplayName;email=[string]$_.Mail;upn=[string]$_.UserPrincipalName;active=[bool]$_.Enabled}}",
            "ConvertTo-Json -InputObject @($rows) -Depth 4 -Compress"
        ].join(";");
        var encoded = Buffer.from(script, "utf16le").toString("base64");
        return new Promise(function (resolve, reject) {
            execFile(powershellPath(), ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded], {
                windowsHide: true, timeout: 60000, maxBuffer: 8 * 1024 * 1024,
                env: Object.assign({}, process.env, { SIRK_AD_DOMAIN: String(ad.domain), SIRK_AD_LOGIN: String(ad.login), SIRK_AD_PASSWORD: String(ad.password) })
            }, function (error, stdout, stderr) {
                if (error) { reject(new Error(shared.cleanText(stderr || error.message, 1000))); return; }
                try {
                    var rows = JSON.parse(String(stdout || "[]").trim() || "[]");
                    resolve((Array.isArray(rows) ? rows : [rows]).filter(function (item) { return item && item.value; }));
                } catch (parseError) { reject(new Error("Active Directory returned invalid user data.")); }
            });
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
        if (!jiraAssets || typeof jiraAssets.listUsers !== "function") return listDirectoryUsers();
        return Promise.all([jiraAssets.listUsers(false, false), listDirectoryUsers()]).then(function (results) {
            return matchJiraUsers(results[0] && results[0].items, results[1]);
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
