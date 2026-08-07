"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), "utf8");
}

var pluginMain = read("plugin-main.js");
var admin = read("admin.js");
var desktopPath = path.join(root, "public", "native", "desktop-commands.js");

assert.ok(
    pluginMain.indexOf('["sirk-platform-desktop-commands", "desktop-commands.js"]') >= 0,
    "The canonical Quick renderer must be present in the serialized browser startup chain."
);
assert.ok(
    admin.indexOf('"desktop-commands.js": ["public/native/desktop-commands.js", "text/javascript; charset=utf-8"]') >= 0,
    "Every startup script must be exposed by pluginadmin.ashx with a JavaScript MIME type."
);
assert.ok(
    fs.existsSync(desktopPath) && fs.statSync(desktopPath).isFile(),
    "The mapped canonical Quick renderer file must exist."
);
var desktop = read("public/native/desktop-commands.js");
assert.ok(
    desktop.indexOf("window.SirkDesktopCommands = { refresh: refreshLifecycle }") >= 0,
    "The mapped Quick renderer must expose its single lifecycle entrypoint."
);
assert.ok(
    desktop.indexOf('detailsCollapsed: preferences.quickDetailsCollapsed === true') >= 0 &&
    desktop.indexOf('function writeDetailsCollapsed(value)') >= 0,
    "Quick output visibility must be owned directly by the canonical renderer."
);

assert.strictEqual(pluginMain.indexOf("quick-output-state.js"), -1,
    "Startup must not load the removed Quick output compatibility controller.");
assert.strictEqual(admin.indexOf('"quick-output-state.js"'), -1,
    "The asset router must not expose the removed Quick output compatibility controller.");
assert.strictEqual(fs.existsSync(path.join(root, "public", "native", "quick-output-state.js")), false,
    "The removed Quick output compatibility file must not exist in the repository.");
assert.strictEqual(pluginMain.indexOf("mesh-plugin-core.js"), -1,
    "Startup must not load the removed native compatibility core.");

console.log("Canonical startup asset and JavaScript MIME contract: OK");
