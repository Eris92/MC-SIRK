"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var css = fs.readFileSync(path.join(root, "public/native/desktop-commands.css"), "utf8");
var shared = fs.readFileSync(path.join(root, "public/shared/ui/toolbar.css"), "utf8");
assert.ok(css.indexOf(".sirk-quick-command-toolbar-host .mc-shared-toolbar{align-items:center;min-height:34px;margin:0;gap:8px;max-width:100%;box-sizing:border-box;flex-wrap:nowrap}") >= 0,
    "Quick toolbar must remain one row independently of shared toolbar wrapping.");
assert.ok(css.indexOf(".sirk-quick-command-toolbar-host .mc-shared-toolbar-left{flex:0 0 auto;min-width:0}") >= 0 &&
    css.indexOf(".sirk-quick-command-toolbar-host .mc-shared-toolbar-center{display:flex;flex:1 1 0;min-width:0}") >= 0 &&
    css.indexOf(".sirk-quick-command-toolbar-host .mc-shared-toolbar-right{flex:0 0 auto;min-width:34px;margin-left:auto}") >= 0,
    "Quick left/right actions must stay fixed while the center Search slot consumes only remaining space.");
assert.ok(css.indexOf(".sirk-desktop-commands .mc-shared-toolbar-search{flex:1 1 0;min-width:0;max-width:300px;height:32px}") >= 0 &&
    css.indexOf(".sirk-desktop-commands .mc-shared-toolbar-search input{width:100%;min-width:0;height:32px;min-height:32px;line-height:20px;box-sizing:border-box;padding:5px 9px}") >= 0,
    "Quick Search wrapper and native form-control must stay exactly 32 px high so Search on/off cannot change toolbar row height.");
assert.ok(css.indexOf("flex:0 0 34px") >= 0,
    "Quick toolbar actions must not shrink below their canonical 34 px width.");
assert.strictEqual(css.indexOf(".sirk-quick-command-toolbar-host .mc-shared-toolbar{flex-wrap:wrap}"), -1,
    "Quick responsive CSS must not re-enable a second toolbar row.");
assert.ok(shared.indexOf("@media(max-width:760px){.mc-shared-toolbar{flex-wrap:wrap}") >= 0,
    "Non-Quick shared module toolbars may retain their responsive wrapping contract.");
console.log("Quick toolbar keeps fixed actions and a fixed-height elastic Search control: OK");
