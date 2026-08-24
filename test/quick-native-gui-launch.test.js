"use strict";

var assert = require("assert");
var policy = require("../server/core/logged-on-user-command-policy.js");

var commands = [
    { label: "CMD", type: 1, runAsUser: 2, cmd: "start \"\" cmd.exe /K" },
    { label: "PowerShell", type: 1, runAsUser: 2, cmd: "start \"\" powershell.exe -NoExit" },
    { label: "Services", type: 1, runAsUser: 2, cmd: "start \"\" mmc.exe services.msc" },
    { label: "Event Viewer", type: 1, runAsUser: 2, cmd: "start \"\" mmc.exe eventvwr.msc" }
];

commands.forEach(function (command) {
    assert.strictEqual(policy.isNativeGuiLauncher(command), true,
        command.label + " must be recognized as a native GUI launcher.");
    assert.strictEqual(policy.transformCommand(command), command,
        command.label + " must go directly to MeshAgent runAsUser=2 without the scheduled-task wrapper.");
});

var ordinary = { label: "whoami", type: 1, runAsUser: 2, cmd: "whoami" };
assert.strictEqual(policy.isNativeGuiLauncher(ordinary), false,
    "Ordinary user commands must not bypass the logged-on-user launcher.");
assert.notStrictEqual(policy.transformCommand(ordinary), ordinary,
    "Ordinary user commands must retain the isolated logged-on-user execution path.");

console.log("Quick native GUI launchers bypass the scheduled-task wrapper: OK");
