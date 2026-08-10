"use strict";

var assert = require("assert");
var guard = require("../server/core/agent-command-guard.js");

var sent = [];
var captured = [];
var device = {
    sendRunCommands: function (context, command, responseId) {
        sent.push({ nodeId: context.nodeId, command: command, responseId: responseId });
        return Promise.resolve({ state: "sent" });
    }
};
var runtime = {
    context: { device: device },
    captureAgentData: function (command) { captured.push(command); }
};
var plugin = { runtime: runtime };

guard.apply(plugin, { timeoutMs: 30000 });

assert.ok(device.__sirkAgentCommandGuard,
    "Applying the policy must install guard state on the device service.");
assert.strictEqual(guard.responseId({ result: { responseId: "nested-1" } }), "nested-1",
    "Result envelope response IDs must be recognized so a terminal result cannot leave a stale lock.");
assert.strictEqual(guard.isRunCommandsResult({ action: "runcommands" }), true,
    "A native runcommands result must be recognizable for the node-scoped fallback release path.");
assert.strictEqual(guard.isRunCommandsResult({ action: "sysinfo" }), false,
    "Unrelated agent messages must never release a SIRK command lock.");

function expectBusy(nodeId, responseId) {
    return device.sendRunCommands({ nodeId: nodeId }, { cmd: "blocked" }, responseId, null)
        .then(function () { throw new Error("Concurrent command unexpectedly succeeded."); })
        .catch(function (error) {
            assert.strictEqual(error.code, "SIRK_AGENT_COMMAND_BUSY",
                "A second in-flight command for the same agent must be rejected.");
        });
}

Promise.resolve()
    .then(function () {
        return device.sendRunCommands({ nodeId: "node/domain/a" }, { cmd: "one" }, "response-1", null);
    })
    .then(function () { return expectBusy("node/domain/a", "response-2"); })
    .then(function () {
        return device.sendRunCommands({ nodeId: "node/domain/b" }, { cmd: "other-node" }, "response-b", null);
    })
    .then(function () {
        runtime.captureAgentData({ responseid: "response-1", status: "completed", value: "done" }, {});
        return device.sendRunCommands({ nodeId: "node/domain/a" }, { cmd: "three" }, "response-3", null);
    })
    .then(function () {
        runtime.captureAgentData({ result: { responseId: "response-3" }, status: "failed", value: "failed" }, {});
        return device.sendRunCommands({ nodeId: "node/domain/a" }, { cmd: "four" }, "response-4", null);
    })
    .then(function () {
        runtime.captureAgentData({ action: "sysinfo", value: "unrelated" }, { dbNodeKey: "node/domain/a" });
        return expectBusy("node/domain/a", "response-5");
    })
    .then(function () {
        runtime.captureAgentData({ action: "runcommands", status: "error", value: "terminal without response id" }, { dbNodeKey: "node/domain/a" });
        return device.sendRunCommands({ nodeId: "node/domain/a" }, { cmd: "five" }, "response-5", null);
    })
    .then(function () {
        assert.strictEqual(sent.length, 5,
            "The guard must release after direct, nested and node-scoped terminal runcommands results.");
        assert.strictEqual(captured.length, 4,
            "Every agent message must still reach the original runtime handler.");
        assert.strictEqual(sent[4].responseId, "response-5",
            "The command sent after fallback release must preserve its response identifier.");
        console.log("Agent command concurrency guard terminal/failure release paths: OK");
    })
    .catch(function (error) {
        console.error(error);
        process.exitCode = 1;
    });
