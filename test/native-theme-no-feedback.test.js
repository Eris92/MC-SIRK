"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var adapter = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar-config.js"), "utf8");
var lifecycle = fs.readFileSync(path.join(root, "public", "shared", "ui", "settings.js"), "utf8");
var layout = fs.readFileSync(path.join(root, "public", "shared", "ui", "layout.js"), "utf8");

assert.ok(adapter.indexOf("function syncOwnedClasses(element, desired)") >= 0,
    "The native adapter must update only classes whose desired state changed.");
assert.strictEqual(adapter.indexOf("function reset(element)"), -1,
    "The native adapter must not reset and re-add all classes on every pass.");
assert.ok(adapter.indexOf("contentObserver.observe(target, { childList: true, subtree: true })") >= 0,
    "The content observer must watch only newly inserted DOM nodes.");
assert.ok(adapter.indexOf('themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-bs-theme"] })') >= 0,
    "Theme attributes may be observed only on the document root.");
assert.ok(adapter.indexOf('themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class", "data-bs-theme"] })') >= 0,
    "Theme attributes may be observed only on the body.");
assert.strictEqual(adapter.indexOf("attributes: true, subtree: true"), -1,
    "The adapter must never observe class changes throughout the full document subtree.");
assert.ok(adapter.indexOf("Promise.resolve().then(function ()") >= 0,
    "Native class synchronization must be coalesced in a microtask before paint.");

assert.ok(lifecycle.indexOf("function installSynchronousToolbarTheme()") >= 0,
    "Toolbar active states must be synchronized directly instead of through an observer.");
assert.ok(lifecycle.indexOf("syncNativeButton(api.buttons && api.buttons[key])") >= 0,
    "Changing a toolbar state must immediately apply its native MeshCentral class.");
assert.ok(lifecycle.indexOf("childList: true,\n            subtree: true") >= 0,
    "The lifecycle observer may watch inserted children for asynchronous renderers.");
assert.strictEqual(lifecycle.indexOf("attributeFilter:"), -1,
    "The lifecycle observer must not watch attributes that it modifies itself.");
assert.strictEqual(lifecycle.indexOf("attributes: true"), -1,
    "The lifecycle observer must not create a class or aria feedback loop.");

assert.ok(layout.indexOf("layout.clear = function () {}") >= 0,
    "Shared rendering must suppress the legacy blank-layout clear step.");
assert.ok(layout.indexOf("renderQueued = true") >= 0,
    "Overlapping clicks must queue one final render instead of repainting concurrently.");

console.log("Native theme adapter and module rendering have no observer feedback loop: OK");
