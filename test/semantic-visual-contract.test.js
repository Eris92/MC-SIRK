"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var tree = fs.readFileSync(path.join(root, "public", "shared", "ui", "tree.js"), "utf8");
var statusNav = fs.readFileSync(path.join(root, "public", "shared", "ui", "status-nav.js"), "utf8");
var approvals = fs.readFileSync(path.join(root, "public", "modules", "approvals", "index.js"), "utf8");
var mainCss = fs.readFileSync(path.join(root, "public", "shared", "styles", "main.css"), "utf8");
var toolbarCss = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar.css"), "utf8");
var sharedUi = fs.readFileSync(path.join(root, "public", "shared", "ui", "shared-ui.css"), "utf8");

assert.ok(tree.indexOf('graphic.className = "mc-tree-folder-icon mc-tree-fallback-icon"') >= 0,
    "Nested My Scripts/My Commands directories without custom artwork must use the shared folder icon.");
assert.ok(tree.indexOf('graphic.innerHTML = lineIcon("folder")') >= 0,
    "The nested directory fallback must render the same folder glyph as root folders.");
assert.ok(tree.indexOf("mc-tree-folder-arrow") < 0,
    "Missing folder artwork must no longer be represented by a triangle arrow.");

["all", "pending", "executing", "approved", "completed", "failed", "rejected"].forEach(function (key) {
    assert.ok(statusNav.indexOf("--sirk-status-" + key) >= 0,
        "The shared status palette must define " + key + ".");
    assert.ok(statusNav.indexOf("sirk-result-status-" + key) >= 0,
        "The shared status navigation must style " + key + " everywhere.");
    assert.ok(statusNav.indexOf("mc-results-status-" + key) >= 0,
        "Result tables must reuse the shared " + key + " color.");
});

assert.ok(statusNav.indexOf(".mc-module-approvalcenter .mc-nav-icon") >= 0 &&
    statusNav.indexOf("--sirk-icon-blue") >= 0,
    "Approval Center provider and overview icons must use the shared folder blue.");
assert.ok(approvals.indexOf('className: "mc-approval-status sirk-result-status sirk-result-status-" + key') >= 0,
    "Approval Center status filters must expose semantic status classes.");
assert.ok(approvals.indexOf('className: "sirk-action-approve"') >= 0 &&
    approvals.indexOf('className: "sirk-action-reject"') >= 0,
    "Approve and Reject must use explicit success and danger actions.");
assert.ok(statusNav.indexOf(".sirk-action-approve") >= 0 && statusNav.indexOf("#198754") >= 0,
    "Approve must use the connection-success green.");
assert.ok(statusNav.indexOf(".sirk-action-reject") >= 0 && statusNav.indexOf("#dc3545") >= 0,
    "Reject must use the application danger red.");
assert.ok(approvals.indexOf("mc-approval-request-status-") >= 0,
    "Approval cards must color the request status as well as navigation and tables.");

assert.strictEqual(
    mainCss.indexOf(".mc-module-approvalcenter .mc-shared-layout"),
    -1,
    "Approval Center must not have a module-specific collapsed-layout exception."
);
assert.ok(
    toolbarCss.indexOf(".mc-shared-layout.is-collapsed{grid-template-columns:64px minmax(255px,305px) minmax(520px,1fr)!important}") >= 0,
    "The shared collapsed layout must retain stable second and third columns for every module."
);
assert.ok(
    sharedUi.indexOf(".mc-shared-layout.is-collapsed .mc-shared-primary") >= 0,
    "Only the shared primary column may be compacted by the collapsed layout."
);
assert.strictEqual(
    sharedUi.indexOf(".mc-shared-secondary .mc-approval-label{display:none"),
    -1,
    "Collapsing the first column must not hide Approval Center second-column labels."
);

console.log("Folder, semantic approval and shared collapsed-layout contract: OK");
