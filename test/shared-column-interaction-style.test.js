"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var toolbar = fs.readFileSync(path.join(root, "public/shared/ui/toolbar.css"), "utf8");
var quick = fs.readFileSync(path.join(root, "public/native/desktop-commands.css"), "utf8");

assert.ok(toolbar.indexOf('.mc-shared-page[data-mesh-ui="modern"] .mc-shared-primary .list-group-item-action:hover') >= 0,
    "Approval, Commands and My Scripts primary columns must expose the native hover state.");
assert.ok(toolbar.indexOf('.mc-shared-page[data-mesh-ui="modern"] .mc-shared-secondary .list-group-item-action:hover') >= 0,
    "Approval, Commands and My Scripts secondary columns must expose the native hover state.");
assert.ok(toolbar.indexOf("--bs-list-group-action-hover-bg") >= 0 &&
    toolbar.indexOf("--bs-list-group-action-hover-color") >= 0,
    "Shared column hover must use the active MeshCentral Bootstrap variables.");
assert.ok(toolbar.indexOf('.mc-shared-primary .list-group-item-action.active') >= 0 &&
    toolbar.indexOf('.mc-shared-secondary .list-group-item-action.active') >= 0 &&
    toolbar.indexOf("--bs-list-group-active-border-color") >= 0,
    "Selected rows in both shared columns must use the same native outline contract as Quick.");
assert.ok(toolbar.indexOf("transform:none!important") >= 0 && toolbar.indexOf("scale:none!important") >= 0,
    "Shared column rows must keep stable geometry during hover and selection.");
assert.ok(quick.indexOf("--bs-list-group-action-hover-bg") >= 0 &&
    quick.indexOf("--bs-list-group-active-border-color") >= 0,
    "Quick and shared modules must use the same native interaction variables.");
assert.strictEqual(toolbar.indexOf("--mc-shared-selection"), -1,
    "Shared modules must not restore a private selected-row palette.");
assert.strictEqual(toolbar.indexOf("--sirk-column-hover"), -1,
    "Shared modules must not introduce a private hover palette.");

console.log("Approval, Commands, My Scripts and Quick share native column interaction states: OK");
