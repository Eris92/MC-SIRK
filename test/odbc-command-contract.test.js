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
var existingCmd = catalog.system.commands.filter(function (item) { return item.id === "cmd"; })[0];
assert.strictEqual(existingCmd.type, 1, "Existing CMD must remain a native interactive command.");
assert.strictEqual(odbc.type, existingCmd.type, "ODBC must follow the existing native CMD-style GUI launch contract.");
assert.strictEqual(odbc.runAsUser, existingCmd.runAsUser, "ODBC must use the same native interactive-user context as CMD.");
assert.notStrictEqual(odbc.elevatedUserSession, true, "Do not silently elevate the scheduled task.");
assert.ok(/^start "" \/B \/WAIT powershell\.exe -NoProfile -Command "/.test(odbc.cmd),
    "ODBC must use CMD-style native start with bounded wait for the UAC launcher.");
assert.ok(/\r\nif errorlevel 1 \(echo ODBC 32-bit launch failed\. & exit \/b 1\)/.test(odbc.cmd),
    "Denied UAC or failed launch must propagate nonzero status.");
assert.ok(/\r\necho ODBC \(32-bit\) launched\.$/.test(odbc.cmd),
    "Success must be reported only after the native launch helper exits successfully.");
assert.ok(odbc.cmd.indexOf(" -NonInteractive") < 0,
    "An interactive UAC prompt must not be launched from a NonInteractive PowerShell host.");
var commandMatch = /-Command "([^"\r\n]+)"/.exec(odbc.cmd);
assert.ok(commandMatch, "ODBC must include a single PowerShell command with no nested CMD quoting.");
var odbcPowerShell = commandMatch[1];
assert.ok(odbcPowerShell.indexOf("SysWOW64\\odbcad32.exe") >= 0, "ODBC must resolve the 32-bit executable.");
assert.ok(odbcPowerShell.indexOf("System32\\odbcad32.exe") < 0, "Never select the 64-bit ODBC administrator.");
assert.ok(odbcPowerShell.indexOf("[Environment+SpecialFolder]::Windows") >= 0,
    "The path must come from the OS Windows directory, without user input.");
assert.ok(odbcPowerShell.indexOf("Test-Path -LiteralPath $odbc -PathType Leaf") >= 0 &&
    odbcPowerShell.indexOf("executable was not found") >= 0, "Missing executable must fail clearly.");
assert.ok(odbcPowerShell.indexOf("Start-Process -FilePath $odbc -Verb RunAs -PassThru -ErrorAction Stop") >= 0 &&
    odbcPowerShell.indexOf("catch{throw") >= 0, "UAC rejection must fail the native command.");
assert.ok(odbcPowerShell.indexOf("-Wait") < 0, "Do not wait for the ODBC GUI to close.");

assert.strictEqual(policy.isNativeGuiLauncher(existingCmd), true, "CMD must retain native GUI routing.");
assert.strictEqual(policy.isNativeGuiLauncher(odbc), true, "ODBC must use the exact same native route as CMD.");
assert.strictEqual(policy.transformCommand(odbc), odbc,
    "Do not insert the short-lived scheduled-task launcher for the ODBC GUI.");
assert.strictEqual(policy.transformCommand(existingCmd), existingCmd,
    "The existing CMD launcher must remain untouched.");

assert.ok(source.indexOf('if (payload.commandId) requireCommandAccess(user, payload.commandId);') >= 0 &&
    source.indexOf('var accessible = requireCommandAccess(user, value.commandId).command;') >= 0 &&
    source.indexOf('requireCommandRights: true') >= 0,
    "Existing folder, execute and device command rights must still guard the preset.");
assert.ok(source.indexOf('result.showOnDesktop = override.showOnDesktop !== false;') >= 0 &&
    source.indexOf('["system", "other"].indexOf(String(categoryKey || "")) < 0') >= 0,
    "The preset must retain standard desktop and no-desktop visibility defaults.");

if (process.argv.indexOf("--print-script") >= 0) process.stdout.write(odbcPowerShell);
else console.log("ODBC 32-bit command catalog, UAC and negative-path contracts: OK");
