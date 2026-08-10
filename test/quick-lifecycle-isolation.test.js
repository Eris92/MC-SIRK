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
    "Quick must remain declared in the canonical deferred asset list.");
assert.ok(source.indexOf('var coreReady = load("sirk-platform-core", asset("core.js"))') >= 0 &&
    source.indexOf("Promise.all(criticalScripts.map") >= 0 &&
    source.indexOf("deferredScripts.filter(function (item)") >= 0 &&
    source.indexOf("}).map(function (item)") >= 0,
    "Browser startup must keep critical and independent deferred assets parallel under one canonical owner.");
assert.ok(source.indexOf('var scriptToolsReady = load("sirk-platform-script-tools", asset("shared-ui/script-tools.js"))') >= 0 &&
    source.indexOf("var parameterDialogReady = scriptToolsReady.then(function ()") >= 0 &&
    source.indexOf('return load("sirk-platform-parameter-dialog", asset("shared-ui/parameter-dialog.js"))') >= 0 &&
    source.indexOf("deferredReady.push(parameterDialogReady.then(function ()") >= 0 &&
    source.indexOf('return load("sirk-platform-desktop-commands", asset("desktop-commands.js"))') >= 0,
    "Only the real script-tools -> parameter-dialog -> Quick dependency must be serialized inside the shared startup owner.");
assert.ok(source.indexOf('window.SirkPlatformCore.api("", "bootstrap")') >= 0 &&
    source.indexOf("window.SirkPlatformRuntime.prepare(bootstrapReady)") >= 0 &&
    source.indexOf("window.SirkPlatformRuntime.initialize(dependenciesReady)") >= 0 &&
    source.indexOf("window.SirkPlatformRuntime.onDeviceRefreshEnd(nodeId)") >= 0,
    "Quick lifecycle must remain owned by the shared browser runtime while reusing the single early bootstrap request.");
assert.strictEqual(source.indexOf("loadQuick"), -1,
    "Startup must not introduce a secondary Quick-specific lifecycle loader.");

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

console.log("Quick lifecycle isolation with shared parameter-dialog dependency and no global observer/title monkey-patches: OK");
