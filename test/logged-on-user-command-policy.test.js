"use strict";

var assert = require("assert");
var elevatedPolicy = require("../server/core/elevated-quick-command-policy.js");
var policy = require("../server/core/logged-on-user-command-policy.js");

var captured = [];
var device = {
    sendRunCommands: function (context, command, responseId, sessionId) {
        captured.push({ context: context, command: command, responseId: responseId, sessionId: sessionId });
        return Promise.resolve({ state: "sent" });
    }
};
var plugin = { runtime: { context: { device: device } } };

elevatedPolicy.apply(plugin);
policy.apply(plugin);

var userPowerShell = {
    label: "Wallpaper",
    type: 2,
    runAsUser: 2,
    cmd: "whoami\nWrite-Output $env:APPDATA"
};
var networkSettingsCmd = {
    label: "Network Settings",
    type: 2,
    runAsUser: 2,
    elevatedUserSession: true,
    cmd: "$shell=New-Object -ComObject Shell.Application;$folder=$shell.Namespace(49);$verb.DoIt()"
};
var legacyUserCmd = {
    label: "Legacy user command",
    type: 1,
    runAsUser: 1,
    cmd: "whoami && echo %APPDATA%"
};
var systemCommand = {
    label: "SYSTEM command",
    type: 2,
    runAsUser: 0,
    cmd: "whoami"
};

function decodedPayloads(source) {
    var values = [];
    var expression = /FromBase64String\('([^']+)'\)/g;
    var match;
    while ((match = expression.exec(String(source || ""))) !== null) {
        try { values.push(Buffer.from(match[1], "base64").toString("utf8")); }
        catch (error) {}
    }
    return values;
}

