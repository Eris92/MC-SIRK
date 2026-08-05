"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var toolbar = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar.js"), "utf8");
var quick = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.js"), "utf8");

assert.ok(toolbar.indexOf("function quickDefinitions(options)") >= 0 &&
    toolbar.indexOf("definitions.push(value)") >= 0 &&
    toolbar.indexOf("definitions.sort(function (a, b)") >= 0 &&
    toolbar.indexOf("if (quickToolbar) quickDefinitions(options).forEach(add)") >= 0,
    "Quick standard and custom toolbar buttons must be sorted together by order.");
assert.ok(toolbar.indexOf("function addStableDefinitions(options, add, context)") >= 0 &&
    toolbar.indexOf("else addStableDefinitions(options, add, context)") >= 0 &&
    toolbar.indexOf("window.SharedToolbarConfig.resolve(\n            options.preset,\n            options.buttons\n        ).forEach(add)") >= 0,
    "Non-Quick modules must retain the stable 1.7.7 toolbar mounting path.");
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
assert.ok(toolbar.indexOf("function alignQuickCollapseWithMyScripts(api)") >= 0 &&
    toolbar.indexOf('if (key === "collapse") return originalSetActive.call(api, key, false)') >= 0 &&
    toolbar.indexOf("if (quickToolbar) alignQuickCollapseWithMyScripts(api)") >= 0,
    "Quick collapse must use the neutral MyScripts button style instead of remaining highlighted.");
assert.ok(toolbar.indexOf("if (value === definition.icon) value = definition.expandIcon") >= 0 &&
    toolbar.indexOf("else if (value === definition.expandIcon) value = definition.icon") >= 0,
    "Quick collapse and expand icons must use the corrected opposite direction without changing MyScripts.");

console.log("Quick-only toolbar behavior and stable shared-module mounting: OK");
