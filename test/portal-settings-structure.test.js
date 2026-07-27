"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var source = fs.readFileSync(path.join(__dirname, "../public/portal/settings.js"), "utf8");

[
    '["overview", "Przegląd"]', '["devices", "Urządzenia"]', '["approvals", "Akceptacje"]',
    '["automation", "Automatyzacja"]', '["monitoring", "Monitoring"]', '["assets", "Zasoby"]',
    '["management", "Zarządzanie"]', '["reports", "Raporty"]', '["security", "Bezpieczeństwo"]',
    '["settings", "Ustawienia"]'
].forEach(function (value) { assert.ok(source.indexOf(value) >= 0, "Settings menu is missing " + value); });
assert.ok(source.indexOf('el("details", "sirk-card")') >= 0, "Settings sections must be collapsed details.");
assert.ok(source.indexOf('objectForm(section, value, 0)') >= 0, "Module settings must render inside their owning section.");
assert.ok(source.indexOf('payload.moduleOptions.portal.views = values.folderpermissions') >= 0, "Folder permissions must save through one owning section.");
console.log("Portal settings structure: OK");
