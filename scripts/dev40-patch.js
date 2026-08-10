"use strict";
const fs = require("fs");

function patch(path, replacements) {
  let text = fs.readFileSync(path, "utf8");
  replacements.forEach(([from, to]) => {
    if (!text.includes(from)) throw new Error(`Missing patch anchor in ${path}: ${from.slice(0,120)}`);
    text = text.replace(from, to);
  });
  fs.writeFileSync(path, text, "utf8");
}

patch("server/modules/commands/index.js", [
  [
    '{ id: "network-adapter-properties", label: "Network Settings", locales: { pl: { label: "Network Settings" }, en: { label: "Network Settings" } }, description: "Open properties for the adapter used by the preferred active default route.", type: 2, runAsUser: 2, cmd:',
    '{ id: "network-adapter-properties", label: "Network Settings", locales: { pl: { label: "Network Settings" }, en: { label: "Network Settings" } }, description: "Open properties for the adapter used by the preferred active default route.", type: 2, runAsUser: 2, nativeUserSession: true, cmd:'
  ],
  [
    'return { label: found.command.label, cmd: commandText, type: Number(found.command.type) || 1, runAsUser: Number(found.command.runAsUser) || 0 };',
    'return { label: found.command.label, cmd: commandText, type: Number(found.command.type) || 1, runAsUser: Number(found.command.runAsUser) || 0, nativeUserSession: found.command.nativeUserSession === true };'
  ]
]);

patch("server/core/logged-on-user-command-policy.js", [
  [
    '    if ((runAsUser !== 1 && runAsUser !== 2) || (type !== 1 && type !== 2)) return command;\n    if (String(command.cmd || "").indexOf(MARKER) >= 0) return command;',
    '    if ((runAsUser !== 1 && runAsUser !== 2) || (type !== 1 && type !== 2)) return command;\n    // Trusted built-in native Shell UI commands must use MeshAgent UserOnly directly.\n    // The scheduled-task wrapper exists for profile/env/output semantics and changes\n    // the COM/UI launch chain that Network Settings requires.\n    if (command.nativeUserSession === true && runAsUser === 2) return command;\n    if (String(command.cmd || "").indexOf(MARKER) >= 0) return command;'
  ]
]);

patch("web/admin/admin.js", [
  [
    '        if (hostBody && hostBody.classList.contains("night")) return true;\n        if (typeof hostWindow.nightMode === "boolean") return hostWindow.nightMode;',
    '        if (hostBody && hostBody.classList.contains("night")) return true;\n        var bodyStyle = hostBody && hostWindow.getComputedStyle ? hostWindow.getComputedStyle(hostBody) : null;\n        var background = bodyStyle && colorParts(bodyStyle.backgroundColor);\n        var themeStylesheet = hostDocument && hostDocument.getElementById ? hostDocument.getElementById("theme-stylesheet") : null;\n        if (themeStylesheet && background) return ((background[0] * 299 + background[1] * 587 + background[2] * 114) / 1000) < 145;\n        if (typeof hostWindow.nightMode === "boolean") return hostWindow.nightMode;'
  ],
  [
    '        var bodyStyle = hostBody && hostWindow.getComputedStyle ? hostWindow.getComputedStyle(hostBody) : null;\n        var background = bodyStyle && colorParts(bodyStyle.backgroundColor);\n        if (background) return ((background[0] * 299 + background[1] * 587 + background[2] * 114) / 1000) < 145;',
    '        if (background) return ((background[0] * 299 + background[1] * 587 + background[2] * 114) / 1000) < 145;'
  ],
  [
    '            if (hostDocument && hostDocument.body && hostDocument.body !== hostDocument.documentElement) {\n                observer.observe(hostDocument.body, { attributes: true, attributeFilter: ["class", "data-bs-theme"] });\n            }\n        }',
    '            if (hostDocument && hostDocument.body && hostDocument.body !== hostDocument.documentElement) {\n                observer.observe(hostDocument.body, { attributes: true, attributeFilter: ["class", "data-bs-theme"] });\n            }\n            var themeStylesheet = hostDocument && hostDocument.getElementById ? hostDocument.getElementById("theme-stylesheet") : null;\n            if (themeStylesheet) {\n                observer.observe(themeStylesheet, { attributes: true, attributeFilter: ["href"] });\n                if (typeof themeStylesheet.addEventListener === "function") themeStylesheet.addEventListener("load", syncHostTheme);\n            }\n        }'
  ]
]);

