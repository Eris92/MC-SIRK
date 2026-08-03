"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }

var tabs = read("public/native/device-tabs.js");
var css = read("public/native/device-tabs.css");
var main = read("plugin-main.js");
var admin = read("admin.js");
[
    'var STORAGE_KEY = "sirkPortal.deviceTabs"',
    'function createHostFrame(pane)',
    'frame.className = "sirk-device-isolated-frame"',
    'function showPane(key)',
    'function closeTab(key)',
    'window.SirkPlatformDeviceTabs'
].forEach(function (value) { assert.ok(tabs.indexOf(value) >= 0, "Missing native device-tabs contract: " + value); });
[".sirk-device-tabs", ".sirk-device-session-layer", ".sirk-device-isolated-frame"].forEach(function (value) {
    assert.ok(css.indexOf(value) >= 0, "Missing native device-tabs CSS: " + value);
});
assert.ok(main.indexOf('style("sirk-platform-device-tabs-style", "portal-device-tabs.css")') >= 0);
assert.ok(main.indexOf('["sirk-platform-device-tabs", "portal-device-tabs.js"]') >= 0);
assert.ok(admin.indexOf('"portal-device-tabs.js"') >= 0 && admin.indexOf('"portal-device-tabs.css"') >= 0);
console.log("Native MeshCentral device tabs: OK");
