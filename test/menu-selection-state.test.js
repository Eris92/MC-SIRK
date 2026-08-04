"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var core = fs.readFileSync(path.join(root, "public", "shared", "core.js"), "utf8");
var helper = fs.readFileSync(path.join(root, "public", "shared", "ui", "download-results.js"), "utf8");
var style = fs.readFileSync(path.join(root, "public", "shared", "styles", "main.css"), "utf8");
var runtime = fs.readFileSync(path.join(root, "public", "shared", "runtime.js"), "utf8");

assert.ok(core.indexOf("core.preparePluginMenuItem = function (item)") >= 0,
    "Menu entries must use the proven native plugin menu preparation flow.");
assert.ok(core.indexOf('item.setAttribute("data-meshcentral-plugin-menu"') >= 0,
    "Every SIRK menu item must be registered as an ordered MeshCentral plugin entry.");
assert.ok(core.indexOf("items = Array.prototype.slice.call(host.children)") >= 0 &&
    core.indexOf("data-meshcentral-plugin-menu") >= 0,
    "Plugin menu entries must be sorted deterministically after the native Devices anchor.");
assert.ok(core.indexOf("core.setPluginMenuActive = function (main, left, active)") >= 0,
    "One shared native activation helper must control every SIRK module.");
assert.ok(core.indexOf('left.classList.add(modernMenuItem(left) ? "active" : "lbbuttonsel2")') >= 0,
    "Legacy left navigation must use MeshCentral's native lbbuttonsel2 state.");
assert.ok(core.indexOf("#MainMenuSpan [id^='MainMenu']") >= 0 &&
    core.indexOf("#page_leftbar [id^='LeftMenu']") >= 0,
    "Selection clearing must be scoped to the actual MeshCentral navigation containers.");
assert.ok(core.indexOf("core.activeViewMode = value") >= 0,
    "The current SIRK module must be tracked explicitly instead of inferred from redraw side effects.");
assert.ok(core.indexOf("core.activateMenu(viewMode)") >= 0,
    "Opening a SIRK workspace must select its menu immediately.");
assert.ok(core.indexOf("core.isNativeMenuTarget = function (target)") >= 0,
    "Only a real native menu activation may close the active SIRK workspace.");

assert.ok(helper.indexOf("function syncActiveSirkMenu()") < 0,
    "The download-results helper must not own or rewrite navigation state.");
assert.ok(helper.indexOf("sirk-native-menu-selected") < 0,
    "No second plugin-owned selected class may compete with MeshCentral's native menu classes.");
assert.ok(helper.indexOf('attributeFilter: ["class", "style"]') < 0,
    "Download and command helpers must not observe menu class/style mutations.");
assert.ok(helper.indexOf("installCommandNodeResolver()") >= 0 &&
    helper.indexOf("installMountHook()") >= 0,
    "Removing menu workarounds must preserve command node resolution and download handling.");

assert.ok(style.indexOf("sirk-platform-workspace-active .lbbutton") < 0,
    "Shared styles must not globally override inactive or active MeshCentral menu entries.");
assert.ok(style.indexOf("background-color:rgba(80,120,200,.28)!important") < 0,
    "The selected state must come from the native host theme, not a forced plugin color.");

assert.ok(runtime.indexOf('!(Number(view) === 1 && core.workspaceState)') >= 0 &&
    runtime.indexOf('core.activateMenu(core.workspaceState.viewMode)') >= 0,
    "A native p1 redraw must preserve the current SIRK module and reapply its native selection.");

console.log("Native SIRK menu controller: OK");
