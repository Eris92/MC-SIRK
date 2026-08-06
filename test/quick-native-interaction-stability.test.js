"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var css = fs.readFileSync(path.join(__dirname, "..", "public/native/desktop-commands.css"), "utf8");

assert.ok(css.indexOf('.sirk-desktop-commands-toggle:hover,.sirk-desktop-commands-toggle[aria-expanded="true"]{width:38px}') >= 0,
    "Quick launcher must retain its exact width on hover and while open.");
assert.ok(css.indexOf(".sirk-desktop-commands-panel:hover") >= 0 &&
    css.indexOf(".sirk-quick-command-details:hover") >= 0 &&
    css.indexOf("transform:none!important") >= 0 &&
    css.indexOf("scale:none!important") >= 0,
    "Quick panel, output column and rows must not inherit host hover scaling.");
assert.ok(css.indexOf('background-color:var(--bs-body-bg)!important') >= 0,
    "Modern Quick surfaces must use the active MeshCentral Bootstrap body background.");
assert.ok(css.indexOf('.sirk-desktop-commands-panel[data-mesh-ui="modern"] .sirk-quick-command-toolbar-host{background-color:var(--bs-body-bg)!important}') >= 0,
    "The padded Quick toolbar host must use the same opaque native surface as the columns below it.");
assert.ok(css.indexOf("--bs-list-group-action-hover-bg") >= 0 &&
    css.indexOf("--bs-list-group-action-hover-color") >= 0,
    "First and second Quick columns must expose the native hover state.");
assert.ok(css.indexOf("--bs-list-group-active-border-color") >= 0 &&
    css.indexOf("outline-offset:-1px") >= 0,
    "Selected Quick rows must remain visible without replacing the native active background.");
assert.ok(css.indexOf(".sirk-quick-command-toolbar-host{padding:8px 10px 0;overflow:hidden;box-sizing:border-box}") >= 0,
    "Quick content must start immediately below the toolbar and stay inside the panel outline.");
assert.ok(css.indexOf(".sirk-quick-command-toolbar-host .mc-shared-toolbar-button:hover") >= 0,
    "Quick toolbar controls, including Close, must not scale outside the panel outline.");
assert.ok(css.indexOf('data-sirk-output-hidden="1"') >= 0 &&
    css.indexOf("grid-template-columns:minmax(165px,205px) minmax(285px,1fr)!important") >= 0 &&
    css.indexOf("grid-template-columns:64px minmax(285px,1fr)!important") >= 0,
    "Hidden Quick output must use a real two-column grid instead of retaining a zero-width third track.");
var hiddenOverrides = css.slice(css.lastIndexOf('html .sirk-desktop-commands-panel[data-sirk-output-hidden="1"]'));
assert.strictEqual(hiddenOverrides.indexOf("minmax(285px,340px) 0!important"), -1,
    "The final hidden-output override must not declare the obsolete third track.");
assert.strictEqual(css.indexOf("--bs-list-group-active-bg"), -1,
    "Quick must not own the active-row background.");
assert.strictEqual(css.indexOf("--bs-list-group-active-color"), -1,
    "Quick must not own the active-row text color.");
assert.strictEqual(css.indexOf("--sdc-hover"), -1,
    "Quick interaction feedback must not restore a private hover palette.");
assert.strictEqual(css.indexOf("--sdc-active"), -1,
    "Quick interaction feedback must not restore a private active palette.");

console.log("Quick native background, opaque toolbar, containment and exact collapsed geometry: OK");
