"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var source = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "ui", "toolbar-api.js"),
    "utf8"
);

assert.ok(source.indexOf('page.classList.toggle(className, active)') >= 0,
    "The active Edit and Multi modes must be exposed on the shared page root.");
assert.ok(source.indexOf("captureModeGeometry(page)") >= 0,
    "Mode activation must capture the live rendered layout before changing grid tracks.");
assert.ok(source.indexOf('setGeometryProperty(page, "--sirk-mode-primary-width"') >= 0,
    "The exact live first-column width must be retained for Edit and Multi.");
assert.ok(source.indexOf('setGeometryProperty(page, "--sirk-mode-secondary-width"') >= 0,
    "The exact normal second-column width must be retained before actions are added.");
assert.ok(source.indexOf('setGeometryProperty(page, "--sirk-mode-row-width"') >= 0,
    "The exact normal script-row width must be retained for label wrapping.");

assert.ok(source.indexOf("--sirk-actions-button-width:36px") >= 0 &&
    source.indexOf("--sirk-actions-gap:4px") >= 0 &&
    source.indexOf("--sirk-actions-column-gap:12px") >= 0,
    "The action area must use the same fixed button and gap dimensions as the working preview.");

assert.ok(source.indexOf("grid-template-columns:var(--sirk-mode-primary-width,220px) calc(var(--sirk-mode-secondary-width,340px) + var(--sirk-actions-width) + var(--sirk-actions-column-gap))") >= 0,
    "Edit must preserve the captured first and second columns and add only the action area.");
assert.ok(source.indexOf("grid-template-columns:var(--sirk-primary-collapsed-track) calc(var(--sirk-mode-secondary-width,340px) + var(--sirk-actions-width) + var(--sirk-actions-column-gap))") >= 0,
    "Collapsed Edit must preserve the collapsed first column and the captured second-column text width.");
assert.ok(source.indexOf("grid-template-columns:var(--sirk-mode-row-width,316px) var(--sirk-actions-width)!important") >= 0,
    "Each Edit row must preserve its captured text width and add a separate actions track.");

assert.strictEqual(source.indexOf("--sirk-scripts-text-width:clamp"), -1,
    "Edit must not replace the live text width with a new responsive clamp.");
assert.strictEqual(source.indexOf("--sirk-scripts-edit-width"), -1,
    "Edit must not calculate an independent second-column width unrelated to the normal rendering.");
assert.strictEqual(source.indexOf(".mc-shared-page-mycommands.is-edit-mode"), -1,
    "Commands must not have page-specific Edit geometry.");
assert.strictEqual(source.indexOf(".mc-shared-page-myscripts.is-edit-mode"), -1,
    "My Scripts must not have page-specific Edit geometry.");
assert.strictEqual(source.indexOf(".mc-shared-page.is-edit-mode .mc-tree-script .mc-tree-label"), -1,
    "Edit must not change label wrapping rules at all.");

assert.ok(source.indexOf(".mc-shared-page-mycommands.is-multi-mode .mc-shared-layout{grid-template-columns:var(--sirk-mode-primary-width,220px)") >= 0,
    "Commands Multi must also preserve the captured first-column width.");
assert.ok(source.indexOf("@media(max-width:800px)") >= 0 &&
    source.indexOf("grid-template-columns:1fr!important") >= 0,
    "Edit and Multi must return to a stacked layout on mobile widths.");
assert.ok(source.indexOf('item.setAttribute("aria-pressed", active ? "true" : "false")') >= 0,
    "Toolbar modes must expose their active state accessibly.");

console.log("Edit preserves live primary, secondary and text widths: OK");
