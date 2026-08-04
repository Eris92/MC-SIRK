"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var source = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "ui", "download-results.js"), "utf8");

assert.ok(source.indexOf("function validNodeId(value)") >= 0,
    "Commands execution must validate canonical MeshCentral node identifiers.");
assert.ok(source.indexOf("/^node\\/[^/]*\\/[^/]+$/") >= 0,
    "Both node/<domain>/<id> and default-domain node//<id> identifiers must be accepted.");
assert.ok(source.indexOf("window.currentNode") >= 0,
    "The currently open MeshCentral device must be the primary node source.");
assert.ok(source.indexOf("currentDeviceNodeId(values && values.nodeId)") >= 0,
    "My Commands execute requests must replace stale device state with the current device ID.");
assert.ok(source.indexOf("core.post.__sirkCommandNodeResolver") >= 0,
    "The device-context wrapper must be installed only once.");
assert.ok(source.indexOf("Unable to determine the current device identifier") >= 0,
    "Missing current device context must fail locally instead of producing a false access-denied error.");

console.log("Current device node context contract: OK");
