"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var browser = fs.readFileSync(path.join(root, "web/admin/admin.js"), "utf8");
var css = fs.readFileSync(path.join(root, "web/admin/admin.css"), "utf8");
assert.ok(browser.indexOf('function disclosure(host, className, title, expanded)') >= 0 && browser.indexOf('element("details"') >= 0 && browser.indexOf('element("summary"') >= 0,
    "Admin must reuse one native details/summary disclosure helper.");
assert.ok(browser.indexOf('disclosure(host, "mc-admin-provider-card", title, false)') >= 0,
    "Approval providers must be independently collapsible.");
assert.ok(browser.indexOf('disclosure(host, "mc-admin-provider-card mc-admin-permission-module", title, false)') >= 0,
    "My Commands and My Scripts permission modules must be collapsible.");
assert.ok(browser.indexOf('disclosure(host, "mc-admin-permission-folder", label, false)') >= 0,
    "Folder/category permission blocks must be collapsible.");
assert.strictEqual(browser.indexOf('.ontoggle'), -1, "Native disclosure must not rerender on toggle.");
assert.strictEqual(browser.indexOf('addEventListener("toggle"'), -1, "Native disclosure must not add toggle request/event loops.");
assert.ok(browser.indexOf('return { accessGroupIds: selectedAccessGroups, folderPermissions: folderPermissions };') >= 0,
    "Permissions save must still read the existing control closures independent of disclosure state.");
assert.ok(browser.indexOf('providers: { moverequests: move(), mycommands: commands(), myscripts: scripts() }') >= 0,
    "Approval save must keep the same provider payload independent of disclosure state.");
assert.ok(css.indexOf('.mc-admin-disclosure>summary{cursor:pointer') >= 0,
    "Disclosure styling must remain a small geometry/readability layer over native details/summary.");
console.log("Admin Approval/Permissions native disclosure preserves form state contract: OK");
