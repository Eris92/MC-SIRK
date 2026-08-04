"use strict";

var assert = require("assert");
var entrypoint = require("../SIRKPortal.js");
var policy = require("../server/core/elevated-quick-command-policy.js");

var captured = [];
var device = {
    sendRunCommands: function (context, command, responseId, sessionId) {
        captured.push({ context: context, command: command, responseId: responseId, sessionId: sessionId });
        return Promise.resolve({ state: "sent" });
    }
};

entrypoint.applyElevatedQuickCommandPolicy({ runtime: { context: { device: device } } });

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

assert.strictEqual(policy.extractInteractiveCommand(interactiveSource), '"powershell.exe" -NoExit',
    "The policy must recover the original interactive command line from the legacy launcher.");

Promise.resolve()
    .then(function () { return device.sendRunCommands({}, interactive, "interactive", null); })
    .then(function () { return device.sendRunCommands({}, background, "background", null); })
    .then(function () {
        assert.strictEqual(captured.length, 2, "Both commands must reach the MeshAgent transport.");
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
        assert.strictEqual(interactive.cmd, interactiveSource,
            "The policy must not mutate the original command object.");
        console.log("SYSTEM Quick commands policy: OK");
    })
    .catch(function (error) {
        console.error(error);
        process.exitCode = 1;
    });
