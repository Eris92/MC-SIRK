"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var source = fs.readFileSync(path.join(root, "public/portal/vendor/portal-ui-contract.js"), "utf8");

assert.ok(source.indexOf('data-settings-base-primary') >= 0,
    "The technical Settings button must be retained for the existing renderer.");
assert.ok(source.indexOf('base.hidden = true') >= 0 && source.indexOf('base.style.display = "none"') >= 0,
    "The technical Settings button must not remain visible.");
assert.ok(source.indexOf('data-settings-root-menu') >= 0,
    "Promoted settings sections must use a protected first-column container.");
["modules", "portal", "integrations"].forEach(function (key) {
    assert.ok(source.indexOf('rootButton(menu, "' + key + '"') >= 0,
        "Missing promoted first-column section: " + key);
});
assert.ok(source.indexOf('projectSecondary(secondary)') >= 0,
    "The second column must be projected from the selected first-column section.");
assert.ok(source.indexOf('sirk-settings-primary-projected>summary') >= 0,
    "The former second-column root heading must be hidden after promotion.");
assert.ok(source.indexOf('serverButton(primary)') >= 0,
    "Server must remain a separate first-column section.");

console.log("Portal promoted settings navigation: OK");
