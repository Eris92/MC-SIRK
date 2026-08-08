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
    "Modern Move Request surface must be owned by native modal sections rather than plugin background overrides.");
assert.strictEqual(css.indexOf(".mc-move-dialog.card{"), -1,
    "Move Request must not retain card-specific cascade workarounds.");
assert.strictEqual(css.indexOf(".mc-move-dialog:hover"), -1,
    "Move Request must not neutralize host hover with a plugin workaround.");
assert.ok(css.indexOf(".mc-move-dialog-frame{") >= 0,
    "Move Request must keep geometry on the native modal-dialog frame.");
assert.ok(css.indexOf(".mc-move-dialog:not(.modal-content){padding:18px}") >= 0,
    "Plugin padding must be limited to the Classic/non-native content path.");
assert.ok(css.indexOf(".mc-move-dialog-input:not(.form-control):not(.form-select){padding:7px 8px}") >= 0,
    "Native Modern form-control/form-select padding must not be overridden by plugin geometry.");
assert.ok(css.indexOf(".mc-move-dialog-actions:not(.modal-footer)") >= 0,
    "Native Modern modal-footer geometry must not be overridden by Classic action-row styling.");

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
    "Move Request must reuse the existing theme owner when deciding whether native modal sections are needed.");
assert.ok(source.indexOf('dialogFrame.className = "mc-move-dialog-frame" + (modern ? " modal-dialog modal-dialog-centered" : "");') >= 0,
    "Modern Move Request frame must use native modal-dialog modal-dialog-centered classes.");
var frameAppend = source.indexOf('overlay.appendChild(dialogFrame);');
var dialogAppend = source.indexOf('dialogFrame.appendChild(dialog);');
assert.ok(frameAppend >= 0 && dialogAppend > frameAppend,
    "Move Request outer DOM must be overlay -> modal-dialog frame -> modal-content dialog.");
assert.strictEqual(source.indexOf("overlay.appendChild(dialog);"), -1,
    "Move Request must not attach modal-content directly below modal.");

var headerCreate = source.indexOf('header.className = "mc-move-dialog-header" + (modern ? " modal-header" : "");');
var bodyCreate = source.indexOf('body.className = "mc-move-dialog-body" + (modern ? " modal-body" : "");');
var footerCreate = source.indexOf('actions.className = "mc-move-dialog-actions" + (modern ? " modal-footer" : "");');
assert.ok(headerCreate >= 0 && bodyCreate > headerCreate && footerCreate > bodyCreate,
    "Modern Move Request content must use native modal-header -> modal-body -> modal-footer sections.");
assert.ok(source.indexOf('header.appendChild(heading);') >= 0 && source.indexOf('heading.appendChild(title);') >= 0 && source.indexOf('heading.appendChild(device);') >= 0,
    "Move Request title and device identity must live in the native header section.");
assert.ok(source.indexOf('body.appendChild(groupLabel);') >= 0 && source.indexOf('body.appendChild(select);') >= 0 && source.indexOf('body.appendChild(note);') >= 0 && source.indexOf('body.appendChild(status);') >= 0,
    "Move Request form and status must live in the native body section.");
assert.ok(source.indexOf('actions.appendChild(cancel);') >= 0 && source.indexOf('actions.appendChild(submit);') >= 0,
    "Move Request Cancel/Submit actions must live in the native footer section.");
assert.ok(source.indexOf('window.MeshThemeAdapter.refresh(overlay);') >= 0 &&
    source.indexOf('window.MeshThemeAdapter.refresh(overlay);') < source.indexOf('document.body.appendChild(overlay);'),
    "Move Request must theme the complete detached native modal structure before first paint.");

console.log("Move Request uses native modal header/body/footer surface ownership: OK");
