"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var css = fs.readFileSync(path.join(root, "public/shared/styles/main.css"), "utf8");
var theme = fs.readFileSync(path.join(root, "public/shared/ui/toolbar-config.js"), "utf8");
var source = fs.readFileSync(path.join(root, "public/modules/move-requests/index.js"), "utf8");

var dialogRule = css.match(/\.mc-move-dialog\{([^}]*)\}/);
assert.ok(dialogRule, "Move Request dialog must keep a dedicated geometry rule.");
assert.strictEqual(/background(?:-color|-image)?:/.test(dialogRule[1]), false,
    "Modern Move Request surface must be owned by native modal-content rather than plugin card/background overrides.");
assert.strictEqual(css.indexOf(".mc-move-dialog.card{"), -1,
    "Move Request must not retain card-specific cascade workarounds once the native modal surface is used.");
assert.strictEqual(css.indexOf(".mc-move-dialog:hover"), -1,
    "Move Request must not neutralize host card hover with a plugin hover workaround.");

var classicRule = css.match(/\.mc-move-dialog\.style10\{([^}]*)\}/);
assert.ok(classicRule && /background-color:Canvas/.test(classicRule[1]),
    "Classic Move Request must keep an opaque system-color fallback while reusing style10.");
assert.ok(css.indexOf('html[data-bs-theme="dark"] .mc-move-dialog,body.night .mc-move-dialog{color-scheme:dark}') >= 0,
    "Dark host signals must drive the Classic system-color fallback.");
assert.ok(css.indexOf('html:not([data-bs-theme="dark"]) body:not(.night) .mc-move-dialog,html[data-bs-theme="light"] .mc-move-dialog{color-scheme:light}') >= 0,
    "Light host signals must drive the Classic system-color fallback.");

assert.ok(theme.indexOf('"card", "modal", "modal-content", "form-control"') >= 0,
    "MeshThemeAdapter must own both modal and modal-content so Modern surface variables and stale classes stay under one owner.");
assert.ok(theme.indexOf('element.classList.contains("mc-move-dialog")') >= 0 &&
    theme.indexOf('isModern() ? "modal-content" : "style10"') >= 0,
    "Move Request must reuse the existing shared surface adapter but map to native modal-content in Modern and style10 in Classic.");
assert.ok(theme.indexOf('PLUGIN_ROOT_SELECTOR = ".mc-shared-page,#sirk-platform-admin,.sirk-desktop-commands-panel,.mc-results-viewer,.mc-move-dialog-overlay,.mc-move-dialog"') >= 0,
    "The existing theme observer must own the Move Request overlay so the native modal variable scope is refreshed with the dialog.");
assert.ok(theme.indexOf('queryAll(root, ".mc-move-dialog-overlay", function (element) { syncOwnedClasses(element, modern ? ["modal"] : []); });') >= 0,
    "Modern Move Request overlay must receive native modal ownership while Classic removes the Bootstrap modal class.");
assert.ok(source.indexOf('window.MeshThemeAdapter.refresh(overlay);') >= 0 &&
    source.indexOf('window.MeshThemeAdapter.refresh(overlay);') < source.indexOf('document.body.appendChild(overlay);'),
    "Move Request must apply the existing theme adapter to the complete detached overlay before first paint.");
assert.ok(theme.indexOf('.mc-move-dialog,.mc-results-viewer", applyCard') >= 0,
    "Move Request must stay on the existing MeshThemeAdapter refresh path without a new observer or repair loop.");

console.log("Move Request uses native modal surface ownership without card hover behavior: OK");
