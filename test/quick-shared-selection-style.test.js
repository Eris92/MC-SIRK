"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var shared = fs.readFileSync(path.join(root, "public", "shared", "ui", "shared-ui.css"), "utf8");
var quick = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.css"), "utf8");

assert.ok(
    shared.indexOf(".mc-shared-page,.sirk-desktop-commands{--mc-shared-selection-bg:rgba(80,120,200,.18);--mc-shared-selection-hover:rgba(80,120,200,.12);--mc-shared-selection-icon:var(--bs-primary,#3f7fdb)}") >= 0,
    "Quick and shared modules must inherit one selection palette."
);
assert.ok(
    shared.indexOf(".mc-shared-nav-item:hover,.mc-shared-nav-item.active{background:var(--mc-shared-selection-bg)}") >= 0,
    "Shared module navigation must consume the shared selection background."
);
assert.ok(
    shared.indexOf(".sirk-desktop-commands .sirk-quick-command-browser button:hover{background:var(--mc-shared-selection-hover)!important;color:inherit!important}") >= 0,
    "Quick hover must use the shared subtle hover color."
);
assert.ok(
    shared.indexOf(".sirk-desktop-commands .sirk-quick-command-browser button.is-active{background:var(--mc-shared-selection-bg)!important;color:inherit!important;box-shadow:none!important;font-weight:inherit!important}") >= 0,
    "Quick active rows must match shared modules without a left stripe or forced bold text."
);
assert.ok(
    shared.indexOf(".sirk-desktop-commands .sirk-quick-command-icon{color:var(--mc-shared-selection-icon)!important}") >= 0,
    "Quick icons must use the same theme-aware primary color as shared module icons."
);
assert.ok(
    quick.indexOf(".sirk-quick-command-browser button.is-active{background:var(--sdc-active);box-shadow:inset 3px 0 0 #4f7df3;font-weight:600}") >= 0,
    "The legacy Quick rule remains non-important and must be neutralized by the shared contract."
);
assert.strictEqual(
    quick.indexOf("box-shadow:inset 3px 0 0 #4f7df3!important"),
    -1,
    "Quick must not be able to override the shared no-stripe active state."
);

console.log("Quick and shared module selection palette: OK");
