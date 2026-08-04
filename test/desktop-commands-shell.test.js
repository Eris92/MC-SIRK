"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var script = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.js"), "utf8");
var css = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.css"), "utf8");
var toolbar = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar.js"), "utf8");

assert.ok(script.indexOf("window.SharedToolbar.mount") >= 0 &&
    script.indexOf('preset: "mycommands"') >= 0,
    "Quick commands must use the same shared toolbar component as My Commands.");
assert.ok(script.indexOf('collapse: {') >= 0 &&
    script.indexOf('favorites: {') >= 0 &&
    script.indexOf('refresh: {') >= 0 &&
    script.indexOf('search: { title: text("search")') >= 0,
    "Quick commands toolbar must provide collapse, favorites, refresh and search controls.");
assert.ok(script.indexOf('key: "details"') >= 0 &&
    script.indexOf('DETAILS_COLLAPSED_KEY = "mc-sirk-quickcommands-details-collapsed"') >= 0 &&
    script.indexOf('browser.classList.toggle("is-details-collapsed", state.detailsCollapsed)') >= 0,
    "Quick commands must provide a persistent output-column collapse action.");
assert.ok(script.indexOf('key: "close"') >= 0 && script.indexOf("closePanel(panel)") >= 0,
    "Quick commands must expose Close as a toolbar action.");
assert.ok(script.indexOf('PREFERENCES_KEY = "sirkPlatform.mycommands.preferences"') >= 0 &&
    script.indexOf("state.favoritesOnly") >= 0 && script.indexOf("filterGroup") >= 0,
    "Quick commands favorites must use the same saved favorites as My Commands.");
assert.ok(toolbar.indexOf('QUICK_PREFERENCES_KEY = "sirkPlatform.mycommands.preferences"') >= 0 &&
    toolbar.indexOf("preferences.quickFavoritesOnly") >= 0 &&
    toolbar.indexOf("writeQuickFavoritesOnly(nextQuickFavorites)") >= 0 &&
    toolbar.indexOf("restoreQuickFavorites(context.buttons.favorites)") >= 0,
    "Quick commands must save and restore whether the Favorites-only filter is active.");
assert.ok(toolbar.indexOf("typeof preferences.favoritesOnly === \"boolean\"") >= 0,
    "Quick commands must migrate an older saved Favorites-only preference.");
assert.ok(script.indexOf('path: "@command/" + category.key + "/" + command.id') >= 0,
    "Quick commands must use the same command favorite keys as My Commands.");
assert.ok(script.indexOf('sirk-quick-command-browser mc-shared-layout') >= 0 &&
    script.indexOf('mc-shared-primary') >= 0 &&
    script.indexOf('mc-shared-secondary') >= 0 &&
    script.indexOf('mc-shared-details') >= 0,
    "Quick commands must expose the same semantic three-column structure as Commands.");
assert.ok(script.indexOf('mc-command-run-button sirk-quick-command-submit') >= 0,
    "Quick commands Run must use the same action-button class as My Commands.");
assert.ok(css.indexOf("grid-template-columns:minmax(165px,205px) minmax(285px,340px) minmax(240px,300px)!important") >= 0,
    "Quick commands must keep the My Commands first two columns and use a smaller details column.");
assert.ok(css.indexOf("grid-template-columns:64px minmax(285px,340px) minmax(240px,300px)!important") >= 0,
    "Quick commands collapsed layout must keep the smaller details column.");
assert.ok(css.indexOf(".is-details-collapsed{grid-template-columns:minmax(165px,205px) minmax(285px,340px) 0!important}") >= 0 &&
    css.indexOf(".is-details-collapsed .sirk-quick-command-details{display:none!important}") >= 0,
    "Quick commands must remove the complete details column when output is hidden.");
assert.ok(script.indexOf("function refresh(panel)") >= 0 &&
    script.indexOf('setOutput(panel, text("loading"), false)') >= 0 &&
    script.indexOf('onClick: function () { refresh(panel); }') >= 0,
    "Quick refresh progress must stay inside the details output pane.");
assert.ok(script.indexOf('panel.appendChild(element("div", "sirk-quick-command-loading"') < 0,
    "Quick refresh must not replace the whole panel with a full-width loading message.");
assert.ok(css.indexOf(".sirk-quick-command-label") >= 0 &&
    css.indexOf("white-space:normal") >= 0 &&
    css.indexOf("overflow-wrap:anywhere") >= 0,
    "Long Quick commands labels must wrap instead of being truncated.");
assert.ok(css.indexOf(".sirk-quick-command-toolbar-host .mc-shared-toolbar") >= 0 &&
    css.indexOf(".sirk-desktop-commands .mc-shared-toolbar-button") >= 0,
    "Quick commands toolbar must inherit the same live-theme visual contract as Commands.");

console.log("Quick commands toolbar, persistent Favorites, output collapse and compact columns: OK");
