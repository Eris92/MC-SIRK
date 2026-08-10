from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Unexpected {label} count: {count}")
    return text.replace(old, new, 1)

# #128: built-in runAsUser:2 commands must reach the canonical shared user-session owner.
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
old_launcher_contract = '''assert.ok(server.indexOf('windowStyle: /(?:^|\\\\s)-WindowStyle\\\\s+Hidden') >= 0,
    "Interactive desktop launcher must preserve an explicitly hidden PowerShell helper instead of forcing a visible console window.");
assert.ok(server.indexOf('shell.Run \\\\\\\"" + launchLine.replace(/"/g, \'""\') + "\\\\\\\", " + launch.windowStyle + ", False') >= 0,
    "VBS must use the parsed window style rather than hardcoding a visible window.");
assert.ok(server.indexOf('If " + launch.windowStyle + " = 0 Then') >= 0,
    "A hidden helper must exit the VBS focus loop immediately instead of trying to activate its PowerShell window.");

'''
new_launcher_contract = '''assert.strictEqual(server.indexOf('function interactiveDesktopCommand('), -1,
    "Commands module must not keep a second interactive launcher beside the shared logged-on-user policy.");
assert.strictEqual(server.indexOf("$taskName='SIRK-Desktop-'"), -1,
    "Built-in runAsUser:2 commands must not be rewritten into the legacy interactive-SYSTEM launcher marker.");
assert.ok(server.indexOf('return { label: found.command.label, cmd: commandText, type: Number(found.command.type) || 1, runAsUser: Number(found.command.runAsUser) || 0 };') >= 0,
    "Built-in command execution must preserve canonical runAsUser/type so the shared policy owns the user-session launch.");

'''
network_test = replace_once(network_test, old_launcher_contract, new_launcher_contract, "network duplicate-launcher regression")
network_test_path.write_text(network_test, encoding="utf-8")

# Strengthen the shared owner test with the exact built-in CMD -> hidden PowerShell shape used by Network Settings.
policy_test_path = Path("test/logged-on-user-command-policy.test.js")
policy_test = policy_test_path.read_text(encoding="utf-8")
old_legacy = '''var legacyUserCmd = {
    label: "Legacy user command",
    type: 1,
    runAsUser: 1,
    cmd: "whoami && echo %APPDATA%"
};'''
new_legacy = '''var networkSettingsCmd = {
    label: "Network Settings",
    type: 1,
    runAsUser: 2,
    cmd: "start \\\"\\\" powershell.exe -NoProfile -WindowStyle Hidden -Command \\\"$verb.DoIt()\\\""
};
var legacyUserCmd = {
    label: "Legacy user command",
    type: 1,
    runAsUser: 1,
    cmd: "whoami && echo %APPDATA%"
};'''
policy_test = replace_once(policy_test, old_legacy, new_legacy, "Network Settings shared-policy fixture")
old_chain = '''    .then(function () {
        return device.sendRunCommands({ nodeId: "node/domain/user" }, legacyUserCmd, "user-cmd", 7);
    })
    .then(function () {
        return device.sendRunCommands({ nodeId: "node/domain/system" }, systemCommand, "system", 7);
    })
    .then(function () {
        assert.strictEqual(captured.length, 3, "All commands must reach the MeshAgent transport.");'''
new_chain = '''    .then(function () {
        return device.sendRunCommands({ nodeId: "node/domain/network" }, networkSettingsCmd, "network-settings", 7);
    })
    .then(function () {
        return device.sendRunCommands({ nodeId: "node/domain/user" }, legacyUserCmd, "user-cmd", 7);
    })
    .then(function () {
        return device.sendRunCommands({ nodeId: "node/domain/system" }, systemCommand, "system", 7);
    })
    .then(function () {
        assert.strictEqual(captured.length, 4, "All commands must reach the MeshAgent transport.");'''
policy_test = replace_once(policy_test, old_chain, new_chain, "shared-policy execution chain")
old_transformed_cmd = '''        var transformedCmd = captured[1].command;
        assert.strictEqual(transformedCmd.runAsUser, 0,
            "Legacy runAsUser 1 commands must use the reliable user-session launcher.");
        assert.strictEqual(transformedCmd.type, 2,
            "CMD user commands must also use the PowerShell launcher.");
        assert.ok(decodedPayloads(transformedCmd.cmd).some(function (value) {
            return value.indexOf("whoami && echo %APPDATA%") >= 0;
        }), "The original CMD body must be preserved.");

        assert.strictEqual(captured[2].command, systemCommand,
            "SYSTEM commands must remain unchanged.");'''
new_transformed_cmd = '''        var transformedNetwork = captured[1].command;
        assert.strictEqual(transformedNetwork.runAsUser, 0,
            "Network Settings transport wrapper must run through LocalSystem only after the shared user-session policy owns the launch.");
        assert.strictEqual(transformedNetwork.type, 2,
            "Network Settings must use the shared PowerShell launcher wrapper.");
        assert.strictEqual(transformedNetwork.cmd.indexOf("SIRK-Desktop-"), -1,
            "Network Settings must not enter the legacy interactive-SYSTEM launcher path.");
        assert.ok(decodedPayloads(transformedNetwork.cmd).some(function (value) {
            return value.indexOf("start \\\"\\\" powershell.exe -NoProfile -WindowStyle Hidden") >= 0 && value.indexOf("$verb.DoIt()") >= 0;
        }), "The shared logged-on-user owner must preserve the Network Settings CMD body exactly.");

        var transformedCmd = captured[2].command;
        assert.strictEqual(transformedCmd.runAsUser, 0,
            "Legacy runAsUser 1 commands must use the reliable user-session launcher.");
        assert.strictEqual(transformedCmd.type, 2,
            "CMD user commands must also use the PowerShell launcher.");
        assert.ok(decodedPayloads(transformedCmd.cmd).some(function (value) {
            return value.indexOf("whoami && echo %APPDATA%") >= 0;
        }), "The original CMD body must be preserved.");

        assert.strictEqual(captured[3].command, systemCommand,
            "SYSTEM commands must remain unchanged.");'''
policy_test = replace_once(policy_test, old_transformed_cmd, new_transformed_cmd, "shared Network Settings policy assertions")
policy_test_path.write_text(policy_test, encoding="utf-8")

# #237: MeshCentral owns the modal size; do not force modal-xl from Results.
results_path = Path("public/shared/ui/results.js")
results = results_path.read_text(encoding="utf-8")
results = replace_once(
    results,
    'if (manager.mode === "modern") manager.setContent("xxAddAgent", title, contentHtml, "extra-large");',
    'if (manager.mode === "modern") manager.setContent("xxAddAgent", title, contentHtml);',
    "Results Modern size override",
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

# Existing stable-content test must also reject host-level modal-xl, not only plugin-root vw/vh.
stable_test_path = Path("test/results-viewer-stable-content.test.js")
stable_test = stable_test_path.read_text(encoding="utf-8")
marker = '''assert.strictEqual(css.indexOf('.mc-results-viewer-overlay{'), -1,
    "Removed plugin-owned Results overlay CSS must not return once MeshCentral owns the modal.");'''
addition = marker + '''
assert.strictEqual(source.indexOf('"extra-large"'), -1,
    "Results renderer must not resize the native MeshCentral dialog owner after real dev.37 showed child CSS was not the visible geometry owner.");'''
stable_test = replace_once(stable_test, marker, addition, "Results host geometry negative regression")
stable_test_path.write_text(stable_test, encoding="utf-8")
