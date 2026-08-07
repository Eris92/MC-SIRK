"use strict";

var assert = require("assert");
var path = require("path");

var factory = require(path.resolve(__dirname, "../server/core/mesh-events.js"));
var calls = [];
var parent = {
    parent: {
        DispatchEvent: function (targets, source, event) {
            calls.push({ targets: targets, source: source, event: event });
        }
    }
};
var log = factory.createMeshEventLog({ parent: parent });

var result = log.writeSync({
    actorId: "user/example/admin",
    actorName: "Administrator",
    module: "mycommands",
    action: "execute",
    outcome: "success",
    target: "PC-01",
    durationMs: 123,
    details: {
        nodeId: "node/example/abc",
        nodeName: "PC-01",
        commandId: "dns",
        status: "completed",
        password: "must-not-leak",
        output: "must-not-leak"
    }
});

assert.strictEqual(calls.length, 1, "SIRK actions must be sent through MeshCentral DispatchEvent.");
assert.deepStrictEqual(calls[0].targets, ["*", "user/example/admin", "node/example/abc"], "Mesh event must target the global stream, actor and affected node.");
assert.strictEqual(calls[0].source, parent, "Plugin parent must be used as the MeshCentral event source.");
assert.strictEqual(calls[0].event.etype, "node", "Node actions must be native node events.");
assert.strictEqual(calls[0].event.action, "sirk-mycommands-execute");
assert.strictEqual(calls[0].event.domain, "example");
assert.strictEqual(calls[0].event.userid, "user/example/admin");
assert.strictEqual(calls[0].event.username, "Administrator");
assert.strictEqual(calls[0].event.nodeid, "node/example/abc");
assert.ok(calls[0].event.msg.indexOf("SIRK mycommands: execute - success") === 0, "Mesh Events must receive a readable SIRK message.");
assert.strictEqual(calls[0].event.nolog, undefined, "SIRK Mesh events must remain persistable by MeshCentral.");
assert.strictEqual(calls[0].event.sirk.details.password, undefined, "Sensitive fields must not be copied into Mesh events.");
assert.strictEqual(calls[0].event.sirk.details.output, undefined, "Command output must not be copied into Mesh events.");
assert.strictEqual(result.sirk.durationMs, 123);

var serverResult = log.writeSync({
    actorName: "MeshCentral Agent",
    module: "mycommands",
    action: "agent-result",
    outcome: "completed",
    target: "execution-1",
    details: { executionId: "execution-1", status: "completed" }
});
assert.strictEqual(calls.length, 2);
assert.strictEqual(calls[1].event.etype, "server", "Agent results without a user or node must remain visible as server events.");
assert.strictEqual(serverResult.action, "sirk-mycommands-agent-result");

var unavailable = factory.createMeshEventLog({ parent: {} });
assert.strictEqual(unavailable.writeSync({ module: "runtime" }), null, "Missing MeshCentral event dispatcher must fail closed without creating alternate storage.");

console.log("Native MeshCentral event logging without separate audit storage: OK");
