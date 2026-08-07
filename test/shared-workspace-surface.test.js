"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var sharedUi = read("public/shared/ui/shared-ui.css");
var themeAdapter = read("public/shared/ui/toolbar-config.js");
var shell = read("public/shared/module-shell.js");
var settings = read("public/shared/ui/settings.js");
var approval = read("public/native/approval.css");
var automation = read("public/modules/automation/style.css");
var mainCss = read("public/shared/styles/main.css");

assert.ok(sharedUi.indexOf(".mc-shared-page{width:100%;box-sizing:border-box;background:transparent!important;color:inherit!important}") >= 0,
    "Every shared module must expose the native MeshCentral page surface.");
assert.ok(sharedUi.indexOf(".mc-shared-page>.mc-shared-toolbar-host") >= 0 &&
    sharedUi.indexOf(".mc-shared-page>.mc-shared-layout-host") >= 0 &&
    sharedUi.indexOf("background:transparent!important") >= 0,
    "Toolbar and all workspace columns must not insert a competing plugin background.");
assert.strictEqual(sharedUi.indexOf("--mc-shared-page-surface"), -1,
    "The removed plugin-owned workspace surface must not return.");

assert.ok(themeAdapter.indexOf('syncOwnedClasses(element, [isModern() ? "card" : "style10"])') >= 0,
    "Panels and cards must use the active Modern or Classic MeshCentral surface class.");
assert.ok(themeAdapter.indexOf('var PLUGIN_ROOT_SELECTOR = ".mc-shared-page,#sirk-platform-admin,.sirk-desktop-commands-panel,.mc-results-viewer,.mc-move-dialog"') >= 0,
    "The native adapter must recognize every SIRK surface root.");
assert.ok(themeAdapter.indexOf("function installObserver()") >= 0 &&
    themeAdapter.indexOf("contentObserver.observe(target, { childList: true, subtree: true })") >= 0,
    "New asynchronous SIRK roots must be normalized by the single native adapter observer.");
assert.ok(shell.indexOf('window.MeshThemeAdapter.refresh(page.root || realDetails.parentNode)') >= 0,
    "Every atomic module render commit must explicitly restore native surface classes before the updated view is considered complete.");
assert.ok(themeAdapter.indexOf("function syncOwnedClasses(element, desired)") >= 0,
    "Native surface classes must be updated idempotently without reset/flicker.");
assert.strictEqual(settings.indexOf("syncNativeContainers"), -1,
    "Settings must not retain a second surface-restoration lifecycle.");
assert.strictEqual(settings.indexOf("MutationObserver"), -1,
    "Settings must not duplicate the native adapter observer.");

[
    [approval, "background-color:#000", "Approval Center"],
    [automation, "background-color:#000", "My Scripts"],
    [mainCss, "--sirk-button-bg", "shared actions"],
    [sharedUi, "background-color:var(--mc-shared-page-surface)", "shared workspace"]
].forEach(function (entry) {
    assert.strictEqual(entry[0].indexOf(entry[1]), -1,
        entry[2] + " must not define a private workspace surface.");
});

console.log("Commands, Approval and My Scripts inherit the native MeshCentral surface: OK");
