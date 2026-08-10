"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var approvalFactory = require("../server/core/approval-service.js");

var dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mc-sirk-approval-duplicate-pending-"));
var databasePath = path.join(dataRoot, "requests.json");
var current = {
    modules: {
        approvals: {
            providers: {
                myscripts: { enabled: true, levels: {} },
                mycommands: { enabled: true, levels: {} }
            }
        }
    }
};
var settings = {
    read: function () { return current; },
    isModuleEnabled: function () { return true; }
};
var service = approvalFactory.createApprovalService({
    fs: fs,
    path: path,
    parent: {},
    settings: settings,
    databasePath: databasePath,
    fallbackDatabasePath: path.join(dataRoot, "approval-requests.json")
});
var executionCalls = [];

function provider(type) {
    service.registerProvider({
        type: type,
        title: type,
        normalizePayload: function (payload) { return JSON.parse(JSON.stringify(payload || {})); },
        getApprovalLevels: function () { return [1]; },
        canSubmit: function (user) { return !!user; },
        execute: function (payload, request) {
            executionCalls.push({ type: type, payload: payload, requestId: request.id });
            return { message: "executed" };
        }
    });
}

provider("myscripts");
provider("mycommands");

var userA = { _id: "user/a", name: "User A", siteadmin: true };
var userB = { _id: "user/b", name: "User B", siteadmin: true };

function readRows() {
    var value = JSON.parse(fs.readFileSync(databasePath, "utf8"));
    return Array.isArray(value.requests) ? value.requests : [];
}

function row(id) {
    return readRows().find(function (item) { return item.id === id; });
}

function pending(type, requesterId, predicate) {
    return readRows().filter(function (item) {
        return item.type === type && item.status === "pending" &&
            (!requesterId || item.requester && item.requester.id === requesterId) &&
            (!predicate || predicate(item.payload || {}));
    });
}

function scriptPayload(variableValues, overrides) {
    return Object.assign({
        scriptPath: "L1/sample.ps1",
        scriptHash: "hash-a",
        label: "Sample",
        description: "Presentation only",
        approvalLevels: [1],
        confirmedExecution: true,
        protocolRunNonce: "nonce-a",
        variableValues: variableValues
    }, overrides || {});
}

function commandPayload(nodeId, variableValues, overrides) {
    return Object.assign({
        nodeId: nodeId,
        nodeName: "Display " + nodeId,
        commandId: "dns",
        label: "DNS",
        description: "Presentation only",
        approvalLevels: [1],
        confirmedExecution: true,
        multiHost: true,
        variableValues: variableValues
    }, overrides || {});
}

