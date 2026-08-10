"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var source = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "ui", "results.js"), "utf8");

assert.ok(source.indexOf("function visibleNodeName(nodeId)") >= 0,
    "Results must resolve device display names from the already visible MeshCentral node store.");
assert.ok(source.indexOf("node.name || node.rname || node.hostname || node.host || nodeId") >= 0,
    "Results device resolution must prefer friendly node names and keep the stable node ID only as fallback.");
assert.ok(source.indexOf("var device = { title: \"Device\", value: resultDeviceName };") >= 0,
    "The Commands Device column must use the friendly-name resolver.");
assert.ok(source.indexOf("Array.isArray(source) ? source : source && typeof source === \"object\"") >= 0,
    "Results must support both array and keyed-object MeshCentral node stores without another request.");
assert.strictEqual(source.indexOf("fetch("), -1,
    "Friendly device-name presentation must not introduce a per-row fetch path.");

console.log("Commands Results friendly device name contract: OK");
