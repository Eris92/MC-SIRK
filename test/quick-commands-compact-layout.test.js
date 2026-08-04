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
assert.ok(css.indexOf("width:min(845px,calc(100% - 52px))") >= 0,
    "The normal panel width must equal the smaller maximum widths of its three grid columns.");
assert.ok(css.indexOf("minmax(240px,300px)") >= 0,
    "The third details column must use the reduced width cap.");
assert.ok(css.indexOf("minmax(165px,205px) minmax(285px,340px)") >= 0,
    "The first two columns must retain the My Commands geometry.");
assert.ok(css.indexOf(":has(.sirk-quick-command-browser.is-collapsed){width:min(704px") >= 0,
    "Collapsing categories must shrink the panel to the exact sum of the remaining columns.");
assert.ok(css.indexOf(":has(.sirk-quick-command-browser.is-details-collapsed){width:min(545px") >= 0 &&
    css.indexOf(":has(.sirk-quick-command-browser.is-collapsed.is-details-collapsed){width:min(404px") >= 0,
    "Hiding output must remove the details width from both normal and category-collapsed panels.");
assert.ok(css.indexOf("width:min(765px,calc(100% - 52px))") >= 0 &&
    css.indexOf("width:min(644px,calc(100% - 52px))") >= 0 &&
    css.indexOf("width:min(485px,calc(100% - 52px))") >= 0 &&
    css.indexOf("width:min(364px,calc(100% - 52px))") >= 0,
    "Responsive panel widths must equal the responsive column sums in every collapse state.");
assert.ok(css.indexOf(".is-details-collapsed{grid-template-columns:minmax(165px,205px) minmax(285px,340px) 0!important}") >= 0 &&
    css.indexOf(".is-collapsed.is-details-collapsed{grid-template-columns:64px minmax(285px,340px) 0!important}") >= 0 &&
    css.indexOf(".is-details-collapsed .sirk-quick-command-details{display:none!important}") >= 0,
    "The details pane must be completely removed from the grid when hidden.");
assert.ok(css.indexOf("height:100%!important") >= 0 &&
    css.indexOf(".sirk-quick-command-details{display:flex;flex-direction:column") >= 0,
    "The details pane must fill the browser row and provide adaptive vertical layout.");
assert.ok(css.indexOf(".sirk-quick-command-status:not(:empty){display:block;flex:1 1 auto") >= 0 &&
    css.indexOf("max-width:none") >= 0 && css.indexOf("overflow:auto") >= 0,
    "Command output must fill the available details pane and scroll inside its own box.");
assert.ok(nativeCore.indexOf("sirk-quick-commands-layout-contract") >= 0 &&
    nativeCore.indexOf("padding:12px 8px!important") >= 0,
    "The details pane must keep equal compact horizontal spacing on both sides.");
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
assert.ok(nativeCore.indexOf("installToolbarHook") >= 0 &&
    nativeCore.indexOf("__sirkQuickPersistenceWrapped") >= 0 &&
    nativeCore.indexOf("effective.buttons.collapse") >= 0,
    "Quick persistence must wrap the known toolbar collapse action instead of matching a translated DOM title.");
assert.ok(nativeCore.indexOf("restoreCollapsedPreference(panel,") >= 0 &&
    nativeCore.indexOf("__sirkQuickRestoredBrowser") >= 0 &&
    nativeCore.indexOf("button.click()") >= 0,
    "The saved state must be restored for each newly rendered Quick Commands browser.");
assert.ok(nativeCore.indexOf("__sirkQuickToggleInProgress") >= 0,
    "A user collapse action must not be reversed by restore logic during its own synchronous render.");
assert.ok(nativeCore.indexOf("LEGACY_COLLAPSED_KEYS") >= 0 &&
    nativeCore.indexOf("shared.quickCollapsed") >= 0,
    "Existing saved Quick Commands preferences must migrate to the dedicated key.");

console.log("Exact-width dual-collapse Quick Commands layout: OK");