Promise.resolve()
    .then(function () {
        return device.sendRunCommands({ nodeId: "node/domain/user" }, userPowerShell, "user-ps", 7);
    })
    .then(function () {
        return device.sendRunCommands({ nodeId: "node/domain/network" }, networkSettingsCmd, "network-settings", 7);
    })
    .then(function () {
        return device.sendRunCommands({ nodeId: "node/domain/user" }, legacyUserCmd, "user-cmd", 7);
    })
    .then(function () {
        return device.sendRunCommands({ nodeId: "node/domain/system" }, systemCommand, "system", 7);
    })
    .then(function () {
        assert.strictEqual(captured.length, 4, "All commands must reach the MeshAgent transport.");

        var transformedPowerShell = captured[0].command;
        assert.strictEqual(transformedPowerShell.runAsUser, 0,
            "The launcher itself must run through the LocalSystem MeshAgent service.");
        assert.strictEqual(transformedPowerShell.type, 2,
            "The user-session launcher must be a PowerShell command.");
        assert.ok(transformedPowerShell.cmd.indexOf("$taskName='SIRK-UserCommand-'") >= 0,
            "The transformed command must use an isolated short-lived task.");
        assert.ok(transformedPowerShell.cmd.indexOf("SirkActiveWtsSession") >= 0,
            "The launcher must select the active Windows session through WTS.");
        assert.ok(transformedPowerShell.cmd.indexOf("Get-Process explorer -IncludeUserName") >= 0,
            "The launcher must resolve the real logged-on account from explorer.exe.");
        assert.ok(transformedPowerShell.cmd.indexOf("New-ScheduledTaskPrincipal -UserId $userName -LogonType Interactive -RunLevel Limited") >= 0,
            "The script itself must run under the logged-on user's interactive token.");
        assert.ok(transformedPowerShell.cmd.indexOf("$directPowerShell=0") >= 0 &&
            transformedPowerShell.cmd.indexOf("-DirectPowerShell '+$directPowerShell") >= 0,
            "Ordinary user PowerShell must retain the isolated child-process execution path.");
        assert.ok(transformedPowerShell.cmd.indexOf("$runnerMode=if($directPowerShell -eq 1){' -STA'}else{' -NonInteractive'}") >= 0,
            "Ordinary commands and trusted Shell UI commands must select their runner mode from one shared owner.");
        assert.ok(transformedPowerShell.cmd.indexOf("icacls.exe") >= 0 &&
            transformedPowerShell.cmd.indexOf("S-1-5-18") >= 0,
            "Temporary command files must be restricted to SYSTEM and the selected user.");
        assert.ok(transformedPowerShell.cmd.indexOf("output.txt") >= 0 &&
            transformedPowerShell.cmd.indexOf("exit.txt") >= 0,
            "The wrapper must return output and exit status to MeshCentral.");
        assert.ok(transformedPowerShell.cmd.indexOf("wscript.exe") >= 0,
            "Task Scheduler must start the console-free WScript host.");
        assert.ok(transformedPowerShell.cmd.indexOf("New-ScheduledTaskAction -Execute $wscript") >= 0,
            "PowerShell must not be the visible scheduled-task executable.");
        assert.ok(transformedPowerShell.cmd.indexOf("launch-command.txt") >= 0,
            "The hidden launcher must read the PowerShell command from a protected file.");
        assert.ok(policy.hiddenLauncherSource().indexOf("shell.Run(commandLine, 0, True)") >= 0,
            "The WScript helper must launch PowerShell hidden and wait for completion.");
        assert.ok(decodedPayloads(transformedPowerShell.cmd).some(function (value) {
            return value.indexOf("Write-Output $env:APPDATA") >= 0;
        }), "The original PowerShell body must be embedded without changing user-profile variables.");

        var transformedNetwork = captured[1].command;
        assert.notStrictEqual(transformedNetwork, networkSettingsCmd,
            "Network Settings must use the shared interactive-user launcher so its elevation is explicit and bounded.");
        assert.strictEqual(transformedNetwork.runAsUser, 0,
            "The elevated interactive-user launcher itself must still be started by the LocalSystem MeshAgent service.");
        assert.strictEqual(transformedNetwork.type, 2,
            "The elevated launcher must remain PowerShell.");
        assert.ok(transformedNetwork.cmd.indexOf("New-ScheduledTaskPrincipal -UserId $userName -LogonType Interactive -RunLevel Highest") >= 0,
            "Network Settings must match the manually proven elevated Administrator token using RunLevel Highest.");
        assert.ok(transformedNetwork.cmd.indexOf("$directPowerShell=1") >= 0,
            "Trusted elevated PowerShell must execute directly in the interactive task runner instead of spawning a second PowerShell host.");
        assert.ok(transformedNetwork.cmd.indexOf("$runnerMode=if($directPowerShell -eq 1){' -STA'}else{' -NonInteractive'}") >= 0 &&
            transformedNetwork.cmd.indexOf("-NoProfile'+$runnerMode+' -ExecutionPolicy") >= 0,
            "Trusted Shell UI PowerShell must use an STA interactive runner rather than the ordinary NonInteractive host.");
        assert.ok(decodedPayloads(transformedNetwork.cmd).some(function (value) { return value.indexOf("$verb.DoIt()") >= 0; }),
            "The proven FolderItemVerb body must be preserved inside the elevated launcher.");
        assert.ok(decodedPayloads(transformedNetwork.cmd).some(function (value) {
            return value.indexOf("[int]$DirectPowerShell") >= 0 &&
                value.indexOf("if($DirectPowerShell -eq 1)") >= 0 &&
                value.indexOf("$captured=@(& $scriptPath 2>&1)") >= 0;
        }), "The runner must execute trusted elevated PowerShell in its own interactive/elevated process without a redundant child host.");

        var transformedCmd = captured[2].command;
        assert.strictEqual(transformedCmd.runAsUser, 0,
            "Legacy runAsUser 1 commands must use the reliable user-session launcher.");
        assert.strictEqual(transformedCmd.type, 2,
            "CMD user commands must also use the PowerShell launcher.");
        assert.ok(decodedPayloads(transformedCmd.cmd).some(function (value) {
            return value.indexOf("whoami && echo %APPDATA%") >= 0;
        }), "The original CMD body must be preserved.");

        assert.strictEqual(captured[3].command, systemCommand,
            "SYSTEM commands must remain unchanged.");
        assert.strictEqual(userPowerShell.runAsUser, 2,
            "The policy must not mutate the original command object.");
        assert.strictEqual(legacyUserCmd.runAsUser, 1,
            "The policy must not mutate legacy command objects.");

        var once = policy.transformCommand(userPowerShell);
        assert.strictEqual(policy.transformCommand(once), once,
            "An already wrapped command must not be wrapped twice.");
        assert.strictEqual(policy.transformCommand({ type: 3, runAsUser: 2, cmd: "echo test" }).type, 3,
            "Unsupported non-Windows command types must remain unchanged.");

        console.log("Logged-on-user command policy: OK");
    })
    .catch(function (error) {
        console.error(error);
        process.exitCode = 1;
    });
