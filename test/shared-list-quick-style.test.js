"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var runtime = fs.readFileSync(path.join(root, "public/shared/ui/status-nav.js"), "utf8");
var quick = fs.readFileSync(path.join(root, "public/native/desktop-commands.css"), "utf8");

["mc-shared-page-approvalcenter", "mc-shared-page-mycommands", "mc-shared-page-myscripts", "sirk-quick-command-browser"].forEach(function (name) {
    assert.ok(runtime.indexOf(name) >= 0,
        name + " must be normalized by the actual shared-list runtime.");
});

assert.ok(runtime.indexOf('element.classList.add("sirk-shared-list-item")') >= 0,
    "Every real row element must receive the canonical shared-list class.");
assert.ok(runtime.indexOf('icon.classList.add("sirk-shared-list-icon")') >= 0 &&
    runtime.indexOf('label.classList.add("sirk-shared-list-label", "sirk-quick-command-label")') >= 0,
    "Icons and labels must receive the same DOM contract as Quick.");
assert.ok(runtime.indexOf('copy.className = "sirk-shared-list-copy sirk-quick-command-copy"') >= 0 &&
    runtime.indexOf("if (label.parentNode !== copy) copy.appendChild(label)") >= 0,
    "Approval, Commands and My Scripts labels must use the same copy wrapper as Quick.");
assert.ok(runtime.indexOf("directApprovalIndicator(element)") >= 0 &&
    runtime.indexOf("if (approval && approval.parentNode !== copy) copy.appendChild(approval)") >= 0 &&
    runtime.indexOf('copy.classList.toggle("has-approval", !!approval)') >= 0,
    "Requires-approval indicator must stay in the first text row instead of becoming a new grid row.");

assert.ok(runtime.indexOf('element.classList.toggle("active", selected)') >= 0 &&
    runtime.indexOf('element.classList.toggle("is-active", selected)') >= 0 &&
    runtime.indexOf('element.setAttribute("aria-selected", selected ? "true" : "false")') >= 0,
    "Selected state must be synchronized identically for all modules and Quick.");
assert.ok(runtime.indexOf("moveStatusToIcon(element)") >= 0 &&
    runtime.indexOf("element.classList.remove(name)") >= 0,
    "Approval semantic status colors must be removed from the complete row and moved to its icon.");

assert.ok(runtime.indexOf("grid-template-columns:24px minmax(0,1fr)!important") >= 0 &&
    quick.indexOf("grid-template-columns:24px minmax(0,1fr)") >= 0,
    "Shared rows and Quick must use the same icon and label tracks.");
assert.ok(runtime.indexOf("min-height:36px!important;margin:0 0 3px!important;padding:8px!important") >= 0 &&
    quick.indexOf("min-height:36px;margin:0 0 3px;padding:8px") >= 0,
    "Shared rows and Quick must use the same height, spacing and padding.");
assert.ok(runtime.indexOf("background-color:var(--bs-list-group-action-hover-bg)!important") >= 0 &&
    quick.indexOf("background-color:var(--bs-list-group-action-hover-bg)!important") >= 0,
    "Shared rows and Quick must use the same native hover state.");
assert.ok(runtime.indexOf("outline:1px solid var(--bs-list-group-active-border-color,currentColor)!important") >= 0 &&
    quick.indexOf("outline:1px solid var(--bs-list-group-active-border-color,currentColor)!important") >= 0,
    "Shared rows and Quick must use the same native selected outline.");
assert.strictEqual(runtime.indexOf("background-color:transparent!important"), -1,
    "The exact Quick runtime must not force a transparent row background over native list-group styling.");
assert.strictEqual(runtime.indexOf("border-color:transparent!important"), -1,
    "The exact Quick runtime must not erase native list-group borders.");
assert.ok(runtime.indexOf("background-color:var(--bs-body-bg)!important") >= 0,
    "The first, second and details columns must use the same native surface as Quick.");
assert.ok(runtime.indexOf("new MutationObserver") >= 0 && runtime.indexOf("adapter.refresh = function") >= 0,
    "The contract must be re-applied after asynchronous renders and theme refreshes.");

console.log("Exact Quick list contract and inline approval indicator: OK");
