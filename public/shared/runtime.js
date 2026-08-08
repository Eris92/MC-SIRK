(function () {
    "use strict";

    window.SirkPlatformRuntime = window.SirkPlatformRuntime || {};
    window.SirkPlatformModules = window.SirkPlatformModules || {};

    var runtime = window.SirkPlatformRuntime;
    var core = window.SirkPlatformCore;
    runtime.state = runtime.state || {};
    if (runtime.state.bootstrap == null) runtime.state.bootstrap = null;
    if (runtime.state.preparePromise == null) runtime.state.preparePromise = null;
    if (runtime.state.initializePromise == null) runtime.state.initializePromise = null;
    if (!runtime.state.modulePromises) runtime.state.modulePromises = {};
    if (runtime.state.nodeId == null) runtime.state.nodeId = "";
    if (runtime.state.nativePageStart == null) runtime.state.nativePageStart = null;
    if (runtime.state.nativePageEnd == null) runtime.state.nativePageEnd = null;

    var definitions = {
        approvalcenter: { file: "approvalcenter.js", viewMode: 105, menuOrder: 110, showInMenu: true },
        moverequests: { file: "moverequests.js", viewMode: 106, showInMenu: false },
        mycommands: { file: "mycommands.js", viewMode: 102, showInMenu: false },
        myscripts: { file: "myscripts.js", viewMode: 101, menuOrder: 160, showInMenu: true }
    };
    var order = ["approvalcenter", "moverequests", "mycommands", "myscripts"];

    function isCustomView(view) {
        view = Number(view);
        return Object.keys(definitions).some(function (key) { return definitions[key].viewMode === view; });
    }

    function notify(method) {
        var args = Array.prototype.slice.call(arguments, 1);
        Object.keys(window.SirkPlatformModules).forEach(function (key) {
            var module = window.SirkPlatformModules[key];
            if (!module || typeof module[method] !== "function") return;
            try { module[method].apply(module, args); }
            catch (error) {
                if (window.console) console.error("SirkPlatform " + key + " " + method + " failed", error);
            }
        });
    }

    function refreshQuickCommands() {
        var quick = window.SirkDesktopCommands;
        if (quick && typeof quick.refresh === "function") quick.refresh();
    }

    function moduleState(key) {
        var bootstrap = runtime.state.bootstrap;
        return bootstrap && bootstrap.modules ? bootstrap.modules[key] : null;
    }

    function canLoad(state) {
        return !!(state && state.enabled && state.ready !== false);
    }

    function canMountMenu(key, state) {
        var definition = definitions[key];
        if (!definition || definition.showInMenu === false || !canLoad(state)) return false;
        if (!state.access || state.access.allowed !== true) return false;
        return !(state.config && state.config.showInMenu === false);
    }

    function configureModule(key, module) {
        var definition = definitions[key];
        if (!definition || !module || !module.api || !module.api.definition) return;
        module.api.definition.viewMode = definition.viewMode || module.api.definition.viewMode || 960;
    }

    function replayNativeLifecycle(module) {
        if (!module) return;
        if (runtime.state.nativePageStart != null && typeof module.onNativePageStart === "function") {
            module.onNativePageStart(runtime.state.nativePageStart);
        }
        if (runtime.state.nodeId && typeof module.onDeviceRefreshEnd === "function") {
            module.onDeviceRefreshEnd(runtime.state.nodeId);
        }
        if (runtime.state.nativePageEnd != null && typeof module.onNativePageEnd === "function") {
            module.onNativePageEnd(runtime.state.nativePageEnd);
        }
    }

    function ensureModule(key) {
        if (runtime.state.modulePromises[key]) return runtime.state.modulePromises[key];
        var state = moduleState(key);
        var definition = definitions[key];
        if (!definition || !canLoad(state)) return Promise.resolve(null);

        runtime.state.modulePromises[key] = core.loadScript(
            "sirk-platform-module-" + key,
            core.assetUrl("", definition.file)
        ).then(function () {
            var module = window.SirkPlatformModules[key];
            configureModule(key, module);
            if (!module || typeof module.initialize !== "function") return null;
            return Promise.resolve(module.initialize(state)).then(function () {
                replayNativeLifecycle(module);
                return module;
            });
        });
        return runtime.state.modulePromises[key];
    }

    function deferredOpen(key, event) {
        if (event && ((event.which === 3) || (event.button === 2))) return false;
        if (event && event.preventDefault) event.preventDefault();
        runtime.initialize().then(function () {
            var module = window.SirkPlatformModules[key];
            if (module && typeof module.open === "function") module.open();
        }).catch(function (error) {
            if (window.console) console.error("SirkPlatform " + key + " open failed", error);
        });
        return false;
    }

    function mountBootstrapMenu(key, state) {
        if (!canMountMenu(key, state)) return;
        var definition = definitions[key];
        var config = state.config || {};
        core.ensureMenu({
            mainId: "MainMenuSirkPlatform-" + key,
            leftId: "LeftMenuSirkPlatform-" + key,
            title: config.menuTitle || config.name || key,
            order: definition.menuOrder || definition.viewMode || 200,
            viewMode: definition.viewMode,
            icon: config.leftMenuIconUrl || config.menuIcon || "",
            open: function (event) { return deferredOpen(key, event); }
        });
    }

    function mountBootstrapMenus(bootstrap) {
        order.forEach(function (key) {
            mountBootstrapMenu(key, bootstrap.modules && bootstrap.modules[key]);
        });
    }

    runtime.refreshMenus = function () {
        notify("refreshMenu");
    };

    runtime.prepare = function () {
        if (runtime.state.preparePromise) return runtime.state.preparePromise;
        runtime.state.preparePromise = core.api("", "bootstrap").then(function (bootstrap) {
            runtime.state.bootstrap = bootstrap;
            runtime.state.nodeId = String(runtime.state.nodeId || window.__SIRK_CURRENT_NODE_ID__ || "");
            if (window.__SIRK_LAST_NATIVE_PAGE_START__ != null) runtime.state.nativePageStart = window.__SIRK_LAST_NATIVE_PAGE_START__;
            if (window.__SIRK_LAST_NATIVE_PAGE_END__ != null) runtime.state.nativePageEnd = window.__SIRK_LAST_NATIVE_PAGE_END__;
            mountBootstrapMenus(bootstrap);
            return bootstrap;
        }).catch(function (error) {
            runtime.state.preparePromise = null;
            throw error;
        });
        return runtime.state.preparePromise;
    };

    runtime.initialize = function (dependenciesReady) {
        if (runtime.state.initializePromise) return runtime.state.initializePromise;
        runtime.state.initializePromise = Promise.all([
            runtime.prepare(),
            dependenciesReady ? Promise.resolve(dependenciesReady) : Promise.resolve()
        ]).then(function () {
            return Promise.all(order.map(function (key) { return ensureModule(key); }));
        }).catch(function (error) {
            runtime.state.initializePromise = null;
            throw error;
        });
        return runtime.state.initializePromise;
    };

    runtime.onNativePageStart = function (view) {
        runtime.state.nativePageStart = view;
        if (view != null && !isCustomView(view) && !(Number(view) === 1 && core.workspaceState)) {
            core.restoreWorkspace();
        }
        notify("onNativePageStart", view);
    };

    runtime.onNativePageEnd = function (view) {
        runtime.state.nativePageEnd = view;
        if (view != null && !isCustomView(view) && !(Number(view) === 1 && core.workspaceState)) {
            core.restoreWorkspace();
        }
        if (core.workspaceState && typeof core.activateMenu === "function") {
            core.activateMenu(core.workspaceState.viewMode);
        }
        notify("onNativePageEnd", view);
        refreshQuickCommands();
    };

    runtime.onDeviceRefreshEnd = function (nodeId) {
        runtime.state.nodeId = String(nodeId || "");
        notify("onDeviceRefreshEnd", runtime.state.nodeId);
        refreshQuickCommands();
    };

    runtime.commandResult = function (message) {
        notify("commandResult", message);
    };
}());
