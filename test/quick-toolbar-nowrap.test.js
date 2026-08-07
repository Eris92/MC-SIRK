"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var css = fs.readFileSync(path.join(root, "public/native/desktop-commands.css"), "utf8");
var shared = fs.readFileSync(path.join(root, "public/shared/ui/toolbar.css"), "utf8");
assert.ok(css.indexOf(".sirk-quick-command-toolbar-host .mc-shared-toolbar{align-items:center;min-height:34px;margin:0;gap:8px;max-width:100%;box-sizing:border-box;flex-wrap:nowrap}") >= 0, "Quick toolbar must remain one row independently of shared toolbar wrapping.");
assert.ok(css.indexOf(".sirk-quick-command-toolbar-host .mc-shared-toolbar-left{flex:1 1 auto;min-width:0}") >= 0 && css.indexOf(".sirk-quick-command-toolbar-host .mc-shared-toolbar-right{flex:0 0 auto;min-width:34px;margin-left:auto}") >= 0, "Quick left actions/search must consume flexible space while Close stays fixed.");
assert.ok(css.indexOf(".sirk-desktop-commands .mc-shared-toolbar-search{flex:1 1 0;min-width:0;max-width:300px}") >= 0 && css.indexOf(".sirk-desktop-commands .mc-shared-toolbar-search input{width:100%;min-width:0") >= 0, "Quick Search must shrink before any fixed toolbar action moves.");
assert.ok(css.indexOf("flex:0 0 34px") >= 0, "Quick toolbar actions must not shrink below their canonical 34 px width.");
assert.strictEqual(css.indexOf(".sirk-quick-command-toolbar-host .mc-shared-toolbar{flex-wrap:wrap}"), -1, "Quick responsive CSS must not re-enable a second toolbar row.");
assert.ok(shared.indexOf("@media(max-width:760px){.mc-shared-toolbar{flex-wrap:wrap}") >= 0, "The Quick-specific fix must not remove wrapping support from other shared module toolbars.");
console.log("Quick toolbar search remains one row with fixed action geometry: OK");
