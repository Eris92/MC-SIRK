"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var tree = read("public/shared/ui/tree.js");
var statusNav = read("public/shared/ui/status-nav.js");
var approvals = read("public/modules/approvals/index.js");
var themeAdapter = read("public/shared/ui/toolbar-config.js");
var mainCss = read("public/shared/styles/main.css");
var toolbarCss = read("public/shared/ui/toolbar.css");
var layout = read("public/shared/ui/layout.js");
var sharedUi = read("public/shared/ui/shared-ui.css");

assert.ok(tree.indexOf('graphic.className = "mc-tree-folder-icon mc-tree-fallback-icon"') >= 0,
    "Nested My Scripts/Commands directories without custom artwork must use the shared folder icon.");
assert.ok(tree.indexOf('graphic.innerHTML = lineIcon("folder")') >= 0,
    "The nested directory fallback must render the same folder glyph as root folders.");
assert.ok(tree.indexOf("mc-tree-folder-arrow") < 0,
    "Missing folder artwork must not be represented by a triangle arrow.");

["all", "pending", "executing", "approved", "completed", "failed", "rejected"].forEach(function (key) {
    assert.ok(statusNav.indexOf('sirk-result-status-' + (key === "all" ? '" + (item.key || "all")' : key)) >= 0 ||
        statusNav.indexOf('{ key: "' + (key === "all" ? "" : key) + '"') >= 0,
        "Status navigation must retain the semantic state " + key + ".");
});
assert.ok(statusNav.indexOf("window.MeshThemeAdapter.status") >= 0,
    "Status rows must delegate their appearance to the native MeshCentral adapter.");
assert.strictEqual(statusNav.indexOf("--sirk-status"), -1,
    "Status navigation must not own a private color palette.");
["text-warning", "text-info", "text-success", "text-danger"].forEach(function (name) {
    assert.ok(themeAdapter.indexOf('desired = "' + name + '"') >= 0,
        "Modern status state must map to native Bootstrap class " + name + ".");
});
assert.ok(themeAdapter.indexOf("element.classList.add(desired)") >= 0,
    "The selected native semantic status class must be applied idempotently.");
assert.ok(approvals.indexOf('className: "mc-approval-status sirk-result-status sirk-result-status-" + key') >= 0,
    "Approval Center status filters must expose semantic status classes.");
assert.ok(approvals.indexOf("sirk-action-approve") >= 0 &&
    approvals.indexOf("sirk-action-reject") >= 0,
    "Approve and Reject must retain explicit semantic action roles alongside native button variants.");
assert.ok(themeAdapter.indexOf('element.classList.contains("sirk-action-approve")') >= 0 &&
    themeAdapter.indexOf('return "success"') >= 0,
    "Modern Approve must use MeshCentral's native success button variant.");
assert.ok(themeAdapter.indexOf('element.classList.contains("sirk-action-reject")') >= 0 &&
    themeAdapter.indexOf('return "danger"') >= 0,
    "Modern Reject must use MeshCentral's native danger button variant.");
assert.ok(approvals.indexOf("mc-approval-request-status-") >= 0,
    "Approval cards must retain semantic request-status classes.");

assert.strictEqual(mainCss.indexOf(".mc-module-approvalcenter .mc-shared-layout"), -1,
    "Approval Center must not have a module-specific collapsed-layout exception.");
assert.ok(layout.indexOf("grid-template-columns:var(--sirk-primary-collapsed-track) var(--sirk-shared-secondary-track) var(--sirk-shared-details-track)!important") >= 0,
    "The canonical collapsed layout must retain stable Quick-aligned second and third columns for every module.");
assert.ok(layout.indexOf("--sirk-primary-collapsed-track:64px") >= 0 &&
    layout.indexOf("--sirk-shared-secondary-track:minmax(285px,340px)") >= 0,
    "The collapsed shared layout must retain the Quick first and second-column tracks.");
assert.strictEqual(toolbarCss.indexOf(".mc-shared-layout.is-collapsed{grid-template-columns:"), -1,
    "Toolbar CSS must not reintroduce a competing collapsed-layout definition.");
assert.ok(sharedUi.indexOf(".mc-shared-layout.is-collapsed .mc-shared-primary") >= 0,
    "Only the shared primary column may be compacted by the collapsed layout.");
assert.strictEqual(sharedUi.indexOf(".mc-shared-secondary .mc-approval-label{display:none"), -1,
    "Collapsing the first column must not hide Approval Center second-column labels.");

console.log("Native semantic statuses, approval actions and canonical collapsed layout: OK");
