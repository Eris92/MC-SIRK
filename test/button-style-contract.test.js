"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var mainCss = read("public/shared/styles/main.css");
var themeAdapter = read("public/shared/ui/toolbar-config.js");
var toolbar = read("public/shared/ui/toolbar.js");
var toolbarApi = read("public/shared/ui/toolbar-api.js");
var adminView = read("views/SIRK-Portal.handlebars");

assert.ok(themeAdapter.indexOf("window.MeshThemeAdapter") >= 0,
    "All plugin controls must be decorated by one native MeshCentral adapter.");
assert.ok(themeAdapter.indexOf('element.classList.add("btn", "btn-" +') >= 0,
    "Modern MeshCentral controls must use the host Bootstrap button classes.");
assert.ok(themeAdapter.indexOf('element.classList.add(active(element) ? "style10s" : "style10")') >= 0,
    "Classic MeshCentral controls must use native style10/style10s classes.");
assert.ok(themeAdapter.indexOf('element.classList.add("btn", "btn-" + (variant || buttonVariant(element)), "btn-sm")') >= 0,
    "Run, Approval and administration actions must obtain their Modern variant from the adapter.");
assert.ok(themeAdapter.indexOf('element.classList.contains("sirk-action-approve")') >= 0 &&
    themeAdapter.indexOf('element.classList.contains("sirk-action-reject")') >= 0 &&
    themeAdapter.indexOf('element.classList.contains("mc-command-run-button")') >= 0,
    "Semantic action variants must remain represented without a private color palette.");
assert.strictEqual(mainCss.indexOf("--sirk-button"), -1,
    "Plugin CSS must not reintroduce a private action-button palette.");
assert.strictEqual(mainCss.indexOf("One live-theme action-button contract"), -1,
    "The removed SIRK-owned visual button contract must not return.");

assert.ok(toolbarApi.indexOf('key === "favorites" ? false : value === false') >= 0,
    "Show favorites must remain clickable while Results is active.");
assert.ok(toolbarApi.indexOf('/^Show all\\b/i.test(item.title)') >= 0,
    "The favorites toolbar state must remain visible while Results is active.");
assert.ok(toolbar.indexOf("function activePage()") >= 0 &&
    toolbar.indexOf('document.querySelectorAll(".mc-shared-page")') >= 0 &&
    toolbar.indexOf('page.querySelector(".mc-catalog-results.active,.mc-catalog-results.is-active")') >= 0,
    "Favorites and Results navigation must resolve the active module page, including Commands device tabs.");
assert.ok(toolbar.indexOf("leaveResultsAfterFavoritesRender") >= 0 &&
    toolbar.indexOf("if (catalogRoot) catalogRoot.click()") >= 0,
    "Show favorites must leave Results immediately, including after an empty filter is cleared.");

var adapterIndex = adminView.indexOf("asset=shared-ui/toolbar-config.js");
var lifecycleIndex = adminView.indexOf("asset=shared-ui/settings.js");
var adminJsIndex = adminView.indexOf("asset=admin.js");
assert.ok(adapterIndex >= 0 && lifecycleIndex > adapterIndex && adminJsIndex > lifecycleIndex,
    "Administration must load the shared native adapter and lifecycle before rendering its controls.");

console.log("Native MeshCentral buttons, favorites and Commands device-page behavior: OK");
