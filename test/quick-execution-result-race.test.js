"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var source = fs.readFileSync(path.join(root, "server", "modules", "commands", "index.js"), "utf8");

var executeStart = source.indexOf("function execute(payload, request)");
var executeEnd = source.indexOf("function executeDirect(user, value)", executeStart);
var executeSource = source.slice(executeStart, executeEnd);

var saveIndex = executeSource.indexOf("saveExecution(row);");
var sendIndex = executeSource.indexOf("context.device.sendRunCommands(node, command, id, null)");
var reloadIndex = executeSource.indexOf("var rows = executionRows();", sendIndex);

assert.ok(executeStart >= 0 && executeEnd > executeStart,
    "My Commands execute lifecycle must remain discoverable by the regression contract.");
assert.ok(saveIndex >= 0 && sendIndex > saveIndex,
    "Execution row must be persisted before sendRunCommands so an immediate agent response cannot be dropped.");
assert.ok(reloadIndex > sendIndex,
    "sendRunCommands completion must reload the persisted row instead of replacing an agent result captured in flight.");
assert.ok(executeSource.indexOf("if (!saved.output && !terminal)") >= 0,
    "Send completion must preserve terminal/output state already written by captureAgentData.");
assert.ok(executeSource.indexOf("saved.status = \"error\"") >= 0,
    "Dispatch failures must terminate the pre-created execution row instead of leaving it pending forever.");

console.log("Quick execution result correlation is race-safe: OK");
