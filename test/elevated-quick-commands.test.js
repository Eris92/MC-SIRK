"use strict";

var assert = require("assert");
var policy = require("../server/core/elevated-quick-command-policy.js");

var captured = [];
var device = {
    sendRunCommands: function (context, command, responseId, sessionId) {
        captured.push({ context: context, command: command, responseId: responseId, sessionId: sessionId });
        return Promise.resolve({ state: "sent" });
    }
};

policy.apply({ runtime: { context: { device: device } } });

var vbs = [
    "Set shell = CreateObject(\"WScript.Shell\")",
    "shell.Run \"\"\"powershell.exe\"\" -NoExit\", 1, False"
].join("\r\n");
var encodedVbs = Buffer.from(vbs, "utf8").toString("base64");
var interactiveSource = [
    "$taskName='SIRK-Desktop-'+[guid]::NewGuid().ToString('N')",
    "$scriptPath=$taskName+'.vbs'",
    "[IO.File]::WriteAllBytes($scriptPath,[Convert]::FromBase64String('" + encodedVbs + "'))",
    "$action=New-ScheduledTaskAction -Execute ($env:SystemRoot+'\\System32\\wscript.exe')",
    "$principal=New-ScheduledTaskPrincipal -UserId $userName -LogonType Interactive -RunLevel Limited"
].join(";");

var interactive = {
    label: "Open PowerShell",
    type: 2,
    runAsUser: 0,
    cmd: interactiveSource
};
var background = {
    label: "Flush DNS",
    type: 1,
    runAsUser: 0,
    cmd: "ipconfig /flushdns"
};
var legacyLoggedOnUser = {
    label: "Legacy user script",
    type: 2,
    runAsUser: 1,
    cmd: "whoami"
};

assert.strictEqual(policy.extractInteractiveCommand(interactiveSource), '"powershell.exe" -NoExit',
    "The policy must recover the original interactive command line from the legacy launcher.");
assert.strictEqual(policy.normalizeCommandRunAs(legacyLoggedOnUser).runAsUser, 2,
    "Legacy UserOrAgent mode must be promoted to strict UserOnly mode.");

Promise.resolve()
    .then(function () { return device.sendRunCommands({}, interactive, "interactive", null); })
    .then(function () { return device.sendRunCommands({}, background, "background", null); })
    .then(function () { return device.sendRunCommands({}, legacyLoggedOnUser, "legacy-user", null); })
    .then(function () {
        assert.strictEqual(captured.length, 3, "All commands must reach the MeshAgent transport.");
        assert.strictEqual(captured[0].command.runAsUser, 0,
            "The transformed command must execute in the MeshAgent service context.");
        assert.strictEqual(captured[0].command.type, 2,
            "The SYSTEM launcher must execute through PowerShell.");
        assert.ok(captured[0].command.cmd.indexOf("SirkInteractiveSystemLauncher") >= 0,
            "Interactive Quick commands must use the SYSTEM interactive-session launcher.");
        var sourceMatch = captured[0].command.cmd.match(/FromBase64String\('([^']+)'\)/);
        assert.ok(sourceMatch, "The launcher must embed its C# implementation.");
        var csharpSource = Buffer.from(sourceMatch[1], "base64").toString("utf8");
        assert.ok(csharpSource.indexOf("CreateProcessAsUser") >= 0,
            "The launcher must create the process with the SYSTEM token in the user session.");
        assert.ok(csharpSource.indexOf("Process.GetProcessesByName(\"winlogon\")") >= 0,
            "The launcher must obtain the target session's LocalSystem token from winlogon.");
        assert.ok(captured[0].command.cmd.indexOf("NT AUTHORITY\\SYSTEM") >= 0,
            "Successful output must identify the effective SYSTEM account.");
        assert.ok(captured[0].command.cmd.indexOf("New-ScheduledTaskPrincipal") < 0,
            "The limited logged-on-user scheduled-task launcher must be removed.");
        assert.strictEqual(captured[1].command.cmd, background.cmd,
            "Non-interactive commands must remain unchanged.");
        assert.strictEqual(captured[1].command.runAsUser, 0,
            "SYSTEM scripts must remain in the MeshAgent service context.");
        assert.strictEqual(captured[2].command.runAsUser, 2,
            "Logged-on-user scripts must use MeshAgent UserOnly mode.");
        assert.strictEqual(legacyLoggedOnUser.runAsUser, 1,
            "The policy must not mutate the original legacy command object.");
        assert.strictEqual(interactive.cmd, interactiveSource,
            "The policy must not mutate the original interactive command object.");
        console.log("SYSTEM and logged-on-user command policy: OK");
    })
    .catch(function (error) {
        console.error(error);
        process.exitCode = 1;
    });
