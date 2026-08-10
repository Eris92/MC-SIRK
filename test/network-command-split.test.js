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
assert.ok(panel.indexOf('label: "Network Control"') >= 0 &&
    panel.indexOf('locales: { pl: { label: "Network Control" }, en: { label: "Network Control" } }') >= 0,
    "Existing network-settings ID must expose the exact Network Control label in both locales.");
assert.ok(panel.indexOf('runAsUser: 2') >= 0 && panel.indexOf('control.exe ncpa.cpl') >= 0,
    "Network panel must run in the interactive user context and open native Network Connections.");
["Get-NetRoute", "Get-NetAdapter", "Start-Sleep", "InvokeVerb"].forEach(function (fragment) {
    assert.strictEqual(panel.indexOf(fragment), -1, "Network panel must not perform adapter-property automation: " + fragment);
});

assert.ok(properties.indexOf('label: "Network Settings"') >= 0 &&
    properties.indexOf('locales: { pl: { label: "Network Settings" }, en: { label: "Network Settings" } }') >= 0,
    "Adapter-properties command must expose the exact Network Settings label in both locales.");
assert.ok(properties.indexOf('runAsUser: 2') >= 0,
    "Adapter properties must run in the interactive user context.");
assert.ok(properties.indexOf('$pickRoute={param($prefix);') >= 0 &&
    properties.indexOf("$selected=&$pickRoute '0.0.0.0/0'") >= 0 &&
    properties.indexOf("$selected=&$pickRoute '::/0'") >= 0,
    "Adapter properties must prefer IPv4 operational-route candidates and use IPv6 only as fallback.");
assert.ok(properties.indexOf('Get-NetAdapter -InterfaceIndex $routeCandidate.InterfaceIndex -ErrorAction SilentlyContinue') >= 0 &&
    properties.indexOf("$adapterCandidate.Status -eq 'Up'") >= 0,
    "Every default-route candidate must map to an adapter with Status=Up before it can be selected.");
assert.ok(properties.indexOf('([long]$_.Route.RouteMetric)+([long]$_.Route.InterfaceMetric)') >= 0 &&
    properties.indexOf('$_.Route.InterfaceMetric') >= 0 &&
    properties.indexOf('$_.Route.RouteMetric') >= 0 &&
    properties.indexOf('$_.Route.InterfaceIndex') >= 0,
    "Operational default-route selection must remain deterministic by route + interface metric with InterfaceIndex tie-break.");
assert.ok(properties.indexOf('$route=$selected.Route;$adapter=$selected.Adapter') >= 0,
    "The selected route and already-validated Up adapter must stay paired.");
assert.ok(properties.indexOf('$shell.Namespace(49)') >= 0 &&
    properties.indexOf("$item=$folder.Items()|Where-Object{$_.Name -eq $adapter.Name}|Select-Object -First 1") >= 0,
    "Adapter properties must enumerate Network Connections and resolve the exact selected Up adapter item.");
assert.ok(properties.indexOf('$verbs=@($item.Verbs())') >= 0 &&
    properties.indexOf("($_.Name -replace '&','').Trim()") >= 0 &&
    properties.indexOf("'^(Properties|Właściwości)$'") >= 0 &&
    properties.indexOf('$verb.DoIt()') >= 0,
    "Network Settings must execute the actual Properties/Właściwości FolderItemVerb proven on the real Windows host.");
assert.strictEqual(properties.indexOf("$item.InvokeVerb('properties')"), -1,
    "The unverified direct InvokeVerb path must not return.");
assert.strictEqual(properties.indexOf('ShellExecuteEx'), -1,
    "ShellExecuteEx false-success path from dev.36 must not return.");
assert.strictEqual(properties.indexOf('SHGetIDListFromObject'), -1,
    "The obsolete PIDL interop path must not return once the real FolderItem verb owns execution.");
assert.strictEqual(properties.indexOf('FromBase64String'), -1,
    "Network Settings must not carry the removed embedded C# Shell interop payload.");
assert.strictEqual(properties.indexOf('Add-Type -TypeDefinition'), -1,
    "Network Settings must not compile a Shell interop helper after the native FolderItem verb path is proven.");
assert.strictEqual(properties.indexOf("$shell.Namespace('shell:ConnectionsFolder')"), -1,
    "The ineffective dev.33 shell:ConnectionsFolder NameSpace input must not return.");
assert.strictEqual(properties.indexOf('$shell.Namespace(3)'), -1,
    "Adapter properties must never enumerate Shell special folder 3 because it is Control Panel, not Network Connections.");
assert.ok(properties.indexOf("throw 'No active default route with an Up adapter was found.'") >= 0,
    "No operational default route must be a controlled error, not a disconnected-adapter fallback.");
assert.strictEqual(properties.indexOf('Start-Sleep'), -1,
    "Adapter properties must not depend on a fixed UI delay.");
assert.strictEqual(properties.indexOf('control.exe ncpa.cpl'), -1,
    "Showing Network Connections alone must not count as adapter-properties success.");

assert.strictEqual(server.indexOf('function interactiveDesktopCommand('), -1,
    "Commands module must not keep a second interactive launcher beside the shared logged-on-user policy.");
assert.strictEqual(server.indexOf("$taskName='SIRK-Desktop-'"), -1,
    "Built-in runAsUser:2 commands must not be rewritten into the legacy interactive-SYSTEM launcher marker.");
assert.ok(server.indexOf('return { label: found.command.label, cmd: commandText, type: Number(found.command.type) || 1, runAsUser: Number(found.command.runAsUser) || 0 };') >= 0,
    "Built-in command execution must preserve canonical runAsUser/type so the shared policy owns the user-session launch.");

assert.ok(server.indexOf('locales: command.locales || {}') >= 0,
    "Public catalog must carry command locales so Quick and My Commands share labels.");
assert.strictEqual(commands.indexOf('"Network Connections": "Panel Sieciowy"'), -1,
    "My Commands must not retain the obsolete Network Connections PL alias.");
assert.strictEqual(commands.indexOf('"Network Adapter Properties": "Właściwości Sieciowe"'), -1,
    "My Commands must not retain the obsolete adapter-properties PL alias.");
assert.ok(commands.indexOf('ICONS["network-adapter-properties"] = ICONS["network-settings"]') >= 0,
    "My Commands must reuse the existing Network artwork for the new command.");
assert.ok(quick.indexOf('artwork["network-adapter-properties"] = artwork["network-settings"]') >= 0,
    "Quick must reuse the same existing Network artwork without duplicating SVG.");
assert.strictEqual((server.match(/id: "network-settings"/g) || []).length, 1,
    "Existing network-settings ID must remain unique so overrides/Favorites are preserved.");
console.log("Network panel and active-adapter properties use an operational adapter and the real Windows Shell Properties verb: OK");