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

var currentUserCertificates = {
    label: "Certificates (user)",
    type: 1,
    runAsUser: 2,
    cmd: "start \"\" certmgr.msc"
};
assert.strictEqual(policy.isNativeGuiLauncher(currentUserCertificates), false,
    "Current-user certificates must not use the generic native GUI bypass because the MMC store is identity-scoped.");
var transformedCertificates = policy.transformCommand(currentUserCertificates);
assert.notStrictEqual(transformedCertificates, currentUserCertificates,
    "Current-user certificates must use the strict logged-on-user execution path.");
assert.strictEqual(transformedCertificates.runAsUser, 0,
    "The strict user-session launcher must itself run through the LocalSystem MeshAgent service.");
assert.ok(transformedCertificates.cmd.indexOf("New-ScheduledTaskPrincipal -UserId $userName -LogonType Interactive -RunLevel Limited") >= 0,
    "Current-user certificates must launch under the detected interactive Windows account.");

var ordinary = { label: "whoami", type: 1, runAsUser: 2, cmd: "whoami" };
assert.strictEqual(policy.isNativeGuiLauncher(ordinary), false,
    "Ordinary user commands must not bypass the logged-on-user launcher.");
assert.notStrictEqual(policy.transformCommand(ordinary), ordinary,
    "Ordinary user commands must retain the isolated logged-on-user execution path.");

console.log("Quick native GUI launchers keep the certmgr user-store exception: OK");
