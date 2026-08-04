(function () {
    "use strict";

    window.MeshPluginCore = window.MeshPluginCore || {};
    window.SirkPlatformCore = window.SirkPlatformCore || {};

    var meshCore = window.MeshPluginCore;
    var sirkCore = window.SirkPlatformCore;

    if (meshCore !== sirkCore) {
        var initialOwner = meshCore.activePlugin || sirkCore.activePlugin || null;
        meshCore.activePlugin = initialOwner;

        Object.defineProperty(sirkCore, "activePlugin", {
            configurable: true,
            enumerable: true,
            get: function () {
                return meshCore.activePlugin || null;
            },
            set: function (value) {
                meshCore.activePlugin = value || null;
            }
        });
    }

    if (!sirkCore.__nativeMenuContractInstalled) {
        sirkCore.__nativeMenuContractInstalled = true;

        sirkCore.setPluginMenuActive = function (main, left, active) {
            if (main) {
                main.classList.remove("fullselect", "semiselect", "active");
                main.removeAttribute("aria-current");
                if (active) {
                    main.classList.add("fullselect");
                    main.setAttribute("aria-current", "page");
                }
            }
            if (left) {
                left.classList.remove("lbbuttonsel", "lbbuttonsel2", "active");
                left.removeAttribute("aria-current");
                if (active) {
                    left.classList.add("lbbuttonsel2");
                    left.setAttribute("aria-current", "page");
                }
            }
        };

        var originalEnsureMenu = sirkCore.ensureMenu;
        if (typeof originalEnsureMenu === "function") {
            sirkCore.ensureMenu = function (definition) {
                var result = originalEnsureMenu.call(sirkCore, definition);
                var left = definition && definition.leftId && typeof document !== "undefined"
                    ? document.getElementById(definition.leftId)
                    : null;
                if (left) {
                    left.classList.remove("active");
                    var image = left.querySelector("img.sirk-platform-menu-icon");
                    if (image) {
                        image.style.width = "40px";
                        image.style.height = "40px";
                        image.style.objectFit = "contain";
                        image.style.display = "block";
                        image.style.margin = "auto";
                    }
                }
                return result;
            };
        }
    }

    function installQuickCommandsLayoutContract() {
        if (typeof document === "undefined" || typeof document.createElement !== "function" || sirkCore.__quickCommandsLayoutContractInstalled) return;
        sirkCore.__quickCommandsLayoutContractInstalled = true;

        var COLLAPSED_KEY = "mc-sirk-quickcommands-first-collapsed";
        var LEGACY_COLLAPSED_KEYS = [
            "mc-sirk-quickcommands-collapsed",
            "sirkPlatform.quickcommands.collapsed"
        ];
        var DETAILS_PREFERRED_KEY = "mc-sirk-quickcommands-details-preferred-collapsed";
        var DETAILS_ATTENTION_KEY = "mc-sirk-quickcommands-details-attention";
        var SHARED_PREFERENCES_KEY = "sirkPlatform.mycommands.preferences";

        var style = document.getElementById("sirk-quick-commands-layout-contract");
        if (!style) {
            style = document.createElement("style");
            style.id = "sirk-quick-commands-layout-contract";
            style.textContent = [
                ".sirk-desktop-commands .sirk-quick-command-details{padding:12px 8px!important}",
                ".sirk-desktop-commands .sirk-quick-command-details-toggle.has-attention{border-color:rgba(220,38,38,.55)!important;background:rgba(220,38,38,.12)!important;color:#b42318!important}",
                "[data-bs-theme=dark] .sirk-desktop-commands .sirk-quick-command-details-toggle.has-attention,body.night .sirk-desktop-commands .sirk-quick-command-details-toggle.has-attention,body.dark .sirk-desktop-commands .sirk-quick-command-details-toggle.has-attention{border-color:rgba(248,113,113,.7)!important;background:rgba(248,113,113,.16)!important;color:#fca5a5!important}"
            ].join("");
            (document.head || document.documentElement).appendChild(style);
        }

        function parseStoredBoolean(value) {
            if (value == null || value === "") return null;
            if (/^(1|true|yes|on)$/i.test(String(value))) return true;
            if (/^(0|false|no|off)$/i.test(String(value))) return false;
            return null;
        }

        function storageBoolean(key, fallback) {
            try {
                var value = parseStoredBoolean(window.localStorage.getItem(key));
                return value == null ? fallback : value;
            } catch (error) { return fallback; }
        }

        function writeStorageBoolean(key, value) {
            try { window.localStorage.setItem(key, value === true ? "1" : "0"); }
            catch (error) {}
        }

        function saveCollapsedPreference(value) {
            try {
                window.localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0");
                var shared = JSON.parse(window.localStorage.getItem(SHARED_PREFERENCES_KEY) || "{}");
                if (!shared || typeof shared !== "object" || Array.isArray(shared)) shared = {};
                shared.quickCollapsed = value === true;
                window.localStorage.setItem(SHARED_PREFERENCES_KEY, JSON.stringify(shared));
            } catch (error) {}
        }

        function readCollapsedPreference() {
            var value = null;
            try {
                value = parseStoredBoolean(window.localStorage.getItem(COLLAPSED_KEY));
                if (value != null) return value;

                for (var index = 0; index < LEGACY_COLLAPSED_KEYS.length; index += 1) {
                    value = parseStoredBoolean(window.localStorage.getItem(LEGACY_COLLAPSED_KEYS[index]));
                    if (value != null) {
                        saveCollapsedPreference(value);
                        return value;
                    }
                }

                var shared = JSON.parse(window.localStorage.getItem(SHARED_PREFERENCES_KEY) || "{}");
                if (shared && typeof shared.quickCollapsed === "boolean") value = shared.quickCollapsed;
                else if (shared && typeof shared.desktopCollapsed === "boolean") value = shared.desktopCollapsed;
                if (value != null) saveCollapsedPreference(value);
            } catch (error) {}
            return value;
        }

        function currentCollapsed(panel) {
            var browser = panel && panel.querySelector(".sirk-quick-command-browser");
            return !!(browser && browser.classList.contains("is-collapsed"));
        }

        function detailsCollapsed(panel) {
            var browser = panel && panel.querySelector(".sirk-quick-command-browser");
            return !!(browser && browser.classList.contains("is-details-collapsed"));
        }

        function detailsPreferredCollapsed() {
            return storageBoolean(DETAILS_PREFERRED_KEY, storageBoolean("mc-sirk-quickcommands-details-collapsed", false));
        }

        function detailsAttention() {
            return storageBoolean(DETAILS_ATTENTION_KEY, false);
        }

        function setDetailsPreference(value) {
            writeStorageBoolean(DETAILS_PREFERRED_KEY, value === true);
            if (value !== true) writeStorageBoolean(DETAILS_ATTENTION_KEY, false);
        }

        function setDetailsAttention(value) {
            writeStorageBoolean(DETAILS_ATTENTION_KEY, value === true);
        }

        function transientOutput(value) {
            return /^(Ładowanie poleceń|Loading commands|Polecenie wysłano do agenta|Command sent to the agent)/i.test(String(value || "").trim());
        }

        function copyStatus(source, target) {
            if (!source || !target) return;
            target.textContent = source.textContent;
            target.className = source.className;
            target.scrollTop = source.scrollTop;
        }

        function preserveOutput(panel, action) {
            var previousStatus = panel && panel.querySelector(".sirk-quick-command-status");
            var previousScroll = previousStatus ? previousStatus.scrollTop : 0;
            var result = action();
            if (!panel || !previousStatus) return result;

            var synchronize = function () {
                var currentStatus = panel.querySelector(".sirk-quick-command-status");
                if (!currentStatus) return;
                copyStatus(previousStatus, currentStatus);
                currentStatus.scrollTop = previousScroll;
            };

            synchronize();
            window.setTimeout(synchronize, 0);

            if (typeof MutationObserver === "function") {
                var observer = new MutationObserver(synchronize);
                observer.observe(previousStatus, {
                    childList: true,
                    subtree: true,
                    characterData: true,
                    attributes: true,
                    attributeFilter: ["class"]
                });
                window.setTimeout(function () { observer.disconnect(); }, 30000);
            }
            return result;
        }

        function quickToolbarHost(value) {
            if (!value) return null;
            if (typeof value === "string") value = document.querySelector(value);
            return value && value.classList && value.classList.contains("sirk-quick-command-toolbar-host") ? value : null;
        }

        function collapseButton(panel) {
            if (!panel) return null;
            return panel.querySelector(
                ".sirk-quick-command-toolbar-host .mc-shared-toolbar-left .mc-shared-toolbar-button"
            ) || panel.querySelector(
                ".sirk-quick-command-toolbar-host .mc-shared-toolbar-button"
            );
        }

        function restoreCollapsedPreference(panel, button) {
            if (!panel || panel.__sirkQuickToggleInProgress) return;
            var browser = panel.querySelector(".sirk-quick-command-browser");
            if (!browser || panel.__sirkQuickRestoredBrowser === browser) return;
            panel.__sirkQuickRestoredBrowser = browser;

            var preferred = readCollapsedPreference();
            if (preferred == null || preferred === currentCollapsed(panel)) return;
            button = button || collapseButton(panel);
            if (!button || typeof button.click !== "function") return;
            panel.__sirkQuickRestoring = true;
            button.click();
            panel.__sirkQuickRestoring = false;
        }

        function syncDetailsButton(panel, button) {
            if (!panel || !button) return;
            button.classList.add("sirk-quick-command-details-toggle");
            button.classList.toggle("has-attention", detailsPreferredCollapsed() && detailsAttention());
        }

        function reconcileDetailsPreference(panel, button) {
            if (!panel) return;
            window.setTimeout(function () {
                if (!panel.isConnected) return;
                var browser = panel.querySelector(".sirk-quick-command-browser");
                var status = panel.querySelector(".sirk-quick-command-status");
                var currentOutput = status ? String(status.textContent || "").trim() : "";
                var previousOutput = String(panel.__sirkQuickLastOutput || "");
                panel.__sirkQuickLastOutput = currentOutput;

                button = button && button.isConnected ? button : panel.querySelector(".sirk-quick-command-details-toggle");
                if (detailsPreferredCollapsed() && currentOutput && currentOutput !== previousOutput && !transientOutput(currentOutput)) {
                    setDetailsAttention(true);
                }

                if (!detailsPreferredCollapsed()) {
                    setDetailsAttention(false);
                    syncDetailsButton(panel, button);
                    return;
                }

                if (browser && !detailsCollapsed(panel) && button && typeof button.click === "function" && !panel.__sirkQuickDetailsRestoreInProgress) {
                    panel.__sirkQuickDetailsRestoreInProgress = true;
                    try { button.click(); }
                    finally { panel.__sirkQuickDetailsRestoreInProgress = false; }
                    return;
                }
                syncDetailsButton(panel, button);
            }, 0);
        }

        function installToolbarHook() {
            var toolbar = window.SharedToolbar;
            if (!toolbar || typeof toolbar.mount !== "function") return false;
            if (toolbar.mount.__sirkQuickPersistenceWrapped) return true;

            var originalMount = toolbar.mount;
            var wrappedMount = function (options) {
                var host = quickToolbarHost(options && options.container);
                if (!host) return originalMount.call(toolbar, options);

                var effective = Object.assign({}, options || {});
                effective.buttons = Object.assign({}, options && options.buttons || {});
                effective.customButtons = (options && options.customButtons || []).map(function (definition) {
                    if (!definition || definition.key !== "details") return definition;
                    var details = Object.assign({}, definition);
                    var originalDetails = details.onClick;
                    details.onClick = function (api, event, currentDefinition) {
                        var panel = host.closest(".sirk-desktop-commands-panel");
                        var opening = detailsCollapsed(panel);
                        setDetailsPreference(!opening);
                        if (opening) setDetailsAttention(false);
                        return typeof originalDetails === "function"
                            ? originalDetails(api, event, currentDefinition)
                            : undefined;
                    };
                    return details;
                });

                var collapse = Object.assign({}, effective.buttons.collapse || {});
                var originalCollapse = collapse.onClick;

                collapse.onClick = function (api, event, definition) {
                    var panel = host.closest(".sirk-desktop-commands-panel");
                    if (!panel || typeof originalCollapse !== "function") {
                        return typeof originalCollapse === "function"
                            ? originalCollapse(api, event, definition)
                            : undefined;
                    }

                    panel.__sirkQuickToggleInProgress = true;
                    var result;
                    try {
                        result = preserveOutput(panel, function () {
                            return originalCollapse(api, event, definition);
                        });
                        saveCollapsedPreference(currentCollapsed(panel));
                    } finally {
                        panel.__sirkQuickToggleInProgress = false;
                    }
                    return result;
                };
                collapse.__sirkPreserveQuickOutput = true;
                effective.buttons.collapse = collapse;

                var api = originalMount.call(toolbar, effective);
                var panel = host.closest(".sirk-desktop-commands-panel");
                var detailsButton = api && api.buttons && api.buttons.details;
                syncDetailsButton(panel, detailsButton);
                window.setTimeout(function () {
                    restoreCollapsedPreference(panel, api && api.buttons && api.buttons.collapse);
                    reconcileDetailsPreference(panel, detailsButton);
                }, 0);
                return api;
            };
            wrappedMount.__sirkQuickPersistenceWrapped = true;
            toolbar.mount = wrappedMount;
            return true;
        }

        function wrapExistingButton(panel) {
            var button = collapseButton(panel);
            if (!button || button.__sirkPreserveQuickOutput || typeof button.onclick !== "function") return;
            var original = button.onclick;
            button.__sirkPreserveQuickOutput = true;
            button.onclick = function (event) {
                panel.__sirkQuickToggleInProgress = true;
                var result;
                try {
                    result = preserveOutput(panel, function () {
                        return original.call(button, event);
                    });
                    saveCollapsedPreference(currentCollapsed(panel));
                } finally {
                    panel.__sirkQuickToggleInProgress = false;
                }
                return result;
            };
        }

        function scan() {
            installToolbarHook();
            Array.prototype.forEach.call(
                document.querySelectorAll(".sirk-desktop-commands-panel"),
                function (panel) {
                    wrapExistingButton(panel);
                    restoreCollapsedPreference(panel, collapseButton(panel));
                    reconcileDetailsPreference(panel, panel.querySelector(".sirk-quick-command-details-toggle"));
                }
            );
        }

        scan();
        window.setTimeout(scan, 0);
        window.setTimeout(scan, 50);
        window.setTimeout(scan, 250);
        window.setTimeout(scan, 1000);
        if (typeof MutationObserver === "function") {
            new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
        }
    }

    installQuickCommandsLayoutContract();
    window.MeshPluginCore = meshCore;
}());
