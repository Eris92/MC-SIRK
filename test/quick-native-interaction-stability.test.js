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
assert.ok(css.indexOf("--bs-list-group-action-hover-bg") >= 0 &&
    css.indexOf("--bs-list-group-action-hover-color") >= 0,
    "First and second Quick columns must expose the native hover state.");
assert.ok(css.indexOf("--bs-list-group-active-bg") >= 0 &&
    css.indexOf("--bs-list-group-active-color") >= 0 &&
    css.indexOf("--bs-list-group-active-border-color") >= 0,
    "Selected Quick rows must expose the native active state.");
assert.strictEqual(css.indexOf("--sdc-hover"), -1,
    "Quick interaction feedback must not restore a private hover palette.");
assert.strictEqual(css.indexOf("--sdc-active"), -1,
    "Quick interaction feedback must not restore a private active palette.");

console.log("Quick native background, hover, selection and fixed geometry: OK");
