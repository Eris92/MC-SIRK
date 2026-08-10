from pathlib import Path
import re


def replace_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, lambda _m: replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"Patch target count for {label}: {count}")
    return updated


# #128: only operational adapters are eligible; execute the real Shell verb.
server_path = Path("server/modules/commands/index.js")
server = server_path.read_text(encoding="utf-8")
marker = '{ id: "network-adapter-properties"'
start = server.index(marker)
end = server.index('\n                { id: "dns"', start)
block = server[start:end]

route_replacement = "$pickRoute={param($prefix);Get-NetRoute -DestinationPrefix $prefix -ErrorAction SilentlyContinue|Where-Object{$_.State -eq 'Alive'}|ForEach-Object{$routeCandidate=$_;$adapterCandidate=Get-NetAdapter -InterfaceIndex $routeCandidate.InterfaceIndex -ErrorAction SilentlyContinue;if($adapterCandidate -and $adapterCandidate.Status -eq 'Up'){[PSCustomObject]@{Route=$routeCandidate;Adapter=$adapterCandidate}}}|Sort-Object @{Expression={([long]$_.Route.RouteMetric)+([long]$_.Route.InterfaceMetric)};Ascending=$true},@{Expression={$_.Route.InterfaceMetric};Ascending=$true},@{Expression={$_.Route.RouteMetric};Ascending=$true},@{Expression={$_.Route.InterfaceIndex};Ascending=$true}|Select-Object -First 1};$selected=&$pickRoute '0.0.0.0/0';if(-not $selected){$selected=&$pickRoute '::/0'};if(-not $selected){throw 'No active default route with an Up adapter was found.'};$route=$selected.Route;$adapter=$selected.Adapter;"
block = replace_once(
    block,
    r"\$route=Get-NetRoute -DestinationPrefix '0\.0\.0\.0/0'.*?\$adapter=Get-NetAdapter -InterfaceIndex \$route\.InterfaceIndex -ErrorAction Stop;",
    route_replacement,
    "operational route selection",
)

verb_replacement = "$verbs=@($item.Verbs());$verb=$verbs|Where-Object{$name=($_.Name -replace '&','').Trim();$name -match '^(Properties|Właściwości)$'}|Select-Object -First 1;if(-not $verb){throw ('Properties/Właściwości verb was not found for network connection: '+$adapter.Name)};$verb.DoIt()"
block = replace_once(
    block,
    r"\$source=\[Text\.Encoding\]::UTF8\.GetString\(\[Convert\]::FromBase64String\('[A-Za-z0-9+/=]+'\)\);Add-Type -TypeDefinition \$source -ErrorAction Stop;\[SirkNetworkShell\]::ShowProperties\(\$item\)",
    verb_replacement,
    "FolderItemVerb execution",
)
server = server[:start] + block + server[end:]
server_path.write_text(server, encoding="utf-8")

network_test_path = Path("test/network-command-split.test.js")
network_test = network_test_path.read_text(encoding="utf-8")
test_start = network_test.index('assert.ok(properties.indexOf("DestinationPrefix')
test_end = network_test.index("assert.ok(server.indexOf('windowStyle", test_start)
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

'''
network_test = network_test[:test_start] + contract + network_test[test_end:]
network_test = network_test.replace(
    'console.log("Network panel and active-adapter properties use the synchronous Windows Shell PIDL properties contract: OK");',
    'console.log("Network panel and active-adapter properties use an operational adapter and the real Windows Shell Properties verb: OK");',
)
network_test_path.write_text(network_test, encoding="utf-8")

# #237: native MeshCentral modal owns outer surface and viewport geometry.
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
    raise RuntimeError("Unexpected Results test source line count")
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
    "MeshThemeAdapter must not turn the Results content root into a second card/surface inside the native modal.");
assert.ok(themeSource.indexOf('PLUGIN_ROOT_SELECTOR') >= 0 && themeSource.indexOf('.mc-results-viewer') >= 0,
    "Results must remain a plugin root so native controls/tables inside it still receive shared theme ownership.");

console.log("Results viewer first paint is final, structured output is tabular, Debug preserves full raw output and native modal owns outer geometry: OK");'''
if results_test.count(old_log) != 1:
    raise RuntimeError("Unexpected Results test completion marker count")
results_test = results_test.replace(old_log, geometry_assertions, 1)
results_test_path.write_text(results_test, encoding="utf-8")
