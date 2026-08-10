"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var deviceFactory = require("../server/core/device-service.js");

var moveSource = fs.readFileSync(path.join(__dirname, "../server/modules/move-requests/index.js"), "utf8");
var upstreamContract = fs.readFileSync(path.join(__dirname, "../server/core/device-service.js"), "utf8");

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function fixture() {
    var user = { _id: "user/domain/admin", name: "Admin", domain: "domain", siteadmin: true };
    var sourceMesh = { _id: "mesh/domain/source", name: "Source", domain: "domain", mtype: 2 };
    var targetMesh = { _id: "mesh/domain/target", name: "Target", domain: "domain", mtype: 2 };
    var otherType = { _id: "mesh/domain/other-type", name: "Other Type", domain: "domain", mtype: 1 };
    var nodeId = "node/domain/host-a";
    var docs = Object.create(null);
    docs[nodeId] = { _id: nodeId, name: "Host A", domain: "domain", meshid: sourceMesh._id, type: "node" };
    var share = { _id: "share-1", type: "deviceshare", domain: "domain", nodeid: nodeId, xmeshid: sourceMesh._id };
    var setCalls = [];
    var getCalls = [];
    var shareSets = [];
    var dispatches = [];
    var mqttCalls = [];
    var mpsCalls = [];
    var sourceRights = 1;
    var targetRights = 1;
    var persistWrites = true;

    var db = {
        Set: function (value, callback) {
            setCalls.push(clone(value));
            if (String(value && value._id || "").indexOf("share-") === 0) {
                shareSets.push(clone(value));
                if (callback) callback(null);
                return;
            }
            if (persistWrites) docs[value._id] = clone(value);
            if (callback) callback(null);
        },
        Get: function (id, callback) {
            getCalls.push(id);
            callback(null, docs[id] ? [clone(docs[id])] : []);
        },
        GetAllTypeNoTypeField: function (type, domain, callback) {
            callback(null, type === "deviceshare" && domain === "domain" ? [clone(share)] : []);
        },
        GetAllTypeNoTypeFieldMeshFiltered: function () {}
    };

    var agent = {
        authenticated: 2,
        dbMeshKey: sourceMesh._id,
        meshid: "source",
        policyUpdates: 0,
        sendUpdatedIntelAmtPolicy: function () { this.policyUpdates++; }
    };
    var server = {
        DispatchEvent: function (targets, source, event) { dispatches.push({ targets: targets, source: source, event: clone(event) }); },
        GetConnectivityState: function () { return { connectivity: 1 }; },
        mqttbroker: { changeDeviceMesh: function (id, meshId) { mqttCalls.push([id, meshId]); } },
        mpsserver: { changeDeviceMesh: function (id, meshId) { mpsCalls.push([id, meshId]); } }
    };
    var web = {
        users: {},
        meshes: {},
        db: db,
        parent: server,
        wsagents: {},
        cleanDevice: function (value) { return clone(value); },
        GetNodeWithRights: function (domain, actingUser, id, callback) {
            assert.strictEqual(actingUser._id, user._id, "Move must execute with the original requester identity.");
            callback(docs[id] ? clone(docs[id]) : null, sourceRights, true);
        },
        GetMeshRights: function (actingUser, meshId) {
            assert.strictEqual(actingUser._id, user._id);
            return meshId === targetMesh._id || meshId === otherType._id ? targetRights : sourceRights;
        },
        CreateMeshDispatchTargets: function (meshId, extras) { return [meshId].concat(extras || []); }
    };
    web.users[user._id] = user;
    web.meshes[sourceMesh._id] = sourceMesh;
    web.meshes[targetMesh._id] = targetMesh;
    web.meshes[otherType._id] = otherType;
    web.wsagents[nodeId] = agent;

    var parent = { webserver: web };
    var service = deviceFactory.createDeviceService({ parent: parent, source: "move-test" });
    return {
        user: user,
        nodeId: nodeId,
        sourceMesh: sourceMesh,
        targetMesh: targetMesh,
        otherType: otherType,
        docs: docs,
        db: db,
        web: web,
        agent: agent,
        service: service,
        setCalls: setCalls,
        getCalls: getCalls,
        shareSets: shareSets,
        dispatches: dispatches,
        mqttCalls: mqttCalls,
        mpsCalls: mpsCalls,
        setSourceRights: function (value) { sourceRights = value; },
        setTargetRights: function (value) { targetRights = value; },
        setPersistWrites: function (value) { persistWrites = value; }
    };
}

