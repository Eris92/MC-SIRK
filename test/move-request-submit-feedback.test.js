"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "public/modules/move-requests/index.js"), "utf8");

assert.ok(source.indexOf('function setDialogStatus(status, state, message)') >= 0 &&
    source.indexOf('window.MeshThemeAdapter.status(status)') >= 0,
    "Move Request must reuse the shared semantic status owner on the injected native-dialog status node.");
assert.ok(source.indexOf('setDialogStatus(status, "pending", "Submitting...")') >= 0,
    "Submit must expose an in-flight pending state in the native dialog.");
assert.ok(source.indexOf('setDialogStatus(status, "completed", "Request sent.")') >= 0,
    "Success must remain visible in the same native dialog status node.");
assert.ok(source.indexOf('setDialogStatus(status, "failed", error.message || String(error))') >= 0,
    "Rejected submit must keep the native dialog open and expose the error in the same status node.");
assert.ok(source.indexOf('var submitting = false; var submitted = false;') >= 0 &&
    source.indexOf('if (submitting || submitted) return false;') >= 0,
    "Rapid repeated submit must remain guarded before issuing another POST.");
assert.ok(source.indexOf('dialogManager.show("xxAddAgentModal", "idx_dlgOkButton", submitRequest)') >= 0 &&
    source.indexOf('return false;', source.indexOf('function submitRequest()')) >= 0,
    "Modern submit must use the native showModal callback and return false so async status remains visible.");
assert.ok(source.indexOf('event.stopImmediatePropagation') >= 0 &&
    source.indexOf('submit.addEventListener("click", onClassicSubmit, true)') >= 0,
    "Classic submit must intercept setDialogMode OK before dialogclose while Modern remains callback-owned.");
assert.ok(source.indexOf('modernModal.addEventListener("hidden.bs.modal", cleanup)') >= 0 &&
    source.indexOf('cancel.addEventListener("click", cleanup, true)') >= 0 &&
    source.indexOf('close.addEventListener("click", cleanup, true)') >= 0,
    "Modern hidden and Classic Cancel/X paths must restore the shared host OK control.");
assert.ok(source.indexOf('var sourceMeshName = sourceMesh && sourceMesh.name || ""') >= 0 &&
    source.indexOf('sourceMeshName: sourceMeshName') >= 0,
    "Move Request submit must preserve human-readable source group metadata.");
assert.strictEqual(source.indexOf('window.alert("Move request was created in Approval Center.")'), -1,
    "Successful submit must not show a blocking browser alert.");
assert.strictEqual(source.indexOf('closeDialog('), -1,
    "Successful submit must not use the removed plugin overlay close path.");

console.log("Move Request keeps guarded async feedback while reusing the native host OK button: OK");
