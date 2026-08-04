"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var script = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.js"), "utf8");

assert.ok(script.indexOf('DEVICE_COMMANDS_PAGE = "sirk-platform-mycommands-device-page"') >= 0 &&
    script.indexOf('DEVICE_COMMANDS_TAB = "MainDevSirkPlatform-Commands"') >= 0 &&
    script.indexOf('document.getElementById("MainDevPlugins")') >= 0,
    "Commands routing must explicitly distinguish the custom Commands page from native Plugins.");
assert.ok(script.indexOf('PREVIOUS_PLUGIN_PAGE_KEY = "sirkPlatform.previousNativePluginPage"') >= 0 &&
    script.indexOf("rememberNativePluginPage") >= 0 &&
    script.indexOf("restoreNativePluginPage") >= 0,
    "Commands must remember the last native plugin page before taking over view 19.");
assert.ok(script.indexOf("putStoredPluginPage(target)") >= 0 &&
    script.indexOf('plugins.addEventListener("mousedown", restoreNativePluginPage, true)') >= 0 &&
    script.indexOf('plugins.addEventListener("mouseup", restoreNativePluginPage, true)') >= 0,
    "Clicking Plugins must restore its native page before MeshCentral processes the tab action.");
assert.ok(script.indexOf('plugins.style.display = ""') >= 0,
    "Opening Commands must never hide the native Plugins tab.");
assert.ok(script.indexOf('commands.classList.add(active ? "style3sel" : "style3x")') >= 0 &&
    script.indexOf('plugins.classList.add("style3x")') >= 0 &&
    script.indexOf('headers.style.display = active ? "none" : ""') >= 0,
    "Commands and Plugins must keep separate active styling and plugin header visibility.");
assert.ok(script.indexOf("getStoredPluginPage() === DEVICE_COMMANDS_PAGE") >= 0 &&
    script.indexOf("activeHeader === commandHeader") >= 0,
    "Reloading a device must restore Commands selection only when the Commands plugin page is active.");

console.log("Commands and native Plugins device-tab routing: OK");
