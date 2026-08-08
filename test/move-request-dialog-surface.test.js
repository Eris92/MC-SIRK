"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var css = fs.readFileSync(path.join(root, "public/shared/styles/main.css"), "utf8");
var theme = fs.readFileSync(path.join(root, "public/shared/ui/toolbar-config.js"), "utf8");

var dialogRule = css.match(/\.mc-move-dialog\{([^}]*)\}/);
assert.ok(dialogRule, "Move Request dialog must have a dedicated shared surface rule.");
assert.ok(/background-color:Canvas/.test(dialogRule[1]),
    "Move Request dialog must keep an independent opaque Canvas base that cannot be invalidated with the native card token layer.");
assert.strictEqual(/background:/.test(dialogRule[1]), false,
    "Move Request dialog must not use a single background shorthand because a native token failure can invalidate the whole surface.");
assert.ok(/border:1px solid var\(--bs-border-color,currentColor\)/.test(dialogRule[1]),
    "Move Request dialog must keep a theme-native visible border fallback.");

var modernRule = css.match(/\.mc-move-dialog\.card\{([^}]*)\}/);
assert.ok(modernRule, "Modern Move Request dialog must explicitly own the combined .mc-move-dialog.card surface seen in real MeshCentral runtime.");
assert.ok(/background-color:Canvas!important/.test(modernRule[1]),
    "Modern native card cascade must not be able to override the opaque Canvas base.");
assert.ok(/background-image:linear-gradient\(var\(--bs-card-bg,var\(--bs-body-bg,transparent\)\),var\(--bs-card-bg,var\(--bs-body-bg,transparent\)\)\)!important/.test(modernRule[1]),
    "Modern Move Request dialog may reuse the native card/body token only as an optional layer above the opaque base.");

var classicRule = css.match(/\.mc-move-dialog\.style10\{([^}]*)\}/);
assert.ok(classicRule, "Classic Move Request dialog must explicitly own the combined .mc-move-dialog.style10 surface.");
assert.ok(/background-color:Canvas!important/.test(classicRule[1]) && /background-image:none!important/.test(classicRule[1]),
    "Classic Move Request dialog must keep a plain opaque system surface without a plugin-specific palette.");

assert.strictEqual(/background(?:-color)?:transparent/.test(dialogRule[1]), false,
    "Move Request dialog surface must never be explicitly transparent.");
assert.ok(css.indexOf('html[data-bs-theme="dark"] .mc-move-dialog,body.night .mc-move-dialog{color-scheme:dark}') >= 0,
    "Dark host signals must drive the Classic/system-color fallback.");
assert.ok(css.indexOf('html:not([data-bs-theme="dark"]) body:not(.night) .mc-move-dialog,html[data-bs-theme="light"] .mc-move-dialog{color-scheme:light}') >= 0,
    "Light host signals must drive the Classic/system-color fallback.");
assert.ok(theme.indexOf('PLUGIN_ROOT_SELECTOR = ".mc-shared-page,#sirk-platform-admin,.sirk-desktop-commands-panel,.mc-results-viewer,.mc-move-dialog"') >= 0 &&
    theme.indexOf('.mc-move-dialog,.mc-results-viewer", applyCard') >= 0,
    "Opaque override must preserve the existing MeshThemeAdapter card ownership for the dialog.");

console.log("Move Request dialog keeps native card ownership with class-specific opaque surface ownership: OK");
