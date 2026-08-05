"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var source = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "ui", "toolbar-api.js"),
    "utf8"
);

assert.ok(source.indexOf('page.classList.toggle("is-edit-mode", active)') >= 0,
    "The active Edit toolbar mode must still be exposed on the shared page root.");
assert.ok(source.indexOf('page.classList.toggle("is-multi-mode", active)') >= 0,
    "The active multi-device toolbar mode must be exposed on the shared page root.");
assert.ok(source.indexOf(".mc-shared-page-mycommands.is-multi-mode .mc-shared-layout") >= 0,
    "My Commands may enlarge its second column only for multi-device mode.");
assert.ok(source.indexOf("minmax(480px,52%)") >= 0,
    "Multi-device mode must reserve enough room for long labels and row actions.");
assert.ok(source.indexOf(":is(.is-edit-mode,.is-multi-mode) .mc-shared-layout") < 0,
    "Edit mode must not share the layout-expansion selector with multi-device mode.");
assert.ok(!/\.is-edit-mode[^\{]*\.mc-shared-layout\{/.test(source),
    "Enabling Edit must not change the Commands grid or column widths.");
assert.ok(source.indexOf("white-space:normal!important") >= 0 &&
    source.indexOf("overflow-wrap:anywhere!important") >= 0 &&
    source.indexOf("text-overflow:clip!important") >= 0,
    "The normal label rendering contract must remain unchanged.");
assert.ok(source.indexOf(".mc-tree-script-actions{flex:0 0 auto!important") >= 0,
    "Edit mode must add row actions without making them collapse into the text.");
assert.ok(source.indexOf('item.setAttribute("aria-pressed", active ? "true" : "false")') >= 0,
    "Toolbar modes must expose their active state accessibly.");

console.log("Edit adds actions without expanding text or columns: OK");
