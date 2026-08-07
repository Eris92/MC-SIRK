from pathlib import Path
import re


def replace(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"Expected fragment not found in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))


server = Path('server/modules/commands/index.js')
text = server.read_text()
old_pattern = re.compile(r'\s*\{ id: "network-settings", label: "Active network adapter settings".*?\},\n(?=\s*\{ id: "dns")')
match = old_pattern.search(text)
if not match:
    raise SystemExit('network-settings catalog entry not found')
properties_script = (
    "$route=Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue|"
    "Where-Object{$_.State -eq 'Alive'}|"
    "Sort-Object @{Expression={([long]$_.RouteMetric)+([long]$_.InterfaceMetric)};Ascending=$true},InterfaceMetric,RouteMetric,InterfaceIndex|"
    "Select-Object -First 1;"
    "if(-not $route){$route=Get-NetRoute -DestinationPrefix '::/0' -ErrorAction SilentlyContinue|"
    "Where-Object{$_.State -eq 'Alive'}|"
    "Sort-Object @{Expression={([long]$_.RouteMetric)+([long]$_.InterfaceMetric)};Ascending=$true},InterfaceMetric,RouteMetric,InterfaceIndex|"
    "Select-Object -First 1};"
    "if(-not $route){throw 'No active default route was found.'};"
    "$adapter=Get-NetAdapter -InterfaceIndex $route.InterfaceIndex -ErrorAction Stop;"
    "$shell=New-Object -ComObject Shell.Application;"
    "$folder=$shell.Namespace(3);"
    "if(-not $folder){throw 'Network Connections shell folder is unavailable.'};"
    "$item=$folder.Items()|Where-Object{$_.Name -eq $adapter.Name}|Select-Object -First 1;"
    "if(-not $item){throw ('Network connection was not found: '+$adapter.Name)};"
    "$item.InvokeVerb('properties')"
)
# Escape only for the JS double-quoted cmd literal.
js_ps = properties_script.replace('\\', '\\\\').replace('"', '\\"')
replacement = '''
                { id: "network-settings", label: "Network Connections", locales: { pl: { label: "Panel Sieciowy" }, en: { label: "Network Connections" } }, description: "Open the native Network Connections panel.", type: 1, runAsUser: 2, cmd: "start \\\"\\\" control.exe ncpa.cpl" },
                { id: "network-adapter-properties", label: "Network Adapter Properties", locales: { pl: { label: "Właściwości Sieciowe" }, en: { label: "Network Adapter Properties" } }, description: "Open properties for the adapter used by the preferred active default route.", type: 1, runAsUser: 2, cmd: "start \\\"\\\" powershell.exe -NoProfile -WindowStyle Hidden -Command \\\"''' + js_ps + '''\\\"" },
'''
text = text[:match.start()] + replacement + text[match.end():]
server.write_text(text)

# Public catalog must carry command locales for Quick; no separate Quick label table.
replace(
    'server/modules/commands/index.js',
    '''                        label: command.label,
                        description: command.description,
                        variables: publicVariables(command.variables),''',
    '''                        label: command.label,
                        description: command.description,
                        locales: command.locales || {},
                        variables: publicVariables(command.variables),'''
)

# My Commands Polish labels and artwork reuse.
replace(
    'public/modules/commands/index.js',
    '"Flush DNS": "Wyczyść DNS", "Active network adapter settings": "Ustawienia aktywnej karty sieciowej", "Check DNS": "Sprawdź DNS", "Check port": "Sprawdź port",',
    '"Flush DNS": "Wyczyść DNS", "Network Connections": "Panel Sieciowy", "Network Adapter Properties": "Właściwości Sieciowe", "Check DNS": "Sprawdź DNS", "Check port": "Sprawdź port",'
)
replace(
    'public/modules/commands/index.js',
    '''    var MENU_ICONS = {''',
    '''    ICONS["network-adapter-properties"] = ICONS["network-settings"];

    var MENU_ICONS = {'''
)

# Quick uses the same command-id artwork without duplicating SVG and gets label locales from public catalog.
replace(
    'public/native/desktop-commands.js',
    '''        artwork["network-settings"] = '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4M7 9h10M7 13h6"/><circle cx="18" cy="15" r="3"/><path d="M18 10v2M18 18v2M13 15h2M21 15h2"/>';''',
    '''        artwork["network-settings"] = '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4M7 9h10M7 13h6"/><circle cx="18" cy="15" r="3"/><path d="M18 10v2M18 18v2M13 15h2M21 15h2"/>';
        artwork["network-adapter-properties"] = artwork["network-settings"];'''
)

Path('test/network-command-split.test.js').write_text(r'''"use strict";

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
''')
