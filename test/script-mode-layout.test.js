"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var source = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "ui", "toolbar-api.js"),
    "utf8"
);
var toolbarConfig = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "ui", "toolbar-config.js"),
    "utf8"
);

assert.ok(source.indexOf('page.classList.toggle("is-edit-mode", active)') >= 0,
    "The active Edit toolbar mode must be exposed on the shared page root.");
assert.ok(source.indexOf('page.classList.toggle("is-multi-mode", active)') >= 0,
    "The active multi-device toolbar mode must be exposed on the shared page root.");

assert.ok(source.indexOf(".mc-shared-page.is-edit-mode .mc-shared-layout{grid-template-columns:minmax(220px,300px) max-content minmax(260px,1fr)") >= 0,
    "Edit must preserve the normal desktop primary-column track and change only the script/details tracks.");
assert.ok(source.indexOf(".mc-shared-page.is-edit-mode .mc-shared-layout.is-collapsed{grid-template-columns:64px max-content minmax(260px,1fr)") >= 0,
    "Edit must preserve the collapsed primary-column width.");
assert.ok(source.indexOf("@media(max-width:1000px){.mc-shared-page.is-edit-mode .mc-shared-layout,.mc-shared-page.is-edit-mode .mc-shared-layout.is-collapsed{grid-template-columns:minmax(190px,260px) max-content minmax(220px,1fr)") >= 0,
    "Edit must preserve the existing narrow-desktop primary-column track.");

assert.strictEqual(source.indexOf(".mc-shared-page-mycommands.is-edit-mode"), -1,
    "Commands must not have a private Edit layout contract.");
assert.strictEqual(source.indexOf(".mc-shared-page-myscripts.is-edit-mode"), -1,
    "My Scripts must not have a private Edit layout contract.");

assert.ok(source.indexOf(".mc-shared-page.is-edit-mode .mc-shared-secondary{width:max-content!important") >= 0,
    "Every Edit-capable page must grow the script list to the natural row width.");
assert.ok(source.indexOf(".mc-shared-page.is-edit-mode .mc-tree-script-row{display:flex!important;width:max-content!important") >= 0,
    "Every Edit row must size from the script label plus the action group.");
assert.ok(source.indexOf(".mc-shared-page.is-edit-mode .mc-tree-script{width:max-content!important;min-width:360px!important") >= 0,
    "Every Edit script button must retain a useful natural label width.");
assert.ok(source.indexOf(".mc-shared-page.is-edit-mode .mc-tree-script .mc-tree-label{white-space:nowrap!important") >= 0 &&
    source.indexOf("overflow-wrap:normal!important") >= 0 &&
    source.indexOf("word-break:normal!important") >= 0,
    "Edit labels must stay on one line on desktop in every script tab.");
assert.ok(source.indexOf(".mc-shared-page.is-edit-mode .mc-tree-script-actions{width:132px!important;min-width:132px!important;flex:0 0 132px!important") >= 0,
    "Edit must reserve the same four-button action width in every script tab.");

assert.ok(/myscripts:\s*\{[^}]*manage:\s*true/.test(toolbarConfig),
    "My Scripts must use the shared Edit control.");
assert.ok(/mycommands:\s*\{[^}]*manage:\s*true/.test(toolbarConfig),
    "Commands must use the shared Edit control.");
assert.ok(/myscripts:\s*\{[^}]*multi:\s*false/.test(toolbarConfig),
    "My Scripts must remain single-device-only.");

assert.ok(source.indexOf(".mc-shared-page-mycommands.is-multi-mode .mc-shared-layout") >= 0 &&
    source.indexOf("minmax(480px,52%)") >= 0,
    "Commands multi-device mode must retain its separate layout rule.");
assert.ok(source.indexOf("@media(max-width:800px)") >= 0 &&
    source.indexOf(".mc-shared-page.is-edit-mode .mc-shared-secondary") >= 0 &&
    source.indexOf("grid-template-columns:1fr!important") >= 0 &&
    source.indexOf("white-space:normal!important") >= 0,
    "The shared Edit layout must return to a wrapped stacked layout on mobile widths.");
assert.ok(source.indexOf('item.setAttribute("aria-pressed", active ? "true" : "false")') >= 0,
    "Toolbar modes must expose their active state accessibly.");

console.log("Shared Edit preserves the primary column in My Scripts and Commands: OK");
