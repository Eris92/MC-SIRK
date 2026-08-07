"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var toolbar = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar.js"), "utf8");
var quick = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.js"), "utf8");

assert.ok(toolbar.indexOf("function definitions(options)") >= 0 &&
    toolbar.indexOf("window.SharedToolbarConfig.resolve(options.preset, options.buttons).slice()") >= 0 &&
    toolbar.indexOf("(options.customButtons || []).forEach") >= 0 &&
    toolbar.indexOf("items.push(item)") >= 0 &&
    toolbar.indexOf("return items.sort(function (a, b)") >= 0,
    "SharedToolbar must combine standard and custom definitions before one canonical order sort.");
assert.ok(toolbar.indexOf('if (a.side !== b.side) return a.side === "left" ? -1 : 1') >= 0 &&
    toolbar.indexOf("return Number(a.order || 500) - Number(b.order || 500)") >= 0,
    "All toolbar actions must be sorted first by side and then by numeric order.");
assert.ok(toolbar.indexOf("definitions(options).forEach(add)") >= 0,
    "Every module, including Quick, must use the same shared mounting path.");
assert.strictEqual(toolbar.indexOf("quickDefinitions"), -1,
    "Quick must not have a private toolbar-definition sorter.");
assert.strictEqual(toolbar.indexOf("addStableDefinitions"), -1,
    "Shared modules must not retain a parallel legacy mounting path.");

assert.ok(quick.indexOf('collapse: {') >= 0 && quick.indexOf('side: "left", order: 10') >= 0,
    "Quick Collapse must be first on the left.");
assert.ok(quick.indexOf('favorites: {') >= 0 && quick.indexOf('side: "left", order: 20') >= 0,
    "Quick Favorites must follow Collapse.");
assert.ok(quick.indexOf('title: text("refresh"), side: "left", order: 50') >= 0,
    "Quick Refresh must remain before Output and Search.");
assert.ok(quick.indexOf('key: "details"') >= 0 && quick.indexOf("order: 65") >= 0 &&
    quick.indexOf('search: { title: text("search"), side: "left", order: 70 }') >= 0,
    "Quick Output must appear before Search, with Search as the final left-side action.");
assert.ok(quick.indexOf('key: "close"') >= 0 && quick.indexOf('side: "right", order: 200') >= 0,
    "Quick Close must remain isolated on the right side.");

assert.ok(toolbar.indexOf("if (context.buttons.search) center.appendChild(searchWrap)") >= 0,
    "The Search field must use the stable center slot instead of entering the ordered left action group.");
assert.strictEqual(toolbar.indexOf("if (context.buttons.search) left.appendChild(searchWrap)"), -1,
    "Search visibility must not change the geometry of the ordered left action group.");
assert.ok(quick.indexOf('toolbar.setActive("collapse", state.collapsed)') >= 0 &&
    quick.indexOf('toolbar.setIcon("collapse", state.collapsed ? collapseDefinition.icon : collapseDefinition.expandIcon)') >= 0,
    "Quick Collapse active state and visual chevron must be derived from the one renderer-owned collapsed state.");
assert.ok(quick.indexOf('toolbar.setActive("favorites", state.favoritesOnly)') >= 0 &&
    quick.indexOf('toolbar.setActive("details", !state.detailsCollapsed)') >= 0 &&
    quick.indexOf('toolbar.setActive("search", state.searchVisible)') >= 0,
    "Quick toolbar visual state must be synchronized through the shared toolbar API.");
assert.strictEqual(toolbar.indexOf("keepQuickToolbarOnOneLine"), -1,
    "SharedToolbar must not contain Quick-only layout monkey-patches.");
assert.strictEqual(toolbar.indexOf("alignQuickCollapseWithMyScripts"), -1,
    "SharedToolbar must not override Quick collapse state after mount.");

console.log("Canonical shared toolbar ordering and stable Search slot: OK");
