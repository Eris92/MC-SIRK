"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var api = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar-api.js"), "utf8");
var css = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar.css"), "utf8");

assert.ok(api.indexOf('page.classList.toggle(className, active)') >= 0,
    "The active Edit and Multi modes must be exposed on the shared page root.");
assert.ok(api.indexOf("captureModeGeometry(page)") >= 0,
    "Mode activation must capture the live rendered layout before changing grid tracks.");
assert.ok(api.indexOf('setGeometryProperty(page, "--sirk-mode-primary-width"') >= 0,
    "The exact live first-column width must be retained for Edit and Multi.");
assert.ok(api.indexOf('setGeometryProperty(page, "--sirk-mode-secondary-width"') >= 0,
    "The exact normal second-column width must be retained before actions are added.");
assert.ok(api.indexOf('setGeometryProperty(page, "--sirk-mode-row-width"') >= 0,
    "The exact normal script-row width must be retained for label wrapping.");
assert.ok(api.indexOf('setGeometryProperty(page, "--sirk-actions-width", width)') >= 0,
    "The live action width must be measured after mode activation.");

assert.ok(css.indexOf("--sirk-actions-button-width:36px") >= 0 &&
    css.indexOf("--sirk-actions-gap:4px") >= 0 &&
    css.indexOf("--sirk-actions-column-gap:12px") >= 0,
    "Static toolbar CSS must own the fixed action button and gap dimensions.");
assert.ok(css.indexOf(".mc-shared-page:is(.is-edit-mode,.is-multi-mode) .mc-shared-layout{grid-template-columns:var(--sirk-mode-primary-width,220px) calc(var(--sirk-mode-secondary-width,340px) + var(--sirk-actions-width) + var(--sirk-actions-column-gap))") >= 0,
    "Edit and Multi must preserve the captured first and second columns and add only the action area.");
assert.ok(css.indexOf(".mc-shared-page:is(.is-edit-mode,.is-multi-mode) .mc-shared-layout.is-collapsed{grid-template-columns:var(--sirk-primary-collapsed-track) calc(var(--sirk-mode-secondary-width,340px) + var(--sirk-actions-width) + var(--sirk-actions-column-gap))") >= 0,
    "Collapsed Edit and Multi must preserve the collapsed first column and captured text width.");
assert.ok(css.indexOf("grid-template-columns:var(--sirk-mode-row-width,316px) var(--sirk-actions-width)") >= 0,
    "Each Edit and Multi row must preserve its captured text width and add a separate actions track.");
assert.ok(css.indexOf(".mc-shared-page:is(.is-edit-mode,.is-multi-mode) .mc-tree-script-actions button{width:var(--sirk-actions-button-width)") >= 0 &&
    css.indexOf("box-sizing:border-box") >= 0,
    "Action buttons must fit inside the reserved measured area including border and padding.");

assert.strictEqual(css.indexOf("--sirk-scripts-text-width:clamp"), -1,
    "Modes must not replace the live text width with a new responsive clamp.");
assert.strictEqual(css.indexOf("--sirk-scripts-edit-width"), -1,
    "Modes must not calculate an independent second-column width unrelated to normal rendering.");
assert.strictEqual(css.indexOf(".mc-shared-page-mycommands.is-edit-mode"), -1,
    "Commands must not have page-specific Edit geometry.");
assert.strictEqual(css.indexOf(".mc-shared-page-mycommands.is-multi-mode .mc-shared-layout"), -1,
    "Commands must not have a separate percentage-based Multi geometry.");
assert.strictEqual(css.indexOf("minmax(480px,52%)"), -1,
    "Multi must not replace the normal text width with a fixed percentage track.");
assert.strictEqual(css.indexOf(".mc-shared-page-myscripts.is-edit-mode"), -1,
    "My Scripts must not have page-specific Edit geometry.");
assert.strictEqual(css.indexOf(".mc-shared-page.is-edit-mode .mc-tree-script .mc-tree-label"), -1,
    "Edit must not change label wrapping rules at all.");

assert.ok(api.indexOf('page.classList.contains("is-edit-mode") ||') >= 0 &&
    api.indexOf('page.classList.contains("is-multi-mode")') >= 0,
    "Action width measurement must run for both Edit and Multi.");
assert.ok(css.indexOf("@media(max-width:800px)") >= 0 &&
    css.indexOf("grid-template-columns:1fr") >= 0,
    "Edit and Multi must return to a stacked layout on mobile widths.");
assert.ok(api.indexOf('item.setAttribute("aria-pressed", active ? "true" : "false")') >= 0,
    "Toolbar modes must expose their active state accessibly.");
assert.strictEqual(api.indexOf('createElement("style")'), -1,
    "Edit and Multi geometry must not inject runtime CSS.");

console.log("Edit and Multi preserve live primary, secondary and text widths: OK");
