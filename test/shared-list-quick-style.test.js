"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var runtime = fs.readFileSync(path.join(root, "public/shared/ui/status-nav.js"), "utf8");
var style = fs.readFileSync(path.join(root, "public/shared/ui/toolbar.css"), "utf8");

["mc-shared-page-approvalcenter", "mc-shared-page-mycommands", "mc-shared-page-myscripts", "sirk-quick-command-browser"].forEach(function (name) {
    assert.ok(runtime.indexOf(name) >= 0,
        name + " must be normalized by the actual shared-list runtime.");
});
assert.ok(runtime.indexOf('element.classList.add("sirk-shared-list-item")') >= 0,
    "Every real row element must receive the canonical shared-list class.");
assert.ok(runtime.indexOf('icon.classList.add("sirk-shared-list-icon")') >= 0 &&
    runtime.indexOf('label.classList.add("sirk-shared-list-label")') >= 0,
    "Icons and labels must receive one canonical DOM contract.");
assert.ok(runtime.indexOf('element.classList.toggle("active", selected)') >= 0 &&
    runtime.indexOf('element.classList.toggle("is-active", selected)') >= 0 &&
    runtime.indexOf('element.setAttribute("aria-selected", selected ? "true" : "false")') >= 0,
    "Selected state must be synchronized identically for all modules and Quick.");
assert.ok(runtime.indexOf("moveStatusToIcon(element)") >= 0 &&
    runtime.indexOf("element.classList.remove(name)") >= 0,
    "Approval semantic status colors must be removed from the complete row and moved to its icon.");
assert.ok(runtime.indexOf("new MutationObserver") >= 0 && runtime.indexOf("adapter.refresh = function") >= 0,
    "The contract must be re-applied after asynchronous renders and theme refreshes.");

assert.ok(style.indexOf(".sirk-shared-list-item{") >= 0,
    "One canonical class must own the row geometry and interaction style.");
assert.ok(style.indexOf("background-color:transparent!important") >= 0 &&
    style.indexOf("outline:1px solid var(--bs-list-group-active-border-color,currentColor)!important") >= 0,
    "Inactive and selected rows must use the same Quick-like transparent/outline interaction.");
assert.ok(style.indexOf(".mc-shared-page:is(.mc-shared-page-approvalcenter") < 0,
    "The previous page-specific CSS emulation must not return.");

console.log("Runtime-normalized Approval, Commands, My Scripts and Quick list contract: OK");
