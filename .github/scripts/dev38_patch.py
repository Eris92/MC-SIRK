from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Unexpected {label} count: {count}")
    return text.replace(old, new, 1)


def replace_slice(text, start_marker, end_marker, replacement, label):
    start = text.find(start_marker)
    if start < 0:
        raise RuntimeError(f"Missing start marker: {label}")
    end = text.find(end_marker, start)
    if end < 0:
        raise RuntimeError(f"Missing end marker: {label}")
    return text[:start] + replacement + text[end:]

# #128: remove the module-local interactive launcher and preserve runAsUser:2
# so server/core/logged-on-user-command-policy.js remains the single user-session owner.
server_path = Path("server/modules/commands/index.js")
server = server_path.read_text(encoding="utf-8")
start = server.find("    function desktopLaunch(commandText) {")
end = server.find("    function injectVariables(commandText", start)
if start < 0 or end < 0 or end <= start:
    raise RuntimeError("Module-local interactive launcher block was not found")
server = server[:start] + server[end:]
old_build = "            if (Number(found.command.runAsUser) === 2) return { label: found.command.label, cmd: interactiveDesktopCommand(commandText, found.command.label), type: 2, runAsUser: 0 };\n            return { label: found.command.label, cmd: commandText, type: Number(found.command.type) || 1, runAsUser: Number(found.command.runAsUser) || 0 };"
new_build = "            return { label: found.command.label, cmd: commandText, type: Number(found.command.type) || 1, runAsUser: Number(found.command.runAsUser) || 0 };"
server = replace_once(server, old_build, new_build, "built-in runAsUser pre-wrapper")
server_path.write_text(server, encoding="utf-8")

network_test_path = Path("test/network-command-split.test.js")
network_test = network_test_path.read_text(encoding="utf-8")
launcher_regression = '''assert.strictEqual(server.indexOf('function interactiveDesktopCommand('), -1,
    "Commands module must not keep a second interactive launcher beside the shared logged-on-user policy.");
assert.strictEqual(server.indexOf("$taskName='SIRK-Desktop-'"), -1,
    "Built-in runAsUser:2 commands must not be rewritten into the legacy interactive-SYSTEM launcher marker.");
assert.ok(server.indexOf('return { label: found.command.label, cmd: commandText, type: Number(found.command.type) || 1, runAsUser: Number(found.command.runAsUser) || 0 };') >= 0,
    "Built-in command execution must preserve canonical runAsUser/type so the shared policy owns the user-session launch.");

'''
network_test = replace_slice(
    network_test,
    "assert.ok(server.indexOf('windowStyle:",
    "assert.ok(server.indexOf('locales: command.locales || {}')",
    launcher_regression,
    "network duplicate-launcher regression",
)
network_test_path.write_text(network_test, encoding="utf-8")

# Target the canonical logged-on-user owner with the exact CMD -> hidden PowerShell shape.
policy_test_path = Path("test/logged-on-user-command-policy.test.js")
policy_test = policy_test_path.read_text(encoding="utf-8")
legacy_marker = '''var legacyUserCmd = {
    label: "Legacy user command",
    type: 1,
    runAsUser: 1,
    cmd: "whoami && echo %APPDATA%"
};'''
network_fixture = '''var networkSettingsCmd = {
    label: "Network Settings",
    type: 1,
    runAsUser: 2,
    cmd: 'start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "$verb.DoIt()"'
};
'''
policy_test = replace_once(policy_test, legacy_marker, network_fixture + legacy_marker, "Network Settings policy fixture")
chain_marker = '''    .then(function () {
        return device.sendRunCommands({ nodeId: "node/domain/user" }, legacyUserCmd, "user-cmd", 7);
    })'''
chain_replacement = '''    .then(function () {
        return device.sendRunCommands({ nodeId: "node/domain/network" }, networkSettingsCmd, "network-settings", 7);
    })
''' + chain_marker
policy_test = replace_once(policy_test, chain_marker, chain_replacement, "Network Settings policy invocation")
policy_test = replace_once(
    policy_test,
    'assert.strictEqual(captured.length, 3, "All commands must reach the MeshAgent transport.");',
    'assert.strictEqual(captured.length, 4, "All commands must reach the MeshAgent transport.");',
    "policy capture count",
)
assertion_marker = '''        var transformedCmd = captured[1].command;
        assert.strictEqual(transformedCmd.runAsUser, 0,
            "Legacy runAsUser 1 commands must use the reliable user-session launcher.");'''
