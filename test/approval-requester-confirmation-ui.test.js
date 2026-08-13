"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var serviceSource = fs.readFileSync(path.join(root, "server/core/approval-service.js"), "utf8");
var apiSource = fs.readFileSync(path.join(root, "server/modules/approval-center/index.js"), "utf8");
var uiSource = fs.readFileSync(path.join(root, "public/modules/approvals/index.js"), "utf8");
var statusSource = fs.readFileSync(path.join(root, "public/shared/ui/status-nav.js"), "utf8");

assert.ok(serviceSource.indexOf('request.status = "awaiting_confirmation"') >= 0);
assert.ok(serviceSource.indexOf('request.status = "confirming"') >= 0,
    "Shared approval owner must claim finalization atomically before provider side effects.");
assert.ok(serviceSource.indexOf("function canConfirm(user, request)") >= 0);
assert.ok(serviceSource.indexOf("delete result.confirmation;") >= 0,
    "Server-only confirmation state must never be exposed in public requests.");
assert.ok(apiSource.indexOf('asset === "confirm"') >= 0 && apiSource.indexOf("context.approval.confirm") >= 0,
    "Approval Center must expose confirmation through the existing shared approval API owner.");
assert.ok(uiSource.indexOf("SharedScriptTools.openConfirmationDialog") >= 0,
    "Requester confirmation must reuse the existing native MeshCentral confirmation dialog.");
assert.strictEqual(uiSource.indexOf("window.confirm"), -1);
assert.ok(uiSource.indexOf('shell.post("confirm"') >= 0);
assert.ok(uiSource.indexOf('status: "actionable"') >= 0,
    "Approval overview must include pending approvals and requester confirmations in one bounded request.");
assert.ok(statusSource.indexOf('key: "awaiting_confirmation"') >= 0 && statusSource.indexOf('key: "confirming"') >= 0);
assert.strictEqual(uiSource.indexOf("MutationObserver"), -1);
assert.strictEqual(uiSource.indexOf("setInterval"), -1);

console.log("Approval Center requester confirmation reuses shared lifecycle and native dialog: OK");
