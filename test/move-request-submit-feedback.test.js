"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "public/modules/move-requests/index.js"), "utf8");

assert.ok(source.indexOf('function setDialogStatus(status, state, message)') >= 0 &&
    source.indexOf('window.MeshThemeAdapter.status(status)') >= 0,
    "Move Request must reuse the shared semantic status owner on its existing status node.");
assert.ok(source.indexOf('setDialogStatus(status, "pending", "Submitting...")') >= 0,
    "Submit must expose an in-flight pending state in the dialog.");
assert.ok(source.indexOf('setDialogStatus(status, "completed", "Request sent.")') >= 0,
    "Success must remain visible in the same dialog status node.");
assert.ok(source.indexOf('setDialogStatus(status, "failed", error.message || String(error))') >= 0,
    "Rejected submit must keep the dialog open and expose the error in the same status node.");
assert.ok(source.indexOf('var submitting = false;') >= 0 && source.indexOf('var submitted = false;') >= 0 &&
    source.indexOf('if (submitting || submitted) return;') >= 0,
    "Rapid repeated submit must be guarded before issuing another POST.");
assert.ok(source.indexOf('submitted = true;') >= 0 && source.indexOf('submit.disabled = true;') >= 0,
    "A successful dialog must not be reusable for an automatic duplicate request.");
assert.strictEqual(source.indexOf('window.alert("Move request was created in Approval Center.")'), -1,
    "Successful submit must not show a blocking browser alert.");
var successStart = source.indexOf('setDialogStatus(status, "completed", "Request sent.")');
var submitStart = source.indexOf('submit.onclick = function ()');
var catchStart = source.indexOf('}).catch(function (error)', submitStart);
var submitFlow = source.slice(submitStart, catchStart);
assert.strictEqual(submitFlow.indexOf('closeDialog(overlay)'), -1,
    "Successful submit must not close the dialog before the user can read the success state.");
assert.ok(successStart > submitStart && successStart < catchStart,
    "Success status must be part of the successful submit promise path.");
console.log("Move Request submit uses one guarded dialog status lifecycle without browser alert: OK");
