from pathlib import Path


def replace_slice(text, start_marker, end_marker, replacement, label):
    start = text.find(start_marker)
    if start < 0:
        raise RuntimeError(f"Start marker not found: {label}")
    end_start = text.find(end_marker, start)
    if end_start < 0:
        raise RuntimeError(f"End marker not found: {label}")
    end = end_start + len(end_marker)
    return text[:start] + replacement + text[end:]


# #128 — exact command owner only.
server_path = Path("server/modules/commands/index.js")
server = server_path.read_text(encoding="utf-8")
command_start = server.find('{ id: "network-adapter-properties"')
command_end = server.find('\n                { id: "dns"', command_start)
if command_start < 0 or command_end < 0:
    raise RuntimeError("network-adapter-properties command block not found")
block = server[command_start:command_end]

route_start = "$route=Get-NetRoute -DestinationPrefix '0.0.0.0/0'"
route_end = "$adapter=Get-NetAdapter -InterfaceIndex $route.InterfaceIndex -ErrorAction Stop;"
route_replacement = "$pickRoute={param($prefix);Get-NetRoute -DestinationPrefix $prefix -ErrorAction SilentlyContinue|Where-Object{$_.State -eq 'Alive'}|ForEach-Object{$routeCandidate=$_;$adapterCandidate=Get-NetAdapter -InterfaceIndex $routeCandidate.InterfaceIndex -ErrorAction SilentlyContinue;if($adapterCandidate -and $adapterCandidate.Status -eq 'Up'){[PSCustomObject]@{Route=$routeCandidate;Adapter=$adapterCandidate}}}|Sort-Object @{Expression={([long]$_.Route.RouteMetric)+([long]$_.Route.InterfaceMetric)};Ascending=$true},@{Expression={$_.Route.InterfaceMetric};Ascending=$true},@{Expression={$_.Route.RouteMetric};Ascending=$true},@{Expression={$_.Route.InterfaceIndex};Ascending=$true}|Select-Object -First 1};$selected=&$pickRoute '0.0.0.0/0';if(-not $selected){$selected=&$pickRoute '::/0'};if(-not $selected){throw 'No active default route with an Up adapter was found.'};$route=$selected.Route;$adapter=$selected.Adapter;"
block = replace_slice(block, route_start, route_end, route_replacement, "operational route selection")

interop_start = "$source=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('"
interop_end = "[SirkNetworkShell]::ShowProperties($item)"
verb_replacement = "$verbs=@($item.Verbs());$verb=$verbs|Where-Object{$name=($_.Name -replace '&','').Trim();$name -match '^(Properties|Właściwości)$'}|Select-Object -First 1;if(-not $verb){throw ('Properties/Właściwości verb was not found for network connection: '+$adapter.Name)};$verb.DoIt()"
block = replace_slice(block, interop_start, interop_end, verb_replacement, "FolderItemVerb execution")
server = server[:command_start] + block + server[command_end:]
server_path.write_text(server, encoding="utf-8")

# Targeted #128 regression contract.
network_test_path = Path("test/network-command-split.test.js")
network_test = network_test_path.read_text(encoding="utf-8")
test_start = network_test.find('assert.ok(properties.indexOf("DestinationPrefix')
test_end = network_test.find("assert.ok(server.indexOf('windowStyle", test_start)
if test_start < 0 or test_end < 0:
    raise RuntimeError("network-command-split contract markers not found")
contract = r'''assert.ok(properties.indexOf('$pickRoute={param($prefix);') >= 0 &&
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
    "Operational route selection must remain deterministic by route + interface metric with InterfaceIndex tie-break.");
assert.ok(properties.indexOf('$route=$selected.Route;$adapter=$selected.Adapter') >= 0,
    "The selected route and validated Up adapter must stay paired.");
assert.ok(properties.indexOf('$shell.Namespace(49)') >= 0 &&
    properties.indexOf("$item=$folder.Items()|Where-Object{$_.Name -eq $adapter.Name}|Select-Object -First 1") >= 0,
    "Network Settings must resolve the exact selected Up adapter item in Network Connections.");
assert.ok(properties.indexOf('$verbs=@($item.Verbs())') >= 0 &&
    properties.indexOf("($_.Name -replace '&','').Trim()") >= 0 &&
    properties.indexOf("'^(Properties|Właściwości)$'") >= 0 &&
    properties.indexOf('$verb.DoIt()') >= 0,
    "Network Settings must execute the actual Properties/Właściwości FolderItemVerb proven on the real host.");
assert.strictEqual(properties.indexOf("$item.InvokeVerb('properties')"), -1,
    "The unverified direct InvokeVerb path must not return.");
assert.strictEqual(properties.indexOf('ShellExecuteEx'), -1,
    "The dev.36 ShellExecuteEx false-success path must not return.");
assert.strictEqual(properties.indexOf('SHGetIDListFromObject'), -1,
    "The removed PIDL interop path must not return.");
assert.strictEqual(properties.indexOf('FromBase64String'), -1,
    "The removed embedded C# Shell interop payload must not return.");
assert.strictEqual(properties.indexOf('Add-Type -TypeDefinition'), -1,
    "Network Settings must not compile the removed Shell interop helper.");
assert.strictEqual(properties.indexOf('Start-Sleep'), -1,
    "Adapter properties must not depend on a fixed UI delay.");
assert.strictEqual(properties.indexOf('control.exe ncpa.cpl'), -1,
    "Showing Network Connections alone must not count as adapter-properties success.");
assert.ok(properties.indexOf("throw 'No active default route with an Up adapter was found.'") >= 0,
    "No operational default route must fail explicitly rather than selecting a disconnected adapter.");

'''
network_test = network_test[:test_start] + contract + network_test[test_end:]
network_test = network_test.replace(
    'console.log("Network panel and active-adapter properties use the synchronous Windows Shell PIDL properties contract: OK");',
    'console.log("Network panel and active-adapter properties use an operational adapter and the real Windows Shell Properties verb: OK");',
)
network_test_path.write_text(network_test, encoding="utf-8")

