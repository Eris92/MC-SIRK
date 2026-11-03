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
assert.ok(source.indexOf("Export-Csv -LiteralPath $csvPath -NoTypeInformation -Encoding UTF8") >= 0,
    "The report must generate a UTF-8 CSV artifact.");
assert.ok(source.indexOf('Write-Output "CSV_DOWNLOAD: $csvPath"') >= 0,
    "The report must emit the shared Results CSV download marker.");
assert.ok(source.indexOf('Write-Output "Liczba rekordow: $($export.Count)"') >= 0,
    "The report must emit the record-count summary consumed by shared Results.");

assert.ok(source.indexOf("Protect-CsvCell") >= 0 && source.indexOf("foreach ($column in") >= 0,
    "Every exported CSV column must be checked against spreadsheet formula injection.");
assert.ok(source.indexOf("[guid]::NewGuid()") >= 0,
    "Concurrent or rapid runs must not overwrite an existing CSV file.");
assert.ok(source.indexOf("if ($export.Count -gt 0)") >= 0 && source.indexOf("WriteAllText") >= 0,
    "Disabled SMS and Voice policy must still produce a header-only downloadable CSV.");
assert.ok(!source.includes("Jan 28, 2027"),
    "The report must not display a stale or unsupported fixed retirement date.");
console.log("Entra SMS/Voice policy report My Scripts and downloadable CSV contract: OK");
