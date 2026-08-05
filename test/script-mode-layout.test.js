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
assert.ok(source.indexOf(".mc-shared-page-mycommands.is-edit-mode .mc-shared-layout") >= 0,
    "Commands Edit mode must use a dedicated layout rule.");
assert.ok(source.indexOf("grid-template-columns:96px 500px minmax(260px,1fr)") >= 0,
    "Commands Edit mode must reserve the normal label width plus fixed space for four actions.");
assert.ok(source.indexOf(".mc-shared-page-mycommands.is-edit-mode .mc-shared-layout.is-collapsed") >= 0 &&
    source.indexOf("grid-template-columns:56px 500px minmax(260px,1fr)") >= 0,
    "Collapsing the root navigation must not take width away from Edit row labels or actions.");
assert.ok(source.indexOf("grid-template-columns:82px 440px minmax(220px,1fr)") >= 0,
    "Narrow desktop layouts must keep a usable Edit label width and all four actions.");
assert.ok(source.indexOf(".mc-shared-page-mycommands.is-multi-mode .mc-shared-layout") >= 0 &&
    source.indexOf("minmax(480px,52%)") >= 0,
    "Commands multi-device mode must retain its separate layout rule.");
assert.ok(source.indexOf("@media(max-width:800px)") >= 0 &&
    source.indexOf("grid-template-columns:1fr!important") >= 0,
    "Edit and Multi modes must return to the stacked layout on mobile widths.");
assert.ok(source.indexOf("white-space:normal!important") >= 0 &&
    source.indexOf("overflow-wrap:anywhere!important") >= 0 &&
    source.indexOf("text-overflow:clip!important") >= 0,
    "The normal label rendering contract must remain unchanged.");
assert.ok(source.indexOf(".mc-tree-script-actions{flex:0 0 auto!important") >= 0,
    "Row actions must retain their full width beside the script label.");
assert.ok(source.indexOf('item.setAttribute("aria-pressed", active ? "true" : "false")') >= 0,
    "Toolbar modes must expose their active state accessibly.");

console.log("Edit reserves action width without squeezing Commands labels: OK");
