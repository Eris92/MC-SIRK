"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var policy = require("../server/core/myscripts-multi-device-policy.js");

function browserContract() {
    var source = fs.readFileSync(
        path.join(__dirname, "..", "public", "shared", "ui", "toolbar-config.js"),
        "utf8"
    );
    var storage = Object.create(null);
    var context = {
        console: console,
        document: {
            createElement: function () {
                return { className: "", classList: { add: function () {} }, appendChild: function () {} };
            }
        },
        window: {
            localStorage: {
                getItem: function (key) { return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null; },
                setItem: function (key, value) { storage[key] = String(value); }
            },
            setInterval: setInterval,
            clearInterval: clearInterval,
            SirkPlatformModules: {},
            SirkPlatformRuntime: { state: { nodeId: "" } },
            selectedNode: ""
        }
    };
    context.window.window = context.window;
    context.window.document = context.document;
    vm.runInNewContext(source, context, { filename: "toolbar-config.js" });

    assert.strictEqual(context.window.SharedToolbarConfig.presets.myscripts.multi, true,
        "The My Scripts preset must expose the multi-device toolbar button.");

    var syncConfig = null;
    var actionConfig = null;
    var toggleCalled = 0;
    context.window.SharedScriptTools = {
        create: function () {
            return {
                state: { multiPickMode: false },
                syncToolbar: function (toolbar, mode, selected, config) { syncConfig = config; },
                scriptActions: function (script, config) { actionConfig = config; return []; },
                toggleMulti: function (toolbar, onChange) { toggleCalled += 1; if (onChange) onChange(); },
                openMultiExecution: function () {}
            };
        }
    };

    var tools = context.window.SharedScriptTools.create({
        storageKey: "sirkPlatform.myscripts.preferences"
    });
    tools.syncToolbar({}, "scripts", "", { enableMulti: false });
    assert.strictEqual(syncConfig.enableMulti, true,
        "My Scripts toolbar synchronization must keep the multi-device button visible.");

    tools.scriptActions({ path: "A/Test.ps1", multiHost: true }, { enableMulti: false });
    assert.strictEqual(actionConfig.enableMulti, true,
        "A multiHost My Script must receive the row-level multi-device action.");
    assert.strictEqual(typeof actionConfig.onMulti, "function",
        "A multiHost My Script must receive a working multi-device handler.");

    tools.scriptActions({ path: "A/Single.ps1", multiHost: false }, { enableMulti: true });
    assert.strictEqual(actionConfig.enableMulti, false,
        "A script without multiHost must not receive a multi-device execution action.");

    var capturedDefinition = null;
    context.window.SharedScriptTools = context.window.SharedScriptTools;
    context.window.SirkPlatformModuleShell = {
        create: function (definition) { capturedDefinition = definition; return { api: { render: function () {} } }; }
    };
    context.window.SirkPlatformModuleShell.create({
        key: "myscripts",
        buttons: { multi: false }
    });
    assert.ok(capturedDefinition.buttons.multi && typeof capturedDefinition.buttons.multi.onClick === "function",
        "The My Scripts module definition must replace its legacy multi:false override with a button.");
    capturedDefinition.buttons.multi.onClick({});
    assert.strictEqual(toggleCalled, 1,
        "The My Scripts multi-device toolbar button must toggle the shared multi selection mode.");
}

function backendContract() {
    var submissions = [];
    var registeredProvider = null;
    var capturedEnvironment = null;
    var fakeChildProcess = {
        execFile: function (file, args, options, callback) {
            capturedEnvironment = options.env;
            callback(null, "ok", "");
        }
    };
    var approval = {
        registerProvider: function (provider) {
            registeredProvider = provider;
            return function () {};
        },
        submit: function (type, user, payload) {
            submissions.push({ type: type, user: user, payload: payload });
            return Promise.resolve({
                id: "request-" + submissions.length,
                status: "pending"
            });
        }
    };
    var settings = {
        read: function () {
            return {
                modules: {
                    myscripts: { maxMultiHostNodes: 10, multiHostConcurrency: 2 },
                    approvals: { providers: { myscripts: { allowNoApproval: true } } }
                }
            };
        }
    };
    var script = {
        path: "Admin/Test.ps1",
        hash: "hash-1",
        label: "Test script",
        description: "Test",
        multiHost: true,
        confirmExecution: false,
        approvalLevels: [],
        variables: []
    };
    var module = {
        key: "myscripts",
        clientConfig: function () { return { key: "myscripts", toolbar: {} }; },
        apiGet: function (asset, req) {
            assert.strictEqual(asset, "script");
            assert.strictEqual(req.query.path, script.path);
            return { ok: true, script: script };
        },
        apiPost: function () { throw new Error("Unexpected fallback API call."); }
    };
    var runtime = {
        context: {
            approval: approval,
            childProcess: fakeChildProcess,
            parent: {},
            settings: settings
        },
        modules: { myscripts: module },
        settings: settings
    };
    var plugin = { runtime: runtime };
    var user = { _id: "user/domain/admin", name: "Admin" };

    policy.apply(plugin);
    var config = module.clientConfig();
    assert.strictEqual(config.toolbar.multiHost, true,
        "The My Scripts client configuration must advertise multi-device support.");
    assert.strictEqual(config.maxMultiHostNodes, 10);
    assert.strictEqual(config.multiHostConcurrency, 2);

    var provider = {
        type: "myscripts",
        execute: function (payload, request) {
            return new Promise(function (resolve, reject) {
                fakeChildProcess.execFile("pwsh", [], {
                    env: { MYSCRIPTS_REQUEST_ID: request.id }
                }, function (error) {
                    if (error) reject(error);
                    else resolve({ ok: true });
                });
            });
        }
    };
    approval.registerProvider(provider);
    assert.ok(registeredProvider && registeredProvider.execute.__sirkMyScriptsMultiWrapped,
        "The My Scripts provider execution must be wrapped with per-device environment context.");

    return Promise.resolve(module.apiPost("multi-execute", {
        body: {
            nodeIds: ["node/domain/one", "node/domain/two", "node/domain/one"],
            scriptPath: script.path,
            variableValues: {},
            confirmedExecution: false,
            language: "pl",
            note: ""
        }
    }, user)).then(function (response) {
        assert.deepStrictEqual(
            { total: response.total, submitted: response.submitted, pending: response.pending, failed: response.failed },
            { total: 2, submitted: 2, pending: 2, failed: 0 },
            "Multi-device execution must create one request for each unique selected device."
        );
        assert.strictEqual(submissions.length, 2);
        assert.strictEqual(submissions[0].type, "myscripts");
        assert.strictEqual(submissions[0].payload.multiHost, true);
        assert.strictEqual(submissions[0].payload.scriptPath, script.path);
        assert.ok(submissions[0].payload.nodeId === "node/domain/one" || submissions[0].payload.nodeId === "node/domain/two");
        assert.ok(submissions[1].payload.nodeId !== submissions[0].payload.nodeId);

        var payload = submissions[0].payload;
        return registeredProvider.execute(payload, { id: "execution-1" }).then(function () {
            assert.strictEqual(capturedEnvironment.MYSCRIPTS_NODE_ID, payload.nodeId,
                "The server-side script must receive the selected MeshCentral node ID.");
            assert.strictEqual(capturedEnvironment.MYSCRIPTS_NODE_NAME, payload.nodeName);
            assert.strictEqual(capturedEnvironment.MYSCRIPTS_MULTI_HOST, "1");
        });
    });
}

browserContract();
backendContract().then(function () {
    console.log("My Scripts multi-device toolbar, submission and node environment: OK");
}).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});
