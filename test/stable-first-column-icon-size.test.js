"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }
var toolbar = read("public/shared/ui/toolbar.css");
var shared = read("public/shared/ui/shared-ui.css");
var layout = read("public/shared/ui/layout.js");
var tree = read("public/shared/ui/tree.js");
var approvals = read("public/modules/approvals/index.js");
var quick = read("public/native/desktop-commands.css");

assert.ok(toolbar.indexOf('.mc-shared-primary>.sirk-shared-list-item,.sirk-quick-command-browser .mc-shared-primary>button{grid-template-columns:28px minmax(0,1fr)}') >= 0,
    "Expanded and collapsed first-column rows must reserve one stable 28 px icon box.");
assert.ok(toolbar.indexOf('.mc-shared-primary>.sirk-shared-list-item .sirk-shared-list-icon,.sirk-quick-command-browser .mc-shared-primary>button .sirk-quick-command-icon{width:28px;min-width:28px;height:28px;max-width:28px}') >= 0,
    "My Scripts/My Commands and Quick first-column icon boxes must stay 28x28 in every Collapse state.");
assert.ok(toolbar.indexOf('.mc-shared-primary>.sirk-shared-list-item .sirk-shared-list-icon svg,.sirk-quick-command-browser .mc-shared-primary>button .sirk-quick-command-icon svg{width:24px;height:24px}') >= 0,
    "Monochrome first-column SVG artwork must stay 24x24 in every Collapse state.");

assert.ok(toolbar.indexOf('.mc-shared-layout.is-collapsed .mc-shared-primary>.sirk-shared-list-item,.sirk-quick-command-browser.is-collapsed .mc-shared-primary>button{display:flex;align-items:center;justify-content:center;width:44px;min-width:44px;height:44px;min-height:44px;margin:0 auto 3px;padding:8px;font-size:0}') >= 0,
    "Collapsed first-column rows must keep the same 44 px vertical step as expanded 28 px icons with 8 px padding.");
assert.ok(shared.indexOf('.mc-shared-layout.is-collapsed .mc-shared-primary{padding:12px 9px;overflow:hidden}') >= 0,
    "Collapse must preserve the expanded primary column's 12 px vertical origin while only tightening horizontal padding.");

assert.ok(shared.indexOf('.mc-shared-primary{padding:12px 9px}') >= 0,
    "Expanded first-column horizontal padding must place the 28 px icon center on the collapsed 64 px track axis.");
assert.ok(shared.indexOf('.mc-shared-primary .mc-shared-nav-item .mc-nav-icon{width:28px;min-width:28px;height:28px}') >= 0,
    "Approval Center first-column navigation must reuse the same 28 px icon box as Commands/Scripts/Quick.");
assert.ok(shared.indexOf('.mc-shared-layout.is-collapsed .mc-shared-primary .mc-shared-nav-item{display:flex;align-items:center;justify-content:center;width:44px;min-width:44px;height:44px;min-height:44px;padding:8px;margin:0 auto 3px;font-size:0}') >= 0,
    "Approval Center collapsed navigation must keep the same 44 px row geometry as expanded first-column rows.");
assert.ok(approvals.indexOf('button.className = "mc-shared-nav-item sirk-shared-list-item "') >= 0 && approvals.indexOf('icon.className = "mc-nav-icon sirk-shared-list-icon"') >= 0,
    "Approval Center must remain a direct consumer of the shared first-column geometry owner.");

assert.ok(quick.indexOf('.sirk-quick-command-browser .mc-shared-primary{padding-left:9px;padding-right:9px}') >= 0 &&
    quick.indexOf('.sirk-quick-command-browser.is-collapsed .sirk-quick-command-categories{padding:12px 9px;overflow:hidden}') >= 0,
    "Quick expanded/collapsed primary must keep the same horizontal icon/indicator origin.");
assert.ok(quick.indexOf('width:44px;min-width:44px;height:44px;min-height:44px;margin:0 auto 3px;padding:8px') >= 0,
    "Quick collapsed category row must reuse the 44 px shared first-column row geometry.");

assert.ok(toolbar.indexOf('.sirk-shared-list-icon,.sirk-quick-command-icon{display:grid;place-items:center;width:20px;min-width:20px;height:20px;max-width:20px;object-fit:contain}') >= 0,
    "Second-column/shared list icons must retain their existing compact 20 px geometry.");
assert.ok(toolbar.indexOf('.sirk-shared-list-icon svg,.sirk-quick-command-icon svg{display:block;width:20px;height:20px}') >= 0,
    "Non-primary SVG icons must retain the existing compact 20 px geometry.");

assert.strictEqual(/is-collapsed[^}]*sirk-shared-list-icon[^}]*width:/.test(toolbar), false,
    "Collapse CSS must not resize shared first-column icons.");
assert.strictEqual(/is-collapsed[^}]*sirk-quick-command-icon[^}]*width:/.test(toolbar), false,
    "Quick Collapse CSS must not resize category icons.");
assert.strictEqual(/is-collapsed[^}]*mc-tree-root img[^}]*width:/.test(shared), false,
    "Shared Collapse CSS must not resize custom root images.");
assert.strictEqual(/is-collapsed[^}]*mc-tree-fallback-icon[^}]*width:/.test(shared), false,
    "Shared Collapse CSS must not resize fallback root artwork.");

assert.ok(tree.indexOf('image.className = (className || "mc-tree-icon") + " sirk-shared-list-icon"') >= 0,
    "Custom root images must reuse the same primary icon-size owner with object-fit containment.");
assert.ok(layout.indexOf('entry.root.classList.toggle("is-collapsed", entry.collapsed)') >= 0 &&
    layout.indexOf('createElement("style")') < 0,
    "Collapse lifecycle must remain state/class-only with no runtime icon sizing.");
assert.ok(shared.indexOf('--sirk-primary-collapsed-track:64px') >= 0,
    "Stable icon size must preserve the canonical 64 px collapsed primary track.");
assert.ok(toolbar.indexOf('.mc-shared-page :is(.sirk-shared-list-item,.mc-shared-nav-item):is(.active,.is-active)') >= 0,
    "Stable larger first-column icons must preserve the shared selected-state indicator contract.");

console.log("First-column icons keep one stable expanded/collapsed size without changing second-column geometry: OK");
