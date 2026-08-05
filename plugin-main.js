"use strict";

var createAdmin = require("./admin.js").admin;
var VERSION = require("./config.json").version;

function errorText(error) {
    return String(error && (error.stack || error.message) || error || "Unknown SIRK Platform load error.");
}

function sendJson(res, status, value) {
    if (typeof res.status === "function") res.status(status); else res.statusCode = status;
    if (typeof res.set === "function") res.set("Content-Type", "application/json; charset=utf-8");
    else if (typeof res.setHeader === "function") res.setHeader("Content-Type", "application/json; charset=utf-8");
    if (typeof res.json === "function") res.json(value);
    else if (typeof res.send === "function") res.send(JSON.stringify(value));
    else if (typeof res.end === "function") res.end(JSON.stringify(value));
}

function createFallbackRuntime(error) {
    var message = errorText(error);
    return {
        loadError: message,
        modules: {},
        initialize: function () { return Promise.resolve(); },
        captureAgentData: function () {},
        request: function (method, moduleName, asset, req, res) {
            sendJson(res, 503, { ok: false, error: "SIRK Platform runtime failed to load." });
        },
        adminSnapshot: function () {
            return {
                plugin: { name: "SIRK Management Platform", shortName: "SIRKPortal", version: VERSION },
                modules: [],
                moduleSettings: {},
                integrations: {},
                diagnostics: { logs: "", errors: message },
                loadError: message,
                generatedAt: new Date().toISOString()
            };
        },
        saveAdminSettings: function () {
            return Promise.reject(new Error("SIRK Platform runtime failed to load: " + message));
        }
    };
}

function dataRoot(parent) {
    var path = parent.path || require("path");
    var meshServer = parent && parent.parent;
    var dataBase = meshServer && meshServer.datapath
        ? meshServer.datapath
        : path.dirname(parent.pluginPath || __dirname);
    return path.join(dataBase, "sirk-platform-data");
}

function writeLoadError(parent, error) {
    try {
        var fs = parent.fs || require("fs");
        var path = parent.path || require("path");
        var root = dataRoot(parent);
        fs.mkdirSync(root, { recursive: true });
        fs.writeFileSync(
            path.join(root, "plugin-load-error.log"),
            new Date().toISOString() + "\r\n" + errorText(error) + "\r\n",
            "utf8"
        );
    } catch (ignored) {}
}

