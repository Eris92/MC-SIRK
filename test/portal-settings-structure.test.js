"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var source = fs.readFileSync(path.join(root, "public/vendor/sirk-portal/settings-structure.js"), "utf8");
var runtime = fs.readFileSync(path.join(root, "server/core/runtime-portal.js"), "utf8");

[
    'key: "overview"', 'key: "devices"', 'key: "commands"', 'key: "approvals"',
    'key: "move"', 'key: "automation"', 'key: "monitoring"', 'key: "assets"',
    'key: "management"', 'key: "reports"', 'key: "security"'
].forEach(function (value) {
    assert.ok(source.indexOf(value) >= 0, "Unified settings menu is missing " + value);
});

assert.strictEqual((source.match(/"Włącz i pokaż"/g) || []).length, 1,
    "The unified renderer must define exactly one Włącz i pokaż control.");
assert.ok(source.indexOf('"Enabled"') < 0, "Technical Enabled fields must not be rendered.");
assert.ok(source.indexOf('"Widoczność zakładki"') < 0, "A second visibility toggle must not be rendered.");
assert.ok(source.indexOf("Brak ustawień w tej sekcji.") < 0, "Empty legacy section messages must not return.");
assert.ok(source.indexOf("Ten moduł nie ma osobnej konfiguracji Permissions.") < 0,
    "Empty legacy permissions messages must not return.");
assert.ok(source.indexOf("renderStandardPermissions") >= 0, "Every normal module must receive group permissions.");
assert.ok(source.indexOf("renderApprovalPermissions") >= 0, "Approvals must render provider policies.");
assert.ok(source.indexOf('label: "Przenoszenie urządzeń"') >= 0, "Move requests must be independent from Approvals.");
assert.ok(source.indexOf("var INTEGRATIONS") >= 0 && source.indexOf('label: "SMS"') >= 0,
    "Integrations must use an independent navigation group.");
assert.ok(source.indexOf('return loadSnapshot();') >= 0,
    "Saving must be verified by reading the settings snapshot back.");
assert.ok(source.indexOf('Accept: "application/json"') >= 0,
    "Settings endpoints must explicitly request JSON.");
assert.ok(runtime.indexOf("persistPortalExtras") >= 0, "Portal-specific values must be persisted after the base save.");
assert.ok(runtime.indexOf("devicesCardAccessGroupIds") >= 0, "Overview card permissions must be persisted.");
assert.ok(runtime.indexOf("current.modules.portal.banner = normalizeBanner") >= 0,
    "Banner configuration must be persisted and normalized.");

console.log("Portal unified settings structure: OK");