# #237 — native modal owns outer surface/viewport geometry.
css_path = Path("public/shared/ui/shared-ui.css")
css = css_path.read_text(encoding="utf-8")
old_geometry = ".mc-results-viewer-overlay{position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.58)}.mc-results-viewer{width:min(1200px,96vw);max-height:92vh;display:flex;flex-direction:column;box-sizing:border-box;color:inherit}"
new_geometry = ".mc-results-viewer{min-width:0;min-height:0;width:100%;box-sizing:border-box;color:inherit}"
if css.count(old_geometry) != 1:
    raise RuntimeError("Unexpected Results standalone geometry count")
css = css.replace(old_geometry, new_geometry, 1)
css = css.replace(".mc-results-viewer-overlay{padding:8px}", "")
css_path.write_text(css, encoding="utf-8")

theme_path = Path("public/shared/ui/toolbar-config.js")
theme = theme_path.read_text(encoding="utf-8")
old_card = ',.mc-move-dialog,.mc-results-viewer", applyCard);'
new_card = ',.mc-move-dialog", applyCard);'
if theme.count(old_card) != 1:
    raise RuntimeError("Unexpected Results applyCard selector count")
theme = theme.replace(old_card, new_card, 1)
theme_path.write_text(theme, encoding="utf-8")

results_test_path = Path("test/results-viewer-stable-content.test.js")
results_test = results_test_path.read_text(encoding="utf-8")
source_line = 'var source = fs.readFileSync(path.join(root, "public/shared/ui/results.js"), "utf8");'
if results_test.count(source_line) != 1:
    raise RuntimeError("Unexpected Results test source marker count")
results_test = results_test.replace(
    source_line,
    source_line + '\nvar css = fs.readFileSync(path.join(root, "public/shared/ui/shared-ui.css"), "utf8");\nvar themeSource = fs.readFileSync(path.join(root, "public/shared/ui/toolbar-config.js"), "utf8");',
    1,
)
old_log = 'console.log("Results viewer first paint is final, structured output is tabular and Debug preserves full raw output: OK");'
geometry_assertions = r'''var viewerRule = /\.mc-results-viewer\{([^}]*)\}/.exec(css);
assert.ok(viewerRule, "Results viewer content root geometry rule must exist.");
assert.ok(viewerRule[1].indexOf('width:100%') >= 0,
    "Native modal content root must fill the host body instead of owning a second viewport-sized surface.");
['96vw', '92vh', 'max-height:92vh', 'display:flex', 'flex-direction:column'].forEach(function (fragment) {
    assert.strictEqual(viewerRule[1].indexOf(fragment), -1,
        "Native Results modal content root must not retain standalone viewer geometry: " + fragment);
});
assert.strictEqual(css.indexOf('.mc-results-viewer-overlay{'), -1,
    "Removed plugin-owned Results overlay CSS must not return once MeshCentral owns the modal.");
var applyCardLine = themeSource.split('\n').filter(function (line) { return line.indexOf('applyCard);') >= 0 && line.indexOf('.mc-move-dialog') >= 0; })[0] || '';
assert.strictEqual(applyCardLine.indexOf('.mc-results-viewer'), -1,
    "MeshThemeAdapter must not turn Results content into a second card inside the native modal.");
assert.ok(themeSource.indexOf('PLUGIN_ROOT_SELECTOR') >= 0 && themeSource.indexOf('.mc-results-viewer') >= 0,
    "Results must remain a plugin root so child controls and tables still receive native theme ownership.");

console.log("Results viewer first paint is final, structured output is tabular, Debug preserves full raw output and native modal owns outer geometry: OK");'''
if results_test.count(old_log) != 1:
    raise RuntimeError("Unexpected Results test completion marker count")
results_test = results_test.replace(old_log, geometry_assertions, 1)
results_test_path.write_text(results_test, encoding="utf-8")
