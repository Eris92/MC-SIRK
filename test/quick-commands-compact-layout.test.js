"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var css = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.css"), "utf8").replace(/\r\n/g, "\n");
var script = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.js"), "utf8").replace(/\r\n/g, "\n");

assert.ok(css.indexOf(".sirk-quick-command-header{display:none!important}") >= 0,
    "The separate Quick commands title row must stay hidden so the toolbar is first.");
assert.ok(css.indexOf("grid-template-rows:auto minmax(0,1fr)") >= 0,
    "The panel must contain only the toolbar row and browser row.");
assert.ok(css.indexOf("width:min(845px,calc(100% - 52px))") >= 0,
    "The normal panel width must match the three-column maximum geometry.");
assert.ok(css.indexOf("minmax(240px,300px)") >= 0 &&
    css.indexOf("minmax(165px,205px) minmax(285px,340px)") >= 0,
    "Quick must retain the compact details column and My Commands first-two-column geometry.");
assert.ok(css.indexOf(":has(.sirk-quick-command-browser.is-collapsed){width:min(704px") >= 0,
    "Collapsing categories must shrink the panel to the remaining column geometry.");
assert.ok(css.indexOf(":has(.sirk-quick-command-browser.is-details-collapsed){width:min(545px") >= 0 &&
    css.indexOf(":has(.sirk-quick-command-browser.is-collapsed.is-details-collapsed){width:min(404px") >= 0,
    "Hiding output must remove the details width in both category states.");
assert.ok(css.indexOf(".is-details-collapsed{grid-template-columns:minmax(165px,205px) minmax(285px,340px) 0!important}") >= 0 &&
    css.indexOf(".is-collapsed.is-details-collapsed{grid-template-columns:64px minmax(285px,340px) 0!important}") >= 0 &&
    css.indexOf(".is-details-collapsed .sirk-quick-command-details{display:none!important}") >= 0,
    "The details pane must be completely removed from the grid when hidden.");
assert.ok(css.indexOf("height:100%!important") >= 0 &&
    css.indexOf(".sirk-quick-command-details{display:flex;flex-direction:column") >= 0,
    "The details pane must fill the browser row and provide adaptive vertical layout.");
assert.ok(css.indexOf(".sirk-quick-command-status:not(:empty){display:block;flex:1 1 auto") >= 0 &&
    css.indexOf("overflow:auto") >= 0,
    "Command output must fill the available details pane and scroll internally.");

assert.ok(script.indexOf('PREFERENCES_KEY = "sirkPlatform.mycommands.preferences"') >= 0,
    "Quick must share the canonical My Commands preferences store.");
assert.ok(script.indexOf("collapsed: preferences.quickCollapsed === true") >= 0 &&
    script.indexOf("detailsCollapsed: preferences.quickDetailsCollapsed === true") >= 0,
    "Quick must restore both category and details collapse state directly from preferences.");
assert.ok(script.indexOf("writePreferences({ quickCollapsed: state.collapsed })") >= 0,
    "Every category collapse action must persist its resulting state.");
assert.ok(script.indexOf("writePreferences({ quickDetailsCollapsed: state.detailsCollapsed })") >= 0,
    "Every details collapse action must persist its resulting state.");
assert.ok(script.indexOf('browser.classList.toggle("is-collapsed", state.collapsed)') >= 0 &&
    script.indexOf('browser.classList.toggle("is-details-collapsed", state.detailsCollapsed)') >= 0,
    "Persistent collapse state must be applied directly while rendering the Quick browser.");
assert.ok(script.indexOf('key: "details"') >= 0 &&
    script.indexOf("writeDetailsCollapsed(!state.detailsCollapsed)") >= 0,
    "The output visibility button must update the canonical details preference without a compatibility wrapper.");
assert.ok(script.indexOf("if (state.detailsCollapsed && (state.outputPending || changed)) state.outputAttention = true") >= 0 &&
    script.indexOf('classList.toggle("has-output-attention", state.outputAttention === true)') >= 0,
    "Hidden completed output must raise subtle attention on the details button.");
assert.ok(script.indexOf("function transientOutput(value)") >= 0 &&
    script.indexOf("Loading commands") >= 0 && script.indexOf("Command sent to the agent") >= 0,
    "Loading and submission progress must not be treated as completed hidden output.");
assert.ok(script.indexOf("if (!state.detailsCollapsed) state.outputAttention = false") >= 0,
    "Opening the output pane must clear unseen-output attention.");
assert.ok(script.indexOf("state.detail = value") >= 0 &&
    script.indexOf("state.output = \"\"") >= 0 &&
    script.indexOf("confirmAndSubmit(value, {}, button, panel)") >= 0,
    "Selecting a variable-free Quick item must clear stale output and pass execution through the native confirmation-aware submit owner.");
assert.ok(script.indexOf("if (values == null) return;\n                return confirmAndSubmit(value, values, button, panel)") >= 0,
    "Parameterized Quick execution must keep Output collapsed during input and preserve values through the confirmation-aware submit owner.");
assert.ok(script.indexOf("writeDetailsCollapsed(false);\n            submit(item, values, null, panel, true)") >= 0 &&
    script.indexOf("writeDetailsCollapsed(false);\n            submit(item, values, null, panel, false)") >= 0,
    "Quick Output must reveal only when the confirmation-aware owner actually starts execution.");
assert.strictEqual(script.indexOf("MutationObserver"), -1,
    "Quick state preservation must not depend on detached-node observers.");
assert.strictEqual(script.indexOf("LEGACY_COLLAPSED_KEYS"), -1,
    "Removed compatibility preference keys must not return.");
assert.strictEqual(script.indexOf("installToolbarHook"), -1,
    "Quick persistence must live in the canonical renderer instead of monkey-patching the toolbar.");

console.log("Canonical compact Quick Commands layout, persistence, native parameter/confirmation dialogs and hidden-output attention: OK");
