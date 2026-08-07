"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var core = fs.readFileSync(path.join(root, "public", "shared", "core.js"), "utf8");
var shell = fs.readFileSync(path.join(root, "public", "shared", "module-shell.js"), "utf8");
var page = fs.readFileSync(path.join(root, "public", "shared", "ui", "page.js"), "utf8");
var results = fs.readFileSync(path.join(root, "public", "shared", "ui", "results.js"), "utf8");
var style = fs.readFileSync(path.join(root, "public", "shared", "styles", "main.css"), "utf8");
var runtime = fs.readFileSync(path.join(root, "public", "shared", "runtime.js"), "utf8");

assert.ok(core.indexOf("core.preparePluginMenuItem = function (item)") >= 0,
    "Menu entries must use one canonical MeshCentral preparation flow.");
assert.ok(core.indexOf('item.setAttribute("data-meshcentral-plugin-menu"') >= 0,
    "Every SIRK menu item must be registered as an ordered MeshCentral plugin entry.");
assert.ok(core.indexOf("items = Array.prototype.slice.call(host.children)") >= 0,
    "Plugin entries must be sorted only inside their native menu host.");
assert.ok(core.indexOf("core.activePlugin = core.activePlugin || null") >= 0,
    "All SIRK modules must share one active-plugin owner.");
assert.ok(core.indexOf("core.setPluginMenuActive = function (main, left, active)") >= 0,
    "Core must expose one menu activation API for every SIRK module.");
assert.ok(core.indexOf('"#MainMenuSpan .fullselect"') >= 0 &&
    core.indexOf('"#page_leftbar .lbbuttonsel2"') >= 0,
    "Selection clearing must target native MeshCentral selected states only.");
assert.ok(core.indexOf("[id^='MainMenu']") < 0 && core.indexOf("[id^='LeftMenu']") < 0,
    "SIRK must not clear arbitrary menu entries belonging to unrelated plugins.");
assert.ok(core.indexOf("core.installNativeRestoreGuard") < 0,
    "SIRK must not intercept pointer events from other plugins or native navigation.");

assert.ok(page.indexOf("installNativeLeftMenuContract();") >= 0,
    "Native menu normalization must have one explicit owner in SharedPage.");
assert.ok(page.indexOf("core.setPluginMenuActive = function (main, left, active)") >= 0,
    "SharedPage must normalize activation to the current MeshCentral menu shape.");
assert.ok(page.indexOf('item.classList.remove("lbbuttonsel", "lbbuttonsel2", "active")') >= 0,
    "Menu normalization must clear only known native selected classes from the SIRK item itself.");
assert.ok(page.indexOf("core.__nativeLeftMenuContractInstalled") >= 0,
    "The native menu contract must install once and remain idempotent.");

assert.ok(shell.indexOf("if (typeof window.go === \"function\") window.go(1)") >= 0,
    "Each workspace module must enter through MeshCentral's native device lifecycle.");
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

assert.strictEqual(results.indexOf("syncActiveSirkMenu"), -1,
    "The canonical results renderer must not own or rewrite navigation state.");
assert.strictEqual(results.indexOf("sirk-native-menu-selected"), -1,
    "No results helper may introduce a plugin-owned selected class.");
assert.strictEqual(results.indexOf("new MutationObserver"), -1,
    "Results/download behavior must not observe menu or DOM mutations.");
assert.ok(results.indexOf("parseDownloadResult") >= 0 &&
    results.indexOf('SirkPlatformCore.assetUrl("", "download"') >= 0,
    "CSV download handling must remain inside the canonical result renderer without navigation hooks.");

assert.ok(style.indexOf("sirk-platform-workspace-active .lbbutton") < 0,
    "Shared styles must not globally override MeshCentral or third-party plugin menu entries.");
assert.ok(style.indexOf("background-color:rgba(80,120,200,.28)!important") < 0,
    "Selected menu state must come from the native host theme.");

assert.ok(runtime.indexOf("notify(\"onNativePageStart\", view)") >= 0 &&
    runtime.indexOf("notify(\"onNativePageEnd\", view)") >= 0,
    "MeshCentral page hooks must reach every module lifecycle.");

console.log("Canonical SIRK menu lifecycle and selection ownership: OK");
