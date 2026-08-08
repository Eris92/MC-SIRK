"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }
var commands = read("public/modules/commands/index.js");
var quick = read("public/native/desktop-commands.js");
var approvals = read("public/modules/approvals/index.js");
var catalog = read("public/shared/ui/catalog.js");
var status = read("public/shared/ui/status-nav.js");
var adapter = read("public/shared/ui/toolbar-config.js");

assert.strictEqual(approvals.indexOf('iconClassName: "sirk-result-status'), -1,
    "Approval navigation icons must not carry semantic status color classes.");
assert.strictEqual(catalog.indexOf('sirk-result-status-all'), -1,
    "Results navigation icon must be neutral rather than all-status colored.");
assert.strictEqual(status.indexOf('icon.className = "sirk-management-item-icon sirk-result-status'), -1,
    "Shared status navigation icons must be neutral.");
assert.strictEqual(status.indexOf('window.MeshThemeAdapter.status(icon)'), -1,
    "Shared status navigation must not recolor icons through the semantic status adapter.");
assert.strictEqual(catalog.indexOf('window.MeshThemeAdapter.status(icon)'), -1,
    "Results navigation must not recolor its icon through the semantic status adapter.");
assert.ok(adapter.indexOf('[class*=\'mc-results-status-\']') >= 0 && adapter.indexOf('[class*=\'mc-approval-request-status-\']') >= 0,
    "Semantic status styling must remain available for result/table/detail data outside navigation.");

var scriptsGlyph = 'M6 3h9l3 3v15H6V3Z';
var scriptsTerminal = 'm9 11 2 2-2 2M13 15h3';
assert.ok(commands.indexOf(scriptsGlyph) >= 0 && commands.indexOf(scriptsTerminal) >= 0,
    "My Commands Scripts must use the distinct script/document terminal glyph.");
assert.ok(quick.indexOf('scripts: \'<path d="' + scriptsGlyph) >= 0 && quick.indexOf(scriptsTerminal) >= 0 && quick.indexOf('iconKind: "scripts"') >= 0,
    "Quick Scripts must use the same distinct script/document terminal glyph.");
assert.ok(catalog.indexOf('M4 5h16v14H4z') >= 0 && catalog.indexOf(scriptsTerminal) < 0,
    "Scripts and Results artwork must remain distinct without relying on color.");

var gear = 'M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1';
assert.ok(commands.indexOf(gear) >= 0 && quick.indexOf(gear) >= 0,
    "My Commands and Quick must share the simple symmetric System gear geometry.");
assert.strictEqual(commands.indexOf('m15.5 4.8.8 2.1'), -1,
    "My Commands must not retain the irregular System gear artwork.");
assert.strictEqual(quick.indexOf('m15.5 4.8.8 2.1'), -1,
    "Quick must not retain the irregular System gear artwork.");
console.log("Neutral navigation icons and distinct Scripts/System artwork: OK");
