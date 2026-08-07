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

var panel = entry("network-settings");
var properties = entry("network-adapter-properties");
assert.ok(panel.indexOf('label: "Network Connections"') >= 0 && panel.indexOf('label: "Panel Sieciowy"') >= 0,
    "Existing network-settings ID must become Network Connections / Panel Sieciowy.");
assert.ok(panel.indexOf('runAsUser: 2') >= 0 && panel.indexOf('control.exe ncpa.cpl') >= 0,
    "Network panel must run in the interactive user context and open native Network Connections.");
["Get-NetRoute", "Get-NetAdapter", "Start-Sleep", "InvokeVerb"].forEach(function (fragment) {
    assert.strictEqual(panel.indexOf(fragment), -1, "Network panel must not perform adapter-property automation: " + fragment);
});

assert.ok(properties.indexOf('label: "Network Adapter Properties"') >= 0 && properties.indexOf('label: "Właściwości Sieciowe"') >= 0,
    "New adapter-properties command must expose unambiguous EN/PL labels.");
assert.ok(properties.indexOf('runAsUser: 2') >= 0,
    "Adapter properties must run in the interactive user context.");
assert.ok(properties.indexOf("DestinationPrefix '0.0.0.0/0'") >= 0 && properties.indexOf("DestinationPrefix '::/0'") >= 0,
    "Adapter properties must prefer IPv4 default route and use IPv6 only as fallback.");
assert.ok(properties.indexOf("([long]$_.RouteMetric)+([long]$_.InterfaceMetric)") >= 0 &&
    properties.indexOf("InterfaceMetric,RouteMetric,InterfaceIndex") >= 0,
    "Default route selection must be deterministic by route + interface metric with InterfaceIndex tie-break.");
assert.ok(properties.indexOf('Get-NetAdapter -InterfaceIndex $route.InterfaceIndex') >= 0,
    "Selected route must map to exactly its interface index.");
assert.ok(properties.indexOf('$shell.Namespace(3)') >= 0 && properties.indexOf("$item.InvokeVerb('properties')") >= 0,
    "Adapter properties must invoke the properties verb directly for the resolved connection.");
assert.ok(properties.indexOf("throw 'No active default route was found.'") >= 0,
    "No default route must be a controlled error, not a random adapter fallback.");
assert.strictEqual(properties.indexOf('Start-Sleep'), -1,
    "Adapter properties must not depend on a fixed UI delay.");
assert.strictEqual(properties.indexOf('control.exe ncpa.cpl'), -1,
    "Showing Network Connections alone must not count as adapter-properties success.");

assert.ok(server.indexOf('locales: command.locales || {}') >= 0,
    "Public catalog must carry command locales so Quick and My Commands share labels.");
assert.ok(commands.indexOf('"Network Connections": "Panel Sieciowy"') >= 0 &&
    commands.indexOf('"Network Adapter Properties": "Właściwości Sieciowe"') >= 0,
    "My Commands PL map must match the split catalog labels.");
assert.ok(commands.indexOf('ICONS["network-adapter-properties"] = ICONS["network-settings"]') >= 0,
    "My Commands must reuse the existing Network artwork for the new command.");
assert.ok(quick.indexOf('artwork["network-adapter-properties"] = artwork["network-settings"]') >= 0,
    "Quick must reuse the same existing Network artwork without duplicating SVG.");
assert.strictEqual((server.match(/id: "network-settings"/g) || []).length, 1,
    "Existing network-settings ID must remain unique so overrides/Favorites are preserved.");
console.log("Network panel and active-adapter properties are separate deterministic commands: OK");
