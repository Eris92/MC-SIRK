"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var shell = fs.readFileSync(path.join(root, "public", "shared", "module-shell.js"), "utf8");
var commands = fs.readFileSync(path.join(root, "public", "modules", "commands", "index.js"), "utf8");

assert.ok(commands.indexOf('pageId: "sirk-platform-mycommands-device-page"') >= 0 &&
    commands.indexOf('topTabId: "MainDevSirkPlatform-Commands"') >= 0 &&
    shell.indexOf('document.getElementById("MainDevPlugins")') >= 0,
    "Commands routing must explicitly distinguish the custom Commands page from native Plugins.");
assert.ok(shell.indexOf('previousPageKey = "sirkPlatform.previousNativePluginPage"') >= 0 &&
    shell.indexOf("rememberNativePage") >= 0 &&
    shell.indexOf("selectNativePage") >= 0,
    "Commands must remember the last native plugin page before taking over view 19.");
assert.ok(shell.indexOf("putStoredPage(target)") >= 0 &&
    shell.indexOf('plugins.addEventListener("mousedown", restoreNativeFromTab, true)') >= 0 &&
    shell.indexOf('plugins.addEventListener("mouseup", restoreNativeFromTab, true)') >= 0 &&
    shell.indexOf("if (!enabled()) return;") >= 0,
    "Clicking Plugins may restore its native page before MeshCentral handles the tab, but the hook must be inert when Commands is disabled.");
assert.strictEqual(shell.indexOf('plugins.style.display = ""'), -1,
    "Commands must not force the native Plugins tab display state.");
assert.ok(shell.indexOf("if (plugins && status.pluginView)") >= 0 &&
    shell.indexOf('plugins.classList.remove("style3x", "style3sel")') >= 0 &&
    shell.indexOf('plugins.classList.add(active ? "style3x" : "style3sel")') >= 0,
    "Commands and native Plugins must exchange only the native selected classes while view 19 owns the header.");
assert.strictEqual(shell.indexOf("plugins.className ="), -1,
    "Commands selection synchronization must not overwrite the native Plugins className.");
assert.ok(shell.indexOf('tab.classList.add(active ? "style3sel" : "style3x")') >= 0 &&
    shell.indexOf('headers.style.setProperty("display", "none", "important")') >= 0 &&
    shell.indexOf('headers.style.removeProperty("display")') >= 0,
    "Commands must keep its custom tab and nested plugin header visibility synchronized with the same active state.");
assert.ok(shell.indexOf('view === 19 && stored === pageId') >= 0 &&
    shell.indexOf('activePageId() !== pageId') >= 0 &&
    shell.indexOf('selectPluginPage(pageId)') >= 0,
    "Reloading a device must restore Commands selection only when the Commands plugin page is requested.");
assert.ok(shell.indexOf('commandsActive: view === 19 && activePage === pageId') >= 0,
    "Commands active state must depend on the actual active nested page, not view 19 alone.");

console.log("Commands routing synchronizes native Plugins selection without replacing native ownership: OK");
