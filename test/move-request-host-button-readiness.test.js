"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var source = fs.readFileSync(path.join(root, "public", "modules", "move-requests", "index.js"), "utf8");

assert.ok(source.indexOf("function syncHostButton() { return installHostButton(); }") >= 0,
    "Move Request must use the idempotent host-button installer directly from native lifecycle callbacks.");
assert.ok(source.indexOf("module.onDeviceRefreshEnd = function (nodeId) { baseDeviceRefresh(nodeId); syncHostButton(); }") >= 0,
    "Device refresh completion must reconcile the host action immediately.");
assert.ok(source.indexOf("module.onNativePageEnd = function (view) { basePageEnd(view); syncHostButton(); }") >= 0,
    "Native page completion must reconcile the host action immediately.");
assert.strictEqual(source.indexOf("function scheduleHostButton"), -1,
    "The host action must not keep a timeout-based readiness scheduler.");
assert.strictEqual(source.indexOf("[0, 100, 400, 1000, 2000, 4000]"), -1,
    "The historical multi-second retry staircase must not return.");
assert.strictEqual(source.indexOf("MutationObserver"), -1,
    "Host-button readiness must not add a DOM observer when native lifecycle callbacks already exist.");
assert.ok(source.indexOf("if (!hostButtonEnabled()) { removeElement(hostButtonId); return false; }") >= 0,
    "Disabled host actions must remain absent even when lifecycle reconciliation runs.");
assert.ok(source.indexOf("if (existing && host.contains(existing))") >= 0,
    "Repeated lifecycle callbacks must reuse the single connected host action.");

console.log("Move Request host button readiness contract: OK");
