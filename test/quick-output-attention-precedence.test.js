"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var desktopCss = fs.readFileSync(
    path.join(__dirname, "..", "public", "native", "desktop-commands.css"),
    "utf8"
);
var outputState = fs.readFileSync(
    path.join(__dirname, "..", "public", "native", "quick-output-state.js"),
    "utf8"
);

var neutralSelector = ".sirk-desktop-commands-panel[data-sirk-output-hidden=\"1\"] .sirk-quick-command-output-toggle.is-active:not(.has-output-attention)";
assert.ok(desktopCss.indexOf(neutralSelector) >= 0,
    "A hidden Quick output button must suppress the transient active highlight before attention is applied.");

var neutralRuleStart = desktopCss.indexOf(neutralSelector);
var neutralRuleEnd = desktopCss.indexOf("}", neutralRuleStart);
var neutralRule = desktopCss.slice(neutralRuleStart, neutralRuleEnd + 1);
assert.ok(/background:var\(--sdc-panel-alt\)!important/.test(neutralRule),
    "The hidden transient state must use the neutral toolbar background with important precedence.");
assert.ok(/border-color:var\(--sdc-border\)!important/.test(neutralRule),
    "The hidden transient state must not keep the active border.");

assert.ok(/\.sirk-quick-command-output-toggle\.has-output-attention\{[^}]*background:[^}]*!important/.test(outputState),
    "The red attention state must retain important precedence over normal toolbar styles.");
assert.ok(/button\.classList\.toggle\("has-output-attention", hidden && attention\(\)\)/.test(outputState),
    "Attention must only be shown while the output is hidden.");

console.log("Quick hidden-output attention visual precedence: OK");
