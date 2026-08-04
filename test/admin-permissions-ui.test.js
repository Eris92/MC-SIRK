"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var view = fs.readFileSync(path.join(root, "views", "SIRK-Portal.handlebars"), "utf8");
var browser = fs.readFileSync(path.join(root, "web", "admin", "admin.js"), "utf8");
var runtime = fs.readFileSync(path.join(root, "server", "core", "runtime.js"), "utf8");

assert.ok(view.indexOf('data-tab="permissions"') >= 0,
    "Plugin administration must expose a Permissions tab.");
assert.ok(browser.indexOf('tab === "permissions"') >= 0,
    "The administration browser must render the Permissions page.");
assert.ok(browser.indexOf("Restrict module access to selected MeshCentral user groups") >= 0,
    "Module-level execution access must be configurable.");
assert.ok(browser.indexOf("Allow every user who has module access") >= 0,
    "Folder and category rules must support allow-all access.");
assert.ok(browser.indexOf("Allowed MeshCentral user groups") >= 0,
    "Folder and category rules must support selected user groups.");
assert.ok(runtime.indexOf("moduleOptions.permissions") >= 0,
    "The server must persist Permissions page values.");
assert.ok(runtime.indexOf("folderAccess.normalizeRules") >= 0,
    "Folder permission payloads must be normalized against known folders and groups.");

console.log("Admin permissions UI contract: OK");
