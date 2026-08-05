"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var toolbar = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar.js"), "utf8");
var quick = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.js"), "utf8");

assert.ok(toolbar.indexOf("function orderedDefinitions(options)") >= 0 &&
    toolbar.indexOf("definitions.push(value)") >= 0 &&
    toolbar.indexOf("definitions.sort(function (a, b)") >= 0 &&
    toolbar.indexOf("orderedDefinitions(options).forEach(add)") >= 0,
    "Standard and custom toolbar buttons must be sorted together by order.");
assert.ok(quick.indexOf('key: "details"') >= 0 && quick.indexOf("order: 65") >= 0 &&
    quick.indexOf('search: { title: text("search"), side: "left", order: 70 }') >= 0,
    "Quick output must appear before Search, with Search as the final left-side button.");
assert.ok(toolbar.indexOf("function keepQuickToolbarOnOneLine") >= 0 &&
    toolbar.indexOf('root.style.flexWrap = "nowrap"') >= 0 &&
    toolbar.indexOf('left.style.flexWrap = "nowrap"') >= 0 &&
    toolbar.indexOf('right.style.flexWrap = "nowrap"') >= 0,
    "Quick toolbar controls must remain on one line at compact panel widths.");
assert.ok(toolbar.indexOf('searchWrap.style.flex = "1 1 120px"') >= 0 &&
    toolbar.indexOf('searchWrap.style.minWidth = "80px"') >= 0 &&
    toolbar.indexOf('searchInput.style.width = "100%"') >= 0 &&
    toolbar.indexOf('searchInput.style.minWidth = "0"') >= 0,
    "The opened Quick search field must shrink within the toolbar instead of wrapping below it.");
assert.ok(toolbar.indexOf("if (context.buttons.search) left.appendChild(searchWrap)") >= 0,
    "The search field must stay directly after the final Search button.");

console.log("Quick toolbar Search order and single-line layout: OK");
