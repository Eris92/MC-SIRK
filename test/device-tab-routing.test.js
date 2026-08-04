"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var script = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.js"), "utf8");
var css = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.css"), "utf8");

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
    script.indexOf('headers.style.setProperty("display", "none", "important")') >= 0,
    "Commands and Plugins must keep separate active styling and Commands must hide the nested plugin header reliably.");
assert.ok(script.indexOf("getStoredPluginPage() === DEVICE_COMMANDS_PAGE") >= 0 &&
    script.indexOf("activeHeader === commandHeader") >= 0,
    "Reloading a device must restore Commands selection only when the Commands plugin page is active.");
assert.ok(script.indexOf("function mountDeviceCommands()") >= 0 &&
    script.indexOf('typeof module.mountDeviceCommands !== "function"') >= 0 &&
    script.indexOf("module.mountDeviceCommands(host, current)") >= 0 &&
    script.indexOf("host.__sirkCommandsMountedNode !== current") >= 0,
    "A Commands page restored after F5 must remount its shared page for the current device instead of remaining blank.");
assert.ok(script.indexOf("function activateDeviceCommandsPage()") >= 0 &&
    script.indexOf("window.pluginHandler.callPluginPage(DEVICE_COMMANDS_PAGE, header)") >= 0,
    "Restoring Commands must activate its plugin page before mounting content.");
assert.ok(script.indexOf("function replaceDeviceTitle()") >= 0 &&
    script.indexOf("Wtyczki|Plugins") >= 0 &&
    script.indexOf('"$1Commands$3"') >= 0 &&
    script.indexOf("function restoreDeviceTitle()") >= 0,
    "The device heading must read Commands - <device> while Commands is active and restore the native Plugins title on exit.");
assert.ok(script.indexOf('classList.toggle("sirk-device-commands-active", active)') >= 0 &&
    css.indexOf("html.sirk-device-commands-active #p19headers{display:none!important}") >= 0 &&
    css.indexOf("html.sirk-device-commands-active #p19pages{border-top:0!important") >= 0,
    "Commands must use a native single-page layout without the nested Plugins subheader and divider.");
assert.ok(css.indexOf("html.sirk-platform-workspace-active #p1title") >= 0 &&
    css.indexOf("font-size:24px!important") >= 0 &&
    css.indexOf("font-weight:700!important") >= 0,
    "SIRK workspace headings must match the prominent native MeshCentral page heading style.");

console.log("Commands refresh restore, native heading and Plugins routing: OK");
