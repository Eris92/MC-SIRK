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

assert.ok(runtime.indexOf('var CONTRACT_VERSION = "1.8.15"') >= 0 &&
    runtime.indexOf('document.documentElement.setAttribute("data-sirk-list-contract-version", CONTRACT_VERSION)') >= 0,
    "The browser must expose the exact shared-list runtime version for diagnostics.");
assert.ok(runtime.indexOf('element.classList.add("sirk-shared-list-item")') >= 0 &&
    runtime.indexOf('element.setAttribute("data-sirk-list-contract", "1")') >= 0,
    "Every real row must receive the canonical class and ownership marker.");
assert.ok(runtime.indexOf('icon.classList.add("sirk-shared-list-icon")') >= 0 &&
    runtime.indexOf('label.classList.add("sirk-shared-list-label", "sirk-quick-command-label")') >= 0,
    "Icons and labels must receive the same DOM contract as Quick.");
assert.ok(runtime.indexOf('copy.className = "sirk-shared-list-copy sirk-quick-command-copy"') >= 0 &&
    runtime.indexOf("if (label.parentNode !== copy) copy.appendChild(label)") >= 0,
    "Approval, Commands and My Scripts labels must use the same copy wrapper as Quick.");
assert.ok(runtime.indexOf("grid-template-columns:minmax(0,1fr) auto!important") >= 0 &&
    runtime.indexOf("if (approval && approval.parentNode !== copy) copy.appendChild(approval)") >= 0,
    "Requires-approval indicator must remain beside the first text line.");

assert.ok(runtime.indexOf('element.classList.toggle("active", selected)') >= 0 &&
    runtime.indexOf('element.classList.toggle("is-active", selected)') >= 0 &&
    runtime.indexOf('element.setAttribute("aria-selected", selected ? "true" : "false")') >= 0,
    "Selected state must be synchronized identically for all modules and Quick.");
assert.ok(runtime.indexOf("moveStatusToIcon(element)") >= 0 &&
    runtime.indexOf("element.classList.remove(name)") >= 0,
    "Approval semantic status colors must be removed from the complete row and moved to its icon.");

assert.ok(runtime.indexOf('button.sirk-shared-list-item.sirk-shared-list-item[data-sirk-list-contract="1"][data-sirk-list-contract="1"]') >= 0,
    "The final visual owner must depend only on the SIRK marker, not MeshCentral or Bootstrap item classes.");
assert.strictEqual(runtime.indexOf("sirk-shared-list-item.list-group-item.list-group-item-action"), -1,
    "The final visual selector must not require list-group-item classes.");
assert.strictEqual(runtime.indexOf("sirk-shared-list-item.nav-link"), -1,
    "The final visual selector must not require nav-link classes.");
assert.ok(runtime.indexOf("grid-template-columns:24px minmax(0,1fr)!important") >= 0 &&
    quick.indexOf("grid-template-columns:24px minmax(0,1fr)") >= 0,
    "All rows must use the same icon and label tracks as Quick.");
assert.ok(runtime.indexOf("min-height:36px!important;margin:0 0 3px!important;padding:8px!important") >= 0 &&
    quick.indexOf("min-height:36px;margin:0 0 3px;padding:8px") >= 0,
    "All rows must use the same height, spacing and padding as Quick.");
assert.ok(runtime.indexOf("background:transparent!important;color:inherit!important;border:1px solid transparent!important;border-radius:0!important") >= 0,
    "Default rows must have one square, transparent interaction surface.");
assert.ok(runtime.indexOf("background:var(--bs-list-group-action-hover-bg,rgba(127,127,127,.12))!important") >= 0,
    "Every module and Quick must use one native hover state.");
assert.ok(runtime.indexOf("border-color:var(--bs-list-group-active-border-color,var(--bs-border-color,currentColor))!important") >= 0 &&
    runtime.indexOf("outline:0!important;box-shadow:none!important") >= 0,
    "Every selected row must use one border state without a second outline or shadow.");
assert.ok(runtime.indexOf(".sirk-quick-command-categories > button") >= 0 &&
    runtime.indexOf(".sirk-quick-command-tree > button") >= 0,
    "Both Quick columns must be explicitly covered by the shared contract.");
assert.ok(runtime.indexOf("background-color:var(--bs-body-bg)!important") >= 0,
    "The first, second and details columns must use the same native surface.");
assert.ok(runtime.indexOf("window.__sirkSharedListObserver.disconnect()") >= 0 &&
    runtime.indexOf("adapter.__sirkSharedListContractVersion = CONTRACT_VERSION") >= 0,
    "A new release must replace the previous observer and adapter contract instead of keeping stale runtime code.");

console.log("Class-independent Approval, Commands, My Scripts and Quick list interaction owner: OK");
