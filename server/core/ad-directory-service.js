"use strict";

var childProcess = require("child_process");
var shared = require("./shared.js");

var MAX_MATCH_UPNS = 10000;
var INLINE_UPNS_JSON_MAX = 8000;

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

    function listDirectoryUsers(jiraUsers) {
        var ad = context.integrations.get("ad");
        if (!ad.domain || !ad.login || !ad.password) return Promise.reject(new Error("Active Directory integration is not configured."));
        var matchUpns = Array.isArray(jiraUsers) ? requestedUpns(jiraUsers) : null;
        if (matchUpns && !matchUpns.length) return Promise.resolve([]);
        var matchJson = matchUpns ? JSON.stringify(matchUpns) : "";
        var inlineMatchJson = matchJson.length <= INLINE_UPNS_JSON_MAX ? matchJson : "";
        var script = [
            "$ErrorActionPreference='Stop'", "Import-Module ActiveDirectory -ErrorAction Stop",
            "$sec=ConvertTo-SecureString $env:SIRK_AD_PASSWORD -AsPlainText -Force",
            "$cred=[pscredential]::new($env:SIRK_AD_LOGIN,$sec)",
            "function ConvertTo-SirkLdapValue { param([string]$Value); $builder=New-Object Text.StringBuilder; foreach($character in $Value.ToCharArray()){ switch([int][char]$character){ 0 {[void]$builder.Append('\\00')} 40 {[void]$builder.Append('\\28')} 41 {[void]$builder.Append('\\29')} 42 {[void]$builder.Append('\\2a')} 92 {[void]$builder.Append('\\5c')} default {[void]$builder.Append($character)} } }; $builder.ToString() }",
            "if($env:SIRK_AD_MATCH_MODE -eq 'upn'){",
            "$raw=[string]$env:SIRK_AD_UPNS_JSON; if([string]::IsNullOrWhiteSpace($raw)){$raw=[Console]::In.ReadToEnd()}",
            "$wanted=@(ConvertFrom-Json -InputObject $raw | ForEach-Object {[string]$_} | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })",
            "$matches=New-Object System.Collections.Generic.List[object]; $chunkSize=500",
            "for($offset=0;$offset -lt $wanted.Count;$offset+=$chunkSize){$last=[Math]::Min($offset+$chunkSize,$wanted.Count);$parts=New-Object System.Collections.Generic.List[string];for($index=$offset;$index -lt $last;$index++){[void]$parts.Add('(userPrincipalName='+(ConvertTo-SirkLdapValue $wanted[$index])+')')};$ldap='(|'+($parts -join '')+')';Get-ADUser -Server $env:SIRK_AD_DOMAIN -Credential $cred -LDAPFilter $ldap -Properties DisplayName,Mail,Enabled,UserPrincipalName | ForEach-Object {[void]$matches.Add($_)}}",
            "$source=@($matches)",
            "}else{$source=@(Get-ADUser -Server $env:SIRK_AD_DOMAIN -Credential $cred -Filter * -Properties DisplayName,Mail,Enabled,UserPrincipalName | Select-Object -First 10000)}",
            "$rows=$source | Sort-Object DisplayName,SamAccountName | Select-Object -First 10000 | ForEach-Object {[ordered]@{value=[string]$_.SamAccountName;label=(([string]$_.DisplayName)+' ('+([string]$_.SamAccountName)+')');displayName=[string]$_.DisplayName;email=[string]$_.Mail;upn=[string]$_.UserPrincipalName;active=[bool]$_.Enabled}}",
            "ConvertTo-Json -InputObject @($rows) -Depth 4 -Compress"
        ].join(";");
        var encoded = Buffer.from(script, "utf16le").toString("base64");
        return new Promise(function (resolve, reject) {
            var settled = false;
            var child;
            function finish(error, stdout, stderr) {
                if (settled) return;
                settled = true;
                if (error) { reject(new Error(shared.cleanText(stderr || error.message, 1000))); return; }
                try {
                    var rows = JSON.parse(String(stdout || "[]").trim() || "[]");
                    resolve((Array.isArray(rows) ? rows : [rows]).filter(function (item) { return item && item.value; }));
                } catch (parseError) { reject(new Error("Active Directory returned invalid user data.")); }
            }
            try {
                child = execFile(powershellPath(), ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded], {
                    windowsHide: true, timeout: matchUpns ? 30000 : 60000, maxBuffer: 8 * 1024 * 1024,
                    env: Object.assign({}, process.env, {
                        SIRK_AD_DOMAIN: String(ad.domain),
                        SIRK_AD_LOGIN: String(ad.login),
                        SIRK_AD_PASSWORD: String(ad.password),
                        SIRK_AD_MATCH_MODE: matchUpns ? "upn" : "all",
                        SIRK_AD_UPNS_JSON: inlineMatchJson
                    })
                }, finish);
                if (matchUpns && !inlineMatchJson && child && child.stdin && typeof child.stdin.end === "function") {
                    child.stdin.end(matchJson, "utf8");
                }
            } catch (error) {
                finish(error, "", "");
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