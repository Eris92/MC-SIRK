"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var shell = read("public/shared/module-shell.js");
var topTabStart = shell.indexOf("function ensureTopTab()");
var topTabEnd = shell.indexOf("function remove()", topTabStart);
var topTab = shell.slice(topTabStart, topTabEnd);
assert.ok(topTabStart >= 0 && topTabEnd > topTabStart, "Commands device-tab registration must exist.");
assert.ok(topTab.indexOf('document.getElementById(pageId)') < 0,
    "Commands top tab must not wait for its own unopened plugin page.");
assert.ok(topTab.indexOf('document.getElementById("MainDevTerminal")') >= 0,
    "Commands top tab must attach beside the native Terminal tab.");

var browserRuntime = read("public/shared/runtime.js");
assert.ok(browserRuntime.indexOf('core.assetUrl("", "shared-ui/') < 0,
    "Browser runtime must not reload shared UI assets already serialized by plugin-main.");

var approvals = read("server/modules/approval-center/index.js");
assert.ok(approvals.indexOf("current.modules.approvals") >= 0,
    "Approval Center must use the shared approval settings store.");
assert.ok(approvals.indexOf("current.modules.approvalcenter.retentionDays") < 0,
    "Approval Center must not persist retention in a disconnected module key.");

var admin = read("admin.js");
assert.ok(admin.indexOf('var action = String(req && req.query && req.query.action || "")') >= 0,
    "Admin POST routing must read the requested action.");

console.log("Native UI contracts: OK");
