"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var css = fs.readFileSync(path.join(root, "public/native/desktop-commands.css"), "utf8");
var adapter = fs.readFileSync(path.join(root, "public/shared/ui/toolbar-config.js"), "utf8");

assert.ok(css.indexOf('.sirk-desktop-commands-toggle{position:absolute;z-index:1002;top:50%;right:-1px;width:38px;height:60px') >= 0,
    "Quick launcher must retain its exact 38 px geometry.");
assert.strictEqual(css.indexOf('.sirk-desktop-commands-toggle:hover'), -1,
    "Quick launcher hover must not change its width or geometry.");
assert.strictEqual(css.indexOf('.sirk-desktop-commands-toggle[aria-expanded="true"]'), -1,
    "Opening Quick must not change launcher width or geometry.");
assert.ok(css.indexOf('transform:translateY(-50%)') >= 0,
    "The edge launcher may keep its positioning transform.");
assert.ok(css.indexOf('background-color:var(--bs-body-bg)!important') >= 0,
    "Modern Quick surfaces must use the active MeshCentral Bootstrap body background.");
assert.ok(css.indexOf('.sirk-desktop-commands-panel[data-mesh-ui="modern"]') >= 0 &&
    css.indexOf('.sirk-quick-command-toolbar-host{background-color:var(--bs-body-bg)!important}') >= 0,
    "The Quick panel, columns and toolbar host must share the same opaque native surface.");

assert.ok(adapter.indexOf('.sirk-quick-command-browser button') >= 0 &&
    adapter.indexOf('syncOwnedClasses(element, ["list-group-item", "list-group-item-action"])') >= 0,
    "Modern Quick rows must inherit native MeshCentral list interaction styling.");
assert.ok(adapter.indexOf('syncOwnedClasses(element, [selected ? "style10s" : "style10"])') >= 0,
    "Classic Quick rows must inherit native MeshCentral style10/style10s styling.");

assert.ok(css.indexOf('.sirk-quick-command-toolbar-host{min-width:0;padding:8px 10px 0;overflow:hidden;box-sizing:border-box}') >= 0,
    "Quick content must start immediately below the toolbar and stay inside the panel outline.");
assert.ok(css.indexOf('grid-template-columns:minmax(165px,205px) minmax(285px,340px) 0!important') >= 0 &&
    css.indexOf('grid-template-columns:64px minmax(285px,340px) 0!important') >= 0,
    "Hidden Quick output must use the canonical collapsed details track.");
assert.ok(css.indexOf('.sirk-quick-command-browser.is-details-collapsed .sirk-quick-command-details{display:none!important}') >= 0,
    "The canonical details-collapsed class must be the only CSS visibility owner.");
assert.ok(css.indexOf('.sirk-desktop-commands-panel button:hover') >= 0 &&
    css.indexOf('transform:none!important') >= 0 &&
    css.indexOf('scale:none!important') >= 0 &&
    css.indexOf('zoom:1!important') >= 0,
    "Quick-owned controls must neutralize MeshCentral hover scaling so panel/table geometry cannot grow.");

[
    "data-sirk-output-hidden",
    "--bs-list-group-action-hover-bg",
    "--bs-list-group-action-hover-color",
    "--bs-list-group-active-border-color",
    "--bs-list-group-active-bg",
    "--bs-list-group-active-color",
    "--sdc-hover",
    "--sdc-active"
].forEach(function (value) {
    assert.strictEqual(css.indexOf(value), -1,
        "Quick native interaction CSS must not contain a duplicated color/state palette: " + value);
});
assert.strictEqual(css.indexOf('.sirk-quick-command-browser button:hover{background'), -1,
    "Quick must not override native row hover colors.");
assert.strictEqual(css.indexOf('.sirk-quick-command-browser button.active{background'), -1,
    "Quick must not override native row selected colors.");

console.log("Quick native colors with stable non-scaling hover geometry: OK");
