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
assert.ok(source.indexOf("grid-template-columns:96px max-content minmax(260px,1fr)") >= 0,
    "Commands Edit mode must use the reference max-content list column instead of a fixed width.");
assert.ok(source.indexOf("grid-template-columns:56px max-content minmax(260px,1fr)") >= 0,
    "The collapsed root navigation must preserve the natural-width Edit list column.");
assert.ok(source.indexOf(".mc-shared-page-mycommands.is-edit-mode .mc-shared-secondary{width:max-content!important") >= 0,
    "The Commands script list must grow to the natural width of its rows and actions.");
assert.ok(source.indexOf(".mc-shared-page-mycommands.is-edit-mode .mc-tree-script-row{display:flex!important;width:max-content!important") >= 0,
    "Each Edit row must size from the script label plus the action group.");
assert.ok(source.indexOf(".mc-shared-page-mycommands.is-edit-mode .mc-tree-script{width:max-content!important;min-width:360px!important") >= 0,
    "The script button must retain a useful natural label width before actions are added.");
assert.ok(source.indexOf("white-space:nowrap!important") >= 0 &&
    source.indexOf("overflow-wrap:normal!important") >= 0 &&
    source.indexOf("word-break:normal!important") >= 0,
    "Edit labels must stay on one line like the reference MyScripts implementation.");
assert.ok(source.indexOf("width:132px!important;min-width:132px!important;flex:0 0 132px!important") >= 0,
    "Edit must reserve the full four-button action width beside the natural label.");
assert.ok(source.indexOf(".mc-shared-page-mycommands.is-multi-mode .mc-shared-layout") >= 0 &&
    source.indexOf("minmax(480px,52%)") >= 0,
    "Commands multi-device mode must retain its separate layout rule.");
assert.ok(source.indexOf("@media(max-width:800px)") >= 0 &&
    source.indexOf("grid-template-columns:1fr!important") >= 0 &&
    source.indexOf("white-space:normal!important") >= 0,
    "The natural-width Edit layout must return to a wrapped stacked layout on mobile widths.");
assert.ok(source.indexOf('item.setAttribute("aria-pressed", active ? "true" : "false")') >= 0,
    "Toolbar modes must expose their active state accessibly.");

console.log("Edit uses reference max-content rows without squeezing Commands labels: OK");