patch("test/network-command-split.test.js", [
  [
    'assert.ok(properties.indexOf(\'type: 2\') >= 0,\n    "Network Settings must execute as direct PowerShell so the shared logged-on-user runner owns the full UI operation lifetime.");',
    'assert.ok(properties.indexOf(\'type: 2\') >= 0 && properties.indexOf(\'nativeUserSession: true\') >= 0,\n    "Network Settings must execute as direct PowerShell through the native MeshAgent UserOnly session, not the script-oriented scheduled-task wrapper.");'
  ],
  [
    'assert.ok(server.indexOf(\'return { label: found.command.label, cmd: commandText, type: Number(found.command.type) || 1, runAsUser: Number(found.command.runAsUser) || 0 };\') >= 0,\n    "Built-in command execution must preserve canonical runAsUser/type so the shared policy owns the user-session launch.");',
    'assert.ok(server.indexOf(\'nativeUserSession: found.command.nativeUserSession === true\') >= 0,\n    "Built-in execution must preserve the trusted native-user-session marker from the canonical catalog.");'
  ]
]);

patch("test/logged-on-user-command-policy.test.js", [
  [
    'var networkSettingsCmd = {\n    label: "Network Settings",\n    type: 1,\n    runAsUser: 2,\n    cmd: \'start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "$verb.DoIt()"\'\n};',
    'var networkSettingsCmd = {\n    label: "Network Settings",\n    type: 2,\n    runAsUser: 2,\n    nativeUserSession: true,\n    cmd: "$shell=New-Object -ComObject Shell.Application;$folder=$shell.Namespace(49);$verb.DoIt()"\n};'
  ],
  [
    '        assert.strictEqual(transformedNetwork.runAsUser, 0,\n            "Network Settings transport wrapper must become LocalSystem only after the shared user-session policy owns the launch.");\n        assert.strictEqual(transformedNetwork.type, 2,\n            "Network Settings must use the shared PowerShell launcher wrapper.");\n        assert.strictEqual(transformedNetwork.cmd.indexOf("SIRK-Desktop-"), -1,\n            "Network Settings must not enter the legacy interactive-SYSTEM launcher path.");\n        assert.ok(decodedPayloads(transformedNetwork.cmd).some(function (value) {\n            return value.indexOf(\'start "" powershell.exe -NoProfile -WindowStyle Hidden\') >= 0 && value.indexOf("$verb.DoIt()") >= 0;\n        }), "The shared logged-on-user owner must preserve the Network Settings CMD body exactly.");',
    '        assert.strictEqual(transformedNetwork, networkSettingsCmd,\n            "Trusted native Shell UI commands must bypass the script-oriented scheduled-task wrapper.");\n        assert.strictEqual(transformedNetwork.runAsUser, 2,\n            "Network Settings must reach MeshAgent as strict UserOnly.");\n        assert.strictEqual(transformedNetwork.type, 2,\n            "Network Settings must remain direct PowerShell.");\n        assert.strictEqual(transformedNetwork.cmd.indexOf("SIRK-UserCommand-"), -1,\n            "Network Settings must not be rewritten through the logged-on-user scheduled-task wrapper.");'
  ]
]);

patch("test/admin-host-theme-signal.test.js", [
  [
    'assert.ok(admin.indexOf(\'observer.observe(hostDocument.documentElement\') >= 0 &&\n    admin.indexOf(\'observer.observe(hostDocument.body\') >= 0 &&\n    admin.indexOf(\'attributeFilter: ["class", "data-bs-theme"]\') >= 0,\n    "The single observer must watch the actual parent host theme attributes/classes.");',
    'assert.ok(admin.indexOf(\'observer.observe(hostDocument.documentElement\') >= 0 &&\n    admin.indexOf(\'observer.observe(hostDocument.body\') >= 0 &&\n    admin.indexOf(\'attributeFilter: ["class", "data-bs-theme"]\') >= 0,\n    "The single observer must watch the actual parent host theme attributes/classes.");\nassert.ok(admin.indexOf(\'hostDocument.getElementById("theme-stylesheet")\') >= 0 &&\n    admin.indexOf(\'observer.observe(themeStylesheet, { attributes: true, attributeFilter: ["href"] })\') >= 0 &&\n    admin.indexOf(\'themeStylesheet.addEventListener("load", syncHostTheme)\') >= 0,\n    "The same observer must follow Modern MeshCentral Bootswatch href changes and resync after the stylesheet loads.");'
  ],
  [
    'assert.ok(admin.indexOf(\'hostWindow.localStorage && hostWindow.localStorage.getItem("nightMode")\') >= 0 &&',
    'assert.ok(admin.indexOf(\'themeStylesheet && background\') >= 0 && admin.indexOf(\'hostWindow.localStorage && hostWindow.localStorage.getItem("nightMode")\') >= 0 &&'
  ]
]);

console.log("dev40 patches applied");
