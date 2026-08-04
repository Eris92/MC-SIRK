"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var source = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "core.js"), "utf8");

assert.ok(source.indexOf("core.activateMenu = function (viewMode)") >= 0,
    "Opening a SIRK workspace must synchronize the native MeshCentral menu selection.");
assert.ok(source.indexOf('item.classList.remove("fullselect", "semiselect", "active", "lbbuttonsel", "lbbuttonsel2")') >= 0,
    "Native Devices and other menu entries must be deselected while a SIRK workspace is active.");
assert.ok(source.indexOf('isLeft ? "lbbuttonsel" : "fullselect"') >= 0,
    "Legacy left and main menus must use MeshCentral's selected classes.");
assert.ok(source.indexOf('item.setAttribute("aria-current", "page")') >= 0,
    "The active SIRK entry must expose the current-page state to assistive technology.");
assert.ok(source.indexOf("core.workspaceState.menuSelection = peers.map") >= 0,
    "The previous native menu selection must be captured before changing it.");
assert.ok(source.indexOf("item.element.className = item.className") >= 0,
    "Leaving the SIRK workspace must restore the original native menu classes.");
assert.ok(source.indexOf("core.activateMenu(viewMode)") >= 0,
    "Every workspace open, including switching between SIRK modules, must activate its own menu entry.");

console.log("SIRK menu selection state: OK");
