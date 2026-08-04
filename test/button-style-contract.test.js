"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var css = fs.readFileSync(path.join(root, "public", "shared", "styles", "main.css"), "utf8");
var toolbarApi = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar-api.js"), "utf8");
var adminView = fs.readFileSync(path.join(root, "views", "SIRK-Portal.handlebars"), "utf8");

assert.ok(css.indexOf("One live-theme action-button contract") >= 0,
    "All SIRK action buttons must be controlled from one live-theme stylesheet.");
assert.ok(css.indexOf(".sirk-button") >= 0,
    "The shared stylesheet must expose one canonical SIRK action-button class.");
assert.ok(css.indexOf("--sirk-button-bg:var(--bs-tertiary-bg") >= 0 &&
    css.indexOf("--sirk-button-text:var(--bs-body-color") >= 0,
    "Buttons must inherit the active MeshCentral Bootstrap theme variables.");
assert.ok(css.indexOf('[data-bs-theme="dark"]') >= 0 &&
    css.indexOf("body.night") >= 0 && css.indexOf("body.dark") >= 0,
    "Buttons must react to both Bootstrap and legacy MeshCentral theme switches.");
assert.ok(css.indexOf(".mc-command-run-button") >= 0 &&
    css.indexOf(".mc-shared-toolbar-button") >= 0 &&
    css.indexOf(".mc-tree-script-action") >= 0,
    "Run, toolbar and script action controls must share the same contract.");
assert.ok(css.indexOf(".mc-admin-primary") >= 0 && css.indexOf(".mc-admin-secondary") >= 0,
    "Settings action buttons must use the same contract as native modules.");
assert.ok(css.indexOf(".mc-tree-favorite-action.active") >= 0 &&
    css.indexOf(".mc-tree-credential-action") >= 0 &&
    css.indexOf("color:var(--sirk-favorite)!important") >= 0,
    "An active favorite star must use the same gold icon treatment as credentials.");
assert.ok(css.indexOf(".mc-shared-nav-item") < 0 && css.indexOf(".mc-tree-folder-header") < 0,
    "Navigation rows must not be converted into action buttons.");

assert.ok(toolbarApi.indexOf('key === "favorites" ? false : value === false') >= 0,
    "Show favorites must remain clickable while Results is active.");
assert.ok(toolbarApi.indexOf('/^Show all\\b/i.test(item.title)') >= 0,
    "The favorites toolbar state must remain visible while Results is active.");

var adminCssIndex = adminView.indexOf("asset=admin.css");
var sharedCssIndex = adminView.indexOf("asset=main.css");
assert.ok(adminCssIndex >= 0 && sharedCssIndex > adminCssIndex,
    "Settings must load the shared button contract after its compatibility stylesheet.");

console.log("Shared live-theme button and favorites contract: OK");