function createSerializedStartupHook(version, pin) {
    var source = function () {
        if (typeof window === "undefined" || typeof document === "undefined") return;

        var browserVersion = "__VERSION__";
        var browserPin = "__PIN__";
        window.__SIRK_PLATFORM_VERSION__ = browserVersion;
        window.__SIRK_PLATFORM_PIN__ = browserPin;
        document.documentElement.classList.add("sirk-platform-native-ui");

        function asset(name) {
            var url = new URL("pluginadmin.ashx", window.location.href);
            url.searchParams.set("pin", browserPin);
            url.searchParams.set("asset", name);
            url.searchParams.set("v", browserVersion);
            return url.href;
        }

        function load(id, sourceUrl) {
            return new Promise(function (resolve, reject) {
                var existing = document.getElementById(id);
                if (existing) {
                    if (String(existing.src || "") !== String(sourceUrl || "")) {
                        existing.remove();
                        existing = null;
                    }
                }
                if (existing) {
                    if (existing.getAttribute("data-loaded") === "1") resolve();
                    else {
                        existing.addEventListener("load", resolve, { once: true });
                        existing.addEventListener("error", reject, { once: true });
                    }
                    return;
                }
                var script = document.createElement("script");
                script.id = id;
                script.src = sourceUrl;
                script.async = false;
                script.onload = function () { script.setAttribute("data-loaded", "1"); resolve(); };
                script.onerror = reject;
                (document.head || document.documentElement).appendChild(script);
            });
        }

        function style(id, name) {
            var href = asset(name);
            var existing = document.getElementById(id);
            if (existing && String(existing.href || "") === String(href)) return;
            if (existing) existing.remove();
            var link = document.createElement("link");
            link.id = id;
            link.rel = "stylesheet";
            link.href = href;
            (document.head || document.documentElement).appendChild(link);
        }

        function installQuickObserverScope() {
            if (window.__sirkQuickObserverScopeInstalled || typeof window.MutationObserver !== "function") return;
            window.__sirkQuickObserverScopeInstalled = true;

            var NativeMutationObserver = window.MutationObserver;
            var scopedEntries = [];

            function isQuickGlobalSource(sourceUrl) {
                return /(?:mesh-plugin-core|quick-output-state)\.js(?:[?&#]|$)/i.test(String(sourceUrl || ""));
            }

            function quickPanel() {
                return document.getElementById("SirkDesktopCommandsPanel") ||
                    document.querySelector(".sirk-desktop-commands-panel");
            }

            function removeEntry(entry) {
                var index = scopedEntries.indexOf(entry);
                if (index >= 0) scopedEntries.splice(index, 1);
            }

            function attachEntry(entry) {
                if (!entry || entry.disabled) return false;
                var panel = quickPanel();
                if (!panel || entry.panel === panel) return false;
                try {
                    entry.nativeDisconnect();
                    entry.nativeObserve(panel, entry.options);
                    entry.panel = panel;
                    return true;
                } catch (error) {
                    return false;
                }
            }

            function attachAll() {
                scopedEntries.slice().forEach(attachEntry);
            }

            function ScopedMutationObserver(callback) {
                var sourceUrl = String(document.currentScript && document.currentScript.src || "");
                var observer = new NativeMutationObserver(callback);
                if (!isQuickGlobalSource(sourceUrl)) return observer;

                var nativeObserve = observer.observe.bind(observer);
                var nativeDisconnect = observer.disconnect.bind(observer);
                var entry = null;

                observer.observe = function (target, options) {
                    if (target === document.documentElement) {
                        if (!entry) {
                            entry = {
                                observer: observer,
                                nativeObserve: nativeObserve,
                                nativeDisconnect: nativeDisconnect,
                                options: Object.assign({}, options || {}),
                                panel: null,
                                disabled: false
                            };
                            scopedEntries.push(entry);
                        } else {
                            entry.options = Object.assign({}, options || {});
                            entry.disabled = false;
                        }
                        window.setTimeout(function () { attachEntry(entry); }, 0);
                        return;
                    }
                    return nativeObserve(target, options);
                };

                observer.disconnect = function () {
                    if (entry) {
                        entry.disabled = true;
                        entry.panel = null;
                        removeEntry(entry);
                    }
                    return nativeDisconnect();
                };
                return observer;
            }

            ScopedMutationObserver.prototype = NativeMutationObserver.prototype;
            try { Object.setPrototypeOf(ScopedMutationObserver, NativeMutationObserver); }
            catch (error) {}

            window.MutationObserver = ScopedMutationObserver;
            if (window.WebKitMutationObserver === NativeMutationObserver) {
                window.WebKitMutationObserver = ScopedMutationObserver;
            }

            window.__sirkAttachQuickObservers = attachAll;
            document.addEventListener("click", function (event) {
                var target = event && event.target;
                if (!target || typeof target.closest !== "function") return;
                if (target.closest("#SirkDesktopCommandsButton,.sirk-desktop-commands-panel")) {
                    window.setTimeout(attachAll, 0);
                }
            }, true);
        }

        function installCommandsTitleSync() {
            if (window.__sirkCommandsTitleSyncInstalled) return;
            window.__sirkCommandsTitleSyncInstalled = true;
            var pageId = "sirk-platform-mycommands-device-page";
            var tabId = "MainDevSirkPlatform-Commands";

            function storedPage() {
                try {
                    if (typeof window.getstore === "function") return String(window.getstore("_curPluginPage", "") || "");
                } catch (error) {}
                try { return String(window.localStorage.getItem("_curPluginPage") || ""); }
                catch (error2) { return ""; }
            }

            function isActive() {
                if (Number(window.xxcurrentView || 0) !== 19) return false;
                var tab = document.getElementById(tabId);
                var header = document.getElementById("p19ph-" + pageId);
                var activeHeader = document.querySelector("#p19headers .on");
                return storedPage() === pageId || activeHeader === header ||
                    !!(tab && tab.classList.contains("style3sel"));
            }

            function syncNow() {
                if (!isActive()) return false;
                var host = document.querySelector("#p19title h1") || document.getElementById("p19title");
                if (!host || !host.childNodes) return false;
                for (var index = 0; index < host.childNodes.length; index += 1) {
                    var node = host.childNodes[index];
                    if (node && node.nodeType === 3 && String(node.nodeValue || "").trim()) {
                        if (String(node.nodeValue || "").trim() !== "Commands") node.nodeValue = "Commands";
                        return true;
                    }
                }
                return false;
            }

            function schedule() {
                [0, 25, 100, 300, 750].forEach(function (delay) {
                    window.setTimeout(syncNow, delay);
                });
            }

            window.__sirkScheduleCommandsTitle = schedule;
            document.addEventListener("click", function (event) {
                var target = event && event.target;
                if (!target || typeof target.closest !== "function") return;
                if (target.closest("#" + tabId + ",#MainDevPlugins")) schedule();
            }, true);
        }

        installQuickObserverScope();
        installCommandsTitleSync();

        style("sirk-platform-main-style", "main.css");
        style("sirk-platform-automation-style", "myscripts.css");
        style("sirk-platform-shared-style", "shared-ui/shared-ui.css");
        style("sirk-platform-toolbar-style", "shared-ui/toolbar.css");
        style("sirk-platform-approval-style", "native-approval.css");
        style("sirk-platform-desktop-commands-style", "desktop-commands.css");

        var scripts = [
            ["sirk-platform-core", "core.js"],
            ["sirk-platform-mesh-core", "mesh-plugin-core.js"],
            ["sirk-platform-toolbar-config", "shared-ui/toolbar-config.js"],
            ["sirk-platform-toolbar-api", "shared-ui/toolbar-api.js"],
            ["sirk-platform-toolbar", "shared-ui/toolbar.js"],
            ["sirk-platform-tabs", "shared-ui/tabs.js"],
            ["sirk-platform-layout", "shared-ui/layout.js"],
            ["sirk-platform-settings", "shared-ui/settings.js"],
            ["sirk-platform-status-nav", "shared-ui/status-nav.js"],
            ["sirk-platform-tree", "shared-ui/tree.js"],
            ["sirk-platform-catalog", "shared-ui/catalog.js"],
            ["sirk-platform-results", "shared-ui/results.js"],
            ["sirk-platform-download-results", "download-results.js"],
            ["sirk-platform-result-layout", "shared-ui/result-layout.js"],
            ["sirk-platform-script-tools", "shared-ui/script-tools.js"],
            ["sirk-platform-script-definition", "shared-ui/script-definition-form.js"],
            ["sirk-platform-confirm", "shared-ui/confirm-execution-form.js"],
            ["sirk-platform-edit-actions", "shared-ui/script-edit-actions.js"],
            ["sirk-platform-credentials", "shared-ui/system-credentials-form.js"],
            ["sirk-platform-page", "shared-ui/page.js"],
            ["sirk-platform-module-shell", "module-shell.js"],
            ["sirk-platform-runtime", "runtime.js"],
            ["sirk-platform-desktop-commands", "desktop-commands.js"],
            ["sirk-platform-quick-output-state", "quick-output-state.js"]
        ];

        scripts.reduce(function (chain, item) {
            return chain.then(function () { return load(item[0], asset(item[1])); });
        }, Promise.resolve()).then(function () {
            if (typeof window.__sirkAttachQuickObservers === "function") window.__sirkAttachQuickObservers();
            if (!window.SirkPlatformRuntime || typeof window.SirkPlatformRuntime.initialize !== "function") {
                throw new Error("SIRK Platform browser runtime was not loaded.");
            }
            return window.SirkPlatformRuntime.initialize().then(function () {
                var nodeId = String(window.__SIRK_CURRENT_NODE_ID__ || "");
                if (nodeId && typeof window.SirkPlatformRuntime.onDeviceRefreshEnd === "function") {
                    window.SirkPlatformRuntime.onDeviceRefreshEnd(nodeId);
                }
                if (typeof window.__sirkScheduleCommandsTitle === "function") window.__sirkScheduleCommandsTitle();
            });
        }).catch(function (error) {
            if (window.console) console.error("SIRK Platform browser startup failed", error);
        });
    }.toString();

    source = source
        .replace("__VERSION__", String(version).replace(/\\/g, "\\\\").replace(/\"/g, "\\\""))
        .replace("__PIN__", String(pin).replace(/\\/g, "\\\\").replace(/\"/g, "\\\""));
    return Function("return (" + source + ");")();
}

function createPlugin(parent, shortName) {
    var obj = {
        parent: parent,
        meshServer: parent && parent.parent,
        shortName: shortName || "SIRKPortal",
        exports: ["onWebUIStartupEnd", "goPageStart", "goPageEnd", "onDeviceRefreshEnd", "commandResult"]
    };

    try {
        obj.runtime = require("./server/core/runtime.js").createRuntime({
            parent: parent,
            pluginRoot: __dirname,
            source: obj
        });
    } catch (error) {
        console.error("SIRK Platform runtime creation failed", error);
        writeLoadError(parent, error);
        obj.runtime = createFallbackRuntime(error);
    }

    obj.admin = createAdmin(obj);
    obj.server_startup = function () {
        Promise.resolve(obj.runtime.initialize()).catch(function (error) {
            console.error("SIRK Platform initialization failed", error);
            writeLoadError(parent, error);
        });
    };
    obj.handleAdminReq = function (req, res, user) { return obj.admin.req(req, res, user); };
    obj.handleAdminPostReq = function (req, res, user) { return obj.admin.post(req, res, user); };
    obj.hook_processAgentData = function (command, agent) {
        if (obj.runtime && typeof obj.runtime.captureAgentData === "function") {
            obj.runtime.captureAgentData(command, agent);
        }
    };

    obj.onWebUIStartupEnd = createSerializedStartupHook(VERSION, obj.shortName);
    obj.goPageStart = function (view) {
        var runtime = typeof window === "undefined" ? null : window.SirkPlatformRuntime || null;
        if (runtime && typeof runtime.onNativePageStart === "function") runtime.onNativePageStart(view);
        if (typeof window !== "undefined" && typeof window.__sirkScheduleCommandsTitle === "function") {
            window.__sirkScheduleCommandsTitle();
        }
    };
    obj.goPageEnd = function (view) {
        var runtime = typeof window === "undefined" ? null : window.SirkPlatformRuntime || null;
        if (runtime && typeof runtime.onNativePageEnd === "function") runtime.onNativePageEnd(view);
        if (typeof window !== "undefined" && typeof window.__sirkScheduleCommandsTitle === "function") {
            window.__sirkScheduleCommandsTitle();
        }
    };
    obj.onDeviceRefreshEnd = function (nodeId) {
        if (typeof window === "undefined") return;
        var currentNodeId = String(nodeId || "");
        if (currentNodeId) window.__SIRK_CURRENT_NODE_ID__ = currentNodeId;
        var runtime = window.SirkPlatformRuntime || null;
        if (runtime && typeof runtime.onDeviceRefreshEnd === "function") {
            runtime.onDeviceRefreshEnd(currentNodeId || String(window.__SIRK_CURRENT_NODE_ID__ || ""));
        }
        if (typeof window.__sirkScheduleCommandsTitle === "function") window.__sirkScheduleCommandsTitle();
    };
    obj.commandResult = function (server, message) {
        var runtime = typeof window === "undefined" ? null : window.SirkPlatformRuntime || null;
        if (runtime && typeof runtime.commandResult === "function") runtime.commandResult(message);
    };

    return obj;
}

module.exports.createPlugin = createPlugin;
module.exports.createSerializedStartupHook = createSerializedStartupHook;
