"use strict";

var assert = require("assert");
var guard = require("../server/core/agent-command-guard.js");
var QUICK_DIRECT_CONTEXT = Symbol.for("sirk.platform.quick.direct");

var sent = [];
var captured = [];
var device = {
    sendRunCommands: function (context, command, responseId) {
        sent.push({ nodeId: context.nodeId, command: command, responseId: responseId, direct: context[QUICK_DIRECT_CONTEXT] === true });
        return Promise.resolve({ state: "sent" });
    }
};
device.resolveNode = function (user, nodeId, options) {
    assert.strictEqual(options.requireCommandRights, true, "Quick must resolve device with command rights.");
    return new Promise(function (resolve) {
        setImmediate(function () {
            resolve({ nodeId: String(nodeId || ""), node: { agent: { id: 4 } }, rights: 24 });
        });
    });
};
var runtime = {
    context: { device: device },
    modules: {
        mycommands: {
            apiPost: function (asset, req) {
                var body = req && req.body || {};
                if (asset !== "execute") return Promise.resolve({ ok: true });
                return device.resolveNode({}, body.nodeId, { requireCommandRights: true }).then(function (node) {
                    if (body.desktopDirect === true) Object.defineProperty(node, QUICK_DIRECT_CONTEXT, { value: true });
                    return device.sendRunCommands(
                        node,
                        { cmd: String(body.command || "quick"), runAsUser: Number(body.runAsUser) || 0 },
                        String(body.responseId || ""),
                        null
                    );
                });
            }
        }
    },
    captureAgentData: function (command) { captured.push(command); }
};
var plugin = { runtime: runtime };
var originalApiPost = runtime.modules.mycommands.apiPost;

guard.apply(plugin, { timeoutMs: 30000 });

assert.ok(device.__sirkAgentCommandGuard,
    "Applying the policy must install guard state on the device service.");
assert.strictEqual(runtime.modules.mycommands.apiPost, originalApiPost,
    "The guard must not wrap the asynchronous API request lifecycle.");
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
                "A second guarded in-flight command for the same agent must be rejected.");
        });
}

function quick(nodeId, responseId, command) {
    return runtime.modules.mycommands.apiPost("execute", {
        body: {
            nodeId: nodeId,
            responseId: responseId,
            command: command || "quick",
            desktopDirect: true
        }
    }, {});
}

Promise.resolve()
    .then(function () {
        return device.sendRunCommands({ nodeId: "node/domain/a" }, { cmd: "one" }, "response-1", null);
    })
    .then(function () { return expectBusy("node/domain/a", "response-2"); })
    .then(function () {
        return quick("node/domain/a", "quick-1", "services");
    })
    .then(function () {
        return quick("node/domain/a", "quick-2", "devices");
    })
    .then(function () {
        assert.strictEqual(sent.length, 3,
            "Two native Quick direct commands must bypass the existing guarded command without replacing its lock.");
        assert.strictEqual(sent[0].direct, false, "Ordinary execution must not have a direct marker.");
        assert.strictEqual(sent[1].direct, true, "Direct execution must carry a resolved-context marker.");
        assert.strictEqual(sent[2].direct, true, "Second direct execution must carry its own resolved-context marker.");
        runtime.captureAgentData({ action: "runcommands", responseid: "quick-1", status: "completed" },
            { dbNodeKey: "node/domain/a" });
        assert.strictEqual(device.__sirkAgentCommandGuard.activeByNode["node/domain/a"].responseId, "response-1",
            "An untracked Quick result must not release the existing guarded command lock.");
        assert.deepStrictEqual(Object.keys(sent[1].command).sort(), ["cmd", "runAsUser"],
            "Quick concurrency policy must not inject an internal bypass flag into the MeshAgent command object.");
        return expectBusy("node/domain/a", "response-3");
    })
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
        assert.strictEqual(sent.length, 7,
            "The guard must preserve ordinary release behavior while allowing native Quick direct concurrency.");
        assert.strictEqual(captured.length, 5,
            "Every agent message must still reach the original runtime handler.");
        assert.strictEqual(sent[6].responseId, "response-5",
            "The command sent after fallback release must preserve its response identifier.");
        console.log("Agent command guard preserves guarded flows and allows concurrent native Quick direct launches: OK");
    })
    .catch(function (error) {
        console.error(error);
        process.exitCode = 1;
    });
