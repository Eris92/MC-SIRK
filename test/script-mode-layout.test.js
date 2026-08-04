"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var source = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "ui", "toolbar-api.js"),
    "utf8"
);

assert.ok(source.indexOf('page.classList.toggle("is-edit-mode", active)') >= 0,
    "The active Edit toolbar mode must be exposed on the shared page root.");
assert.ok(source.indexOf('page.classList.toggle("is-multi-mode", active)') >= 0,
    "The active multi-device toolbar mode must be exposed on the shared page root.");
assert.ok(source.indexOf(".mc-shared-page-mycommands:is(.is-edit-mode,.is-multi-mode) .mc-shared-layout") >= 0,
    "My Commands must enlarge its second column in Edit and multi-device modes.");
assert.ok(source.indexOf("minmax(480px,52%)") >= 0,
    "Commands must reserve enough room for long labels and all row actions.");
assert.ok(source.indexOf(".mc-shared-page-myscripts:is(.is-edit-mode,.is-multi-mode) .mc-shared-layout") >= 0,
    "My Scripts must use the same mode-aware second-column behavior.");
assert.ok(source.indexOf("white-space:normal!important") >= 0 &&
    source.indexOf("overflow-wrap:anywhere!important") >= 0 &&
    source.indexOf("text-overflow:clip!important") >= 0,
    "Long folder, command and script labels must wrap instead of being truncated.");
assert.ok(source.indexOf(".mc-tree-script-actions{flex:0 0 auto!important") >= 0,
    "Row actions, including multi-device execution, must remain visible beside wrapped labels.");
assert.ok(source.indexOf('item.setAttribute("aria-pressed", active ? "true" : "false")') >= 0,
    "Toolbar modes must expose their active state accessibly.");

console.log("Edit, multi-device and wrapping layout contract: OK");
