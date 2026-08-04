"use strict";

var assert = require("assert");
var pluginMain = require("../plugin-main.js");

var hook = pluginMain.createSerializedStartupHook("9.9.9", "SIRKPortal");
var source = hook.toString();

assert.strictEqual(typeof hook, "function");
assert.ok(source.indexOf("9.9.9") >= 0, "Serialized startup hook must embed the version literal.");
assert.ok(source.indexOf("SIRKPortal") >= 0, "Serialized startup hook must embed the plugin pin literal.");
assert.ok(!/\bVERSION\b/.test(source), "Serialized startup hook must not reference server-side VERSION.");
assert.ok(!/\bobj\b/.test(source), "Serialized startup hook must not reference server-side obj.");
assert.ok(!/browserRuntime\s*\(/.test(source), "Serialized hooks must not depend on a closure helper.");
assert.ok(source.indexOf("window.__SIRK_CURRENT_NODE_ID__") >= 0,
    "Browser startup must replay a device identifier captured before runtime initialization.");
assert.ok(source.indexOf("window.SirkPlatformRuntime.onDeviceRefreshEnd(nodeId)") >= 0,
    "The pending native device identifier must be delivered after runtime initialization.");

var pluginSource = require("fs").readFileSync(require("path").join(__dirname, "..", "plugin-main.js"), "utf8");
["goPageStart", "goPageEnd", "onDeviceRefreshEnd", "commandResult"].forEach(function (name) {
    var start = pluginSource.indexOf("obj." + name + " = function");
    assert.ok(start >= 0, "Missing hook: " + name);
    var body = pluginSource.slice(start, pluginSource.indexOf("};", start) + 2);
    assert.ok(body.indexOf("window.SirkPlatformRuntime") >= 0, name + " must access runtime directly from window.");
    assert.ok(body.indexOf("browserRuntime") < 0, name + " must not use a closure helper.");
});

var deviceHookStart = pluginSource.indexOf("obj.onDeviceRefreshEnd = function");
var deviceHook = pluginSource.slice(deviceHookStart, pluginSource.indexOf("obj.commandResult", deviceHookStart));
assert.ok(deviceHook.indexOf("window.__SIRK_CURRENT_NODE_ID__ = currentNodeId") >= 0,
    "The native device hook must retain the node identifier even when runtime is not loaded yet.");
assert.ok(deviceHook.indexOf("currentNodeId || String(window.__SIRK_CURRENT_NODE_ID__ || \"\")") >= 0,
    "The native device hook must preserve the last captured device context during startup races.");

console.log("Serialized browser hooks: OK");
