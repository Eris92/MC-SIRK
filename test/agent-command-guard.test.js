"use strict";

var assert = require("assert");
var guard = require("../server/core/agent-command-guard.js");
var entrypoint = require("../SIRKPortal.js");

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

assert.strictEqual(typeof entrypoint.applyAgentCommandGuard, "function",
    "The plugin entrypoint must expose the command guard policy.");
assert.ok(device.__sirkAgentCommandGuard,
    "Applying the policy must install guard state on the device service.");

Promise.resolve()
    .then(function () {
        return device.sendRunCommands({ nodeId: "node/domain/a" }, { cmd: "one" }, "response-1", null);
    })
    .then(function () {
        return device.sendRunCommands({ nodeId: "node/domain/a" }, { cmd: "two" }, "response-2", null)
            .then(function () { throw new Error("Concurrent command unexpectedly succeeded."); })
            .catch(function (error) {
                assert.strictEqual(error.code, "SIRK_AGENT_COMMAND_BUSY",
                    "A second in-flight command for the same agent must be rejected.");
            });
    })
    .then(function () {
        return device.sendRunCommands({ nodeId: "node/domain/b" }, { cmd: "other-node" }, "response-b", null);
    })
    .then(function () {
        runtime.captureAgentData({ responseid: "response-1", status: "completed", value: "done" }, {});
        return device.sendRunCommands({ nodeId: "node/domain/a" }, { cmd: "three" }, "response-3", null);
    })
    .then(function () {
        assert.strictEqual(sent.length, 3,
            "The guard must allow one command per agent and release it after the matching result.");
        assert.strictEqual(captured.length, 1,
            "Agent result capture must still reach the original runtime handler.");
        assert.strictEqual(sent[2].responseId, "response-3",
            "The command sent after release must preserve its response identifier.");
        console.log("Agent command concurrency guard: OK");
    })
    .catch(function (error) {
        console.error(error);
        process.exitCode = 1;
    });
