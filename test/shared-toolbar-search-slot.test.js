"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var toolbar = fs.readFileSync(path.join(root, "public/shared/ui/toolbar.js"), "utf8");
var api = fs.readFileSync(path.join(root, "public/shared/ui/toolbar-api.js"), "utf8");
var css = fs.readFileSync(path.join(root, "public/shared/ui/toolbar.css"), "utf8");

assert.ok(toolbar.indexOf('if (context.buttons.search) center.appendChild(searchWrap);') >= 0,
    "Shared Search input must live in the existing center group so left/right action geometry is stable.");
assert.strictEqual(toolbar.indexOf('if (context.buttons.search) left.appendChild(searchWrap);'), -1,
    "Shared Search must not enter/leave the left action group.");
assert.ok(toolbar.indexOf('center.hidden = center.childNodes.length === 0;') >= 0,
    "Center group visibility must be derived from its stable Search child, not Search open/closed state.");
assert.ok(api.indexOf('context.searchWrap.hidden = !context.state.searchVisible;') >= 0,
    "Search toggle may hide only the Search content while preserving group ownership.");
assert.ok(css.indexOf('.mc-shared-toolbar-center{flex:1;min-width:12px}') >= 0,
    "Shared center group must remain the elastic spacer between fixed action groups.");
assert.ok(css.indexOf('.mc-shared-toolbar-center{display:contents}.mc-shared-toolbar-center .mc-shared-toolbar-search{width:100%}') >= 0,
    "Narrow shared toolbars must keep Search usable without injecting it into the action groups.");

console.log("Shared toolbar Search uses a stable center slot without moving action groups: OK");
