"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var policy = require("../server/core/logged-on-user-command-policy.js");

var source = fs.readFileSync(path.resolve(__dirname, "../server/modules/commands/index.js"), "utf8");
var marker = "    var catalog = ";
var begin = source.indexOf(marker);
var end = source.indexOf("\n    };", begin);
assert.ok(begin >= 0 && end > begin, "The canonical command catalog must be present.");
var catalog = vm.runInNewContext("(" + source.slice(begin + marker.length, end + 6) + ")");
var ids = Object.keys(catalog).reduce(function (all, key) {
    return all.concat(catalog[key].commands.map(function (item) { return item.id; }));
}, []);
var matches = catalog.system.commands.filter(function (item) { return item.id === "odbc-32"; });
assert.strictEqual(matches.length, 1, "System must include exactly one ODBC (32-bit) preset.");
assert.strictEqual(ids.filter(function (id) { return id === "odbc-32"; }).length, 1, "ODBC ID must be globally unique.");
var odbc = matches[0];

assert.strictEqual(odbc.label, "ODBC (32-bit)");
assert.ok(odbc.locales.pl.description && odbc.locales.en.description, "PL/EN descriptions must be defined.");
assert.strictEqual(odbc.type, 2, "ODBC must be a PowerShell preset.");
assert.strictEqual(odbc.runAsUser, 2, "ODBC must start in the logged-on user's interactive session.");
assert.notStrictEqual(odbc.elevatedUserSession, true, "Task Scheduler elevation must not bypass the UAC consent path.");
assert.ok(odbc.cmd.indexOf("SysWOW64\\odbcad32.exe") >= 0, "ODBC must resolve the 32-bit system executable.");
assert.ok(odbc.cmd.indexOf("System32\\odbcad32.exe") < 0, "The 64-bit administrator must not be selected.");
assert.ok(odbc.cmd.indexOf("[Environment+SpecialFolder]::Windows") >= 0, "Use the OS Windows directory, not an injectable argument.");
assert.ok(odbc.cmd.indexOf("Test-Path -LiteralPath $odbc -PathType Leaf") >= 0 &&
    odbc.cmd.indexOf("executable was not found") >= 0, "Missing ODBC executable must fail clearly.");
assert.ok(odbc.cmd.indexOf("Start-Process -FilePath $odbc -Verb RunAs -PassThru -ErrorAction Stop") >= 0 &&
    odbc.cmd.indexOf("catch{throw") >= 0, "UAC cancellation and launch failures must be surfaced.");
assert.ok(odbc.cmd.indexOf("-Wait") < 0, "The GUI must remain open without exhausting the launcher timeout.");

var transformed = policy.transformCommand(odbc);
assert.strictEqual(transformed.runAsUser, 0, "The existing MeshAgent wrapper runs as SYSTEM, not the ODBC GUI.");
assert.strictEqual(transformed.type, 2);
assert.ok(transformed.cmd.indexOf("New-ScheduledTaskPrincipal -UserId $userName -LogonType Interactive -RunLevel Limited") >= 0,
    "UAC must be requested from a limited interactive token, not combined with RunLevel Highest.");
assert.ok(transformed.cmd.indexOf("$directPowerShell=0") >= 0,
    "The normal logged-on-user script path must be reused.");
assert.ok(transformed.cmd.indexOf("No interactive Windows user session was found.") >= 0 &&
    transformed.cmd.indexOf("SessionId -gt 0") >= 0, "No logged-on user must not fall through to Session 0.");
assert.ok(transformed.cmd.indexOf("if($exitCode -ne 0){throw") >= 0,
    "A failed command must propagate a nonzero result to existing Results.");
var payload = /\$commandPath,\[Convert\]::FromBase64String\('([^']+)'\)/.exec(transformed.cmd);
assert.ok(payload, "The launcher must include the preset's script body.");
assert.strictEqual(Buffer.from(payload[1], "base64").toString("utf8").replace(/^\uFEFF/, ""), odbc.cmd,
    "The existing launcher must transport the exact trusted ODBC command.");

assert.ok(source.indexOf('if (payload.commandId) requireCommandAccess(user, payload.commandId);') >= 0 &&
    source.indexOf('var accessible = requireCommandAccess(user, value.commandId).command;') >= 0 &&
    source.indexOf('requireCommandRights: true') >= 0,
    "Existing folder, execute and device command rights must still guard the preset.");
assert.ok(source.indexOf('result.showOnDesktop = override.showOnDesktop !== false;') >= 0 &&
    source.indexOf('["system", "other"].indexOf(String(categoryKey || "")) < 0') >= 0,
    "The preset must retain standard desktop and no-desktop visibility defaults.");

if (process.argv.indexOf("--print-script") >= 0) process.stdout.write(odbc.cmd);
else console.log("ODBC 32-bit command catalog, UAC and negative-path contracts: OK");
