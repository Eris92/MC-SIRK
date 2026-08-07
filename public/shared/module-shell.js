(function () {
    "use strict";
    var core = window.SirkPlatformCore;
    var VIEW_MODES = {
        myscripts: 101,
        mycommands: 102,
        approvalcenter: 105,
        moverequests: 106
    };

    function buttonRow(host, items, selected, onSelect) {
        host.innerHTML = "";
        (items || []).forEach(function (item) {
            var button = document.createElement("button");
            button.type = "button";
            button.className = "mc-shared-nav-item";
            button.classList.toggle("active", String(item.key) === String(selected));
            button.textContent = (item.icon ? item.icon + " " : "") + (item.title || item.name || item.key) + (item.badge == null ? "" : " (" + item.badge + ")");
            button.onclick = function () { onSelect(item); };
            host.appendChild(button);
        });
    }

    function renderError(host, error) {
        host.innerHTML = "";
        var card = core.card("Error", error && error.message || String(error));
        card.classList.add("mc-shared-error");
        host.appendChild(card);
    }

    function renderJson(host, value) {
        host.innerHTML = "";
        var pre = document.createElement("pre");
        pre.className = "mc-shared-output";
        pre.textContent = JSON.stringify(value, null, 2);
        host.appendChild(pre);
    }

    function registerMenu(definition, open) {
        core.ensureMenu({
            mainId: "MainMenuSirkPlatform-" + definition.key,
            leftId: "LeftMenuSirkPlatform-" + definition.key,
            title: definition.menuTitle || definition.title,
            order: definition.order || definition.viewMode || 200,
            viewMode: definition.viewMode,
            icon: definition.menuIcon || "",
            open: open
        });
    }

    function routeState(view, storedPage, activePage, pageId) {
        view = Number(view);
        storedPage = String(storedPage || "");
        activePage = String(activePage || "");
        pageId = String(pageId || "");
        return {
            pluginView: view === 19,
            commandsRequested: storedPage === pageId,
            commandsActive: view === 19 && activePage === pageId
        };
    }

    function isInteractiveDeviceTitleElement(node) {
        var tag = String(node && node.tagName || "").toLowerCase();
        return tag === "a" || tag === "button" || tag === "input" ||
            tag === "select" || tag === "textarea" || tag === "script" ||
            tag === "style" || tag === "svg";
    }

    function collectDeviceTitleTextNodes(root, output) {
        output = output || [];
        if (!root || !root.childNodes) return output;
        for (var index = 0; index < root.childNodes.length; index += 1) {
            var node = root.childNodes[index];
            if (!node) continue;
            if (node.nodeType === 3 && String(node.nodeValue || "").trim()) {
                output.push(node);
            } else if (node.nodeType === 1 && !isInteractiveDeviceTitleElement(node)) {
                collectDeviceTitleTextNodes(node, output);
            }
        }
        return output;
    }

    function findDeviceTitleTextNode(root) {
        var nodes = collectDeviceTitleTextNodes(root, []);
        for (var index = 0; index < nodes.length; index += 1) {
            var value = String(nodes[index].nodeValue || "").trim();
            if (/^(?:Wtyczki|Plugins|Commands)\b/i.test(value) || value.indexOf(" - ") >= 0) {
                return nodes[index];
            }
        }
        return nodes[0] || null;
    }

    function formatDeviceTitle(nativeText, replacement) {
        var value = String(nativeText == null ? "" : nativeText);
        var leading = (value.match(/^\s*/) || [""])[0];
        var trailing = (value.match(/\s*$/) || [""])[0];
        var bodyEnd = value.length - trailing.length;
        var body = value.slice(leading.length, bodyEnd < leading.length ? leading.length : bodyEnd);
        var separator = body.indexOf(" - ");
        body = String(replacement || "Commands") + (separator >= 0 ? body.slice(separator) : "");
        return leading + body + trailing;
    }

    function createDeviceIntegration(definition, state, api, mountPage) {
        var options = definition.deviceTab || null;
        if (!options) return null;
        var pageId = options.pageId || ("sirk-platform-" + definition.key + "-device-page");
        var topTabId = options.topTabId || ("MainDevSirkPlatform-" + definition.key);
        var title = options.title || definition.title;
        var previousPageKey = "sirkPlatform.previousNativePluginPage";
        var activeKey = "sirkPlatform.commandsDeviceActive";
        var retryTimer = null;
        var retryCount = 0;
        var reconcileTimers = [];
        var mountedHost = null;
        var mountedNodeId = "";

        function currentView() {
            return typeof window.xxcurrentView === "undefined" ? 0 : Number(window.xxcurrentView);
        }
        function getStoredPage() {
            try {
                if (typeof window.getstore === "function") return String(window.getstore("_curPluginPage", "") || "");
            } catch (error) {}
            try { return String(window.localStorage.getItem("_curPluginPage") || ""); }
            catch (error2) { return ""; }
        }
        function putStoredPage(value) {
            value = String(value || "");
            try {
                if (typeof window.putstore === "function") window.putstore("_curPluginPage", value);
                else window.localStorage.setItem("_curPluginPage", value);
            } catch (error) {}
        }
        function sessionGet(key) {
            try { return String(window.sessionStorage.getItem(key) || ""); }
            catch (error) { return ""; }
        }
        function sessionSet(key, value) {
            try { window.sessionStorage.setItem(key, String(value == null ? "" : value)); }
            catch (error) {}
        }
        function headerPageId(header) {
            return String(header && header.id || "").replace(/^p19ph-/, "");
        }
        function activePageId() {
            return headerPageId(document.querySelector("#p19headers span.on") || document.querySelector("#p19headers .on"));
        }
        function nativePageFromHeaders() {
            var active = activePageId();
            if (active && active !== pageId) return active;
            var headers = document.querySelectorAll ? document.querySelectorAll("#p19headers [id^='p19ph-']") : [];
            for (var index = 0; index < headers.length; index += 1) {
                var id = headerPageId(headers[index]);
                if (id && id !== pageId) return id;
            }
            return "";
        }
        function rememberNativePage() {
            var current = getStoredPage();
            if (!current || current === pageId) current = activePageId();
            if (!current || current === pageId) current = nativePageFromHeaders();
            if (current && current !== pageId) sessionSet(previousPageKey, current);
            return current && current !== pageId ? current : "";
        }
        function previousNativePage() {
            var target = sessionGet(previousPageKey);
            if (!target || target === pageId) target = nativePageFromHeaders();
            return target === pageId ? "" : target;
        }
        function selectPluginPage(target) {
            target = String(target || "");
            var handler = window.pluginHandler;
            var header = target ? document.getElementById("p19ph-" + target) : null;
            if (header && handler && typeof handler.callPluginPage === "function") {
                handler.callPluginPage(target, header);
                return true;
            }
            return false;
        }
        function clearCommandsNestedSelection() {
            var header = document.getElementById("p19ph-" + pageId);
            var page = document.getElementById(pageId);
            if (header) header.classList.remove("on");
            if (page && page.style) page.style.display = "none";
        }
        function selectNativePage() {
            var target = previousNativePage();
            putStoredPage(target);
            sessionSet(activeKey, "0");
            if (!selectPluginPage(target)) clearCommandsNestedSelection();
            return target;
        }
        function setDeviceTitle(active) {
            var host = document.querySelector("#p19title h1") || document.getElementById("p19title");
            if (!host) return;
            var textNode = findDeviceTitleTextNode(host);
            if (!textNode) return;
            var current = String(textNode.nodeValue || "");

            if (active) {
                if (host.__sirkNativeDeviceTitleText == null ||
                    !/^\s*Commands(?:\s+-\s+|\s*$)/i.test(current)) {
                    host.__sirkNativeDeviceTitleText = current;
                }
                textNode.nodeValue = formatDeviceTitle(host.__sirkNativeDeviceTitleText, title);
            } else if (host.__sirkNativeDeviceTitleText != null) {
                textNode.nodeValue = String(host.__sirkNativeDeviceTitleText);
                try { delete host.__sirkNativeDeviceTitleText; }
                catch (error) { host.__sirkNativeDeviceTitleText = null; }
            }
        }
        function enabled() {
            if (options.enabled === false) return false;
            if (typeof options.enabled === "function" && options.enabled(state.bootstrap, api) === false) return false;
            return !(state.bootstrap && state.bootstrap.config && state.bootstrap.config.showOnDevice === false);
        }
        function registerPage() {
            if (!enabled()) return false;
            if (!window.pluginHandler || typeof window.pluginHandler.registerPluginTab !== "function") return false;
            window.pluginHandler.registerPluginTab({ tabId: pageId, tabTitle: title });
            return true;
        }
        function restoreNativeFromTab(event) {
            if (event && ((event.which === 3) || (event.button === 2))) return;
            selectNativePage();
            update(19);
            window.setTimeout(function () {
                selectNativePage();
                update(19);
            }, 0);
        }
        function hookNativePluginsTab() {
            var plugins = document.getElementById("MainDevPlugins");
            if (!plugins || plugins.__sirkModuleDeviceRoutingHooked) return;
            plugins.__sirkModuleDeviceRoutingHooked = true;
            plugins.addEventListener("mousedown", restoreNativeFromTab, true);
            plugins.addEventListener("mouseup", restoreNativeFromTab, true);
            plugins.addEventListener("click", restoreNativeFromTab, true);
            plugins.addEventListener("keypress", function (event) {
                if (event && event.key === "Enter") restoreNativeFromTab(event);
            }, true);
        }
        function ensureTopTab() {
            if (!enabled()) return false;
            var anchor = document.getElementById("MainDevTerminal") || document.getElementById("MainDevPlugins");
            if (!anchor || !anchor.parentNode) return false;
            var tab = document.getElementById(topTabId);
            if (!tab) {
                tab = document.createElement("td");
                tab.id = topTabId;
                tab.tabIndex = 0;
                tab.className = "topbar_td style3x";
                tab.textContent = title;
                tab.onmouseup = open;
                tab.onkeypress = function (event) { if (event && event.key === "Enter") return open(event); };
                anchor.parentNode.insertBefore(tab, anchor.nextSibling);
            }
            tab.style.display = "";
            hookNativePluginsTab();
            return true;
        }
        function remove() {
            reconcileTimers.forEach(function (timer) { window.clearTimeout(timer); });
            reconcileTimers = [];
            [topTabId, "p19ph-" + pageId, pageId].forEach(function (id) {
                var element = document.getElementById(id);
                if (element && element.parentNode) element.parentNode.removeChild(element);
            });
            mountedHost = null;
            mountedNodeId = "";
            setDeviceTitle(false);
        }
        function mountDevicePage(force) {
            var host = document.getElementById(pageId);
            var currentNode = String(state.nodeId || window.__SIRK_CURRENT_NODE_ID__ || window.selectedNode || "");
            if (!host) return false;
            if (force !== true && host === mountedHost && mountedNodeId === currentNode && host.childNodes && host.childNodes.length > 0) return true;
            mountPage(host, "device");
            mountedHost = host;
            mountedNodeId = currentNode;
            host.__sirkDeviceMountedNodeId = currentNode;
            return true;
        }
        function update(view) {
            var tab = document.getElementById(topTabId);
            var plugins = document.getElementById("MainDevPlugins");
            var headers = document.getElementById("p19headers");
            if (view == null) view = currentView();
            var status = routeState(view, getStoredPage(), activePageId(), pageId);
            var active = status.commandsActive;

            if (tab) {
                tab.classList.remove("style3x", "style3sel");
                tab.classList.add(active ? "style3sel" : "style3x");
            }
            if (plugins) {
                plugins.classList.remove("style3x", "style3sel");
                plugins.classList.add(status.pluginView && !active ? "style3sel" : "style3x");
                plugins.style.display = "";
            }
            if (headers) {
                if (active) headers.style.setProperty("display", "none", "important");
                else headers.style.removeProperty("display");
            }
            setDeviceTitle(active);
            document.documentElement.classList.toggle("sirk-device-commands-active", active);
            return active;
        }
        function reconcile() {
            if (!enabled()) { remove(); return false; }
            if (!registerPage()) return false;
            ensureTopTab();

            var view = currentView();
            var stored = getStoredPage();
            if (view === 19 && stored === pageId) {
                var header = document.getElementById("p19ph-" + pageId);
                if (header && activePageId() !== pageId) selectPluginPage(pageId);
                if (update(19)) mountDevicePage(false);
                return true;
            }

            if (view === 19) {
                if (activePageId() === pageId || stored === pageId) selectNativePage();
                update(19);
                return true;
            }

            if (activePageId() === pageId || stored === pageId) selectNativePage();
            update(view);
            return true;
        }
        function scheduleReconcile() {
            reconcileTimers.forEach(function (timer) { window.clearTimeout(timer); });
            reconcileTimers = [0, 25, 100, 300, 750].map(function (delay) {
                return window.setTimeout(reconcile, delay);
            });
        }
        function open(event) {
            if (event && ((event.which === 3) || (event.button === 2))) return false;
            rememberNativePage();
            sessionSet(activeKey, "1");
            registerPage();
            putStoredPage(pageId);
            if (typeof window.go === "function") window.go(19, event);
            window.setTimeout(function () {
                selectPluginPage(pageId);
                ensureTopTab();
                update(19);
                mountDevicePage(false);
                scheduleReconcile();
            }, 0);
            if (event && event.preventDefault) event.preventDefault();
            return false;
        }
        function sync() {
            if (!enabled()) { remove(); return false; }
            if (!registerPage()) {
                if (retryTimer == null && retryCount < 20) {
                    retryCount += 1;
                    retryTimer = window.setTimeout(function () {
                        retryTimer = null;
                        sync();
                    }, 500);
                }
                return false;
            }
            retryCount = 0;
            ensureTopTab();
            scheduleReconcile();
            return true;
        }
        return {
            open: open,
            sync: sync,
            update: update,
            reconcile: reconcile,
            onDeviceRefreshEnd: function (nodeId) {
                state.nodeId = String(nodeId || "");
                mountedHost = null;
                mountedNodeId = "";
                sync();
            },
            onNativePageStart: function (view) {
                if (Number(view) !== 19 && (getStoredPage() === pageId || activePageId() === pageId)) selectNativePage();
                update(view);
            },
            onNativePageEnd: function (view) {
                sync();
                scheduleReconcile();
                update(view);
            }
        };
    }

    window.SirkPlatformModuleShell = {
        routeState: routeState,
        findDeviceTitleTextNode: findDeviceTitleTextNode,
        formatDeviceTitle: formatDeviceTitle,
        create: function (definition) {
            definition.viewMode = Number(definition.viewMode || VIEW_MODES[definition.key] || 960);
            var state = {
                page: null,
                pages: {},
                tab: definition.defaultTab || "main",
                search: "",
                nodeId: "",
                bootstrap: null,
                active: false,
                opening: false
            };
            var moduleInstance = null;

            function syncCollapseControl(page) {
                if (!page || !page.toolbar || !page.layout || !page.toolbar.buttons.collapse) return;
                var collapsed = page.layout.isCollapsed();
                var control = window.SharedToolbarConfig && window.SharedToolbarConfig.definitions.collapse || {};
                page.toolbar.setIcon("collapse", collapsed ? control.expandIcon : control.icon);
                page.toolbar.setTitle("collapse", collapsed ? "Expand" : "Collapse");
            }

            function mountPage(host, mode) {
                host.innerHTML = "";
                var page = window.SharedPage.mount({
                    container: host,
                    preset: definition.preset || definition.key,
                    buttons: definition.buttons || {},
                    customButtons: definition.customButtons || [],
                    tabs: definition.tabs || [{ key: "main", title: definition.title }],
                    activeTab: state.tab,
                    handlers: {
                        onCollapse: function () { page.layout.toggleCollapsed(); syncCollapseControl(page); },
                        onRefresh: function () { state.page = page; if (definition.onRefresh) definition.onRefresh(api); else api.render(); },
                        onClear: function () { state.page = page; state.search = ""; page.toolbar.clearSearch(false); if (definition.onClear) definition.onClear(api); else api.render(); },
                        onSearch: function (value) { state.page = page; state.search = value || ""; if (definition.onSearch) definition.onSearch(state.search, api); else api.render(); },
                        onManage: function () { state.page = page; if (definition.onManage) definition.onManage(api); },
                        onSettings: function () { state.page = page; state.tab = "settings"; page.tabs.select("settings", true); },
                        onLink: function () { try { navigator.clipboard.writeText(window.location.href); } catch (error) {} },
                        onFavorites: function () { state.page = page; if (definition.onFavorites) definition.onFavorites(api); }
                    },
                    onTab: function (key) { state.page = page; state.tab = key; api.render(); }
                });
                state.pages[mode] = page;
                state.page = page;
                syncCollapseControl(page);
                api.render();
                return page;
            }

            function menuEnabled() {
                if (definition.showInMenu === false) return false;
                return !(state.bootstrap && state.bootstrap.config && state.bootstrap.config.showInMenu === false);
            }

            function setRequestedInUrl(enabled) {
                try {
                    var url = new URL(window.location.href);
                    if (enabled) url.searchParams.set("viewmode", String(definition.viewMode));
                    else if (Number(url.searchParams.get("viewmode")) === definition.viewMode) url.searchParams.delete("viewmode");
                    if (url.hash === "#") url.hash = "";
                    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
                } catch (error) {}
            }

            function isRequestedInUrl() {
                try { return Number(new URL(window.location.href).searchParams.get("viewmode")) === definition.viewMode; }
                catch (error) { return false; }
            }

            function syncMenu() {
                core.setPluginMenuActive(
                    document.getElementById("MainMenuSirkPlatform-" + definition.key),
                    document.getElementById("LeftMenuSirkPlatform-" + definition.key),
                    state.active === true
                );
            }

            function close(clearUrl) {
                if (!state.active && core.activePlugin !== moduleInstance) {
                    if (clearUrl) setRequestedInUrl(false);
                    syncMenu();
                    return;
                }
                state.active = false;
                if (core.activePlugin === moduleInstance) core.activePlugin = null;
                if (core.workspaceState && Number(core.workspaceState.viewMode) === definition.viewMode) core.restoreWorkspace();
                syncMenu();
                if (clearUrl) setRequestedInUrl(false);
            }

            function open(event) {
                if (event && ((event.which === 3) || (event.button === 2))) return false;
                if (state.opening) return false;
                state.opening = true;
                try {
                    if (typeof window.go === "function") window.go(1);
                    if (core.activePlugin && core.activePlugin !== moduleInstance && typeof core.activePlugin.close === "function") {
                        core.activePlugin.close(false);
                    }
                    if (!core.showWorkspace(definition.title, definition.viewMode, function (host) { mountPage(host, "workspace"); })) return false;
                    core.activePlugin = moduleInstance;
                    core.clearNativeMenuSelection();
                    state.active = true;
                    syncMenu();
                    if (typeof window.xxcurrentView !== "undefined") window.xxcurrentView = definition.viewMode;
                    setRequestedInUrl(true);
                    if (event && event.preventDefault) event.preventDefault();
                    return false;
                } finally {
                    state.opening = false;
                }
            }

            var api = {
                definition: definition,
                state: state,
                open: open,
                close: close,
                mount: function (host, mode) { return mountPage(host, mode || "inline"); },
                render: function () {
                    if (!state.page) return Promise.resolve();
                    var page = state.page;
                    var sequence = Number(state.renderSequence || 0) + 1;
                    state.renderSequence = sequence;
                    var realSecondary = page.secondary;
                    var realDetails = page.details;
                    var nextSecondary = document.createElement("section");
                    var nextDetails = document.createElement("section");
                    nextSecondary.className = realSecondary.className;
                    nextDetails.className = realDetails.className;
                    page.secondary = nextSecondary;
                    page.details = nextDetails;

                    function restoreReferences() {
                        if (page.secondary === nextSecondary) page.secondary = realSecondary;
                        if (page.details === nextDetails) page.details = realDetails;
                    }
                    function replaceChildren(target, source) {
                        while (target.firstChild) target.removeChild(target.firstChild);
                        while (source.firstChild) target.appendChild(source.firstChild);
                    }
                    function commit() {
                        restoreReferences();
                        if (sequence !== state.renderSequence) return;
                        replaceChildren(realSecondary, nextSecondary);
                        replaceChildren(realDetails, nextDetails);
                        if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.refresh === "function") {
                            window.MeshThemeAdapter.refresh(page.root || realDetails.parentNode);
                        }
                    }

                    var operation;
                    try { operation = definition.render(api); }
                    catch (error) {
                        restoreReferences();
                        renderError(realDetails, error);
                        return Promise.reject(error);
                    }
                    return Promise.resolve(operation).then(function () {
                        commit();
                    }).catch(function (error) {
                        restoreReferences();
                        if (sequence === state.renderSequence) renderError(realDetails, error);
                    });
                },
                api: function (asset, parameters) { return core.api(definition.key, asset, null, parameters); },
                post: function (asset, values) { return core.post(definition.key, asset, values); },
                nav: function (host, items, selected, onSelect) { buttonRow(host, items, selected, onSelect); },
                json: renderJson,
                error: renderError,
                card: core.card,
                element: core.element
            };

            var device = createDeviceIntegration(definition, state, api, mountPage);
            moduleInstance = {
                initialize: function (bootstrapState) {
                    state.bootstrap = bootstrapState || null;
                    if (state.bootstrap && state.bootstrap.config) {
                        definition.menuIcon = state.bootstrap.config.leftMenuIconUrl || state.bootstrap.config.menuIcon || definition.menuIcon;
                    }
                    if (menuEnabled()) registerMenu(definition, open);
                    syncMenu();
                    if (device) device.sync();
                    if (isRequestedInUrl()) window.setTimeout(function () { open(); }, 0);
                    return Promise.resolve();
                },
                open: open,
                close: close,
                mount: function (host, mode) { return mountPage(host, mode || "inline"); },
                render: api.render,
                api: api,
                onDeviceRefreshEnd: function (nodeId) {
                    state.nodeId = String(nodeId || "");
                    if (device) device.onDeviceRefreshEnd(nodeId);
                },
                onNativePageStart: function (view) {
                    if (state.active) close(true);
                    if (device) device.onNativePageStart(view);
                },
                onNativePageEnd: function (view) {
                    if (menuEnabled()) registerMenu(definition, open);
                    syncMenu();
                    if (device) device.onNativePageEnd(view);
                }
            };
            return moduleInstance;
        }
    };
}());
