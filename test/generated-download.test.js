"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var admin = fs.readFileSync(path.join(root, "admin.js"), "utf8");
var startup = fs.readFileSync(path.join(root, "plugin-main.js"), "utf8");
var browser = fs.readFileSync(path.join(root, "public", "shared", "ui", "download-results.js"), "utf8");

assert.ok(admin.indexOf('"download-results.js": ["public/shared/ui/download-results.js"') >= 0,
    "The generated-file browser helper must be exposed as a plugin asset.");
assert.ok(admin.indexOf('if (asset === "download")') >= 0,
    "The admin request handler must expose the authenticated download endpoint.");
assert.ok(admin.indexOf('path.join(root, "seed", "MyScripts")') >= 0 &&
    admin.indexOf('path.join(root, "seed", "MyCommands")') >= 0,
    "Generated downloads must be restricted to canonical script roots.");
assert.ok(admin.indexOf('path.extname(target).toLowerCase() !== ".csv"') >= 0,
    "The generated-file endpoint must allow only CSV reports.");

assert.ok(startup.indexOf('window.__SIRK_PLATFORM_PIN__ = browserPin') >= 0,
    "The native browser startup must expose the active plugin identifier.");
assert.ok(startup.indexOf('["sirk-platform-download-results", "download-results.js"]') >= 0,
    "The native MeshCentral UI must load generated-file result actions after results.js.");

assert.ok(browser.indexOf('/^CSV_DOWNLOAD:\\s*(.+)$/i') >= 0,
    "The result helper must recognize CSV_DOWNLOAD markers.");
assert.ok(browser.indexOf('data-sirk-download') >= 0 && browser.indexOf('"Pobierz"') >= 0,
    "The result helper must render a download action.");
assert.ok(browser.indexOf('COMMANDTABS)_PROGRESS__') >= 0,
    "The result helper must remove progress protocol lines from visible output.");
assert.ok(browser.indexOf('new MutationObserver') >= 0,
    "The result helper must also enhance results opened from history dialogs.");

console.log("Generated CSV download contract: OK");
