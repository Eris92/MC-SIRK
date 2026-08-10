"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var approvalFactory = require("../server/core/approval-service.js");
var moveFactory = require("../server/modules/move-requests/index.js");

var dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mc-sirk-move-single-pending-"));
var databasePath = path.join(dataRoot, "requests.json");
var current = {
    modules: {
        approvals: { providers: { moverequests: { enabled: true, showTab: true, showOverview: true, levels: {} } } },
        moverequests: { enabled: true, targetMeshApprovalLevels: {} }
    }
};
var settings = {
    read: function () { return current; },
    isModuleEnabled: function () { return true; },
    update: function (fn) { current = fn(current) || current; return Promise.resolve(current); },
    updateSync: function (fn) { current = fn(current) || current; return current; }
};
var executionCalls = [];
var executionError = null;
var visibleMeshes = {
    "mesh/domain/source": { _id: "mesh/domain/source", name: "Source" },
    "mesh/domain/target-a": { _id: "mesh/domain/target-a", name: "Target A" },
    "mesh/domain/target-b": { _id: "mesh/domain/target-b", name: "Target B" },
    "mesh/domain/target-c": { _id: "mesh/domain/target-c", name: "Target C" }
};
var context = {
    fs: fs,
    path: path,
    dataRoot: dataRoot,
    settings: settings,
    parent: {},
    source: "test",
    device: {
        visibleMeshes: function () { return visibleMeshes; },
        visibleNodes: function () { return { nodes: [], meshes: Object.keys(visibleMeshes).map(function (id) { return visibleMeshes[id]; }) }; },
        moveNodeToMesh: function (requesterId, nodeId, targetMeshId) {
            executionCalls.push({ nodeId: nodeId, targetMeshId: targetMeshId, requesterId: requesterId });
            if (executionError) return Promise.reject(executionError);
            return Promise.resolve({ message: "Device moved.", nodeId: nodeId, targetMeshId: targetMeshId, alreadyCurrent: false });
        }
    }
};
context.approval = approvalFactory.createApprovalService({
    fs: fs,
    path: path,
    parent: {},
    source: "test",
    settings: settings,
    databasePath: databasePath,
    fallbackDatabasePath: path.join(dataRoot, "approval-requests.json")
});
var move = moveFactory.createModule(context);
var user = { _id: "user/admin", name: "Admin", siteadmin: true };

function payload(nodeId, targetMeshId) {
    return {
        nodeId: nodeId,
        nodeName: nodeId ? nodeId.split("/").pop() : "",
        sourceMeshId: "mesh/domain/source",
        targetMeshId: targetMeshId || "mesh/domain/target-a"
    };
}

function submit(nodeId, targetMeshId, options) {
    return context.approval.submit("moverequests", user, payload(nodeId, targetMeshId), "", options);
}

function readRows() {
    var value = JSON.parse(fs.readFileSync(databasePath, "utf8"));
    return Array.isArray(value.requests) ? value.requests : [];
}

function writeRows(rows) {
    fs.writeFileSync(databasePath, JSON.stringify({ schemaVersion: 3, requests: rows }, null, 2) + "\n", "utf8");
}

function rowById(id) {
    return readRows().find(function (row) { return row.id === id; });
}

function pendingFor(nodeId) {
    return readRows().filter(function (row) {
        return row.type === "moverequests" && row.status === "pending" && row.payload && row.payload.nodeId === nodeId;
    });
}

function seed(status, id, nodeId, type) {
    var rows = readRows();
    rows.push({
        id: id,
        type: type || "moverequests",
        title: id,
        summary: "seed",
        status: status,
        requester: { id: user._id, name: user.name },
        payload: { nodeId: nodeId, targetMeshId: "mesh/domain/target-a" },
        requiredApprovalLevels: [1],
        approvalDecisions: [],
        createdAt: Date.now() - 1000,
        updatedAt: Date.now() - 1000,
        executionId: "execution-" + id
    });
    writeRows(rows);
}

