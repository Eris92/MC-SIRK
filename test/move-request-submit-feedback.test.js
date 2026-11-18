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
assert.ok(source.indexOf('finishRequest(true, "Zlecono przeniesienie " + summary)') >= 0 &&
    source.indexOf('finishRequest(false, "Nie uda\\u0142o si\\u0119 zleci\\u0107 przeniesienia " + summary') >= 0 &&
    source.indexOf('request.status === "failed"') >= 0 &&
    source.indexOf('fields.textContent = ""') >= 0 &&
    source.indexOf('sourceMeshName || sourceMeshId') >= 0 &&
    source.indexOf('option.textContent || option.value') >= 0,
    "Success and error must replace the form with a specific source/device/target summary.");
assert.ok(source.indexOf('writeButtonText(submit, "OK")') >= 0 &&
    source.indexOf('cancelButtons.forEach(function (item) { item.button.style.setProperty("display", "none", "important"); })') >= 0 &&
    source.indexOf('if (dialogManager.mode === "modern" && modernModal)') >= 0,
    "Native OK must be the only visible action in the completed Modern/Classic dialog.");
assert.ok(source.indexOf('setDialogStatus(status, ok ? "completed" : "failed", message)') >= 0,
    "Failed submissions must render a terminal error message without retaining the submission form.");
assert.ok(source.indexOf('var submitting = false; var submitted = false;') >= 0 &&
    source.indexOf('if (submitted) return true;') >= 0 &&
    source.indexOf('if (submitting) return false;') >= 0,
    "Repeated clicks must not resubmit and the OK action must allow native close.");
assert.ok(source.indexOf('dialogManager.show("xxAddAgentModal", "idx_dlgOkButton", submitRequest)') >= 0 &&
    source.indexOf('return false;', source.indexOf('function submitRequest()')) >= 0,
    "Modern submit must use the native showModal callback and return false so async status remains visible.");
assert.ok(source.indexOf('event.stopImmediatePropagation') >= 0 &&
    source.indexOf('submit.addEventListener("click", onClassicSubmit, true)') >= 0 &&
    source.indexOf('if (submitted) { cleanup(); return; }') >= 0,
    "Classic must intercept submission but allow native OK closure after success; Modern remains callback-owned.");
assert.ok(source.indexOf('modernModal.addEventListener("hidden.bs.modal", cleanup)') >= 0 &&
    source.indexOf('cancel.addEventListener("click", cleanup, true)') >= 0 &&
    source.indexOf('close.addEventListener("click", cleanup, true)') >= 0,
    "Modern hidden and Classic Cancel/X paths must restore the shared host OK control.");
assert.ok(source.indexOf('var sourceMeshName = String(result.sourceMeshName || "")') >= 0 &&
    source.indexOf('sourceMeshName: sourceMeshName') >= 0,
    "Move Request submit must preserve human-readable source group metadata.");
assert.strictEqual(source.indexOf('window.alert("Move request was created in Approval Center.")'), -1,
    "Successful submit must not show a blocking browser alert.");
assert.strictEqual(source.indexOf('closeDialog('), -1,
    "Successful submit must not use the removed plugin overlay close path.");

console.log("Move Request keeps guarded async feedback while reusing the native host OK button: OK");
