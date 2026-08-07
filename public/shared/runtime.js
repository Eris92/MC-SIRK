(function () {
    "use strict";

    window.SirkPlatformRuntime = window.SirkPlatformRuntime || {};
    window.SirkPlatformModules = window.SirkPlatformModules || {};

    var runtime = window.SirkPlatformRuntime;
    var core = window.SirkPlatformCore;
    runtime.state = runtime.state || { bootstrap: null, initializePromise: null, nodeId: "" };

    var files = {
        approvalcenter: "approvalcenter.js",
        moverequests: "moverequests.js",
        mycommands: "mycommands.js",
        myscripts: "myscripts.js"
    };
    var order = ["approvalcenter", "moverequests", "mycommands", "myscripts"];
    var viewModes = { approvalcenter: 105, myscripts: 101, mycommands: 102, moverequests: 106 };

    function isCustomView(view) {
        view = Number(view);
        return Object.keys(viewModes).some(function (key) { return viewModes[key] === view; });
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

    function configureModule(key, module) {
        if (!module || !module.api || !module.api.definition) return;
        module.api.definition.viewMode = viewModes[key] || module.api.definition.viewMode || 960;
    }

    runtime.initialize = function () {
        if (runtime.state.initializePromise) return runtime.state.initializePromise;
        runtime.state.initializePromise = core.api("", "bootstrap").then(function (bootstrap) {
            runtime.state.bootstrap = bootstrap;
            var chain = Promise.resolve();

            order.forEach(function (key) {
                var state = bootstrap.modules[key];
                if (!state || !state.enabled || state.ready === false) return;
                chain = chain.then(function () {
                    return core.loadScript("sirk-platform-module-" + key, core.assetUrl("", files[key]));
                }).then(function () {
                    var module = window.SirkPlatformModules[key];
                    configureModule(key, module);
                    if (!module || typeof module.initialize !== "function") return null;
                    return Promise.resolve(module.initialize(state)).then(function () {
                        if (runtime.state.nodeId && typeof module.onDeviceRefreshEnd === "function") {
                            module.onDeviceRefreshEnd(runtime.state.nodeId);
                        }
                    });
                });
            });

            return chain;
        }).catch(function (error) {
            runtime.state.initializePromise = null;
            throw error;
        });
        return runtime.state.initializePromise;
    };

    runtime.onNativePageStart = function (view) {
        if (view != null && !isCustomView(view) && !(Number(view) === 1 && core.workspaceState)) {
            core.restoreWorkspace();
        }
        notify("onNativePageStart", view);
    };

    runtime.onNativePageEnd = function (view) {
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
