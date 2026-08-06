"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var shared = fs.readFileSync(path.join(root, "public/shared/ui/toolbar.css"), "utf8");
var quick = fs.readFileSync(path.join(root, "public/native/desktop-commands.css"), "utf8");
var modules = ".mc-shared-page:is(.mc-shared-page-approvalcenter,.mc-shared-page-mycommands,.mc-shared-page-myscripts)";

assert.ok(shared.indexOf(modules) >= 0,
    "Approval, Commands and My Scripts must have one canonical list selector.");
assert.ok(shared.indexOf("grid-template-columns:24px minmax(0,1fr)") >= 0 &&
    quick.indexOf("grid-template-columns:24px minmax(0,1fr)") >= 0,
    "Shared module rows and Quick must use the same icon and label tracks.");
assert.ok(shared.indexOf("min-height:36px;margin:0 0 3px!important;padding:8px!important") >= 0 &&
    quick.indexOf("min-height:36px;margin:0 0 3px;padding:8px") >= 0,
    "Shared module rows and Quick must use the same height, spacing and padding.");
assert.ok(shared.indexOf("width:48px!important;min-width:48px!important;height:42px!important") >= 0 &&
    quick.indexOf("width:48px;min-width:48px;height:42px") >= 0,
    "Collapsed shared primary rows must use the same geometry as Quick.");
assert.ok(shared.indexOf(".mc-approval-status:not(.active):not(.is-active){color:inherit!important}") >= 0,
    "Approval status semantics must not recolor the complete row.");
assert.ok(shared.indexOf(".mc-approval-status.sirk-result-status-pending:not(.active) .mc-nav-icon") >= 0,
    "Approval status color must be limited to the status icon.");
assert.ok(shared.indexOf("background-color:var(--bs-list-group-active-bg)!important") >= 0 &&
    shared.indexOf("color:var(--bs-list-group-active-color)!important") >= 0,
    "Every selected row must use the same native MeshCentral active state.");
assert.ok(shared.indexOf(":is(.mc-approval-label,.mc-tree-label)") >= 0 &&
    shared.indexOf("white-space:normal!important") >= 0,
    "Approval and tree labels must use one wrapping contract.");

console.log("Approval, Commands, My Scripts and Quick list styling: OK");
