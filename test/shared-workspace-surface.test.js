"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var sharedUi = fs.readFileSync(
    path.join(root, "public", "shared", "ui", "shared-ui.css"),
    "utf8"
);
var approval = fs.readFileSync(
    path.join(root, "public", "native", "approval.css"),
    "utf8"
);
var automation = fs.readFileSync(
    path.join(root, "public", "modules", "automation", "style.css"),
    "utf8"
);

assert.ok(
    sharedUi.indexOf(".mc-shared-page{--mc-shared-page-surface:") >= 0 &&
    sharedUi.indexOf("background-color:var(--mc-shared-page-surface)") >= 0,
    "Every shared module must own the same theme surface instead of inheriting its host page background."
);
assert.ok(
    sharedUi.indexOf('[data-bs-theme="dark"] .mc-shared-page') >= 0 &&
    sharedUi.indexOf("body.night .mc-shared-page") >= 0 &&
    sharedUi.indexOf("body.dark .mc-shared-page") >= 0,
    "The shared surface must follow Bootstrap, classic night and classic dark MeshCentral themes."
);
assert.ok(
    sharedUi.indexOf(".mc-shared-page>.mc-shared-toolbar-host") >= 0 &&
    sharedUi.indexOf(".mc-shared-page>.mc-shared-layout-host") >= 0 &&
    sharedUi.indexOf(".mc-shared-page .mc-shared-layout{background-color:inherit}") >= 0,
    "Toolbar and all columns must expose the same continuous shared surface."
);
assert.strictEqual(
    approval.indexOf("background-color:#000"),
    -1,
    "Approval Center must not define a private black workspace surface."
);
assert.strictEqual(
    automation.indexOf("background-color:#000"),
    -1,
    "My Scripts must not define a private black workspace surface."
);

console.log("Commands, Approval and My Scripts shared workspace surface: OK");
