"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var core = fs.readFileSync(path.join(root, "public", "shared", "core.js"), "utf8");
var shell = fs.readFileSync(path.join(root, "public", "shared", "module-shell.js"), "utf8");
var helper = fs.readFileSync(path.join(root, "public", "shared", "ui", "download-results.js"), "utf8");
var style = fs.readFileSync(path.join(root, "public", "shared", "styles", "main.css"), "utf8");
var runtime = fs.readFileSync(path.join(root, "public", "shared", "runtime.js"), "utf8");

assert.ok(core.indexOf("core.preparePluginMenuItem = function (item)") >= 0,
    "Menu entries must use the same native preparation flow as the working standalone MyScripts plugin.");
assert.ok(core.indexOf('item.setAttribute("data-meshcentral-plugin-menu"') >= 0,
    "Every SIRK menu item must be registered as an ordered MeshCentral plugin entry.");
assert.ok(core.indexOf("items = Array.prototype.slice.call(host.children)") >= 0,
    "Plugin entries must be sorted only inside their native menu host.");
assert.ok(core.indexOf("core.activePlugin = core.activePlugin || null") >= 0,
    "All SIRK modules must share one active-plugin owner exactly like standalone MyScripts.");
assert.ok(core.indexOf("core.setPluginMenuActive = function (main, left, active)") >= 0,
    "One native activation helper must control every SIRK module.");
assert.ok(core.indexOf('left.classList.add((String(left.tagName || "").toLowerCase() === "a"') >= 0 &&
    core.indexOf('"lbbuttonsel2"') >= 0,
    "Legacy left navigation must use MeshCentral's native lbbuttonsel2 state.");
assert.ok(core.indexOf('"#MainMenuSpan .fullselect"') >= 0 &&
    core.indexOf('"#page_leftbar .lbbuttonsel2"') >= 0,
    "Selection clearing must match the exact selectors used by the working MyScripts plugin.");
assert.ok(core.indexOf("[id^='MainMenu']") < 0 && core.indexOf("[id^='LeftMenu']") < 0,
    "SIRK must not clear arbitrary menu entries belonging to unrelated plugins.");
assert.ok(core.indexOf("core.installNativeRestoreGuard") < 0,
    "SIRK must not intercept pointer events from other plugins or native navigation.");
var workspaceStart = core.indexOf("core.showWorkspace = function");
var workspaceEnd = core.indexOf("core.element = function", workspaceStart);
assert.ok(workspaceStart >= 0 && workspaceEnd > workspaceStart &&
    core.slice(workspaceStart, workspaceEnd).indexOf("window.go(") < 0,
    "The shared workspace renderer must not call MeshCentral navigation on its own.");

assert.ok(shell.indexOf("if (typeof window.go === \"function\") window.go(1)") >= 0,
    "Each module must enter through the proven MyScripts go(1) lifecycle.");
assert.ok(shell.indexOf("core.activePlugin && core.activePlugin !== moduleInstance") >= 0,
    "Opening one SIRK module must close the previously active SIRK module.");
assert.ok(shell.indexOf("core.activePlugin = moduleInstance") >= 0,
    "The newly opened module must become the single active owner.");
assert.ok(shell.indexOf("state.active = true") >= 0 && shell.indexOf("state.active = false") >= 0,
    "Each module must maintain an explicit active state.");
assert.ok(shell.indexOf("if (state.active) close(true)") >= 0,
    "Native MeshCentral navigation must close an active SIRK module through goPageStart.");
assert.ok(shell.indexOf("syncMenu();") >= 0,
    "Every module must synchronize only its own menu item after native redraws.");
assert.ok(shell.indexOf("definition.order || definition.viewMode || 200") >= 0,
    "All SIRK menu entries must keep deterministic native ordering.");

assert.ok(helper.indexOf("function syncActiveSirkMenu()") < 0,
    "The download-results helper must not own or rewrite navigation state.");
assert.ok(helper.indexOf("sirk-native-menu-selected") < 0,
    "No plugin-owned selected class may compete with MeshCentral's native classes.");
assert.ok(helper.indexOf('attributeFilter: ["class", "style"]') < 0,
    "Download and command helpers must not observe menu class/style mutations.");
assert.ok(helper.indexOf("installCommandNodeResolver()") >= 0 && helper.indexOf("installMountHook()") >= 0,
    "Removing menu workarounds must preserve command node resolution and download handling.");

assert.ok(style.indexOf("sirk-platform-workspace-active .lbbutton") < 0,
    "Shared styles must not globally override MeshCentral or third-party plugin menu entries.");
assert.ok(style.indexOf("background-color:rgba(80,120,200,.28)!important") < 0,
    "The selected state must come from the native host theme.");

assert.ok(runtime.indexOf("notify(\"onNativePageStart\", view)") >= 0 &&
    runtime.indexOf("notify(\"onNativePageEnd\", view)") >= 0,
    "MeshCentral page hooks must reach every module lifecycle.");

console.log("Exact MyScripts-compatible SIRK menu lifecycle: OK");
