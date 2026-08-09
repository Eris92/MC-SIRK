"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var server = fs.readFileSync(path.join(root, "server/modules/commands/index.js"), "utf8");
var commands = fs.readFileSync(path.join(root, "public/modules/commands/index.js"), "utf8");
var quick = fs.readFileSync(path.join(root, "public/native/desktop-commands.js"), "utf8");

function entry(id) {
    var marker = '{ id: "' + id + '"';
    var start = server.indexOf(marker);
    assert.ok(start >= 0, "Missing command " + id);
    var end = server.indexOf('\n                { id:', start + marker.length);
    if (end < 0) end = server.indexOf('\n            ]', start + marker.length);
    return server.slice(start, end);
}

var powershell = entry("powershell");
var cmd = entry("cmd");
var networkControl = entry("network-settings");
var networkSettings = entry("network-adapter-properties");

assert.ok(powershell.indexOf('label: "PowerShell"') >= 0 && powershell.indexOf('runAsUser: 2') >= 0 && powershell.indexOf('powershell.exe -NoExit') >= 0,
    "PowerShell must use the short canonical label without changing interactive execution.");
assert.ok(cmd.indexOf('label: "CMD"') >= 0 && cmd.indexOf('runAsUser: 2') >= 0 && cmd.indexOf('cmd.exe /K') >= 0,
    "CMD must use the short canonical label without changing interactive execution.");
assert.strictEqual(server.indexOf('label: "Open PowerShell"'), -1, "Obsolete Open PowerShell label must be removed from the canonical catalog.");
assert.strictEqual(server.indexOf('label: "Open CMD"'), -1, "Obsolete Open CMD label must be removed from the canonical catalog.");
assert.strictEqual(commands.indexOf('"Open PowerShell": "Otwórz PowerShell"'), -1, "Obsolete PL PowerShell alias must not survive in My Commands.");
assert.strictEqual(commands.indexOf('"Open CMD": "Otwórz CMD"'), -1, "Obsolete PL CMD alias must not survive in My Commands.");

assert.ok(networkControl.indexOf('label: "Network Control"') >= 0 && networkControl.indexOf('control.exe ncpa.cpl') >= 0,
    "network-settings must keep its stable ID/execution while becoming Network Control.");
assert.ok(networkSettings.indexOf('label: "Network Settings"') >= 0 && networkSettings.indexOf('Get-NetRoute') >= 0 &&
    networkSettings.indexOf('Get-NetAdapter -InterfaceIndex $route.InterfaceIndex') >= 0 &&
    networkSettings.indexOf('[SirkNetworkShell]::ShowProperties($item)') >= 0,
    "network-adapter-properties must keep its route-selected adapter-properties execution while becoming Network Settings.");
assert.strictEqual((server.match(/id: "network-settings"/g) || []).length, 1, "network-settings stable ID must remain unique.");
assert.strictEqual((server.match(/id: "network-adapter-properties"/g) || []).length, 1, "network-adapter-properties stable ID must remain unique.");
assert.ok(server.indexOf('locales: command.locales || {}') >= 0, "Public catalog must still carry locales to all consumers.");
assert.ok(quick.indexOf('function localized(item, field)') >= 0, "Quick must keep consuming canonical catalog locales rather than a Quick-only label map.");
assert.strictEqual(quick.indexOf('Network Connections'), -1, "Quick must not hardcode the obsolete Network Connections label.");
assert.strictEqual(quick.indexOf('Network Adapter Properties'), -1, "Quick must not hardcode the obsolete adapter-properties label.");
assert.strictEqual(quick.indexOf('Open PowerShell'), -1, "Quick must not hardcode the obsolete PowerShell label.");
assert.strictEqual(quick.indexOf('Open CMD'), -1, "Quick must not hardcode the obsolete CMD label.");

console.log("Canonical short command labels preserve stable IDs and execution: OK");