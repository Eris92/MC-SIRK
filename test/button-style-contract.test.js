"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var css = fs.readFileSync(path.join(root, "public", "shared", "styles", "main.css"), "utf8");
var adminView = fs.readFileSync(path.join(root, "views", "SIRK-Portal.handlebars"), "utf8");

assert.ok(css.indexOf("One native action-button contract") >= 0,
    "All SIRK action buttons must be controlled from one shared stylesheet.");
assert.ok(css.indexOf(".sirk-button") >= 0,
    "The shared stylesheet must expose one canonical SIRK action-button class.");
assert.ok(css.indexOf("--sirk-button-bg:var(--bs-secondary,#6c757d)") >= 0,
    "Buttons must follow MeshCentral's secondary-button appearance.");
assert.ok(css.indexOf(".mc-command-run-button") >= 0 &&
    css.indexOf(".mc-shared-toolbar-button") >= 0 &&
    css.indexOf(".mc-tree-script-action") >= 0,
    "Run, toolbar and script action controls must share the same contract.");
assert.ok(css.indexOf(".mc-admin-primary") >= 0 && css.indexOf(".mc-admin-secondary") >= 0,
    "Settings action buttons must use the same contract as native modules.");
assert.ok(css.indexOf(".mc-shared-nav-item") < 0 && css.indexOf(".mc-tree-folder-header") < 0,
    "Navigation rows must not be converted into action buttons.");

var adminCssIndex = adminView.indexOf("asset=admin.css");
var sharedCssIndex = adminView.indexOf("asset=main.css");
assert.ok(adminCssIndex >= 0 && sharedCssIndex > adminCssIndex,
    "Settings must load the shared button contract after its compatibility stylesheet.");

console.log("Shared native button style contract: OK");
