"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var quick = fs.readFileSync(path.join(root, "public/native/desktop-commands.js"), "utf8");
var config = fs.readFileSync(path.join(root, "public/shared/ui/toolbar-config.js"), "utf8");

assert.ok(config.indexOf("collapse: { title: \"Collapse\", icon: svg('<path d=\"m15 18-6-6 6-6\"/>'), expandIcon: svg('<path d=\"m9 18 6-6-6-6\"/>')") >= 0,
    "Shared collapse artwork must remain unchanged for My Scripts/My Commands consumers.");
assert.ok(quick.indexOf('title: state.collapsed ? text("expand") : text("collapse")') >= 0 &&
    quick.indexOf('toolbar.setTitle("collapse", state.collapsed ? text("expand") : text("collapse"))') >= 0,
    "Quick title must continue to describe the action performed by the next click.");
assert.ok(quick.indexOf('toolbar.setIcon("collapse", state.collapsed ? collapseDefinition.icon : collapseDefinition.expandIcon)') >= 0,
    "Quick visual chevron must follow the user runtime contract: collapsed = left, expanded = right.");
assert.ok(quick.indexOf('writePreferences({ quickCollapsed: state.collapsed })') >= 0,
    "The collapse state controlling icon/title must remain persisted after each toggle.");

console.log("Quick collapse chevron follows the runtime state contract without changing shared artwork: OK");
