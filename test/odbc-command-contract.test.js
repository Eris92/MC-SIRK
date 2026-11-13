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
assert.strictEqual(existingCmd.type, 1, "Existing CMD must keep native execution.");
assert.strictEqual(odbc.type, existingCmd.type, "ODBC must use the native CMD command type.");
assert.strictEqual(odbc.runAsUser, existingCmd.runAsUser, "ODBC must use the native interactive user session.");
assert.strictEqual(odbc.nativeInteractiveGui, true, "ODBC must explicitly opt into the trusted native interactive launcher.");
assert.notStrictEqual(odbc.elevatedUserSession, true, "Do not combine UAC with scheduled-task elevation.");
assert.ok(/^powershell\.exe -NoProfile -WindowStyle Hidden -Command "/.test(odbc.cmd),
    "The short UAC launcher must run synchronously through the native CMD transport.");
assert.ok(odbc.cmd.indexOf("start \"\"") < 0 && odbc.cmd.indexOf("-NonInteractive") < 0,
    "Native CMD start hides exit codes; UAC must remain interactive and synchronous.");
var commandMatch = /-Command "([^"\r\n]+)"/.exec(odbc.cmd);
assert.ok(commandMatch, "ODBC must embed exactly one quoted PowerShell command.");
var odbcPowerShell = commandMatch[1];
assert.ok(odbcPowerShell.indexOf("SysWOW64\\odbcad32.exe") >= 0, "ODBC must resolve the 32-bit executable.");
assert.ok(odbcPowerShell.indexOf("System32\\odbcad32.exe") < 0, "Never select the 64-bit ODBC administrator.");
assert.ok(odbcPowerShell.indexOf("[Environment+SpecialFolder]::Windows") >= 0,
    "Only the OS Windows directory, without user-controlled path or arguments.");
assert.ok(odbcPowerShell.indexOf("Test-Path -LiteralPath $odbc -PathType Leaf") >= 0 &&
    odbcPowerShell.indexOf("executable was not found") >= 0, "Missing executable must fail clearly.");
assert.ok(odbcPowerShell.indexOf("Start-Process -FilePath $odbc -Verb RunAs -PassThru -ErrorAction Stop") >= 0 &&
    odbcPowerShell.indexOf("catch{throw") >= 0, "UAC denial and launch errors must propagate.");
assert.ok(odbcPowerShell.indexOf("-Wait") < 0, "Do not block on the ODBC GUI lifetime.");

assert.strictEqual(policy.isNativeGuiLauncher(existingCmd), true, "CMD must retain native GUI routing.");
assert.strictEqual(policy.isNativeGuiLauncher(odbc), true, "Trusted ODBC must use the same native user context as CMD.");
assert.strictEqual(policy.transformCommand(odbc), odbc, "ODBC must avoid a scheduled-task runner.");
assert.strictEqual(policy.transformCommand(existingCmd), existingCmd, "CMD must be unchanged.");
var forged = Object.assign({}, odbc, { nativeInteractiveGui: false });
assert.strictEqual(policy.isNativeGuiLauncher(forged), false, "Untrusted commands cannot opt into native GUI execution.");
assert.strictEqual(policy.transformCommand(forged).runAsUser, 0,
    "Untrusted PowerShell bodies must retain the normal guarded logged-on-user launcher.");
assert.ok(source.indexOf('nativeInteractiveGui: found.command.nativeInteractiveGui === true') >= 0,
    "Only the server-resolved canonical preset may set the trusted native GUI marker.");
assert.ok(source.indexOf('return { label: payload.label || "Custom command"') >= 0 &&
    source.indexOf('nativeInteractiveGui: Number(payload') < 0,
    "Custom command payloads must not be able to set the trusted GUI marker.");

assert.ok(source.indexOf('if (payload.commandId) requireCommandAccess(user, payload.commandId);') >= 0 &&
    source.indexOf('var accessible = requireCommandAccess(user, value.commandId).command;') >= 0 &&
    source.indexOf('requireCommandRights: true') >= 0,
    "Existing folder, execute and device command rights must still guard the preset.");
assert.ok(source.indexOf('result.showOnDesktop = override.showOnDesktop !== false;') >= 0 &&
    source.indexOf('["system", "other"].indexOf(String(categoryKey || "")) < 0') >= 0,
    "The preset must retain standard desktop and no-desktop visibility defaults.");

if (process.argv.indexOf("--print-script") >= 0) process.stdout.write(odbcPowerShell);
else if (process.argv.indexOf("--print-cmd") >= 0) process.stdout.write(odbc.cmd);
else console.log("ODBC 32-bit command catalog, UAC and negative-path contracts: OK");
