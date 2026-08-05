"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var libraryFactory = require("../server/core/script-confirmation-library.js");

var root = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-mycommands-multi-"));

function write(name, lines) {
    fs.writeFileSync(path.join(root, name), lines.join("\r\n"), "utf8");
}

function findScript(node, name) {
    if (!node) return null;
    if (node.type === "script" && node.name === name) return node;
    var children = node.children || [];
    for (var index = 0; index < children.length; index++) {
        var found = findScript(children[index], name);
        if (found) return found;
    }
    return null;
}

try {
    write("default.ps1", [
        "#PL Domyślny skrypt",
        "#EN Default script",
        "Write-Output 'default'"
    ]);
    write("enabled.ps1", [
        "#PL Włączony skrypt",
        "# MultiHost: true",
        "Write-Output 'enabled'"
    ]);
    write("disabled.ps1", [
        "#PL Wyłączony skrypt",
        "# MultiHost: false",
        "Write-Output 'disabled'"
    ]);

    var library = libraryFactory.createScriptLibrary({
        fs: fs,
        path: path,
        root: root,
        readOnly: true,
        allowWrite: true
    });

    assert.strictEqual(library.getScript("default.ps1", true).multiHost, true,
        "A My Commands script without a directive must allow multi-device execution.");
    assert.strictEqual(library.getScript("enabled.ps1", true).multiHost, true,
        "An explicit MultiHost:true directive must remain enabled.");
    assert.strictEqual(library.getScript("disabled.ps1", true).multiHost, false,
        "An explicit MultiHost:false directive must remain disabled.");

    var tree = library.getTree();
    assert.strictEqual(findScript(tree, "default.ps1").multiHost, true,
        "The command tree must expose the default-enabled state used by row actions.");
    assert.strictEqual(findScript(tree, "disabled.ps1").multiHost, false,
        "The command tree must expose explicit opt-out state.");
    assert.strictEqual(library.getDefinition("default.ps1").multiHost, true,
        "The definition editor must show default multi-device availability as enabled.");

    var current = library.getDefinition("default.ps1");
    var disabled = library.saveDefinition("default.ps1", {
        locales: current.locales,
        approvalLevels: current.approvalLevels,
        variables: current.variables,
        secretVariables: current.secretVariables,
        runAsUser: current.runAsUser,
        confirmExecution: current.confirmExecution,
        multiHost: false
    });
    assert.strictEqual(disabled.script.multiHost, false,
        "Saving an opt-out must immediately disable multi-device execution.");
    assert.ok(/^# MultiHost: false$/mi.test(fs.readFileSync(path.join(root, "default.ps1"), "utf8")),
        "An explicit opt-out must be persisted as MultiHost:false.");

    var enabledAgain = library.saveDefinition("default.ps1", {
        locales: disabled.definition.locales,
        approvalLevels: disabled.definition.approvalLevels,
        variables: disabled.definition.variables,
        secretVariables: disabled.definition.secretVariables,
        runAsUser: disabled.definition.runAsUser,
        confirmExecution: disabled.definition.confirmExecution,
        multiHost: true
    });
    assert.strictEqual(enabledAgain.script.multiHost, true,
        "Saving an explicit enable must restore multi-device execution.");
    assert.ok(/^# MultiHost: true$/mi.test(fs.readFileSync(path.join(root, "default.ps1"), "utf8")),
        "An explicit enable must be persisted as MultiHost:true.");

    var browser = fs.readFileSync(path.join(__dirname, "..", "public", "modules", "commands", "index.js"), "utf8");
    assert.ok(browser.indexOf('enableMulti: item.kind === "command" || item.multiHost === true') >= 0,
        "Commands row actions must use the decorated multiHost state.");

    console.log("My Commands default row multi-device availability: OK");
} finally {
    fs.rmSync(root, { recursive: true, force: true });
}