(async function () {
    var value = fixture();
    var result = await value.service.moveNodeToMesh(value.user._id, value.nodeId, value.targetMesh._id);
    assert.strictEqual(result.alreadyCurrent, false);
    assert.strictEqual(value.docs[value.nodeId].meshid, value.targetMesh._id, "Native persistence must update the node meshid.");
    assert.strictEqual(value.setCalls.filter(function (item) { return item._id === value.nodeId; }).length, 1,
        "One approval execution may perform at most one native node persistence call.");
    assert.strictEqual(value.getCalls.length, 1, "Successful move must perform one bounded persistence verification read.");
    assert.strictEqual(value.shareSets.length, 1, "Device-share mesh linkage must follow current MeshCentral changeDeviceMesh behavior.");
    assert.strictEqual(value.shareSets[0].xmeshid, value.targetMesh._id);
    assert.strictEqual(value.agent.dbMeshKey, value.targetMesh._id);
    assert.strictEqual(value.agent.meshid, "target");
    assert.strictEqual(value.agent.policyUpdates, 1);
    assert.deepStrictEqual(value.mqttCalls, [[value.nodeId, value.targetMesh._id]]);
    assert.deepStrictEqual(value.mpsCalls, [[value.nodeId, value.targetMesh._id]]);
    assert.strictEqual(value.dispatches.length, 1);
    assert.strictEqual(value.dispatches[0].event.action, "nodemeshchange");
    assert.strictEqual(value.dispatches[0].event.oldMeshId, value.sourceMesh._id);
    assert.strictEqual(value.dispatches[0].event.newMeshId, value.targetMesh._id);

    var writesBeforeNoop = value.setCalls.length;
    var readsBeforeNoop = value.getCalls.length;
    var noop = await value.service.moveNodeToMesh(value.user._id, value.nodeId, value.targetMesh._id);
    assert.strictEqual(noop.alreadyCurrent, true, "Already-current target must be an idempotent success.");
    assert.strictEqual(value.setCalls.length, writesBeforeNoop, "Already-current success must not invoke persistence again.");
    assert.strictEqual(value.getCalls.length, readsBeforeNoop, "Already-current success is verified from the authoritative resolved node and needs no extra DB read.");

    var cross = fixture();
    await assert.rejects(function () {
        return cross.service.moveNodeToMesh(cross.user._id, cross.nodeId, "mesh/other/target");
    }, /Invalid target device group identifier/);
    assert.strictEqual(cross.setCalls.length, 0, "Cross-domain target must fail before persistence.");

    var wrongType = fixture();
    await assert.rejects(function () {
        return wrongType.service.moveNodeToMesh(wrongType.user._id, wrongType.nodeId, wrongType.otherType._id);
    }, /different types/);
    assert.strictEqual(wrongType.setCalls.length, 0);

    var deniedSource = fixture();
    deniedSource.setSourceRights(0x00000008);
    await assert.rejects(function () {
        return deniedSource.service.moveNodeToMesh(deniedSource.user._id, deniedSource.nodeId, deniedSource.targetMesh._id);
    }, /permission to move this device from/);
    assert.strictEqual(deniedSource.setCalls.length, 0);

    var deniedTarget = fixture();
    deniedTarget.setTargetRights(0x00000008);
    await assert.rejects(function () {
        return deniedTarget.service.moveNodeToMesh(deniedTarget.user._id, deniedTarget.nodeId, deniedTarget.targetMesh._id);
    }, /permission to move this device to/);
    assert.strictEqual(deniedTarget.setCalls.length, 0);

    var missingApi = fixture();
    delete missingApi.web.cleanDevice;
    await assert.rejects(function () {
        return missingApi.service.moveNodeToMesh(missingApi.user._id, missingApi.nodeId, missingApi.targetMesh._id);
    }, /serialization API is unavailable/);
    assert.strictEqual(missingApi.setCalls.length, 0, "Missing native serialization capability must fail rather than report success.");

    var unverified = fixture();
    unverified.setPersistWrites(false);
    await assert.rejects(function () {
        return unverified.service.moveNodeToMesh(unverified.user._id, unverified.nodeId, unverified.targetMesh._id);
    }, /did not persist/);
    assert.strictEqual(unverified.setCalls.filter(function (item) { return item._id === unverified.nodeId; }).length, 1,
        "A verification failure must not retry the native move implicitly.");
    assert.strictEqual(unverified.dispatches.length, 0, "Failed verification must not emit a successful node-mesh-change event.");

    var missingUser = fixture();
    await assert.rejects(function () {
        return missingUser.service.moveNodeToMesh("user/domain/deleted", missingUser.nodeId, missingUser.targetMesh._id);
    }, /request user is unavailable/);
    assert.strictEqual(missingUser.setCalls.length, 0);

    assert.strictEqual(moveSource.indexOf("MoveNodeToMesh"), -1,
        "Move Requests must not depend on the non-existent assumed MoveNodeToMesh helper.");
    assert.ok(moveSource.indexOf("context.device.moveNodeToMesh") >= 0 && moveSource.indexOf("Promise.reject") >= 0,
        "Missing native move owner must reject so Approval marks the request failed.");
    assert.ok(upstreamContract.indexOf("GetNodeWithRights") >= 0 && upstreamContract.indexOf("GetMeshRights") >= 0 &&
        upstreamContract.indexOf("cleanDevice") >= 0 && upstreamContract.indexOf("nodemeshchange") >= 0,
        "Device owner must mirror the current MeshCentral changeDeviceMesh permission/persistence/event chain.");
    assert.strictEqual(upstreamContract.indexOf("setInterval"), -1,
        "Move verification must remain bounded and event/callback driven.");

    console.log("Move Requests execute one verified MeshCentral-native device-group change and fail closed: OK");
})().catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});
