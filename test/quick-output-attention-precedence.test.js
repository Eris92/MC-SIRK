"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var desktopCss = fs.readFileSync(
    path.join(__dirname, "..", "public", "native", "desktop-commands.css"),
    "utf8"
);
var toolbarCss = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "ui", "toolbar.css"),
    "utf8"
);
var outputState = fs.readFileSync(
    path.join(__dirname, "..", "public", "native", "quick-output-state.js"),
    "utf8"
);

assert.ok(/\.mc-shared-toolbar-button\.is-active\{outline:1px solid currentColor\}/.test(toolbarCss),
    "The shared toolbar may retain its normal active outline for real toggle buttons.");

var neutralSelector = ".sirk-desktop-commands .sirk-quick-command-output-toggle.is-active:not(.has-output-attention)";
assert.ok(desktopCss.indexOf(neutralSelector) >= 0,
    "Quick output must override the shared active outline even when a stale renderer state re-adds is-active.");

var neutralRuleStart = desktopCss.indexOf(neutralSelector);
var neutralRuleEnd = desktopCss.indexOf("}", neutralRuleStart);
var neutralRule = desktopCss.slice(neutralRuleStart, neutralRuleEnd + 1);
assert.ok(/outline:0!important/.test(neutralRule),
    "Clicking a Quick category or script must not draw the shared active outline around Show output.");
assert.ok(/background:var\(--sdc-panel-alt\)!important/.test(neutralRule),
    "The transient output state must use the neutral toolbar background with important precedence.");
assert.ok(/border-color:var\(--sdc-border\)!important/.test(neutralRule),
    "The transient output state must not keep the active border.");
assert.ok(neutralSelector.indexOf("data-sirk-output-hidden") < 0,
    "The output action must remain visually neutral both while hidden and while open.");

var pointerFocusSelector = ".sirk-desktop-commands .mc-shared-toolbar-button:focus:not(:focus-visible)";
var pointerFocusStart = desktopCss.indexOf(pointerFocusSelector);
var pointerFocusEnd = desktopCss.indexOf("}", pointerFocusStart);
var pointerFocusRule = desktopCss.slice(pointerFocusStart, pointerFocusEnd + 1);
assert.ok(pointerFocusStart >= 0 && /outline:0!important/.test(pointerFocusRule) && /box-shadow:none!important/.test(pointerFocusRule),
    "Pointer clicks must not leave a Bootstrap focus frame around Quick toolbar buttons.");

var keyboardFocusSelector = ".sirk-desktop-commands .mc-shared-toolbar-button:focus-visible";
var keyboardFocusStart = desktopCss.indexOf(keyboardFocusSelector);
var keyboardFocusEnd = desktopCss.indexOf("}", keyboardFocusStart);
var keyboardFocusRule = desktopCss.slice(keyboardFocusStart, keyboardFocusEnd + 1);
assert.ok(keyboardFocusStart >= 0 && /box-shadow:0 0 0 3px var\(--sdc-focus\)!important/.test(keyboardFocusRule),
    "Keyboard navigation must retain a visible focus indicator.");

assert.ok(/\.sirk-quick-command-output-toggle\.has-output-attention\{[^}]*background:[^}]*!important/.test(outputState),
    "The red attention state must retain important precedence over normal toolbar styles.");
assert.ok(/button\.classList\.toggle\("has-output-attention", hidden && attention\(\)\)/.test(outputState),
    "Attention must only be shown while the output is hidden.");

console.log("Quick output active-outline, attention and focus contract: OK");
