"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var runtimeSource = fs.readFileSync(path.join(root, "public", "shared", "runtime.js"), "utf8").replace(/\r\n/g, "\n");
var moduleSource = fs.readFileSync(path.join(root, "public", "modules", "move-requests", "index.js"), "utf8").replace(/\r\n/g, "\n");

assert.ok(runtimeSource.indexOf('id: "MoveRequestHostButton"') >= 0,
    "Move Request host action metadata must live in the shared bootstrap/runtime owner.");
assert.ok(runtimeSource.indexOf("function mountBootstrapHostAction(key, state)") >= 0,
    "Shared runtime must own idempotent host-action mounting before renderer initialization.");
assert.ok(runtimeSource.indexOf("reconcileBootstrapSurfaces();\n        notify(\"onDeviceRefreshEnd\"") >= 0,
    "Device refresh completion must reconcile bootstrap-native surfaces before module callbacks.");
assert.ok(runtimeSource.indexOf("reconcileBootstrapSurfaces();\n        notify(\"onNativePageEnd\"") >= 0,
    "Native page completion must reconcile bootstrap-native surfaces before module callbacks.");
assert.ok(runtimeSource.indexOf("config.hostButtonEnabled === false") >= 0,
    "Disabled Move Request host action must remain absent during early bootstrap reconciliation.");
assert.ok(runtimeSource.indexOf("if (existing && host.contains(existing))") >= 0,
    "Repeated lifecycle callbacks must reuse the single connected host action.");
assert.ok(runtimeSource.indexOf("runtime.state.dependenciesReady") >= 0 && runtimeSource.indexOf("ensureModule(key)") >= 0,
    "An early click must wait for existing shared dependencies and then reuse the canonical module loader.");
assert.strictEqual(runtimeSource.indexOf("MutationObserver"), -1,
    "Host-action readiness must not add a DOM observer.");
assert.strictEqual(runtimeSource.indexOf("[0, 100, 400, 1000, 2000, 4000]"), -1,
    "The historical multi-second retry staircase must not return.");

assert.ok(moduleSource.indexOf("module.openHostAction = function (nodeId)") >= 0,
    "Move Requests renderer must expose only the deferred action implementation used by the runtime-owned button.");
assert.strictEqual(moduleSource.indexOf("function installHostButton"), -1,
    "The renderer must not keep a second host-button DOM owner.");
assert.strictEqual(moduleSource.indexOf("function syncHostButton"), -1,
    "The renderer must not reconcile the host button independently from shared runtime lifecycle.");
assert.strictEqual(moduleSource.indexOf("function scheduleHostButton"), -1,
    "The renderer must not restore timeout-based readiness.");
assert.strictEqual(moduleSource.indexOf("MutationObserver"), -1,
    "Move Requests renderer must not add a host-button DOM observer.");

console.log("Move Request runtime-owned host button readiness contract: OK");
