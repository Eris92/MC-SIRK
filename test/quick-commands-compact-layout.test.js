"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var css = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.css"), "utf8");
var nativeCore = fs.readFileSync(path.join(root, "public", "native", "mesh-plugin-core.js"), "utf8");

assert.ok(css.indexOf(".sirk-quick-command-header{display:none!important}") >= 0,
    "The separate Quick commands title row must be hidden so the toolbar is first.");
assert.ok(css.indexOf("grid-template-rows:auto minmax(0,1fr)") >= 0,
    "The panel must contain only the toolbar row and the browser row.");
assert.ok(css.indexOf("width:min(965px,calc(100% - 52px))") >= 0,
    "The normal panel width must equal the maximum widths of its three grid columns.");
assert.ok(css.indexOf("minmax(320px,420px)") >= 0,
    "The third details column must retain its compact width cap.");
assert.ok(css.indexOf("minmax(165px,205px) minmax(285px,340px)") >= 0,
    "The first two columns must retain the My Commands geometry.");
assert.ok(css.indexOf(":has(.sirk-quick-command-browser.is-collapsed){width:min(824px") >= 0,
    "Collapsing categories must shrink the panel to the exact sum of the remaining columns.");
assert.ok(css.indexOf("width:min(865px,calc(100% - 52px))") >= 0 &&
    css.indexOf("width:min(744px,calc(100% - 52px))") >= 0,
    "Responsive panel widths must also equal the responsive column sums.");
assert.ok(css.indexOf("height:100%!important") >= 0 &&
    css.indexOf(".sirk-quick-command-details{display:flex;flex-direction:column") >= 0,
    "The details pane must fill the browser row and provide adaptive vertical layout.");
assert.ok(css.indexOf(".sirk-quick-command-status:not(:empty){display:block;flex:1 1 auto") >= 0 &&
    css.indexOf("max-width:none") >= 0 && css.indexOf("overflow:auto") >= 0,
    "Command output must fill the available details pane and scroll inside its own box.");
assert.ok(nativeCore.indexOf("sirk-quick-commands-layout-contract") >= 0 &&
    nativeCore.indexOf("padding:12px 8px!important") >= 0,
    "The details pane must use equal compact horizontal spacing on both sides.");
assert.ok(nativeCore.indexOf("__sirkPreserveQuickOutput") >= 0 &&
    nativeCore.indexOf("copyStatus(previousStatus, currentStatus)") >= 0,
    "Collapsing categories must preserve the current command output.");
assert.ok(nativeCore.indexOf("observer.observe(previousStatus") >= 0 &&
    nativeCore.indexOf("attributeFilter: [\"class\"]") >= 0,
    "Output preservation must continue while an in-flight command updates the detached result node.");
assert.ok(nativeCore.indexOf('mc-sirk-quickcommands-first-collapsed') >= 0,
    "Quick Commands must use a dedicated persistent first-column state key.");
assert.ok(nativeCore.indexOf("saveCollapsedPreference(currentCollapsed(panel))") >= 0,
    "Every collapse or expand action must save the resulting layout state.");
assert.ok(nativeCore.indexOf("readCollapsedPreference()") >= 0 &&
    nativeCore.indexOf("restoreCollapsedPreference(panel)") >= 0 &&
    nativeCore.indexOf("button.click()") >= 0,
    "The saved collapsed state must be restored when a new Quick Commands panel is mounted.");
assert.ok(nativeCore.indexOf("LEGACY_COLLAPSED_KEYS") >= 0 &&
    nativeCore.indexOf("shared.quickCollapsed") >= 0,
    "Existing saved Quick Commands preferences must migrate to the dedicated key.");

console.log("Exact-width persistent Quick Commands layout: OK");
