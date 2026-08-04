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

console.log("Exact-width adaptive Quick commands output layout: OK");
