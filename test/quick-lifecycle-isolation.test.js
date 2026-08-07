"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var pluginMain = require("../plugin-main.js");

var root = path.join(__dirname, "..");
var startupSource = fs.readFileSync(path.join(root, "plugin-main.js"), "utf8");
var desktopSource = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.js"), "utf8");
var shellSource = fs.readFileSync(path.join(root, "public", "shared", "module-shell.js"), "utf8");

var hook = pluginMain.createSerializedStartupHook("1.8.20-test", "SIRKPortal");
var source = hook.toString();

assert.ok(source.indexOf('var browserVersion = "1.8.20-test"') >= 0 &&
    source.indexOf('var browserPin = "SIRKPortal"') >= 0,
    "The serialized browser hook must embed the exact plugin version and pin.");
assert.ok(source.indexOf('style("sirk-platform-desktop-commands-style", "desktop-commands.css")') >= 0,
    "Quick must load its static Desktop stylesheet from the canonical startup hook.");
assert.ok(source.indexOf('["sirk-platform-desktop-commands", "desktop-commands.js"]') >= 0,
    "Quick must load its canonical Desktop renderer through the normal serialized asset list.");
assert.ok(source.indexOf("scripts.reduce(function (chain, item)") >= 0,
    "Browser assets must be loaded serially without a secondary Quick lifecycle loader.");
assert.ok(source.indexOf("window.SirkPlatformRuntime.initialize()") >= 0 &&
    source.indexOf("window.SirkPlatformRuntime.onDeviceRefreshEnd(nodeId)") >= 0,
    "Quick lifecycle must enter through the shared browser runtime after assets load.");

assert.strictEqual(source.indexOf("MutationObserver"), -1,
    "Startup must never replace or scope the browser's global MutationObserver.");
assert.strictEqual(source.indexOf("WebKitMutationObserver"), -1,
    "Startup must never replace WebKitMutationObserver either.");
assert.strictEqual(source.indexOf("mesh-plugin-core"), -1,
    "The removed native compatibility core must not be reloaded by startup.");
assert.strictEqual(source.indexOf("quick-output-state"), -1,
    "The removed Quick output compatibility layer must not be reloaded by startup.");
assert.strictEqual(source.indexOf("currentScript"), -1,
    "Quick lifecycle must not infer ownership from whichever script happens to be executing.");

assert.strictEqual(desktopSource.indexOf("MutationObserver"), -1,
    "The canonical Quick renderer must not install detached-node or document-wide observers.");
assert.strictEqual(desktopSource.indexOf("mesh-plugin-core"), -1,
    "Quick renderer must not depend on the removed compatibility core.");
assert.ok(desktopSource.indexOf('document.getElementById("deskarea3x")') >= 0,
    "Quick must scope itself directly to the native Desktop stage.");
assert.ok(desktopSource.indexOf('panel.id = "SirkDesktopCommandsPanel"') >= 0 &&
    desktopSource.indexOf('wrapper.appendChild(panel)') >= 0,
    "Quick must own one explicit persistent panel instead of observing the full document.");

assert.ok(shellSource.indexOf("findDeviceTitleTextNode") >= 0 &&
    shellSource.indexOf("formatDeviceTitle") >= 0 &&
    shellSource.indexOf("setDeviceTitle(active)") >= 0,
    "Commands - <PC> title ownership must live in the device module shell, not in Quick startup hooks.");
assert.strictEqual(startupSource.indexOf("__sirkScheduleCommandsTitle"), -1,
    "Startup must not carry a second Commands title synchronizer.");

console.log("Quick lifecycle isolation without global observer or title monkey-patches: OK");