network_assertions = '''        var transformedNetwork = captured[1].command;
        assert.strictEqual(transformedNetwork.runAsUser, 0,
            "Network Settings transport wrapper must become LocalSystem only after the shared user-session policy owns the launch.");
        assert.strictEqual(transformedNetwork.type, 2,
            "Network Settings must use the shared PowerShell launcher wrapper.");
        assert.strictEqual(transformedNetwork.cmd.indexOf("SIRK-Desktop-"), -1,
            "Network Settings must not enter the legacy interactive-SYSTEM launcher path.");
        assert.ok(decodedPayloads(transformedNetwork.cmd).some(function (value) {
            return value.indexOf('start "" powershell.exe -NoProfile -WindowStyle Hidden') >= 0 && value.indexOf("$verb.DoIt()") >= 0;
        }), "The shared logged-on-user owner must preserve the Network Settings CMD body exactly.");

        var transformedCmd = captured[2].command;
        assert.strictEqual(transformedCmd.runAsUser, 0,
            "Legacy runAsUser 1 commands must use the reliable user-session launcher.");'''
policy_test = replace_once(policy_test, assertion_marker, network_assertions, "Network Settings shared-owner assertions")
policy_test = replace_once(
    policy_test,
    "        assert.strictEqual(captured[2].command, systemCommand,\n            \"SYSTEM commands must remain unchanged.\");",
    "        assert.strictEqual(captured[3].command, systemCommand,\n            \"SYSTEM commands must remain unchanged.\");",
    "SYSTEM capture index",
)
policy_test_path.write_text(policy_test, encoding="utf-8")

# #237: MeshCentral itself owns xxAddAgentModalConf sizing. Results must not force modal-xl.
results_path = Path("public/shared/ui/results.js")
results = results_path.read_text(encoding="utf-8")
results = replace_once(
    results,
    'if (manager.mode === "modern") manager.setContent("xxAddAgent", title, contentHtml, "extra-large");',
    'if (manager.mode === "modern") manager.setContent("xxAddAgent", title, contentHtml);',
    "Results modal-xl override",
)
results_path.write_text(results, encoding="utf-8")

native_test_path = Path("test/results-viewer-native-dialog.test.js")
native_test = native_test_path.read_text(encoding="utf-8")
old_native = '''assert.ok(source.indexOf('manager.setContent("xxAddAgent", title, contentHtml, "extra-large")') >= 0 &&
    source.indexOf('manager.show("xxAddAgentModal", "idx_dlgOkButton")') >= 0,
    "Modern Results viewer must provide MeshCentral's required OK-button id so showModal returns and live result mounting can continue.");'''
new_native = '''assert.ok(source.indexOf('manager.setContent("xxAddAgent", title, contentHtml)') >= 0 &&
    source.indexOf('manager.show("xxAddAgentModal", "idx_dlgOkButton")') >= 0,
    "Modern Results viewer must reuse MeshCentral's default native dialog geometry and required OK-button contract.");
assert.strictEqual(source.indexOf('"extra-large"'), -1,
    "Results must not force modal-xl on MeshCentral's xxAddAgentModalConf geometry owner.");'''
native_test = replace_once(native_test, old_native, new_native, "Results native geometry regression")
native_test_path.write_text(native_test, encoding="utf-8")

stable_test_path = Path("test/results-viewer-stable-content.test.js")
stable_test = stable_test_path.read_text(encoding="utf-8")
marker = '''assert.strictEqual(css.indexOf('.mc-results-viewer-overlay{'), -1,
    "Removed plugin-owned Results overlay CSS must not return once MeshCentral owns the modal.");'''
addition = marker + '''
assert.strictEqual(source.indexOf('"extra-large"'), -1,
    "Results renderer must not resize the native MeshCentral dialog owner after real dev.37 showed child CSS was not the visible geometry owner.");'''
stable_test = replace_once(stable_test, marker, addition, "Results host geometry negative regression")
stable_test_path.write_text(stable_test, encoding="utf-8")
