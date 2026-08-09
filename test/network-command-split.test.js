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
assert.ok(properties.indexOf("DestinationPrefix '0.0.0.0/0'") >= 0 && properties.indexOf("DestinationPrefix '::/0'") >= 0,
    "Adapter properties must prefer IPv4 default route and use IPv6 only as fallback.");
assert.ok(properties.indexOf("([long]$_.RouteMetric)+([long]$_.InterfaceMetric)") >= 0 &&
    properties.indexOf("InterfaceMetric,RouteMetric,InterfaceIndex") >= 0,
    "Default route selection must be deterministic by route + interface metric with InterfaceIndex tie-break.");
assert.ok(properties.indexOf('Get-NetAdapter -InterfaceIndex $route.InterfaceIndex') >= 0,
    "Selected route must map to exactly its interface index.");
assert.ok(properties.indexOf('$shell.Namespace(49)') >= 0 &&
    properties.indexOf("$item=$folder.Items()|Where-Object{$_.Name -eq $adapter.Name}|Select-Object -First 1") >= 0,
    "Adapter properties must enumerate Network Connections and resolve the exact live adapter item selected by InterfaceIndex.");
assert.strictEqual(properties.indexOf("$item.InvokeVerb('properties')"), -1,
    "The dev.34 locale-sensitive FolderItem.InvokeVerb('properties') path must not return.");
assert.strictEqual(properties.indexOf("$shell.Namespace('shell:ConnectionsFolder')"), -1,
    "The ineffective dev.33 shell:ConnectionsFolder NameSpace input must not return.");
assert.strictEqual(properties.indexOf('$shell.Namespace(3)'), -1,
    "Adapter properties must never enumerate Shell special folder 3 because it is Control Panel, not Network Connections.");
assert.ok(properties.indexOf("throw 'No active default route was found.'") >= 0,
    "No default route must be a controlled error, not a random adapter fallback.");
assert.strictEqual(properties.indexOf('Start-Sleep'), -1,
    "Adapter properties must not depend on a fixed UI delay.");
assert.strictEqual(properties.indexOf('control.exe ncpa.cpl'), -1,
    "Showing Network Connections alone must not count as adapter-properties success.");

var interopMatch = /FromBase64String\('([A-Za-z0-9+/=]+)'\)/.exec(properties);
assert.ok(interopMatch,
    "Network Settings must carry one bounded embedded Shell interop payload inside the existing command owner.");
var interop = Buffer.from(interopMatch[1], "base64").toString("utf8");
assert.ok(properties.indexOf('Add-Type -TypeDefinition $source -ErrorAction Stop') >= 0 &&
    properties.indexOf('[SirkNetworkShell]::ShowProperties($item)') >= 0,
    "The resolved Network Connection FolderItem must be passed directly to the bounded Shell interop implementation.");
assert.ok(interop.indexOf('SHGetIDListFromObject') >= 0 &&
    interop.indexOf('[MarshalAs(UnmanagedType.IUnknown)] object punk') >= 0,
    "Shell interop must obtain the PIDL from the already-resolved Network Connection FolderItem; this contract was verified on Windows Server 2025.");
assert.ok(interop.indexOf('ShellExecuteEx') >= 0 &&
    interop.indexOf('info.fMask = 0x0000000C') >= 0 &&
    interop.indexOf('info.lpVerb = "properties"') >= 0 &&
    interop.indexOf('info.lpIDList = pidl') >= 0,
    "Adapter properties must invoke the canonical Shell properties verb with SEE_MASK_INVOKEIDLIST on the resolved PIDL.");
assert.ok(interop.indexOf('CoTaskMemFree(pidl)') >= 0 &&
    interop.indexOf('Marshal.GetLastWin32Error()') >= 0,
    "Shell interop must free the PIDL and surface a ShellExecuteEx failure instead of silently falling back.");

assert.ok(server.indexOf('windowStyle: /(?:^|\\s)-WindowStyle\\s+Hidden') >= 0,
    "Interactive desktop launcher must preserve an explicitly hidden PowerShell helper instead of forcing a visible console window.");
assert.ok(server.indexOf('shell.Run \\\"" + launchLine.replace(/"/g, \'""\') + "\\\", " + launch.windowStyle + ", False') >= 0,
    "VBS must use the parsed window style rather than hardcoding a visible window.");
assert.ok(server.indexOf('If " + launch.windowStyle + " = 0 Then') >= 0,
    "A hidden helper must exit the VBS focus loop immediately instead of trying to activate its PowerShell window.");

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
console.log("Network panel and active-adapter properties use the Windows-verified PIDL Shell properties contract: OK");