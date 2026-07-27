"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var source = fs.readFileSync(path.resolve(__dirname, "../public/portal/standalone/scripts/cleanup.js"), "utf8");

assert.ok(source.indexOf("data-mesh-group-permissions") >= 0, "Permissions must render MeshCentral group selectors.");
assert.ok(source.indexOf("accessGroupIds = groupIds.slice()") >= 0, "Module permissions must persist accessGroupIds.");
assert.ok(source.indexOf("view.groupIds = groupIds.slice()") >= 0, "Portal view permissions must persist groupIds.");
assert.ok(source.indexOf("view.allowAll = groupIds.length === 0") >= 0, "Empty group selection must allow all users.");
assert.ok(source.indexOf("event.stopImmediatePropagation()") >= 0, "Permission save must not be overwritten by the legacy empty form.");
assert.ok(source.indexOf("renderApprovalPermissions") >= 0, "Approval provider policies must have their own Permissions editor.");
assert.ok(source.indexOf("Włącz akceptacje") >= 0, "Approval-capable modules must expose the approval toggle.");

console.log("Portal permission editors: OK");
