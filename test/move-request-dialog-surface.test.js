"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var css = fs.readFileSync(path.join(root, "public/shared/styles/main.css"), "utf8");
var theme = fs.readFileSync(path.join(root, "public/shared/ui/toolbar-config.js"), "utf8");

var dialogRule = css.match(/\.mc-move-dialog\{([^}]*)\}/);
assert.ok(dialogRule, "Move Request dialog must have a dedicated shared surface rule.");
assert.ok(/background-color:var\(--bs-card-bg,var\(--bs-body-bg,Canvas\)\)/.test(dialogRule[1]),
    "Move Request dialog must use native Bootstrap surface tokens with an opaque Canvas fallback.");
assert.ok(/border:1px solid var\(--bs-border-color,currentColor\)/.test(dialogRule[1]),
    "Move Request dialog must keep a theme-native visible border fallback.");
assert.strictEqual(/background(?:-color)?:transparent/.test(dialogRule[1]), false,
    "Move Request dialog surface must never be explicitly transparent.");
assert.ok(css.indexOf('html[data-bs-theme="dark"] .mc-move-dialog,body.night .mc-move-dialog{color-scheme:dark}') >= 0,
    "Dark host signals must drive the Classic/system-color fallback.");
assert.ok(css.indexOf('html:not([data-bs-theme="dark"]) body:not(.night) .mc-move-dialog,html[data-bs-theme="light"] .mc-move-dialog{color-scheme:light}') >= 0,
    "Light host signals must drive the Classic/system-color fallback.");
assert.ok(theme.indexOf('PLUGIN_ROOT_SELECTOR = ".mc-shared-page,#sirk-platform-admin,.sirk-desktop-commands-panel,.mc-results-viewer,.mc-move-dialog"') >= 0 &&
    theme.indexOf('.mc-move-dialog,.mc-results-viewer", applyCard') >= 0,
    "Opaque fallback must preserve the existing MeshThemeAdapter card ownership for the dialog.");

console.log("Move Request dialog keeps native card ownership with an opaque theme-safe surface: OK");
