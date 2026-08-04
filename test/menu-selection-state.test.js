"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var core = fs.readFileSync(path.join(root, "public", "shared", "core.js"), "utf8");
var helper = fs.readFileSync(path.join(root, "public", "shared", "ui", "download-results.js"), "utf8");

assert.ok(core.indexOf("core.activateMenu = function (viewMode)") >= 0,
    "Opening a SIRK workspace must synchronize the native MeshCentral menu selection.");
assert.ok(core.indexOf("core.workspaceState.menuSelection = peers.map") >= 0,
    "The previous native menu selection must be captured before changing it.");
assert.ok(core.indexOf('isLeft ? "lbbuttonsel2" : "fullselect"') >= 0,
    "Opening a SIRK workspace must immediately use MeshCentral's fully selected left-menu class.");
assert.ok(core.indexOf("item.element.className = item.className") >= 0,
    "Leaving the SIRK workspace must restore the original native menu classes.");

assert.ok(helper.indexOf("function activeSirkViewMode()") >= 0,
    "Active navigation must be resolved independently from a stale URL query string.");
assert.ok(helper.indexOf("core && core.workspaceState && core.workspaceState.viewMode") >= 0,
    "The live SIRK workspace must be the primary active-module source.");
assert.ok(helper.indexOf("function syncActiveSirkMenu()") >= 0,
    "The active SIRK menu must be re-applied after MeshCentral redraws navigation.");
assert.ok(helper.indexOf("document.querySelectorAll('[id^=\"MainMenu\"],[id^=\"LeftMenu\"]')") >= 0,
    "All native and plugin menu entries must be considered, not only direct siblings.");
assert.ok(helper.indexOf('left ? "lbbuttonsel2" : "fullselect"') >= 0,
    "Legacy left navigation must use MeshCentral's actual selected class lbbuttonsel2.");
assert.ok(helper.indexOf("sirk-native-menu-selected") >= 0,
    "The selected SIRK menu item must have a deterministic plugin-owned visual state.");
assert.ok(helper.indexOf('"background:#f4f6f8!important') >= 0,
    "The active legacy menu item must receive a light filled background.");
assert.ok(helper.indexOf("function setImportantStyle(item, property, value)") >= 0,
    "Inline selection styling must be idempotent to avoid mutation-observer loops.");
assert.ok(helper.indexOf('attributeFilter: ["class", "style"]') >= 0,
    "Native class and inline-style changes must trigger menu re-synchronization.");
assert.ok(helper.indexOf("window.setTimeout(scan, 250)") >= 0,
    "The active state must be re-applied after delayed native go(1) rendering.");
assert.ok(helper.indexOf('item.setAttribute("aria-current", "page")') >= 0,
    "The active SIRK entry must expose the current-page state.");

console.log("SIRK menu selection state: OK");
