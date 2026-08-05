(function () {
    "use strict";

    function svg(path) { return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>'; }

    var definitions = {
        collapse: { title: "Collapse", icon: svg('<path d="m15 18-6-6 6-6"/>'), expandIcon: svg('<path d="m9 18 6-6-6-6"/>'), side: "left", order: 10, handler: "onCollapse" },
        favorites: { title: "Favorites", icon: svg('<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>'), side: "left", order: 20, handler: "onFavorites" },
        link: { title: "Copy link", icon: svg('<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>'), side: "left", order: 30, handler: "onLink" },
        manage: { title: "Edit", icon: svg('<path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>'), side: "left", order: 40, handler: "onManage" },
        refresh: { title: "Refresh", icon: svg('<path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M6.1 8A7 7 0 0 1 18 6l2 5M4 13l2 5a7 7 0 0 0 11.9-2"/>'), side: "left", order: 50, handler: "onRefresh" },
        multi: { title: "Multi-device execution", icon: svg('<circle cx="12" cy="12" r="8"/><path d="m9 12 2 2 4-5"/>'), side: "left", order: 60, handler: "onMulti" },
        search: { title: "Search", icon: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'), side: "left", order: 70, handler: "onSearchToggle", search: true },
        clear: { title: "Clear", icon: svg('<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/>'), side: "right", order: 110, handler: "onClear" },
        settings: { title: "Settings", icon: svg('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5L9 6.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 3.1h5l.4-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2.1-1.5a7 7 0 0 0 .1-1Z"/>'), side: "right", order: 140, handler: "onSettings" }
    };

    var presets = {
        myscripts: { collapse: true, favorites: true, link: false, manage: true, refresh: true, multi: true, search: true, clear: false, settings: false },
        mycommands: { collapse: true, favorites: true, link: true, manage: true, refresh: true, multi: true, search: true, clear: false, settings: false },
        standard: { collapse: false, link: true, manage: false, refresh: true, multi: false, search: true, clear: false, favorites: false, settings: true },
        minimal: { collapse: false, refresh: true, search: true }
    };

    function clone(value) {
        var result = {};
        Object.keys(value || {}).forEach(function (key) { result[key] = value[key]; });
        return result;
    }

    function language() {
        try { return window.localStorage.getItem("sirkPortal.language") === "en" ? "en" : "pl"; }
        catch (error) { return "pl"; }
    }

    function myScriptsShell() {
        var module = window.SirkPlatformModules && window.SirkPlatformModules.myscripts;
        return module && module.api || null;
    }

    function currentNode(shell) {
        return String(
            shell && shell.state && shell.state.nodeId ||
            window.SirkPlatformRuntime && window.SirkPlatformRuntime.state && window.SirkPlatformRuntime.state.nodeId ||
            window.selectedNode ||
            ""
        );
    }

    function renderMultiSummary(shell, script, response) {
        var host = shell && shell.state && shell.state.page && shell.state.page.details;
        if (!host) return response;
        host.innerHTML = "";
        var polish = language() === "pl";
        var card = shell.card(
            polish ? "Wynik wykonania na wielu urządzeniach" : "Multi-device result",
            script && (script.label || script.name || script.path) || ""
        );
        card.classList.add("mc-multi-editor-card");
        var pre = document.createElement("pre");
        pre.className = "mc-shared-output";
        pre.textContent = JSON.stringify({
            total: Number(response && response.total) || 0,
            submitted: Number(response && response.submitted) || 0,
            pending: Number(response && response.pending) || 0,
            failed: Number(response && response.failed) || 0
        }, null, 2);
        card.appendChild(pre);
        if (response && Number(response.failed) > 0) card.classList.add("mc-shared-error");
        host.appendChild(card);
        return response;
    }

    var myScriptsTools = null;

    function runMyScriptsMulti(script) {
        var shell = myScriptsShell();
        if (!shell || !myScriptsTools || !script || script.multiHost !== true) return;
        myScriptsTools.openMultiExecution(shell, script, currentNode(shell), function (ids) {
            return shell.post("multi-execute", {
                nodeIds: ids,
                scriptPath: script.path,
                label: script.label || script.name || script.path,
                variableValues: {},
                confirmedExecution: script.confirmExecution === true,
                language: language(),
                note: ""
            }).then(function (response) {
                myScriptsTools.state.multiPickMode = false;
                if (shell.state.page && shell.state.page.toolbar) {
                    shell.state.page.toolbar.setActive("multi", false);
                }
                return renderMultiSummary(shell, script, response);
            });
        });
    }

    function installMyScriptsTools(value) {
        if (!value || typeof value.create !== "function" || value.__sirkMyScriptsMultiWrapped) return;
        value.__sirkMyScriptsMultiWrapped = true;
        var originalCreate = value.create;
        value.create = function (options) {
            var tools = originalCreate.call(value, options);
            if (!options || options.storageKey !== "sirkPlatform.myscripts.preferences") return tools;
            myScriptsTools = tools;

            var originalSyncToolbar = tools.syncToolbar;
            tools.syncToolbar = function (toolbar, mode, selectedScript, config) {
                var effective = clone(config || {});
                effective.enableMulti = true;
                return originalSyncToolbar.call(tools, toolbar, mode, selectedScript, effective);
            };

            var originalScriptActions = tools.scriptActions;
            tools.scriptActions = function (script, config) {
                var effective = clone(config || {});
                effective.enableMulti = !!(script && script.multiHost === true);
                if (effective.enableMulti && typeof effective.onMulti !== "function") {
                    effective.onMulti = runMyScriptsMulti;
                }
                return originalScriptActions.call(tools, script, effective);
            };
            return tools;
        };
    }

    function installMyScriptsModuleShell(value) {
        if (!value || typeof value.create !== "function" || value.__sirkMyScriptsMultiWrapped) return;
        value.__sirkMyScriptsMultiWrapped = true;
        var originalCreate = value.create;
        value.create = function (definition) {
            if (!definition || definition.key !== "myscripts") {
                return originalCreate.call(value, definition);
            }
            var effective = clone(definition);
            effective.buttons = clone(definition.buttons || {});
            effective.buttons.multi = {
                title: "Multi-device execution",
                side: "left",
                order: 60,
                onClick: function (toolbar) {
                    if (!myScriptsTools) return;
                    myScriptsTools.toggleMulti(toolbar, function () {
                        var shell = myScriptsShell();
                        if (shell && typeof shell.render === "function") shell.render();
                    });
                }
            };
            return originalCreate.call(value, effective);
        };
    }

    function interceptGlobal(name, installer) {
        var stored = window[name];
        if (stored) {
            installer(stored);
            return;
        }
        try {
            Object.defineProperty(window, name, {
                configurable: true,
                enumerable: true,
                get: function () { return stored; },
                set: function (value) {
                    stored = value;
                    installer(value);
                }
            });
        } catch (error) {
            var attempts = 0;
            var timer = window.setInterval(function () {
                attempts += 1;
                if (window[name]) {
                    window.clearInterval(timer);
                    installer(window[name]);
                } else if (attempts >= 100) window.clearInterval(timer);
            }, 25);
        }
    }

    window.SharedToolbarConfig = {
        definitions: definitions,
        presets: presets,
        resolve: function (preset, overrides) {
            var source = clone(presets[preset] || presets.standard);
            Object.keys(overrides || {}).forEach(function (key) { source[key] = overrides[key]; });
            return Object.keys(source).map(function (key) {
                var value = source[key];
                if (value === false || value == null) return null;
                var item = clone(definitions[key] || { title: key, icon: key, side: "right", order: 500 });
                item.key = key;
                if (typeof value === "object") Object.keys(value).forEach(function (name) { item[name] = value[name]; });
                return item;
            }).filter(Boolean).sort(function (a, b) {
                if (a.side !== b.side) return a.side === "left" ? -1 : 1;
                return Number(a.order) - Number(b.order);
            });
        }
    };

    interceptGlobal("SharedScriptTools", installMyScriptsTools);
    interceptGlobal("SirkPlatformModuleShell", installMyScriptsModuleShell);
}());
