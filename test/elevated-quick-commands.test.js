"use strict";

var assert = require("assert");
var entrypoint = require("../SIRKPortal.js");

var captured = [];
var device = {
    sendRunCommands: function (context, command, responseId, sessionId) {
        captured.push({ context: context, command: command, responseId: responseId, sessionId: sessionId });
        return Promise.resolve({ state: "sent" });
    }
};

entrypoint.applyElevatedQuickCommandPolicy({ runtime: { context: { device: device } } });

var interactive = {
    label: "Open PowerShell",
    type: 2,
    runAsUser: 0,
    cmd: "$principal=New-ScheduledTaskPrincipal -UserId $userName -LogonType Interactive -RunLevel Limited"
};

var background = {
    label: "Flush DNS",
    type: 1,
    runAsUser: 0,
    cmd: "ipconfig /flushdns"
};

Promise.resolve()
    .then(function () { return device.sendRunCommands({}, interactive, "interactive", null); })
    .then(function () { return device.sendRunCommands({}, background, "background", null); })
    .then(function () {
        assert.strictEqual(captured.length, 2, "Both commands must reach the MeshAgent transport.");
        assert.ok(captured[0].command.cmd.indexOf("-LogonType Interactive -RunLevel Highest") >= 0,
            "Interactive Quick commands must request the highest available Windows token.");
        assert.ok(captured[0].command.cmd.indexOf("RunLevel Limited") < 0,
            "Interactive Quick commands must not run with a limited token.");
        assert.strictEqual(captured[1].command.cmd, background.cmd,
            "Non-interactive commands must remain unchanged.");
        assert.strictEqual(interactive.cmd.indexOf("RunLevel Limited") >= 0, true,
            "The policy must not mutate the original command object.");
        console.log("Elevated Quick commands policy: OK");
    })
    .catch(function (error) {
        console.error(error);
        process.exitCode = 1;
    });
