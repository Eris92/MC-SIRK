"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "public", "modules", "automation", "index.js"), "utf8");
var submitStart = source.indexOf("function submit(shell, script, button, values, detailsHost, resultHost, errorHost)");
var showStart = source.indexOf("function show(shell, item, executeOnSelect)");
assert.ok(submitStart >= 0 && showStart > submitStart, "My Scripts submit owner must remain discoverable.");
var submit = source.slice(submitStart, showStart);

assert.ok(/var\s+executionsInFlight\s*=\s*Object\.create\(null\)/.test(source),
    "My Scripts must keep one lightweight in-memory owner for active browser submissions.");
assert.ok(/if\s*\(executionKey\s*&&\s*executionsInFlight\[executionKey\]\)\s*return\s+executionsInFlight\[executionKey\]/.test(submit),
    "A duplicate submit for the same script path must reuse the active operation before opening another confirmation or POST.");
assert.ok(submit.indexOf("executionsInFlight[executionKey]") < submit.indexOf("confirmExecution(script"),
    "The duplicate guard must run before confirmation/execution work starts.");
assert.ok(/executionsInFlight\[executionKey\]\s*=\s*operation/.test(submit),
    "The first submit must publish its active operation to the single-flight owner.");
assert.ok((submit.match(/delete\s+executionsInFlight\[executionKey\]/g) || []).length >= 2,
    "Single-flight state must be released on both resolved and rejected completion paths.");
assert.strictEqual((submit.match(/shell\.post\("request"/g) || []).length, 1,
    "The submit owner must retain one backend request path.");

console.log("My Scripts duplicate browser submissions are single-flight per script path: OK");
