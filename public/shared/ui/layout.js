(function () {
    "use strict";

    var SHARED_SCRIPT_LAYOUT_KEY = "sirkPlatform.layout.shared-script-columns.collapsed";
    var SHARED_PAGE_CLASSES = [
        "mc-shared-page-approvalcenter",
        "mc-shared-page-mycommands",
        "mc-shared-page-myscripts"
    ];

    function div(name) {
        var value = document.createElement("div");
        value.className = name;
        return value;
    }

    function pageHost(host) {
        if (!host || typeof host.closest !== "function") return null;
        return host.closest(".mc-shared-page");
    }

    function usesSharedScriptColumns(page) {
        if (!page || !page.classList) return false;
        return SHARED_PAGE_CLASSES.some(function (name) {
            return page.classList.contains(name);
        });
    }

    function installSharedColumnAlignment() {
        if (document.getElementById("sirk-shared-column-alignment")) return;
        var style = document.createElement("style");
        style.id = "sirk-shared-column-alignment";
        style.textContent = [
            ".mc-shared-page:is(.mc-shared-page-approvalcenter,.mc-shared-page-mycommands,.mc-shared-page-myscripts){--sirk-shared-primary-track:220px;--sirk-primary-collapsed-track:64px;--sirk-shared-secondary-track:minmax(240px,340px);--sirk-shared-details-track:minmax(420px,1fr)}",
            ".mc-shared-page:is(.mc-shared-page-approvalcenter,.mc-shared-page-mycommands,.mc-shared-page-myscripts) .mc-shared-layout-host{width:100%;margin:0!important;padding:0!important;box-sizing:border-box}",
            ".mc-shared-page:is(.mc-shared-page-approvalcenter,.mc-shared-page-mycommands,.mc-shared-page-myscripts) .mc-shared-layout{width:100%;margin:0!important;grid-template-columns:var(--sirk-shared-primary-track) var(--sirk-shared-secondary-track) var(--sirk-shared-details-track)!important}",
            ".mc-shared-page:is(.mc-shared-page-approvalcenter,.mc-shared-page-mycommands,.mc-shared-page-myscripts) .mc-shared-layout.is-collapsed{grid-template-columns:var(--sirk-primary-collapsed-track) var(--sirk-shared-secondary-track) var(--sirk-shared-details-track)!important}",
            "@media(max-width:1000px){.mc-shared-page:is(.mc-shared-page-approvalcenter,.mc-shared-page-mycommands,.mc-shared-page-myscripts){--sirk-shared-primary-track:190px;--sirk-shared-secondary-track:minmax(210px,300px);--sirk-shared-details-track:minmax(360px,1fr)}}",
            "@media(max-width:800px){.mc-shared-page:is(.mc-shared-page-approvalcenter,.mc-shared-page-mycommands,.mc-shared-page-myscripts) .mc-shared-layout,.mc-shared-page:is(.mc-shared-page-approvalcenter,.mc-shared-page-mycommands,.mc-shared-page-myscripts) .mc-shared-layout.is-collapsed{grid-template-columns:1fr!important}}"
        ].join("");
        (document.head || document.documentElement).appendChild(style);
    }

    function migrateSharedStorage(key) {
        if (!key || key === SHARED_SCRIPT_LAYOUT_KEY) return;
        try {
            if (window.localStorage.getItem(SHARED_SCRIPT_LAYOUT_KEY) != null) return;
            var legacy = window.localStorage.getItem(key);
            if (legacy === "collapsed" || legacy === "expanded") {
                window.localStorage.setItem(SHARED_SCRIPT_LAYOUT_KEY, legacy);
            }
        } catch (error) {}
    }

    function storageKey(host, requestedKey) {
        var page = pageHost(host);
        if (!usesSharedScriptColumns(page)) return requestedKey || "";
        migrateSharedStorage(requestedKey);
        return SHARED_SCRIPT_LAYOUT_KEY;
    }

    function registry() {
        window.__sirkSharedScriptLayouts = window.__sirkSharedScriptLayouts || [];
        return window.__sirkSharedScriptLayouts;
    }

    function registerSharedLayout(entry) {
        var list = registry();
        for (var index = list.length - 1; index >= 0; index--) {
            if (!list[index] || list[index].root === entry.root) list.splice(index, 1);
        }
        list.push(entry);
    }

    function syncSharedLayouts(collapsed, source) {
        registry().slice().forEach(function (entry) {
            if (!entry || entry === source || typeof entry.apply !== "function") return;
            entry.apply(collapsed);
        });
    }

    window.SharedLayout = {
        mount: function (options) {
            options = options || {};
            installSharedColumnAlignment();

            var host = typeof options.container === "string"
                ? document.querySelector(options.container)
                : options.container;
            var page = pageHost(host);
            var sharedColumns = usesSharedScriptColumns(page);
            var root = div("mc-shared-layout");
            var primary = div("mc-shared-primary");
            var secondary = div("mc-shared-secondary");
            var details = div("mc-shared-details");
            var key = storageKey(host, options.storageKey || "");
            var collapsed = false;
            var sharedEntry = null;

            try {
                collapsed = key && window.localStorage.getItem(key) === "collapsed";
            } catch (error) {}

            function applyCollapsed(value) {
                collapsed = value === true;
                root.classList.toggle("is-collapsed", collapsed);
                root.setAttribute("data-collapsed", collapsed ? "1" : "0");
                return collapsed;
            }

            function setCollapsed(value) {
                applyCollapsed(value);
                try {
                    if (key) window.localStorage.setItem(key, collapsed ? "collapsed" : "expanded");
                } catch (error) {}
                if (sharedColumns) syncSharedLayouts(collapsed, sharedEntry);
                return collapsed;
            }

            root.appendChild(primary);
            root.appendChild(secondary);
            root.appendChild(details);
            host.appendChild(root);
            applyCollapsed(collapsed);

            if (sharedColumns) {
                sharedEntry = { root: root, apply: applyCollapsed };
                registerSharedLayout(sharedEntry);
            }

            return {
                root: root,
                primary: primary,
                secondary: secondary,
                details: details,
                isCollapsed: function () { return collapsed; },
                setCollapsed: setCollapsed,
                toggleCollapsed: function () { return setCollapsed(!collapsed); },
                clear: function () {
                    primary.innerHTML = "";
                    secondary.innerHTML = "";
                    details.innerHTML = "";
                }
            };
        }
    };

    function installStableModuleRendering() {
        if (window.__sirkStableModuleRenderingInstalled) return true;
        var shell = window.SirkPlatformModuleShell;
        if (!shell || typeof shell.create !== "function") return false;
        window.__sirkStableModuleRenderingInstalled = true;

        var originalCreate = shell.create;
        shell.create = function (definition) {
            definition = definition || {};
            var originalDefinitionRender = definition.render;
            var renderRunning = false;
            var renderQueued = false;
            var renderPromise = Promise.resolve();

            if (typeof originalDefinitionRender === "function") {
                definition.render = function (api) {
                    if (renderRunning) {
                        renderQueued = true;
                        return renderPromise;
                    }

                    renderRunning = true;
                    renderPromise = Promise.resolve().then(function () {
                        return originalDefinitionRender(api);
                    }).then(function (value) {
                        renderRunning = false;
                        if (renderQueued) {
                            renderQueued = false;
                            return definition.render(api);
                        }
                        return value;
                    }, function (error) {
                        renderRunning = false;
                        if (renderQueued) {
                            renderQueued = false;
                            return definition.render(api);
                        }
                        throw error;
                    });
                    return renderPromise;
                };
            }

            var instance = originalCreate.call(shell, definition);
            var api = instance && instance.api;
            if (!api || typeof api.render !== "function") return instance;

            var originalRender = api.render;
            var scheduled = false;
            var scheduledPromise = Promise.resolve();

            function invokeRender(args) {
                var page = api.state && api.state.page;
                var layout = page && page.layout;
                var clear = layout && layout.clear;

                if (typeof clear === "function") layout.clear = function () {};
                try {
                    return originalRender.apply(api, args || []);
                } finally {
                    if (typeof clear === "function") layout.clear = clear;
                }
            }

            function stableRender() {
                var args = Array.prototype.slice.call(arguments);
                if (scheduled) return scheduledPromise;
                scheduled = true;
                scheduledPromise = Promise.resolve().then(function () {
                    scheduled = false;
                    return invokeRender(args);
                });
                return scheduledPromise;
            }

            stableRender.__sirkStableRender = true;
            stableRender.originalRender = originalRender;
            api.render = stableRender;
            instance.render = stableRender;
            return instance;
        };
        return true;
    }

    if (!installStableModuleRendering()) {
        var attempts = 0;
        (function retryStableRendering() {
            attempts += 1;
            if (installStableModuleRendering() || attempts >= 40) return;
            window.setTimeout(retryStableRendering, 0);
        }());
    }
}());
