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
    if (runtime.state.dependenciesReady == null) runtime.state.dependenciesReady = null;
    if (!runtime.state.modulePromises) runtime.state.modulePromises = {};
    if (runtime.state.nodeId == null) runtime.state.nodeId = "";
    if (runtime.state.nativePageStart == null) runtime.state.nativePageStart = null;
    if (runtime.state.nativePageEnd == null) runtime.state.nativePageEnd = null;

    var definitions = {
        approvalcenter: { file: "approvalcenter.js", title: "Approval Center", viewMode: 105, menuOrder: 110, showInMenu: true },
        moverequests: {
            file: "moverequests.js",
            title: "Move Requests",
            viewMode: 106,
            showInMenu: false,
            hostAction: {
                id: "MoveRequestHostButton",
                legacyIds: ["MainDevSirkPlatform-MoveRequest"],
                title: "Move Request",
                tooltip: "Submit a device move request",
                anchorLabels: ["share", "udostępnij", "udostepnij", "chat", "czat"]
            }
        },
        mycommands: { file: "mycommands.js", title: "My Commands", viewMode: 102, showInMenu: false },
        myscripts: { file: "myscripts.js", title: "My Scripts", viewMode: 101, menuOrder: 160, showInMenu: true }
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
        return !!(state && state.enabled && state.ready !== false && state.access && state.access.allowed === true);
    }

    function canMountMenu(key, state) {
        var definition = definitions[key];
        if (!definition || definition.showInMenu === false || !canLoad(state)) return false;
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
            title: definition.title || config.menuTitle || config.name || key,
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

    function removeElement(id) {
        var element = document.getElementById(id);
        if (element && element.parentNode) element.parentNode.removeChild(element);
    }

    function hostActionButtonText(button) {
        return String(button && (button.value || button.textContent) || "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function deferredHostAction(key, event) {
        if (event && ((event.which === 3) || (event.button === 2))) return false;
        if (event && event.preventDefault) event.preventDefault();
        if (event && event.stopPropagation) event.stopPropagation();

        Promise.resolve(runtime.state.dependenciesReady || Promise.resolve()).then(function () {
            return ensureModule(key);
        }).then(function (module) {
            if (module && typeof module.openHostAction === "function") {
                module.openHostAction(runtime.state.nodeId);
            }
        }).catch(function (error) {
            if (window.console) console.error("SirkPlatform " + key + " host action failed", error);
        });
        return false;
    }

    function mountBootstrapHostAction(key, state) {
        var definition = definitions[key];
        var action = definition && definition.hostAction;
        if (!action) return false;

        (action.legacyIds || []).forEach(removeElement);
        var config = state && state.config || {};
        if (!canLoad(state) || config.hostButtonEnabled === false) {
            removeElement(action.id);
            return false;
        }

        var host = document.getElementById("p10html") || document.getElementById("p10");
        if (!host) return false;

        var existing = document.getElementById(action.id);
        if (existing && host.contains(existing)) {
            if (String(existing.tagName || "").toLowerCase() === "input") existing.value = action.title;
            else existing.textContent = action.title;
            existing.title = action.tooltip || action.title;
            existing.disabled = false;
            existing.removeAttribute("onclick");
            existing.removeAttribute("onmouseup");
            existing.onclick = function (event) { return deferredHostAction(key, event); };
            return true;
        }
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

        var buttons = host.querySelectorAll('input[type="button"],button');
        var labels = action.anchorLabels || [];
        var anchor = null;
        var fallback = null;
        for (var index = 0; index < buttons.length; index += 1) {
            var value = hostActionButtonText(buttons[index]);
            fallback = buttons[index];
            if (labels.indexOf(value) >= 0) {
                anchor = buttons[index];
                if (value === "share" || value === "udostępnij" || value === "udostepnij") break;
            }
        }
        anchor = anchor || fallback;
        if (!anchor || !anchor.parentNode) return false;

        var button = anchor.cloneNode(false);
        button.id = action.id;
        button.type = "button";
        if (String(button.tagName || "").toLowerCase() === "input") button.value = action.title;
        else button.textContent = action.title;
        button.title = action.tooltip || action.title;
        button.disabled = false;
        button.setAttribute("data-meshcentral-plugin-pin", "SirkPlatform");
        button.setAttribute("data-meshcentral-plugin-click", action.title + " host action");
        button.removeAttribute("onclick");
        button.removeAttribute("onmouseup");
        button.onclick = function (event) { return deferredHostAction(key, event); };
        anchor.parentNode.insertBefore(button, anchor.nextSibling);
        return true;
    }

    function mountBootstrapHostActions(bootstrap) {
        order.forEach(function (key) {
            mountBootstrapHostAction(key, bootstrap.modules && bootstrap.modules[key]);
        });
    }

    function reconcileBootstrapSurfaces() {
        var bootstrap = runtime.state.bootstrap;
        if (!bootstrap) return;
        mountBootstrapMenus(bootstrap);
        mountBootstrapHostActions(bootstrap);
    }

    runtime.refreshMenus = function () {
        reconcileBootstrapSurfaces();
        notify("refreshMenu");
    };

    runtime.prepare = function (bootstrapReady) {
        if (runtime.state.preparePromise) return runtime.state.preparePromise;

        var bootstrapSource = bootstrapReady || window.__SIRK_PLATFORM_BOOTSTRAP_PROMISE__;
        if (!bootstrapSource) {
            bootstrapSource = core.api("", "bootstrap");
            window.__SIRK_PLATFORM_BOOTSTRAP_PROMISE__ = bootstrapSource;
        }

        runtime.state.preparePromise = Promise.resolve(bootstrapSource).then(function (bootstrap) {
            runtime.state.bootstrap = bootstrap;
            runtime.state.nodeId = String(runtime.state.nodeId || window.__SIRK_CURRENT_NODE_ID__ || "");
            if (window.__SIRK_LAST_NATIVE_PAGE_START__ != null) runtime.state.nativePageStart = window.__SIRK_LAST_NATIVE_PAGE_START__;
            if (window.__SIRK_LAST_NATIVE_PAGE_END__ != null) runtime.state.nativePageEnd = window.__SIRK_LAST_NATIVE_PAGE_END__;
            reconcileBootstrapSurfaces();
            return bootstrap;
        }).catch(function (error) {
            if (window.__SIRK_PLATFORM_BOOTSTRAP_PROMISE__ === bootstrapSource) {
                window.__SIRK_PLATFORM_BOOTSTRAP_PROMISE__ = null;
            }
            runtime.state.preparePromise = null;
            throw error;
        });
        return runtime.state.preparePromise;
    };

    runtime.initialize = function (dependenciesReady) {
        if (dependenciesReady && !runtime.state.dependenciesReady) {
            runtime.state.dependenciesReady = Promise.resolve(dependenciesReady);
        }
        if (runtime.state.initializePromise) return runtime.state.initializePromise;

        runtime.state.initializePromise = Promise.all([
            runtime.prepare(),
            runtime.state.dependenciesReady || Promise.resolve()
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
        reconcileBootstrapSurfaces();
        notify("onNativePageEnd", view);
        refreshQuickCommands();
    };

    runtime.onDeviceRefreshEnd = function (nodeId) {
        runtime.state.nodeId = String(nodeId || "");
        reconcileBootstrapSurfaces();
        notify("onDeviceRefreshEnd", runtime.state.nodeId);
        refreshQuickCommands();
    };

    runtime.commandResult = function (message) {
        notify("commandResult", message);
    };
}());
