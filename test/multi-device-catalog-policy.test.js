"use strict";

var assert = require("assert");
var backendPolicy = require("../server/core/multi-device-catalog-policy.js");
var browserPolicy = require("../server/core/multi-device-catalog-browser-policy.js");

var visibleMesh = "mesh/domain/visible";
var hiddenMesh = "mesh/domain/hidden";
var nodeA = "node/domain/alpha";
var nodeB = "node/domain/beta";
var dbCalls = 0;
var rightsChecks = 0;
var db = {
    GetAllTypeNoTypeFieldMeshFiltered: function (meshIds, extra, domainId, type, filter, skip, limit, callback) {
        dbCalls += 1;
        assert.deepStrictEqual(meshIds, [visibleMesh], "Catalog query must be constrained to visible MeshCentral groups.");
        assert.strictEqual(domainId, "domain", "Catalog query must stay in the current user domain.");
        assert.strictEqual(type, "node", "Catalog query must request node records only.");
        callback(null, [
            { _id: nodeA, name: "Alpha", rname: "alpha-host", meshid: visibleMesh, tags: ["Prod", "Blue", "Prod", ""] },
            { _id: nodeB, name: "Beta", rname: "beta-host", meshid: visibleMesh, tags: ["Prod"] },
            { _id: "node/domain/hidden", name: "Hidden", meshid: hiddenMesh, tags: ["Secret"] }
        ].filter(function (node) { return meshIds.indexOf(node.meshid) >= 0; }));
    }
};
var parent = { parent: { webserver: { users: {}, db: db } } };
var runtime = {
    context: {
        parent: parent,
        device: {
            visibleMeshes: function () {
                var value = {};
                value[visibleMesh] = { _id: visibleMesh, name: "Visible group" };
                return value;
            },
            resolveNode: function (user, nodeId) {
                rightsChecks += 1;
                return nodeId === nodeA ? Promise.resolve({ nodeId: nodeId }) : Promise.reject(new Error("No access"));
            },
            visibleNodes: function () { throw new Error("DB-backed catalog should not use the fallback path."); }
        }
    }
};

backendPolicy.catalog(runtime, { domain: "domain" }).then(function (catalog) {
    assert.strictEqual(dbCalls, 1, "Catalog must use one database read per request.");
    assert.strictEqual(rightsChecks, 2, "Every candidate node in a visible group must pass MeshCentral node-level authorization.");
    assert.deepStrictEqual(catalog.nodes.map(function (node) { return node._id; }), [nodeA],
        "Node-specific MeshCentral visibility must be enforced before returning catalog metadata.");
    assert.deepStrictEqual(catalog.nodes[0].tags, ["Prod", "Blue"], "Tags must be cleaned and deduplicated without losing order.");
    assert.strictEqual(catalog.meshes[visibleMesh].name, "Visible group", "Visible group presentation metadata must be included.");
    assert.strictEqual(catalog.meshes[hiddenMesh], undefined, "Hidden groups must not be disclosed.");

    var oldNodes = [{ _id: nodeA, name: "Native Alpha", tags: [] }];
    var oldMeshes = {};
    var openedWith = null;
    var apiCalls = 0;
    var globalWindow = {
        nodes: oldNodes,
        meshes: oldMeshes,
        SharedScriptTools: {
            create: function () {
                return {
                    openMultiExecution: function () {
                        openedWith = {
                            nodes: globalWindow.nodes,
                            meshes: globalWindow.meshes
                        };
                        return "opened";
                    }
                };
            }
        },
        SirkPlatformCore: {
            api: function (moduleName, assetName) {
                apiCalls += 1;
                assert.strictEqual(moduleName, "mycommands");
                assert.strictEqual(assetName, "multi-devices");
                return Promise.resolve(catalog);
            }
        }
    };
    var globalDocument = {
        addEventListener: function () {},
        removeEventListener: function () {}
    };
    var previousWindow = global.window;
    var previousDocument = global.document;
    global.window = globalWindow;
    global.document = globalDocument;

    var wrapped = browserPolicy.createStartupWrapper(function () { return "startup"; });
    assert.strictEqual(wrapped(), "startup", "Browser policy must preserve the original startup return value.");
    var tool = globalWindow.SharedScriptTools.create();
    return Promise.resolve(tool.openMultiExecution({}, {}, nodeA, function () {})).then(function () {
        assert.strictEqual(apiCalls, 1, "Opening Multi must perform exactly one permission-filtered catalog read.");
        assert.ok(openedWith, "Existing SharedScriptTools.openMultiExecution must remain the UI owner.");
        assert.deepStrictEqual(openedWith.nodes[0].tags, ["Prod", "Blue"], "Shared Multi UI must receive authoritative tag metadata.");
        assert.strictEqual(openedWith.meshes[visibleMesh].name, "Visible group", "Shared Multi UI must receive authoritative group metadata.");
        assert.strictEqual(globalWindow.nodes, oldNodes, "Native MeshCentral node store must be restored after synchronous catalog normalization.");
        assert.strictEqual(globalWindow.meshes, oldMeshes, "Native MeshCentral mesh store must be restored after synchronous catalog normalization.");
        global.window = previousWindow;
        global.document = previousDocument;
        console.log("Multi-device permission-filtered backend catalog and SharedScriptTools browser bridge: OK");
    });
}).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});
