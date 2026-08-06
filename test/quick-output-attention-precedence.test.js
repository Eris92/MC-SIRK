"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var desktopCss = read("public/native/desktop-commands.css");
var toolbarCss = read("public/shared/ui/toolbar.css");
var outputState = read("public/native/quick-output-state.js");
var lifecycle = read("public/shared/ui/settings.js");
var adapter = read("public/shared/ui/toolbar-config.js");

assert.ok(/button\.classList\.toggle\("has-output-attention", hidden && attention\(\)\)/.test(outputState),
    "Attention must only be shown while the output is hidden.");
assert.ok(outputState.indexOf('button.classList.toggle("is-active", !hidden)') >= 0 &&
    outputState.indexOf('button.setAttribute("aria-pressed", hidden ? "false" : "true")') >= 0,
    "The logical output state must remain available for behavior and accessibility.");

assert.ok(lifecycle.indexOf('var QUICK_OUTPUT_HIDDEN_KEY = "mc-sirk-quickcommands-output-hidden-v2"') >= 0 &&
    lifecycle.indexOf('var QUICK_OUTPUT_ATTENTION_KEY = "mc-sirk-quickcommands-output-attention-v2"') >= 0,
    "The native lifecycle and the Quick state controller must share one hidden and attention state.");
assert.ok(lifecycle.indexOf("function actualQuickOutputHidden(panel)") >= 0 &&
    lifecycle.indexOf('browser.classList.contains("is-details-collapsed")') >= 0 &&
    lifecycle.indexOf('panel.getAttribute("data-sirk-output-hidden") === "1"') >= 0,
    "The visible collapsed Output state must be detected from both supported controllers.");
assert.ok(lifecycle.indexOf("function syncQuickOutputAttention(panel)") >= 0 &&
    lifecycle.indexOf("writeQuickBoolean(QUICK_OUTPUT_HIDDEN_KEY, hidden)") >= 0 &&
    lifecycle.indexOf("writeQuickBoolean(QUICK_OUTPUT_ATTENTION_KEY, active)") >= 0 &&
    lifecycle.indexOf('button.classList.toggle("has-output-attention", active)') >= 0,
    "A final hidden result must synchronize persistence and the visible button class.");
assert.ok(lifecycle.indexOf("pendingOutput || current !== previous") >= 0 &&
    lifecycle.indexOf("if (!hidden) active = false") >= 0,
    "Attention must appear for a new final result and clear immediately after Output is opened.");
assert.ok(lifecycle.indexOf("Lista poleceń została odświeżona") >= 0 &&
    lifecycle.indexOf("Command list refreshed") >= 0,
    "A list refresh must remain neutral and must not create a result alert.");

assert.ok(lifecycle.indexOf('button.classList.contains("sirk-quick-command-output-toggle")') >= 0 &&
    lifecycle.indexOf('button.classList.remove("is-active")') >= 0 &&
    lifecycle.indexOf('button.setAttribute("aria-pressed", "false")') >= 0,
    "The native theme lifecycle must apply a neutral visual class to Show/Hide output.");
assert.ok(lifecycle.indexOf("if (outputActive) button.classList.add(\"is-active\")") >= 0 &&
    lifecycle.indexOf('button.setAttribute("aria-pressed", outputPressed == null ? "false" : outputPressed)') >= 0,
    "Neutral styling must not destroy the logical output state.");
assert.ok(lifecycle.indexOf('button.classList.toggle("text-danger", modern && attention)') >= 0 &&
    lifecycle.indexOf('button.classList.toggle("border-danger", modern && attention)') >= 0,
    "Modern output attention must retain native danger utility classes.");
assert.ok(lifecycle.indexOf("sirk-quick-output-state-style") >= 0 &&
    lifecycle.indexOf("sirk-quick-command-output-toggle\\.has-output-attention") >= 0,
    "Historical hard-coded output attention colors must be removed from generated styles.");
assert.ok(adapter.indexOf('syncOwnedClasses(element, ["btn", "btn-" +') >= 0 &&
    adapter.indexOf('syncOwnedClasses(element, [selected ? "style10s" : "style10"])') >= 0,
    "Output actions must return to native Modern or Classic button styling.");
assert.ok(adapter.indexOf("function syncOwnedClasses(element, desired)") >= 0,
    "Output action styling must not reset valid native classes and trigger repaint loops.");

assert.ok(toolbarCss.indexOf('.sirk-quick-command-output-toggle.has-output-attention') >= 0,
    "A completed hidden Quick result must have a visible attention state.");
assert.ok(toolbarCss.indexOf("rgba(var(--bs-danger-rgb),.18)") >= 0 &&
    toolbarCss.indexOf("border-color:var(--bs-danger)!important") >= 0 &&
    toolbarCss.indexOf("color:var(--bs-danger)!important") >= 0,
    "Quick output attention must use the active MeshCentral Bootstrap danger tokens.");
assert.ok(toolbarCss.indexOf('.sirk-desktop-commands-panel .sirk-quick-command-toolbar-host{padding:8px 10px 10px!important}') >= 0,
    "Quick toolbar buttons must have a bottom gutter before the column divider lines begin.");
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

console.log("Quick output attention is visible, synchronized with the real collapsed state and spaced from dividers: OK");
