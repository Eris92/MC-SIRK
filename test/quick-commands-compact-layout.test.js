"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var css = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.css"), "utf8");

assert.ok(css.indexOf(".sirk-quick-command-header{display:none!important}") >= 0,
    "The separate Quick commands title row must be hidden so the toolbar is first.");
assert.ok(css.indexOf("grid-template-rows:auto minmax(0,1fr)") >= 0,
    "The panel must contain only the toolbar row and the browser row.");
assert.ok(css.indexOf("width:min(1000px,calc(100% - 52px))") >= 0,
    "The Quick commands panel must be narrower than the previous 1120px shell.");
assert.ok(css.indexOf("minmax(320px,420px)") >= 0,
    "The third details column must be capped instead of consuming all remaining width.");
assert.ok(css.indexOf("minmax(165px,205px) minmax(285px,340px)") >= 0,
    "The first two columns must retain the My Commands geometry.");

console.log("Compact Quick commands layout: OK");
