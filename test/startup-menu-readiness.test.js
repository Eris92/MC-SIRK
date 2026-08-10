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
        "Independent deferred shared assets must still fetch concurrently under one final readiness fan-in.");
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
        request: function () { return Promise.resolve({ ok: true }); }
    };
    var context = {
        console: console,
        Promise: Promise,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        AbortController: AbortController,
        window: {
            SirkPlatformCore: core,
            SirkIconSettings: { read: function () { return { mode: "modern" }; } },
            SirkPlatformModules: {},
            localStorage: { getItem: function () { return null; }, setItem: function () {} }
        },
        document: {
            getElementById: function () { return null; },
            createElement: function () { return { setAttribute: function () {}, appendChild: function () {} }; },
            head: { appendChild: function () {} },
            body: { appendChild: function () {} }
        }
    };
    context.window.window = context.window;
    vm.runInNewContext(runtimeSource, context, { filename: "runtime.js" });
    var runtime = context.window.SirkPlatformRuntime;
    assert.ok(runtime, "Runtime must initialize in the test context.");
    runtime.loadModule = function (key) {
        loadCalls.push(key);
        return new Promise(function (resolve) { loadResolvers[key] = resolve; });
    };
    runtime.onNativePageStart = function (view) { lifecycle.push("start:" + view); };
    runtime.onNativePageEnd = function (view) { lifecycle.push("end:" + view); };

    var prepared = runtime.prepare(Promise.resolve(bootstrap));
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(apiCalls, 0,
        "prepare(prefetched) must not issue a second bootstrap request.");
    await prepared;

    runtime.state.nativePageEnd = 19;
    runtime.reconcileBootstrapSurfaces();
    assert.ok(menus.some(function (entry) { return entry && entry.key === "approvalcenter"; }),
        "Allowed bootstrap menu entries must reconcile once native page readiness is known.");
    assert.strictEqual(menus.some(function (entry) { return entry && entry.key === "myscripts"; }), false,
        "Denied bootstrap menu entries must not be created early.");

    var initializing = runtime.initialize(Promise.resolve());
    await Promise.resolve();
    assert.ok(loadCalls.indexOf("approvalcenter") >= 0 && loadCalls.indexOf("moverequests") >= 0 && loadCalls.indexOf("mycommands") >= 0,
        "Allowed modules must start from the same bounded parallel fan-out.");
    assert.strictEqual(loadCalls.indexOf("myscripts"), -1,
        "Denied modules must not start during early initialization.");
    Object.keys(loadResolvers).forEach(function (key) { loadResolvers[key](); });
    await initializing;

    runtime.onNativePageStart(19);
    runtime.onNativePageEnd(19);
    assert.deepStrictEqual(Array.from(lifecycle), ["start:19", "end:19"],
        "Native lifecycle callbacks must remain serialized by the one shared runtime owner.");

    console.log("Startup bootstrap, bounded module fan-out, parameter-dialog dependency and permission-safe menu readiness: OK");
}

main().catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});
