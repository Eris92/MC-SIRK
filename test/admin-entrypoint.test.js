"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var config = require(path.join(root, "config.json"));
var mainEntrypoint = require(path.join(root, "SIRKPortal.js"));
var adminEntrypoint = require(path.join(root, "SIRKPortalAdmin.js"));
var adminImplementation = require(path.join(root, "admin.js"));
var adminUi = fs.readFileSync(path.join(root, "web", "admin", "admin.js"), "utf8");
var adminLayout = fs.readFileSync(path.join(root, "web", "admin", "admin-layout.js"), "utf8");

assert.strictEqual(config.shortName, "SIRKPortal", "MeshCentral shortName must be a JavaScript-safe identifier");
assert(/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(config.shortName), "shortName must be safe for MeshCentral pluginHandler.prepExports");
assert.strictEqual(typeof mainEntrypoint.SIRKPortal, "function", "Main entrypoint must export SIRKPortal(parent)");
assert.strictEqual(adminEntrypoint.admin, adminImplementation.admin, "SIRKPortalAdmin.js must delegate to admin.js");
assert.strictEqual(typeof adminEntrypoint.admin, "function", "Admin entrypoint must export admin(plugin)");
assert.strictEqual(fs.existsSync(path.join(root, "SIRK-Portal.js")), false, "Unsafe legacy main entrypoint must not exist");
assert.strictEqual(fs.existsSync(path.join(root, "SIRK-PortalAdmin.js")), false, "Unsafe legacy admin entrypoint must not exist");
assert.ok(adminUi.indexOf('var serverSection = "service"') >= 0, "Server view must track the active service subcategory");
assert.ok(adminUi.indexOf('title: "Usługa"') >= 0, "Server view must expose the Usługa subcategory");
assert.ok(adminUi.indexOf('data-tab=\"system\"') >= 0 || adminUi.indexOf('active === "system"') >= 0, "Admin UI must expose System");
assert.ok(adminUi.indexOf('data-system-key') >= 0, "Admin UI must expose System subcategories");
assert.ok(adminLayout.indexOf('".mc-admin-server-nav"') >= 0, "Admin layout must relocate Server subnavigation");
assert.ok(adminLayout.indexOf('".mc-admin-system-nav"') >= 0, "Admin layout must relocate System subnavigation");

console.log("SIRK Portal JavaScript-safe entrypoints: OK");
