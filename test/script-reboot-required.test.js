"use strict";

// "Reboot required" flag on scripts: parsed from "# RebootRequired: true",
// saved by the definition editor and shown wherever the script is described.

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var libraryFactory = require("../server/core/script-confirmation-library.js");

var root = path.resolve(__dirname, "..");
var scripts = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-reboot-required-"));
try {
    fs.writeFileSync(path.join(scripts, "tls.ps1"), ["#PL Wyłącz TLS 1.0", "#EN Disable TLS 1.0", "# RebootRequired: true", "Write-Output 'tls'"].join("\r\n"), "utf8");
    fs.writeFileSync(path.join(scripts, "plain.ps1"), ["#EN Plain", "Write-Output 'plain'"].join("\r\n"), "utf8");
    var library = libraryFactory.createScriptLibrary({ fs: fs, path: path, root: scripts, readOnly: true, allowWrite: true });

    assert.strictEqual(library.getScript("tls.ps1", true).rebootRequired, true, "directive is parsed");
    assert.strictEqual(library.getScript("plain.ps1", true).rebootRequired, false, "default is no reboot");
    assert.strictEqual(library.getDefinition("tls.ps1").rebootRequired, true, "definition editor sees the flag");
    assert.ok(!(library.getScript("tls.ps1", true).extraHeaders || []).some(function (header) { return /RebootRequired/i.test(header); }), "directive is not duplicated as an extra header");

    var current = library.getDefinition("plain.ps1");
    var saved = library.saveDefinition("plain.ps1", { locales: current.locales, approvalLevels: [], variables: [], secretVariables: [], rebootRequired: true });
    assert.strictEqual(saved.script.rebootRequired, true, "saving enables the flag");
    var text = fs.readFileSync(path.join(scripts, "plain.ps1"), "utf8");
    assert.strictEqual((text.match(/^# RebootRequired: true\r?$/gm) || []).length, 1, "persisted once");
    saved = library.saveDefinition("plain.ps1", { locales: current.locales, approvalLevels: [], variables: [], secretVariables: [], rebootRequired: false });
    assert.strictEqual(saved.script.rebootRequired, false, "saving clears the flag");
    assert.ok(!/RebootRequired/.test(fs.readFileSync(path.join(scripts, "plain.ps1"), "utf8")), "cleared flag is removed from the header");
} finally {
    fs.rmSync(scripts, { recursive: true, force: true });
}

// UI wiring: definition editor checkbox, shared notice, Commands/My Scripts/Quick consumers.
var editor = fs.readFileSync(path.join(root, "public/shared/ui/script-tools.js"), "utf8");
assert.ok(editor.indexOf("rebootRequired: rebootRequired.checked") >= 0, "definition editor saves the flag");
var dialog = fs.readFileSync(path.join(root, "public/shared/ui/parameter-dialog.js"), "utf8");
assert.ok(dialog.indexOf("appendRebootNotice(content, item);") >= 0, "parameter dialog shows the notice");
assert.ok(dialog.indexOf("appendRebootNotice(content, options.item);") >= 0, "confirmation dialog shows the notice");
var commands = fs.readFileSync(path.join(root, "public/modules/commands/index.js"), "utf8");
assert.ok(commands.indexOf("tools.appendRebootNotice(card, item)") >= 0, "Commands run card shows the notice");
var automation = fs.readFileSync(path.join(root, "public/modules/automation/index.js"), "utf8");
assert.ok(automation.indexOf("tools.appendRebootNotice(card, script)") >= 0, "My Scripts run card shows the notice");
var quick = fs.readFileSync(path.join(root, "public/native/desktop-commands.js"), "utf8");
assert.ok(quick.indexOf("rebootRequired: script.rebootRequired === true") >= 0 && quick.indexOf("appendRebootNotice(details, state.detail)") >= 0, "Quick details show the notice");

console.log("Script reboot-required flag: parse, save and UI notice: OK");
