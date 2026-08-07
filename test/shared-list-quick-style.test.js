"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var tree = read("public/shared/ui/tree.js");
var status = read("public/shared/ui/status-nav.js");
var catalog = read("public/shared/ui/catalog.js");
var css = read("public/shared/ui/toolbar.css");
var sharedUiCss = read("public/shared/ui/shared-ui.css");
var quickCss = read("public/native/desktop-commands.css");
var adapter = read("public/shared/ui/toolbar-config.js");
var startup = read("plugin-main.js");

assert.ok(tree.indexOf('" sirk-shared-list-item"') >= 0 &&
    tree.indexOf('" sirk-shared-list-icon"') >= 0 &&
    tree.indexOf('mc-tree-label sirk-shared-list-label') >= 0 &&
    tree.indexOf('copy.className = "sirk-shared-list-copy"') >= 0,
    "Tree rows must receive the shared list geometry classes directly while they are rendered.");
assert.ok(tree.indexOf('indicator.className = "mc-tree-approval"') >= 0 &&
    tree.indexOf('button.__sirkCopy.appendChild(indicator)') >= 0,
    "Requires-approval must remain inside the label/copy track instead of becoming a third grid item.");

assert.ok(status.indexOf("sirk-shared-list-item") >= 0 &&
    status.indexOf("sirk-shared-list-icon") >= 0 &&
    status.indexOf("sirk-shared-list-label") >= 0,
    "Status navigation must render the same shared list geometry contract directly.");
assert.ok(catalog.indexOf("mc-catalog-results") >= 0 &&
    catalog.indexOf("sirk-shared-list-item") >= 0 &&
    catalog.indexOf("sirk-shared-list-icon") >= 0,
    "Results must use the same shared list geometry contract as roots and status rows.");

[tree, status, catalog].forEach(function (source) {
    assert.strictEqual(source.indexOf("CONTRACT_VERSION"), -1,
        "Shared renderers must not carry release-specific visual contract versions.");
    assert.strictEqual(source.indexOf("MutationObserver"), -1,
        "Shared renderers must not repair their DOM asynchronously after rendering.");
    assert.strictEqual(source.indexOf('createElement("style")'), -1,
        "Shared renderers must not inject runtime CSS.");
    assert.strictEqual(source.indexOf("data-sirk-list-contract"), -1,
        "Shared renderers must not rely on compatibility ownership markers.");
});

assert.ok(css.indexOf(".sirk-shared-list-item,.sirk-quick-command-categories>button,.sirk-quick-command-tree>button{display:grid;grid-template-columns:24px minmax(0,1fr);gap:8px") >= 0,
    "Approval, Commands, My Scripts and both Quick columns must share one 24 px icon geometry.");
assert.ok(css.indexOf("min-height:36px;margin:0 0 3px;padding:8px") >= 0,
    "All shared and Quick rows must use the same height, margin and padding.");
assert.ok(css.indexOf(".sirk-shared-list-copy,.sirk-quick-command-copy{display:grid;grid-template-columns:minmax(0,1fr) auto") >= 0,
    "Shared and Quick copy tracks must reserve a compact first-line indicator column.");
assert.ok(sharedUiCss.indexOf(".mc-tree-folder-body{margin:0 0 0 6px}") >= 0 &&
    css.indexOf("var(--sdc-depth,0) * 6px") >= 0,
    "Nested shared trees and Quick must use the same cumulative 6 px indentation step from their canonical CSS owners.");
assert.strictEqual(css.indexOf(".mc-tree-folder-body{"), -1,
    "Toolbar CSS must not duplicate shared tree indentation ownership.");

assert.ok(adapter.indexOf('.mc-shared-nav-item,.mc-approval-provider,.mc-approval-status,.mc-catalog-results,.mc-tree-root,.mc-tree-script,.mc-tree-folder-header,.sirk-quick-command-browser button') >= 0,
    "Shared and Quick rows must enter the same native navigation styling path.");
assert.ok(adapter.indexOf('syncOwnedClasses(element, ["list-group-item", "list-group-item-action"])') >= 0 &&
    adapter.indexOf('syncOwnedClasses(element, [selected ? "style10s" : "style10"])') >= 0,
    "Hover and selected appearance must come from native Modern or Classic MeshCentral classes.");
[
    ".sirk-shared-list-item:hover",
    ".sirk-shared-list-item.active",
    ".sirk-quick-command-categories>button:hover",
    ".sirk-quick-command-tree>button.active"
].forEach(function (selector) {
    assert.ok(css.indexOf(selector) >= 0 || css.indexOf(".sirk-shared-list-item:is(.active,.is-active)") >= 0,
        "Shared selected state must remain visibly marked while using host theme tokens.");
});
assert.strictEqual(quickCss.indexOf("--bs-list-group-action-hover-bg"), -1,
    "Quick CSS must not duplicate the native hover palette.");
assert.strictEqual(quickCss.indexOf("--bs-list-group-active-border-color"), -1,
    "Quick CSS must not duplicate the native selected-state palette.");

var desktopStyle = startup.indexOf('style("sirk-platform-desktop-commands-style", "desktop-commands.css")');
var sharedStyle = startup.indexOf('style("sirk-platform-toolbar-style", "shared-ui/toolbar.css")');
assert.ok(desktopStyle >= 0 && sharedStyle > desktopStyle,
    "Shared row geometry CSS must load after Quick-specific panel geometry without becoming the interaction-theme owner.");

console.log("Direct shared-list geometry with native MeshCentral interaction ownership: OK");