(async function () {
    await service.initialize();

    var ordered = { alpha: "1", nested: { beta: "2", gamma: { delta: "3" } } };
    var reordered = { nested: { gamma: { delta: "3" }, beta: "2" }, alpha: "1" };
    var duplicateSubmissions = [];
    for (var index = 0; index < 10; index += 1) {
        duplicateSubmissions.push(service.submit(
            "myscripts",
            userA,
            scriptPayload(index % 2 ? ordered : reordered, {
                label: "Display " + index,
                description: "Changed presentation " + index,
                protocolRunNonce: "nonce-" + index
            }),
            "note-" + index
        ));
    }
    var duplicates = await Promise.all(duplicateSubmissions);
    var scriptRows = readRows().filter(function (item) {
        return item.type === "myscripts" && item.requester && item.requester.id === userA._id &&
            item.payload && item.payload.scriptPath === "L1/sample.ps1";
    });
    var scriptPending = scriptRows.filter(function (item) { return item.status === "pending"; });
    var scriptSuperseded = scriptRows.filter(function (item) { return item.status === "superseded"; });
    assert.strictEqual(duplicates.length, 10);
    assert.strictEqual(scriptPending.length, 1, "Concurrent identical My Scripts submissions must leave one pending request.");
    assert.strictEqual(scriptSuperseded.length, 9);
    scriptSuperseded.forEach(function (item) {
        assert.ok(item.supersededByRequestId, "Superseded history must point at its replacement.");
    });

    var publicSuperseded = await service.list(userA, { type: "myscripts", status: "superseded", page: 1, perPage: 200 });
    assert.ok(publicSuperseded.rows.length >= 9);
    publicSuperseded.rows.forEach(function (item) {
        assert.strictEqual(item.canDecide, false, "Superseded requests must never remain approvable.");
    });
    var callsBeforeDeniedDecision = executionCalls.length;
    await assert.rejects(function () {
        return service.decide(userA, scriptSuperseded[0].id, true, "");
    }, /Permission denied/);
    assert.strictEqual(executionCalls.length, callsBeforeDeniedDecision, "A superseded request must not execute.");

    var changedVariable = await service.submit("myscripts", userA, scriptPayload({ alpha: "different", nested: ordered.nested }), "");
    assert.strictEqual(row(changedVariable.id).status, "pending");
    assert.strictEqual(pending("myscripts", userA._id, function (payload) {
        return payload.scriptPath === "L1/sample.ps1";
    }).length, 2, "A different execution variable must remain a separate pending request.");

    var otherUser = await service.submit("myscripts", userB, scriptPayload(reordered), "");
    assert.strictEqual(row(otherUser.id).status, "pending");
    assert.strictEqual(pending("myscripts", userB._id).length, 1, "The same payload from another requester must not supersede user A.");
    assert.strictEqual(pending("myscripts", userA._id).length, 2);

    var commandSubmissions = [];
    for (var commandIndex = 0; commandIndex < 10; commandIndex += 1) {
        commandSubmissions.push(service.submit("mycommands", userA, commandPayload("node/a", {
            hostName: "example.test",
            port: "443"
        }, {
            nodeName: "Node A " + commandIndex,
            label: "DNS " + commandIndex
        }), ""));
    }
    await Promise.all(commandSubmissions);
    assert.strictEqual(pending("mycommands", userA._id, function (payload) {
        return payload.nodeId === "node/a" && payload.commandId === "dns";
    }).length, 1, "Identical My Commands requests for one node must leave one pending request.");

    await service.submit("mycommands", userA, commandPayload("node/b", { hostName: "example.test", port: "443" }), "");
    assert.strictEqual(pending("mycommands", userA._id, function (payload) { return payload.nodeId === "node/b"; }).length, 1);
    assert.strictEqual(pending("mycommands", userA._id, function (payload) { return payload.nodeId === "node/a"; }).length, 1,
        "Multi-host submissions must dedupe per host, not across hosts.");

    var differentCommandVariable = await service.submit("mycommands", userA, commandPayload("node/a", {
        hostName: "example.test",
        port: "53"
    }), "");
    assert.strictEqual(row(differentCommandVariable.id).status, "pending");
    assert.strictEqual(pending("mycommands", userA._id, function (payload) { return payload.nodeId === "node/a"; }).length, 2,
        "Different command execution variables must remain distinct.");

    var idempotency = { idempotencyKey: "external-retry", apiClientId: "api-client", apiClientName: "API client" };
    var idempotentFirst = await service.submit("mycommands", userA, commandPayload("node/idempotent", { port: "443" }), "", idempotency);
    var idempotentRetry = await service.submit("mycommands", userA, commandPayload("node/idempotent", { port: "8443" }), "", idempotency);
    assert.strictEqual(idempotentRetry.id, idempotentFirst.id, "External idempotency must win before duplicate supersede logic.");
    assert.strictEqual(row(idempotentFirst.id).status, "pending");
    assert.strictEqual(pending("mycommands", userA._id, function (payload) { return payload.nodeId === "node/idempotent"; }).length, 1);

    var terminalPayload = commandPayload("node/terminal", { port: "443" });
    var terminalFirst = await service.submit("mycommands", userA, terminalPayload, "");
    var rows = readRows();
    var firstStored = rows.find(function (item) { return item.id === terminalFirst.id; });
    firstStored.status = "completed";
    fs.writeFileSync(databasePath, JSON.stringify({ schemaVersion: 3, requests: rows }, null, 2) + "\n", "utf8");
    var terminalSecond = await service.submit("mycommands", userA, terminalPayload, "");
    assert.strictEqual(row(terminalFirst.id).status, "completed", "Terminal history must never be rewritten by duplicate submission.");
    assert.strictEqual(row(terminalSecond.id).status, "pending");

    var emptyOne = await service.submit("myscripts", userA, { label: "Only presentation A", approvalLevels: [1] }, "");
    var emptyTwo = await service.submit("myscripts", userA, { label: "Only presentation B", approvalLevels: [1] }, "");
    assert.strictEqual(row(emptyOne.id).status, "pending", "An empty effective identity must not become a broad supersede key.");
    assert.strictEqual(row(emptyTwo.id).status, "pending");

    var nestedNameOne = await service.submit("myscripts", userA, scriptPayload({ description: "exec-a" }, { scriptPath: "L1/nested-name.ps1" }), "");
    var nestedNameTwo = await service.submit("myscripts", userA, scriptPayload({ description: "exec-b" }, { scriptPath: "L1/nested-name.ps1" }), "");
    assert.strictEqual(row(nestedNameOne.id).status, "pending", "Ignored presentation field names must still count when nested in variableValues.");
    assert.strictEqual(row(nestedNameTwo.id).status, "pending");

    var tooDeep = {};
    var cursor = tooDeep;
    for (var depth = 0; depth < 20; depth += 1) { cursor.next = {}; cursor = cursor.next; }
    var deepOne = await service.submit("myscripts", userA, scriptPayload({ deep: tooDeep }, { scriptPath: "L1/deep.ps1" }), "");
    var deepTwo = await service.submit("myscripts", userA, scriptPayload({ deep: tooDeep }, { scriptPath: "L1/deep.ps1" }), "");
    assert.strictEqual(row(deepOne.id).status, "pending", "Over-limit identities must fail open without broad supersede.");
    assert.strictEqual(row(deepTwo.id).status, "pending");

    fs.rmSync(dataRoot, { recursive: true, force: true });
    console.log("Approval duplicate pending identity is canonical, requester-scoped, and atomic: OK");
})().catch(function (error) {
    fs.rmSync(dataRoot, { recursive: true, force: true });
    console.error(error);
    process.exitCode = 1;
});
