"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var source = fs.readFileSync(path.join(__dirname, "..", "public", "portal", "folder-collapse.js"), "utf8");

[
    "__sirkSettingsI18nLoaded",
    "sirkportal:languagechange",
    "MutationObserver",
    "applyDocument(document)",
    "frame.contentDocument",
    "data-sirk-i18n-display",
    "data-sirk-i18n-source",
    "window.alert = alertTranslated",
    "window.confirm = confirmTranslated"
].forEach(function (token) {
    assert.ok(source.indexOf(token) >= 0, "Settings i18n runtime is missing: " + token);
});

[
    '["Ustawienia", "Settings"]',
    '["Moduły", "Modules"]',
    '["Ogólne", "General"]',
    '["Przenoszenie urządzeń", "Move devices"]',
    '["Włącz i pokaż", "Enable and show"]',
    '["Dostęp grup MeshCentral", "MeshCentral group access"]',
    '["Zaślepka", "Maintenance page"]',
    '["Animacje", "Animations"]',
    '["Aktualizacje", "Updates"]',
    '["Kopie zapasowe", "Backups"]',
    '["Wtyczki", "Plugins"]',
    '["Zapisywanie…", "Saving…"]',
    '["Zapisano.", "Saved."]'
].forEach(function (translation) {
    assert.ok(source.indexOf(translation) >= 0, "Settings translation is missing: " + translation);
});

assert.ok(source.indexOf("font-size:0!important") >= 0,
    "Navigation and action labels must be translated visually without changing text used by click handlers.");
assert.ok(source.indexOf("NodeFilter.SHOW_TEXT") >= 0,
    "Dynamic descriptions and status messages must be translated after rendering.");

console.log("Portal settings localization contract: OK");
