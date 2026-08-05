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

assert.ok(source.indexOf("--sirk-scripts-text-width:clamp(280px,32vw,430px)") >= 0,
    "The shared Edit layout must use the preview-derived stable script text width.");
assert.ok(source.indexOf("--sirk-actions-button-width:36px") >= 0 &&
    source.indexOf("--sirk-actions-gap:4px") >= 0 &&
    source.indexOf("--sirk-actions-column-gap:12px") >= 0,
    "The action area must use the same button and gap dimensions as the working preview.");
assert.ok(source.indexOf("--sirk-scripts-edit-width:calc(var(--sirk-scripts-text-width) + var(--sirk-scripts-padding) + var(--sirk-actions-width) + var(--sirk-actions-column-gap))") >= 0,
    "Edit width must be the normal script text area plus the separate action area.");

assert.ok(source.indexOf(".mc-shared-page.is-edit-mode .mc-shared-layout{grid-template-columns:var(--sirk-primary-track) var(--sirk-scripts-edit-width) var(--sirk-edit-details-track)!important}") >= 0,
    "Expanded Edit must preserve the normal primary track and change only the second track.");
assert.ok(source.indexOf(".mc-shared-page.is-edit-mode .mc-shared-layout.is-collapsed{grid-template-columns:var(--sirk-primary-collapsed-track) var(--sirk-scripts-edit-width) var(--sirk-edit-details-track)!important}") >= 0,
    "Collapsed Edit must preserve the collapsed primary track and change only the second track.");
assert.strictEqual(source.indexOf(".mc-shared-page-mycommands.is-edit-mode"), -1,
    "Commands must not have a page-specific Edit geometry.");
assert.strictEqual(source.indexOf(".mc-shared-page-myscripts.is-edit-mode"), -1,
    "My Scripts must not have a page-specific Edit geometry.");

assert.ok(source.indexOf("grid-template-columns:var(--sirk-scripts-text-width) var(--sirk-actions-width)!important") >= 0,
    "Each Edit row must keep the script text and actions in separate grid columns.");
assert.ok(source.indexOf("white-space:normal!important") >= 0 &&
    source.indexOf("word-break:normal!important") >= 0,
    "Long script labels must keep the normal wrapped preview behavior.");
assert.strictEqual(source.indexOf(".mc-shared-page.is-edit-mode .mc-tree-script .mc-tree-label{white-space:nowrap"), -1,
    "Edit must not switch labels to a single unbounded line.");
assert.strictEqual(source.indexOf(".mc-shared-page.is-edit-mode .mc-shared-secondary{width:max-content"), -1,
    "Edit must not expand the list using max-content.");

assert.ok(source.indexOf(".mc-shared-page-mycommands.is-multi-mode .mc-shared-layout{grid-template-columns:var(--sirk-primary-track)") >= 0,
    "Commands Multi must preserve the same primary track as normal mode.");
assert.ok(source.indexOf(".mc-shared-page-mycommands.is-multi-mode .mc-shared-layout.is-collapsed{grid-template-columns:var(--sirk-primary-collapsed-track)") >= 0,
    "Collapsed Commands Multi must preserve the collapsed primary track.");
assert.ok(source.indexOf("@media(max-width:800px)") >= 0 &&
    source.indexOf("grid-template-columns:1fr!important") >= 0,
    "Edit and Multi must return to a stacked layout on mobile widths.");
assert.ok(source.indexOf('item.setAttribute("aria-pressed", active ? "true" : "false")') >= 0,
    "Toolbar modes must expose their active state accessibly.");

console.log("Preview-derived Edit changes only the second column in every script page: OK");
