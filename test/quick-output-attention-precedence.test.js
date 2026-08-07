"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var desktop = read("public/native/desktop-commands.js");
var desktopCss = read("public/native/desktop-commands.css");
var toolbarCss = read("public/shared/ui/toolbar.css");
var settings = read("public/shared/ui/settings.js");
var adapter = read("public/shared/ui/toolbar-config.js");

assert.ok(desktop.indexOf('function syncOutputAttention(panel)') >= 0 &&
    desktop.indexOf('button.classList.toggle("has-output-attention", state.outputAttention === true)') >= 0,
    "Quick renderer must own the visible hidden-output attention state directly.");
assert.ok(desktop.indexOf('if (state.detailsCollapsed && (state.outputPending || changed)) state.outputAttention = true') >= 0,
    "A new final result must raise attention only when Output is hidden.");
assert.ok(desktop.indexOf('if (!state.detailsCollapsed) state.outputAttention = false') >= 0,
    "Opening Output must clear attention immediately.");
assert.ok(desktop.indexOf('function transientOutput(value)') >= 0 &&
    desktop.indexOf('Loading commands') >= 0 &&
    desktop.indexOf('Command sent to the agent') >= 0 &&
    desktop.indexOf('Command list refreshed') >= 0,
    "Loading, submission and refresh messages must remain transient and must not create a completed-result alert.");
assert.ok(desktop.indexOf('function writeDetailsCollapsed(value)') >= 0 &&
    desktop.indexOf('writePreferences({ quickDetailsCollapsed: state.detailsCollapsed })') >= 0,
    "The real collapsed state and persistence must have one owner in the Quick renderer.");
assert.ok(desktop.indexOf('key: "details"') >= 0 &&
    desktop.indexOf('active: !state.detailsCollapsed') >= 0 &&
    desktop.indexOf('writeDetailsCollapsed(!state.detailsCollapsed)') >= 0,
    "The Output toolbar action must derive its logical active state from the same collapsed state.");

assert.strictEqual(settings.indexOf("QUICK_OUTPUT_HIDDEN_KEY"), -1,
    "Settings must not carry a second Quick output persistence controller.");
assert.strictEqual(settings.indexOf("syncQuickOutputAttention"), -1,
    "Settings must not duplicate Quick output attention logic.");
assert.strictEqual(settings.indexOf("MutationObserver"), -1,
    "Quick output state must not be synchronized through lifecycle observers.");
assert.strictEqual(desktop.indexOf("quick-output-state"), -1,
    "The removed Quick output compatibility controller must not return.");

assert.ok(adapter.indexOf('syncOwnedClasses(element, ["btn", "btn-" +') >= 0 &&
    adapter.indexOf('syncOwnedClasses(element, [selected ? "style10s" : "style10"])') >= 0,
    "Output actions must return to native Modern or Classic button styling.");
assert.ok(adapter.indexOf("function syncOwnedClasses(element, desired)") >= 0,
    "Output action styling must update only adapter-owned native classes.");

assert.ok(toolbarCss.indexOf('.sirk-quick-command-output-toggle.has-output-attention') >= 0,
    "A completed hidden Quick result must retain a visible attention state.");
assert.ok(toolbarCss.indexOf("rgba(var(--bs-danger-rgb),.18)") >= 0 &&
    toolbarCss.indexOf("border-color:var(--bs-danger)!important") >= 0 &&
    toolbarCss.indexOf("color:var(--bs-danger)!important") >= 0,
    "Modern attention styling must use host Bootstrap danger tokens.");
assert.ok(toolbarCss.indexOf('.sirk-desktop-commands-panel .sirk-quick-command-toolbar-host{padding:8px 10px 10px!important}') >= 0,
    "Quick toolbar buttons must keep a bottom gutter before the column divider lines.");
[
    "#b42318", "#fca5a5", "rgba(220,38,38", "rgba(248,113,113"
].forEach(function (value) {
    assert.strictEqual(toolbarCss.indexOf(value), -1,
        "Quick output attention must not restore a fixed plugin danger palette: " + value);
});

[
    [desktopCss, "--sdc-focus", "Quick-owned focus palette"],
    [desktopCss, "has-output-attention{", "Quick-owned attention colors in desktop geometry CSS"],
    [desktopCss, "box-shadow:inset 3px", "Quick-only active stripe"],
    [desktopCss, "outline:1px solid currentColor", "plugin-owned active outline"]
].forEach(function (entry) {
    assert.strictEqual(entry[0].indexOf(entry[1]), -1,
        "Native Quick output contract forbids " + entry[2] + ".");
});

console.log("Quick hidden-output attention has one canonical state owner and native styling: OK");
