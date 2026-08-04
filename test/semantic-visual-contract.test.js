"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var tree = fs.readFileSync(path.join(root, "public", "shared", "ui", "tree.js"), "utf8");
var statusNav = fs.readFileSync(path.join(root, "public", "shared", "ui", "status-nav.js"), "utf8");
var approvals = fs.readFileSync(path.join(root, "public", "modules", "approvals", "index.js"), "utf8");
var mainCss = fs.readFileSync(path.join(root, "public", "shared", "styles", "main.css"), "utf8");

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

assert.ok(mainCss.indexOf("Approval Center: collapsing only compacts the first column") >= 0,
    "Approval Center must have an explicit collapsed-layout contract.");
assert.ok(mainCss.indexOf("grid-template-columns:56px minmax(280px,340px) minmax(320px,1fr)") >= 0,
    "Collapsing Approval Center must retain a stable second navigation column.");
assert.ok(mainCss.indexOf(".mc-shared-secondary .mc-shared-nav-item{display:grid!important;grid-template-columns:24px minmax(0,1fr)") >= 0,
    "Collapsed Approval Center status/provider rows must keep the normal icon-and-label layout.");
assert.ok(mainCss.indexOf(".mc-shared-secondary .mc-approval-label{display:block!important") >= 0 &&
    mainCss.indexOf("text-align:left!important") >= 0,
    "Collapsing the first column must not center or hide second-column labels.");

console.log("Folder and semantic approval visual contract: OK");
