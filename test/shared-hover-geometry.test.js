"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var shared = fs.readFileSync(path.join(root, "public/shared/ui/shared-ui.css"), "utf8");
var quick = fs.readFileSync(path.join(root, "public/native/desktop-commands.css"), "utf8");
var tools = fs.readFileSync(path.join(root, "public/shared/ui/script-tools.js"), "utf8");

assert.ok(shared.indexOf('.mc-shared-card,.mc-shared-card:hover,.mc-shared-card:focus,.mc-shared-card:focus-within,.mc-definition-section,.mc-definition-section:hover,.mc-definition-section:focus,.mc-definition-section:focus-within{transform:none!important;scale:none!important;zoom:1!important}') >= 0,
    "Shared cards and every Definition Editor section must reject host transform/scale/zoom geometry changes.");
assert.ok(quick.indexOf('.sirk-desktop-commands-panel .sirk-quick-command-details') >= 0 &&
    quick.indexOf('transform:none!important;scale:none!important;zoom:1!important') >= 0,
    "Quick details must retain its existing hover geometry clamp.");
assert.ok(shared.indexOf('.mc-shared-layout{') >= 0 && shared.indexOf('resize:horizontal') >= 0,
    "The hover fix must not remove the existing shared layout resize contract without evidence.");
assert.strictEqual(shared.indexOf('.mc-shared-card:hover{width:'), -1,
    "Hover stability must not be implemented as a per-state width override.");
assert.strictEqual(shared.indexOf('.mc-definition-section:hover{width:'), -1,
    "Definition Editor hover stability must not use a per-state width override.");
assert.strictEqual(tools.indexOf('mouseenter'), -1,
    "Definition Editor geometry must not add mouseenter handlers.");
assert.strictEqual(tools.indexOf('mouseleave'), -1,
    "Definition Editor geometry must not add mouseleave handlers.");

console.log("Shared, Definition Editor and Quick surfaces keep geometry stable on hover: OK");