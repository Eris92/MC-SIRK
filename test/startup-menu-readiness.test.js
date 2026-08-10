"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

async function main() {
    var root = path.join(__dirname, "..");
    var runtimeSource = fs.readFileSync(path.join(root, "public", "shared", "runtime.js"), "utf8");
    var pluginSource = fs.readFileSync(path.join(root, "plugin-main.js"), "utf8");

    assert.ok(pluginSource.indexOf('var coreReady = load("sirk-platform-core", asset("core.js"))') >= 0,
        "Browser startup must load core as the only blocking script before bootstrap can start.");
    assert.ok(pluginSource.indexOf('window.SirkPlatformCore.api("", "bootstrap")') >= 0,
        "The canonical bootstrap request must start directly after core is ready.");
    assert.ok(pluginSource.indexOf("Promise.all(criticalScripts.map") >= 0,
        "Theme/settings/runtime critical scripts must load concurrently after core.");
    assert.ok(pluginSource.indexOf("window.SirkPlatformRuntime.prepare(bootstrapReady)") >= 0,
        "Runtime preparation must reuse the already-started bootstrap request instead of issuing a second request.");
    assert.ok(pluginSource.indexOf("deferredScripts.filter(function (item)") >= 0 &&
        pluginSource.indexOf("}).map(function (item)") >= 0 &&
        pluginSource.indexOf("var dependenciesReady = Promise.all(deferredReady)") >= 0,
        "Independent deferred shared assets must still fetch concurrently instead of becoming one serial request chain.");
    assert.ok(pluginSource.indexOf('var scriptToolsReady = load("sirk-platform-script-tools", asset("shared-ui/script-tools.js"))') >= 0 &&
        pluginSource.indexOf("var parameterDialogReady = scriptToolsReady.then(function ()") >= 0 &&
        pluginSource.indexOf("deferredReady.push(parameterDialogReady.then(function ()") >= 0,
        "Only the real script-tools -> parameter-dialog -> Quick dependency may be serialized inside deferred startup.");
    assert.ok(pluginSource.indexOf("window.__SIRK_LAST_NATIVE_PAGE_START__ = view") >= 0 &&
        pluginSource.indexOf("window.__SIRK_LAST_NATIVE_PAGE_END__ = view") >= 0,
        "Native page context must survive hooks that fire before the browser runtime loads.");

    var coreLoadIndex = pluginSource.indexOf('var coreReady = load("sirk-platform-core", asset("core.js"))');
    var bootstrapIndex = pluginSource.indexOf('window.SirkPlatformCore.api("", "bootstrap")');
    var criticalFanoutIndex = pluginSource.indexOf("Promise.all(criticalScripts.map");
    assert.ok(coreLoadIndex >= 0 && bootstrapIndex > coreLoadIndex && criticalFanoutIndex > bootstrapIndex,
        "Bootstrap must start after core but before the remaining critical-script fan-out completes.");

    assert.ok(runtimeSource.indexOf("runtime.prepare = function (bootstrapReady)") >= 0,
        "Runtime must accept the prefetched bootstrap promise.");
    assert.ok(runtimeSource.indexOf("reconcileBootstrapSurfaces()") >= 0,
        "Allowed native surfaces must reconcile from the shared bootstrap owner.");
    assert.ok(runtimeSource.indexOf("if (runtime.state.nativePageEnd == null) return;") >= 0,
        "Bootstrap menu insertion must wait for the current native MeshCentral page completion signal.");
    assert.ok(runtimeSource.indexOf("runtime.state.nativePageEnd = null;") >= 0,
        "A new native page start must invalidate the previous page-end readiness state.");
    assert.ok(runtimeSource.indexOf("state.access.allowed === true") >= 0,
        "Early menu, host action and module loading must be permission-safe.");
    assert.ok(runtimeSource.indexOf("config.hostButtonEnabled === false") >= 0,
        "Move Request host action must remain hidden when disabled by bootstrap config.");
    assert.ok(runtimeSource.indexOf("Promise.all(order.map(function (key) { return ensureModule(key); }))") >= 0,
        "Module scripts must initialize from one bounded parallel fan-out, not a serial chain.");
    assert.strictEqual(runtimeSource.indexOf("chain = chain.then"), -1,
        "The historical sequential module loader must not return.");
    assert.strictEqual(runtimeSource.indexOf("MutationObserver"), -1,
        "Shared startup readiness must not use a DOM observer.");

    var menus = [];
    var loadCalls = [];
    var loadResolvers = Object.create(null);
    var lifecycle = [];
    var apiCalls = 0;
    var bootstrap = {
        ui: { iconMode: "modern" },
        modules: {
            approvalcenter: { enabled: true, ready: true, access: { allowed: true }, config: { menuTitle: "Approvals" } },
            moverequests: { enabled: true, ready: true, access: { allowed: true }, config: { hostButtonEnabled: true } },
            mycommands: { enabled: true, ready: true, access: { allowed: true }, config: {} },
            myscripts: { enabled: true, ready: true, access: { allowed: false }, config: { menuTitle: "My Scripts" } }
        }
    };
    var core = {
        workspaceState: null,
        api: function () { apiCalls += 1; return Promise.resolve(bootstrap); },
        ensureMenu: function (definition) { menus.push(definition); },
        assetUrl: function (_moduleName, file) { return file; },
        loadScript: function (id) {
            loadCalls.push(id);
            return new Promise(function (resolve) { loadResolvers[id] = resolve; });
        },
        restoreWorkspace: function () {},
        activateMenu: function () {}
    };
    var documentObject = {
        getElementById: function () { return null; }
    };
    var windowObject = {
        SirkPlatformCore: core,
        SirkPlatformRuntime: {},
        SirkPlatformModules: {},
        __SIRK_CURRENT_NODE_ID__: "node/test/1",
        __SIRK_LAST_NATIVE_PAGE_START__: 1,
        __SIRK_LAST_NATIVE_PAGE_END__: 1,
        document: documentObject,
        console: console
    };
    windowObject.window = windowObject;
    var context = { window: windowObject, document: documentObject, console: console, Promise: Promise };
    vm.runInNewContext(runtimeSource, context);

    await windowObject.SirkPlatformRuntime.prepare(Promise.resolve(bootstrap));
    assert.strictEqual(apiCalls, 0,
        "A prefetched bootstrap promise must be reused without issuing a duplicate bootstrap request.");
    assert.deepStrictEqual(menus.map(function (item) { return item.leftId; }), ["LeftMenuSirkPlatform-approvalcenter"],
        "Bootstrap pass must mount exactly the enabled+allowed menu entries and must not expose denied/hidden modules.");
    assert.strictEqual(menus[0].title, "Approval Center",
        "Early menu title must already match the final renderer definition to avoid a post-initialize text swap.");
    assert.strictEqual(loadCalls.length, 0,
        "Native surface availability after bootstrap must not wait for or trigger renderer script loading.");

    var initializePromise = windowObject.SirkPlatformRuntime.initialize(Promise.resolve());
    await Promise.resolve();
    await Promise.resolve();
    assert.deepStrictEqual(loadCalls, [
        "sirk-platform-module-approvalcenter",
        "sirk-platform-module-moverequests",
        "sirk-platform-module-mycommands"
    ], "All enabled+allowed module fetches must start in the same bounded pass and denied modules must not load.");

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

    ["approvalcenter", "moverequests", "mycommands"].forEach(function (key) {
        assert.ok(lifecycle.indexOf(key + ":initialize") >= 0, key + " must initialize after its script is ready.");
        assert.ok(lifecycle.indexOf(key + ":node:node/test/1") >= 0, key + " must receive the device context captured before runtime startup.");
        assert.ok(lifecycle.indexOf(key + ":end:1") >= 0, key + " must receive the latest native page completion context.");
    });
    assert.strictEqual(lifecycle.some(function (entry) { return entry.indexOf("myscripts:") === 0; }), false,
        "A denied module must not initialize or receive native lifecycle callbacks.");

    menus.length = 0;
    windowObject.SirkPlatformRuntime.onNativePageStart(2);
    windowObject.SirkPlatformRuntime.refreshMenus();
    assert.strictEqual(menus.length, 0,
        "A new native page start must not recreate bootstrap menu entries while MeshCentral is still redrawing its page.");

    windowObject.SirkPlatformRuntime.onNativePageEnd(2);
    assert.deepStrictEqual(menus.map(function (item) { return item.leftId; }), ["LeftMenuSirkPlatform-approvalcenter"],
        "The current native page-end callback must restore the full allowed menu in one bounded pass.");

    console.log("Startup bootstrap prefetch, native page-ready menu gate, dialog dependency and parallel module lifecycle: OK");
}

main().catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});
