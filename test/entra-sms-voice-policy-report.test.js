"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var libraryFactory = require("../server/core/script-confirmation-library.js");

var root = path.join(__dirname, "..", "seed", "MyScripts");
var relative = "Entra ID/Get-SmsVoicePolicyUsers.ps1";
var source = fs.readFileSync(path.join(root, relative), "utf8");
var library = libraryFactory.createScriptLibrary({ fs: fs, path: path, root: root, readOnly: true, allowWrite: false });
var script = library.getScript(relative, true);

assert.ok(script, "The SMS/Voice report must be discoverable as a canonical My Scripts entry.");
assert.strictEqual(script.runAsUser, 0, "The report must execute server-side as the agent/system account.");
assert.ok((script.extraHeaders || []).some(function (header) { return /^SirkSystemCredential:\s*Entra$/i.test(header); }),
    "The report must bind to the global Entra integration profile.");
assert.ok(source.indexOf("Connect-MgGraph") < 0 && source.indexOf("Get-Mg") < 0,
    "The report must not require interactive Microsoft Graph PowerShell modules.");
assert.ok(source.indexOf("oauth2/v2.0/token") >= 0 && source.indexOf("client_credentials") >= 0,
    "The report must use non-interactive app-only Graph authentication.");
assert.ok(source.indexOf("MYSCRIPTS_ENTRA_TENANT_ID") >= 0 && source.indexOf("MYSCRIPTS_ENTRA_CLIENT_ID") >= 0 && source.indexOf("MYSCRIPTS_ENTRA_CLIENT_SECRET") >= 0,
    "The report must consume the established Entra execution environment contract.");
assert.ok(source.indexOf("Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8") >= 0,
    "The report must generate a UTF-8 CSV artifact.");
assert.ok(source.indexOf('Write-Output "CSV_DOWNLOAD: $csvPath"') >= 0,
    "The report must emit the shared Results CSV download marker.");
assert.ok(source.indexOf('Write-Output "Liczba rekordow: $($export.Count)"') >= 0,
    "The report must emit the record-count summary consumed by shared Results.");

console.log("Entra SMS/Voice policy report My Scripts and downloadable CSV contract: OK");
