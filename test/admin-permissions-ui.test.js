"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var view = fs.readFileSync(path.join(root, "views", "SIRK-Portal.handlebars"), "utf8");
var browser = fs.readFileSync(path.join(root, "web", "admin", "admin.js"), "utf8");
var runtime = fs.readFileSync(path.join(root, "server", "core", "runtime.js"), "utf8");

assert.ok(view.indexOf('data-tab="permissions"') < 0, "Top-level Permissions tab must be removed.");
assert.ok(browser.indexOf('tab === "permissions"') < 0, "Administration browser must not keep a second Permissions page owner.");
assert.ok(browser.indexOf('modulePermissions(card, "My Commands", current.mycommands, folderData.mycommands, "Permissions")') >= 0, "My Commands must render its existing permission owner locally.");
assert.ok(browser.indexOf('modulePermissions(card, "My Scripts", current.myscripts, scriptFolderData.myscripts, "Permissions")') >= 0, "My Scripts must render its existing permission owner locally.");
assert.ok(browser.indexOf("Restrict module access to selected MeshCentral user groups") >= 0);
assert.ok(browser.indexOf("Allow every user who has module access") >= 0);
assert.ok(runtime.indexOf("moduleOptions.permissions") >= 0);
assert.ok(runtime.indexOf("folderAccess.normalizeRules") >= 0);
console.log("Admin module-local permissions UI contract: OK");
