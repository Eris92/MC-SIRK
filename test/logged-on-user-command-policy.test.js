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
        return device.sendRunCommands({ nodeId: "node/domain/user" }, legacyUserCmd, "user-cmd", 7);
    })
    .then(function () {
        return device.sendRunCommands({ nodeId: "node/domain/system" }, systemCommand, "system", 7);
    })
    .then(function () {
        assert.strictEqual(captured.length, 3, "All commands must reach the MeshAgent transport.");

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

        var transformedCmd = captured[1].command;
        assert.strictEqual(transformedCmd.runAsUser, 0,
            "Legacy runAsUser 1 commands must use the reliable user-session launcher.");
        assert.strictEqual(transformedCmd.type, 2,
            "CMD user commands must also use the PowerShell launcher.");
        assert.ok(decodedPayloads(transformedCmd.cmd).some(function (value) {
            return value.indexOf("whoami && echo %APPDATA%") >= 0;
        }), "The original CMD body must be preserved.");

        assert.strictEqual(captured[2].command, systemCommand,
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
