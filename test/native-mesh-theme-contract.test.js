"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }

var config = read("public/shared/ui/toolbar-config.js");
var settings = read("public/shared/ui/settings.js");
var main = read("public/shared/styles/main.css");
var shared = read("public/shared/ui/shared-ui.css");
var toolbar = read("public/shared/ui/toolbar.css");
var quick = read("public/native/desktop-commands.css");
var admin = read("web/admin/admin.css");
var status = read("public/shared/ui/status-nav.js");
var view = read("views/SIRK-Portal.handlebars");

["style10", "style10s", "style3x", "style3sel"].forEach(function (name) {
    assert.ok(config.indexOf('"' + name + '"') >= 0,
        "Classic MeshCentral class " + name + " must be owned by the native adapter.");
});
["btn-secondary", "list-group-item", "nav-link", "card", "form-control", "form-select", "table-sm"].forEach(function (name) {
    assert.ok(config.indexOf('"' + name + '"') >= 0,
        "Modern MeshCentral class " + name + " must be owned by the native adapter.");
});
assert.ok(config.indexOf("window.MeshThemeAdapter") >= 0,
    "The shared bootstrap must expose one Mesh theme adapter.");
assert.ok(settings.indexOf("syncNativeContainers") >= 0 && settings.indexOf("MutationObserver") >= 0,
    "Native classes must be reapplied after asynchronous plugin renders.");
assert.ok(settings.indexOf("data-native-theme-sanitized") >= 0,
    "Historical generated color rules must be removed at runtime.");

[
    [main, "--sirk-button", "shared action-button palette"],
    [shared, "--mc-shared-page-surface", "shared page surface palette"],
    [shared, "--mc-shared-selection", "shared selection palette"],
    [toolbar, "#3867d6", "fixed blue toolbar action"],
    [quick, "--sdc-", "private Quick palette"],
    [admin, "--sirk-admin", "private administration palette"],
    [admin, "prefers-color-scheme", "administration system-theme emulation"],
    [status, "--sirk-status", "private semantic status palette"],
    [status, "#198754", "hard-coded approval success color"],
    [status, "#dc3545", "hard-coded approval danger color"]
].forEach(function (entry) {
    assert.strictEqual(entry[0].indexOf(entry[1]), -1,
        "Native theme contract forbids " + entry[2] + ".");
});

assert.ok(shared.indexOf("background:transparent!important") >= 0,
    "Shared pages must expose the host MeshCentral surface instead of creating their own background.");
assert.ok(quick.indexOf("grid-template-columns") >= 0 && quick.indexOf("sirk-desktop-commands-panel") >= 0,
    "Quick may retain functional overlay and column geometry.");
assert.ok(toolbar.indexOf("mc-script-form-row") >= 0 && toolbar.indexOf("mc-definition-top-grid") >= 0,
    "Forms may retain functional layout without owning their visual palette.");
assert.ok(view.indexOf("asset=shared-ui/toolbar-config.js") >= 0 && view.indexOf("asset=shared-ui/settings.js") >= 0,
    "The administration view must load the same native adapter and lifecycle as the user UI.");

console.log("Native MeshCentral theme ownership and geometry-only plugin CSS: OK");
