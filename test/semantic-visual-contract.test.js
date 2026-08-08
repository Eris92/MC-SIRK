"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var tree = read("public/shared/ui/tree.js");
var statusNav = read("public/shared/ui/status-nav.js");
var catalog = read("public/shared/ui/catalog.js");
var approvals = read("public/modules/approvals/index.js");
var themeAdapter = read("public/shared/ui/toolbar-config.js");
var mainCss = read("public/shared/styles/main.css");
var toolbarCss = read("public/shared/ui/toolbar.css");
var layout = read("public/shared/ui/layout.js");
var sharedUi = read("public/shared/ui/shared-ui.css");

assert.ok(tree.indexOf('fallback.className = "mc-tree-fallback-icon sirk-shared-list-icon"') >= 0 &&
    tree.indexOf('fallbackKind: "folder"') >= 0,
    "Nested My Scripts/Commands directories without custom artwork must use the shared folder fallback path.");
assert.ok(tree.indexOf('lineIcon(options.fallbackKind || "folder")') >= 0 &&
    tree.indexOf('var paths = kind === "script"') >= 0,
    "The nested directory fallback must resolve to the same shared folder SVG as root folders.");
assert.ok(tree.indexOf("mc-tree-folder-arrow") < 0,
    "Missing folder artwork must not be represented by a triangle arrow.");

["all", "pending", "executing", "approved", "completed", "failed", "rejected"].forEach(function (key) {
    assert.ok(statusNav.indexOf("sirk-result-status-" + key) >= 0 ||
        statusNav.indexOf('{ key: "' + (key === "all" ? "" : key) + '"') >= 0,
        "Status navigation must retain the semantic state " + key + ".");
});
assert.ok(statusNav.indexOf('button.className = "mc-shared-nav-item mc-portal-nav-item sirk-management-item sirk-shared-list-item"') >= 0,
    "Shared status row buttons must remain neutral native navigation items.");
assert.ok(statusNav.indexOf('icon.className = "sirk-management-item-icon sirk-result-status-icon sirk-result-status sirk-result-status-" + key') >= 0,
    "Shared semantic status classes must be attached to icons, not row labels.");
assert.ok(statusNav.indexOf("window.MeshThemeAdapter.status(icon)") >= 0,
    "Shared status icons must delegate their semantic color to the native MeshCentral adapter.");
assert.strictEqual(statusNav.indexOf("--sirk-status"), -1,
    "Status navigation must not own a private color palette.");

["text-warning", "text-info", "text-success", "text-danger"].forEach(function (name) {
    assert.ok(themeAdapter.indexOf('desired = "' + name + '"') >= 0,
        "Modern status state must map to native Bootstrap class " + name + ".");
});
assert.ok(themeAdapter.indexOf("element.classList.add(desired)") >= 0,
    "The selected native semantic status class must be applied idempotently.");

assert.ok(approvals.indexOf('className: "mc-approval-status"') >= 0 &&
    approvals.indexOf('iconClassName: "sirk-result-status sirk-result-status-" + key') >= 0,
    "Approval Center status rows must keep standard text while applying semantic state to their icons.");
assert.strictEqual(approvals.indexOf('className: "mc-approval-status sirk-result-status'), -1,
    "Approval Center status color must never be attached to the whole second-column row.");
assert.ok(approvals.indexOf('title: "Overview"') >= 0 &&
    approvals.indexOf('iconClassName: "sirk-result-status sirk-result-status-all"') >= 0,
    "Approval Overview must use the same neutral/all semantic icon role as Results.");
assert.ok(catalog.indexOf('button.className = "mc-shared-nav-item mc-portal-nav-item sirk-management-item mc-catalog-results sirk-shared-list-item"') >= 0 &&
    catalog.indexOf('sirk-result-status-icon sirk-result-status sirk-result-status-all') >= 0,
    "Commands/My Scripts Results must keep native text and apply the all-state color only to the icon.");
assert.ok(catalog.indexOf("window.MeshThemeAdapter.status(icon)") >= 0,
    "Results icon color must come from the same native semantic adapter as Approval Overview.");

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
assert.ok(sharedUi.indexOf(".mc-shared-layout.is-collapsed{grid-template-columns:var(--sirk-primary-collapsed-track) var(--sirk-shared-secondary-track) var(--sirk-shared-details-track)}") >= 0,
    "The canonical base collapsed layout must retain stable shared second and third columns without blocking action-mode overrides.");
assert.strictEqual(sharedUi.indexOf("var(--sirk-shared-details-track)!important"), -1,
    "The base collapsed geometry must not use !important because it would suppress measured Edit/Multi secondary tracks.");
assert.ok(sharedUi.indexOf("--sirk-primary-collapsed-track:64px") >= 0 &&
    sharedUi.indexOf("--sirk-shared-secondary-track:minmax(285px,340px)") >= 0,
    "The collapsed shared layout must retain the Quick-aligned first and second-column tracks.");
assert.ok(sharedUi.indexOf("--sirk-shared-primary-track:minmax(165px,205px)") >= 0 &&
    sharedUi.indexOf("grid-template-columns:var(--sirk-shared-primary-track) var(--sirk-shared-secondary-track) var(--sirk-shared-details-track)") >= 0,
    "Normal shared modules must use the same canonical first and second-column tracks as Quick.");
assert.strictEqual(layout.indexOf("grid-template-columns:"), -1,
    "SharedLayout JavaScript must own only structure/state; grid geometry belongs to static CSS.");
assert.strictEqual(/(^|})\.mc-shared-layout\.is-collapsed\{grid-template-columns:/.test(toolbarCss), false,
    "Toolbar CSS must not reintroduce a competing global collapsed-layout definition.");
assert.ok(toolbarCss.indexOf(".mc-shared-page:is(.is-edit-mode,.is-multi-mode) .mc-shared-layout.is-collapsed{grid-template-columns:") >= 0,
    "Edit and Multi may retain their mode-specific collapsed geometry for the measured action track.");
assert.ok(sharedUi.indexOf(".mc-shared-layout.is-collapsed .mc-shared-primary") >= 0,
    "Only the shared primary column may be compacted by the collapsed layout.");
assert.strictEqual(sharedUi.indexOf(".mc-shared-secondary .mc-approval-label{display:none"), -1,
    "Collapsing the first column must not hide Approval Center second-column labels.");

console.log("Native semantic icon colors, approval actions and canonical collapsed layout: OK");
