"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var core = fs.readFileSync(path.join(root, "public/portal/standalone/scripts/core.js"), "utf8");
var server = fs.readFileSync(path.join(root, "plugin-main-standalone.js"), "utf8");
var app = fs.readFileSync(path.join(root, "public/portal/standalone/scripts/app.js"), "utf8");

assert.ok(core.indexOf('searchParams.set("pin", "SIRKPortal")') >= 0, "Standalone Portal must use the canonical plugin pin.");
assert.ok(core.indexOf('searchParams.set("pin", "SirkPlatform")') < 0, "Legacy Portal pin must not remain.");
assert.ok(server.indexOf('"vendor/sirk-portal/portal-ui-contract.css": "vendor/portal-ui-contract.css"') >= 0, "Portal UI contract asset must be routed as CSS.");
assert.ok(fs.existsSync(path.join(root, "public/portal/vendor/portal-ui-contract.css")), "Portal UI contract stylesheet must exist.");
assert.ok(app.indexOf('"sirk-toolbar sirk-toolbar-host sirk-settings-module-toolbar"') >= 0, "Standalone Settings must use the canonical Portal toolbar style.");
console.log("Portal runtime assets: OK");
