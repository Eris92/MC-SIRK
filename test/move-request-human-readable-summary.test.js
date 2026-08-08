"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var approvalFactory = require("../server/core/approval-service.js");
var moveFactory = require("../server/modules/move-requests/index.js");

var dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mc-sirk-move-summary-"));
var current = {
    modules: {
        approvals: { providers: { moverequests: { enabled: true, showTab: true, showOverview: true, levels: {} } } },
        moverequests: { enabled: true, targetMeshApprovalLevels: {} }
    }
};
var visibleMeshes = {};
var settings = {
    read: function () { return current; },
    isModuleEnabled: function () { return true; },
    update: function (fn) { current = fn(current) || current; return Promise.resolve(current); },
    updateSync: function (fn) { current = fn(current) || current; return current; }
};
var context = {
    fs: fs, path: path, dataRoot: dataRoot, settings: settings,
    parent: {}, source: "test",
    device: {
        visibleMeshes: function () { return visibleMeshes; },
        visibleNodes: function () { return { nodes: [], meshes: [] }; },
        getWebServer: function () { return null; }
    }
};
context.approval = approvalFactory.createApprovalService({
    fs: fs, path: path, parent: {}, source: "test", settings: settings,
    databasePath: path.join(dataRoot, "requests.json"),
    fallbackDatabasePath: path.join(dataRoot, "approval-requests.json")
});
var move = moveFactory.createModule(context);
var user = { _id: "user/admin", name: "Admin", siteadmin: true };

Promise.resolve(move.initialize())
    .then(function () {
        return context.approval.submit("moverequests", user, {
  nodeId: "node/domain/host-1", nodeName: "HOST-1",
  sourceMeshId: "mesh/domain/source", targetMeshId: "mesh/domain/target"
        }, "");
    })
    .then(function (created) {
        assert.strictEqual(created.summary, "mesh/domain/source → mesh/domain/target",
  "Without visible names the stored/display fallback must remain the stable IDs.");
        visibleMeshes = {
  "mesh/domain/source": { _id: "mesh/domain/source", name: "Production" },
  "mesh/domain/target": { _id: "mesh/domain/target", name: "VIP" }
        };
        return context.approval.list(user, { type: "moverequests", page: 1, perPage: 50 });
    })
    .then(function (listed) {
        assert.strictEqual(listed.rows[0].summary, "Production → VIP",
  "Existing ID-only requests must be presented with current visible mesh names without rewriting execution IDs.");
        assert.strictEqual(Object.prototype.hasOwnProperty.call(listed.rows[0], "payload"), false,
  "Presentation enrichment must not leak the private execution payload.");
        visibleMeshes = {
  "mesh/domain/target": { _id: "mesh/domain/target", name: "VIP" }
        };
        return context.approval.list(user, { type: "moverequests", page: 1, perPage: 50 });
    })
    .then(function (listed) {
        assert.strictEqual(listed.rows[0].summary, "mesh/domain/source → VIP",
  "An invisible mesh name must not be exposed; presentation must fall back to its ID.");
        visibleMeshes = {
  "mesh/domain/source": { _id: "mesh/domain/source", name: "Production" },
  "mesh/domain/target": { _id: "mesh/domain/target", name: "VIP" }
        };
        return context.approval.submit("moverequests", user, {
  nodeId: "node/domain/host-2", nodeName: "HOST-2",
  sourceMeshId: "mesh/domain/source", sourceMeshName: "Spoofed Source",
  targetMeshId: "mesh/domain/target", targetMeshName: "Spoofed Target"
        }, "");
    })
    .then(function (created) {
        assert.strictEqual(created.title, "Move HOST-2", "Human-readable nodeName must remain the request title display metadata.");
        assert.strictEqual(created.summary, "Production → VIP",
  "Server-visible mesh names must win over client-supplied display names.");
        assert.strictEqual(created.payload.sourceMeshId, "mesh/domain/source");
        assert.strictEqual(created.payload.targetMeshId, "mesh/domain/target");
        fs.rmSync(dataRoot, { recursive: true, force: true });
        console.log("Move Requests present human-readable visible mesh names while preserving stable execution IDs: OK");
    })
    .catch(function (error) {
        fs.rmSync(dataRoot, { recursive: true, force: true });
        console.error(error);
        process.exitCode = 1;
    });
