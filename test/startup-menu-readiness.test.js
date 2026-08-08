"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

async function main() {
    var root = path.join(__dirname, "..");
    var runtimeSource = fs.readFileSync(path.join(root, "public", "shared", "runtime.js"), "utf8");
    var pluginSource = fs.readFileSync(path.join(root, "plugin-main.js"), "utf8");

    assert.ok(pluginSource.indexOf("var bootstrapScripts = [") >= 0,
        "Browser startup must keep a small bootstrap-critical script phase.");
    assert.ok(pluginSource.indexOf("window.SirkPlatformRuntime.prepare()") >= 0,
        "Bootstrap/menu preparation must start before deferred shared UI is complete.");
    assert.ok(pluginSource.indexOf("Promise.all(deferredScripts.map") >= 0,
        "Deferred shared assets must fetch concurrently instead of one serial request chain.");
    assert.ok(pluginSource.indexOf("window.__SIRK_LAST_NATIVE_PAGE_START__ = view") >= 0 &&
        pluginSource.indexOf("window.__SIRK_LAST_NATIVE_PAGE_END__ = view") >= 0,
        "Native page context must survive hooks that fire before the browser runtime loads.");

    assert.ok(runtimeSource.indexOf("runtime.prepare = function") >= 0,
        "Runtime must expose a bootstrap/menu preparation phase separate from renderer initialization.");
    assert.ok(runtimeSource.indexOf("mountBootstrapMenus(bootstrap)") >= 0,
        "Allowed menu entries must mount immediately after bootstrap.");
    assert.ok(runtimeSource.indexOf("state.access.allowed !== true") >= 0,
        "Early menu mounting must be permission-safe.");
    assert.ok(runtimeSource.indexOf("Promise.all(order.map(function (key) { return ensureModule(key); }))") >= 0,
        "Module scripts must initialize from one bounded parallel fan-out, not a serial chain.");
    assert.strictEqual(runtimeSource.indexOf("chain = chain.then"), -1,
        "The historical sequential module loader must not return.");

    var menus = [];
    var loadCalls = [];
    var loadResolvers = Object.create(null);
    var lifecycle = [];
    var bootstrap = {
        ui: { iconMode: "modern" },
        modules: {
            approvalcenter: { enabled: true, ready: true, access: { allowed: true }, config: { menuTitle: "Approvals" } },
            moverequests: { enabled: true, ready: true, access: { allowed: true }, config: {} },
            mycommands: { enabled: true, ready: true, access: { allowed: true }, config: {} },
            myscripts: { enabled: true, ready: true, access: { allowed: false }, config: { menuTitle: "My Scripts" } }
        }
    };
    var core = {
        workspaceState: null,
        api: function () { return Promise.resolve(bootstrap); },
        ensureMenu: function (definition) { menus.push(definition); },
        assetUrl: function (_moduleName, file) { return file; },
        loadScript: function (id) {
            loadCalls.push(id);
            return new Promise(function (resolve) { loadResolvers[id] = resolve; });
        },
        restoreWorkspace: function () {},
        activateMenu: function () {}
    };
    var windowObject = {
        SirkPlatformCore: core,
        SirkPlatformRuntime: {},
        SirkPlatformModules: {},
        __SIRK_CURRENT_NODE_ID__: "node/test/1",
        __SIRK_LAST_NATIVE_PAGE_START__: 1,
        __SIRK_LAST_NATIVE_PAGE_END__: 1,
        console: console
    };
    windowObject.window = windowObject;
    var context = { window: windowObject, console: console, Promise: Promise };
    vm.runInNewContext(runtimeSource, context);

    await windowObject.SirkPlatformRuntime.prepare();
    assert.deepStrictEqual(menus.map(function (item) { return item.leftId; }), ["LeftMenuSirkPlatform-approvalcenter"],
        "Bootstrap pass must mount exactly the enabled+allowed menu entries and must not expose denied/hidden modules.");
    assert.strictEqual(loadCalls.length, 0,
        "Menu availability after bootstrap must not wait for or trigger renderer script loading.");

    var initializePromise = windowObject.SirkPlatformRuntime.initialize(Promise.resolve());
    await Promise.resolve();
    await Promise.resolve();
    assert.deepStrictEqual(loadCalls, [
        "sirk-platform-module-approvalcenter",
        "sirk-platform-module-moverequests",
        "sirk-platform-module-mycommands",
        "sirk-platform-module-myscripts"
    ], "All enabled module fetches must be started in the same bounded initialization pass.");

    loadCalls.forEach(function (id) {
        var key = id.replace("sirk-platform-module-", "");
        windowObject.SirkPlatformModules[key] = {
            api: { definition: {} },
            initialize: function () { lifecycle.push(key + ":initialize"); return Promise.resolve(); },
            onNativePageStart: function (view) { lifecycle.push(key + ":start:" + view); },
            onDeviceRefreshEnd: function (nodeId) { lifecycle.push(key + ":node:" + nodeId); },
            onNativePageEnd: function (view) { lifecycle.push(key + ":end:" + view); }
        };
        loadResolvers[id]();
    });
    await initializePromise;

    ["approvalcenter", "moverequests", "mycommands", "myscripts"].forEach(function (key) {
        assert.ok(lifecycle.indexOf(key + ":initialize") >= 0, key + " must initialize after its script is ready.");
        assert.ok(lifecycle.indexOf(key + ":node:node/test/1") >= 0, key + " must receive the device context captured before runtime startup.");
        assert.ok(lifecycle.indexOf(key + ":end:1") >= 0, key + " must receive the latest native page completion context.");
    });

    console.log("Startup menu readiness and parallel module lifecycle: OK");
}

main().catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});
