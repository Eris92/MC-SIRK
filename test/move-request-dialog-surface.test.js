"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "public/modules/move-requests/index.js"), "utf8");

assert.ok(source.indexOf('function hostDialogManager()') >= 0 && source.indexOf('window.setDialogMode') >= 0,
    "Move Request must delegate modal ownership to the native MeshCentral dialog manager.");
assert.ok(source.indexOf('showDialog(2, "Move Request", 3, null, content.innerHTML);') >= 0,
    "Move Request must open through native setDialogMode mode 2 with the native OK/Cancel footer.");
assert.ok(source.indexOf('document.getElementById("idx_dlgOkButton")') >= 0 &&
    source.indexOf('document.getElementById("idx_dlgCancelButton")') >= 0 &&
    source.indexOf('document.getElementById("id_dialogclose")') >= 0,
    "Move Request must reuse the native host dialog controls instead of rendering plugin modal buttons.");
assert.ok(source.indexOf('writeButtonText(submit, "Submit request")') >= 0,
    "The native host OK control must be relabeled to Submit request without replacing its native styling.");
assert.strictEqual(source.indexOf('overlay.className = "mc-move-dialog-overlay"'), -1,
    "Move Request must not create a parallel plugin overlay once native setDialogMode owns the dialog.");
assert.strictEqual(source.indexOf('dialogFrame.className = "mc-move-dialog-frame"'), -1,
    "Move Request must not recreate the host modal-dialog frame.");
assert.strictEqual(source.indexOf('document.body.appendChild(overlay)'), -1,
    "Move Request must not append a custom modal tree to document.body.");
assert.strictEqual(source.indexOf('submit.className = "sirk-primary-action"'), -1,
    "Move Request must use the host OK button surface instead of styling a plugin submit button.");

console.log("Move Request delegates dialog surface and footer ownership to MeshCentral setDialogMode: OK");