(async function () {
    await move.initialize();

    var first = await submit("node/domain/host-a", "mesh/domain/target-a");
    var second = await submit("node/domain/host-a", "mesh/domain/target-b");
    assert.strictEqual(rowById(first.id).status, "superseded", "A newer request must supersede the older pending request for the same node.");
    assert.strictEqual(rowById(first.id).supersededByRequestId, second.id, "Superseded history must link to the request that replaced it.");
    assert.strictEqual(pendingFor("node/domain/host-a").length, 1);
    assert.strictEqual(pendingFor("node/domain/host-a")[0].id, second.id);

    var third = await submit("node/domain/host-a", "mesh/domain/target-c");
    assert.strictEqual(rowById(first.id).status, "superseded");
    assert.strictEqual(rowById(first.id).supersededByRequestId, second.id, "Already terminal history must not be rewritten by later submissions.");
    assert.strictEqual(rowById(second.id).status, "superseded");
    assert.strictEqual(rowById(second.id).supersededByRequestId, third.id);
    assert.strictEqual(pendingFor("node/domain/host-a").length, 1);

    var hostB = await submit("node/domain/host-b", "mesh/domain/target-a");
    var fourth = await submit("node/domain/host-a", "mesh/domain/target-a");
    assert.strictEqual(rowById(hostB.id).status, "pending", "A request for another node must remain pending.");
    assert.strictEqual(rowById(third.id).status, "superseded");
    assert.strictEqual(rowById(third.id).supersededByRequestId, fourth.id);
    assert.strictEqual(pendingFor("node/domain/host-a").length, 1);
    assert.strictEqual(pendingFor("node/domain/host-b").length, 1);

    var concurrent = await Promise.all([
        submit("node/domain/host-concurrent", "mesh/domain/target-a"),
        submit("node/domain/host-concurrent", "mesh/domain/target-b")
    ]);
    var concurrentRows = readRows().filter(function (row) {
        return row.type === "moverequests" && row.payload && row.payload.nodeId === "node/domain/host-concurrent";
    });
    var concurrentPending = concurrentRows.filter(function (row) { return row.status === "pending"; });
    var concurrentSuperseded = concurrentRows.filter(function (row) { return row.status === "superseded"; });
    assert.strictEqual(concurrent.length, 2);
    assert.strictEqual(concurrentPending.length, 1, "Serialized concurrent submissions must leave exactly one pending request.");
    assert.strictEqual(concurrentSuperseded.length, 1);
    assert.strictEqual(concurrentSuperseded[0].supersededByRequestId, concurrentPending[0].id);

    var executionCountBeforeDeniedDecision = executionCalls.length;
    await assert.rejects(
        function () { return context.approval.decide(user, concurrentSuperseded[0].id, true, ""); },
        /Permission denied/,
        "A superseded request must not be approvable."
    );
    assert.strictEqual(executionCalls.length, executionCountBeforeDeniedDecision, "Denied approval must not invoke native move execution.");

    var idempotencyOptions = { idempotencyKey: "same-submit", apiClientId: "test-client", apiClientName: "Test client" };
    var idempotentFirst = await submit("node/domain/host-idempotent", "mesh/domain/target-a", idempotencyOptions);
    var idempotentRetry = await submit("node/domain/host-idempotent", "mesh/domain/target-b", idempotencyOptions);
    assert.strictEqual(idempotentRetry.id, idempotentFirst.id, "An idempotent retry must return the original request.");
    assert.strictEqual(rowById(idempotentFirst.id).status, "pending", "Idempotency must be resolved before supersede logic.");
    assert.strictEqual(pendingFor("node/domain/host-idempotent").length, 1);
    assert.strictEqual(readRows().filter(function (row) { return row.id === idempotentFirst.id; }).length, 1);

    ["completed", "rejected", "failed", "approved", "executing"].forEach(function (status) {
        seed(status, "seed-" + status, "node/domain/host-terminal");
    });
    seed("pending", "seed-other-provider", "node/domain/host-terminal", "mycommands");
    var terminalNew = await submit("node/domain/host-terminal", "mesh/domain/target-c");
    ["completed", "rejected", "failed", "approved", "executing"].forEach(function (status) {
        assert.strictEqual(rowById("seed-" + status).status, status, "Existing " + status + " request must not be rewritten.");
    });
    assert.strictEqual(rowById("seed-other-provider").status, "pending", "Another approval provider must not be touched.");
    assert.strictEqual(rowById(terminalNew.id).status, "pending");

    var emptyFirst = await submit("", "mesh/domain/target-a");
    var emptySecond = await submit("", "mesh/domain/target-b");
    assert.strictEqual(rowById(emptyFirst.id).status, "pending", "Empty nodeId must never become a broad supersede key.");
    assert.strictEqual(rowById(emptySecond.id).status, "pending");

    var executionRequest = await submit("node/domain/host-execute", "mesh/domain/target-c");
    await context.approval.decide(user, executionRequest.id, true, "");
    assert.strictEqual(rowById(executionRequest.id).status, "completed", "The surviving request must retain the normal execution lifecycle after verified move success.");
    assert.deepStrictEqual(executionCalls[executionCalls.length - 1], {
        nodeId: "node/domain/host-execute",
        targetMeshId: "mesh/domain/target-c",
        requesterId: user._id
    }, "Execution must preserve stable requester, nodeId and targetMeshId identifiers.");

    executionError = new Error("MeshCentral did not persist the requested device group change.");
    var failedRequest = await submit("node/domain/host-fail", "mesh/domain/target-b");
    await context.approval.decide(user, failedRequest.id, true, "");
    assert.strictEqual(rowById(failedRequest.id).status, "failed", "Native move failure must persist a failed terminal request, never completed.");
    assert.match(String(rowById(failedRequest.id).result && rowById(failedRequest.id).result.message || ""), /did not persist/);
    executionError = null;

    var supersededList = await context.approval.list(user, { type: "moverequests", status: "superseded", page: 1, perPage: 200 });
    assert.ok(supersededList.rows.length >= 4, "Superseded requests must remain visible and filterable as history.");
    supersededList.rows.forEach(function (request) {
        assert.strictEqual(Object.prototype.hasOwnProperty.call(request, "payload"), false, "Public approval rows must not leak private execution payloads.");
        assert.strictEqual(request.status, "superseded");
        assert.ok(request.supersededByRequestId, "Superseded public history must retain its replacement trace.");
        assert.strictEqual(request.canDecide, false);
    });

    var statusNavSource = fs.readFileSync(path.join(__dirname, "../public/shared/ui/status-nav.js"), "utf8");
    assert.ok(statusNavSource.indexOf('key: "superseded"') >= 0, "Shared status navigation must expose the superseded history filter.");

    fs.rmSync(dataRoot, { recursive: true, force: true });
    console.log("Move Requests keep at most one pending request per stable nodeId and fail closed on move errors: OK");
})().catch(function (error) {
    fs.rmSync(dataRoot, { recursive: true, force: true });
    console.error(error);
    process.exitCode = 1;
});
