"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var css = fs.readFileSync(path.join(root, "public/shared/styles/main.css"), "utf8");
var theme = fs.readFileSync(path.join(root, "public/shared/ui/toolbar-config.js"), "utf8");
var source = fs.readFileSync(path.join(root, "public/modules/move-requests/index.js"), "utf8");

var dialogRule = css.match(/\.mc-move-dialog\{([^}]*)\}/);
assert.ok(dialogRule, "Move Request dialog must keep a dedicated geometry rule.");
assert.strictEqual(/background(?:-color|-image)?:/.test(dialogRule[1]), false,
    "Modern Move Request surface must be owned by native modal-content rather than plugin background overrides.");
assert.strictEqual(css.indexOf(".mc-move-dialog.card{"), -1,
    "Move Request must not retain card-specific cascade workarounds.");
assert.strictEqual(css.indexOf(".mc-move-dialog:hover"), -1,
    "Move Request must not neutralize host hover with a plugin workaround.");
assert.ok(css.indexOf(".mc-move-dialog-frame{") >= 0,
    "Move Request must keep geometry on the native modal-dialog frame.");

var classicRule = css.match(/\.mc-move-dialog\.style10\{([^}]*)\}/);
assert.ok(classicRule && /background-color:Canvas/.test(classicRule[1]),
    "Classic Move Request must keep an opaque system-color fallback while reusing style10.");

assert.ok(theme.indexOf('"card", "modal", "modal-content", "form-control"') >= 0,
    "Existing MeshThemeAdapter modal/modal-content ownership must remain intact.");
assert.ok(theme.indexOf('queryAll(root, ".mc-move-dialog-overlay", function (element) { syncOwnedClasses(element, modern ? ["modal"] : []); });') >= 0,
    "Modern Move Request overlay must retain native modal ownership.");
assert.ok(theme.indexOf('element.classList.contains("mc-move-dialog")') >= 0 &&
    theme.indexOf('isModern() ? "modal-content" : "style10"') >= 0,
    "Move Request content must retain native modal-content ownership in Modern and style10 in Classic.");

assert.ok(source.indexOf('window.MeshThemeAdapter.isModern') >= 0,
    "Move Request must reuse the existing theme owner when deciding whether the native frame is needed.");
assert.ok(source.indexOf('dialogFrame.className = "mc-move-dialog-frame" + (modern ? " modal-dialog modal-dialog-centered" : "");') >= 0,
    "Modern Move Request frame must use the native modal-dialog modal-dialog-centered classes.");
var frameAppend = source.indexOf('overlay.appendChild(dialogFrame);');
var dialogAppend = source.indexOf('dialogFrame.appendChild(dialog);');
assert.ok(frameAppend >= 0 && dialogAppend > frameAppend,
    "Move Request DOM must be overlay -> modal-dialog frame -> modal-content dialog.");
assert.strictEqual(source.indexOf("overlay.appendChild(dialog);"), -1,
    "Move Request must not attach modal-content directly below modal.");
assert.ok(source.indexOf('window.MeshThemeAdapter.refresh(overlay);') >= 0 &&
    source.indexOf('window.MeshThemeAdapter.refresh(overlay);') < source.indexOf('document.body.appendChild(overlay);'),
    "Move Request must theme the complete detached native modal chain before first paint.");

console.log("Move Request uses complete native modal -> modal-dialog -> modal-content ownership: OK");
