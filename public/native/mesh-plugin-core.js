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
        var SHARED_PREFERENCES_KEY = "sirkPlatform.mycommands.preferences";

        var style = document.getElementById("sirk-quick-commands-layout-contract");
        if (!style) {
            style = document.createElement("style");
            style.id = "sirk-quick-commands-layout-contract";
            style.textContent = ".sirk-desktop-commands .sirk-quick-command-details{padding:12px 8px!important}";
            (document.head || document.documentElement).appendChild(style);
        }

        function parseStoredBoolean(value) {
            if (value == null || value === "") return null;
            if (/^(1|true|yes|on)$/i.test(String(value))) return true;
            if (/^(0|false|no|off)$/i.test(String(value))) return false;
            return null;
        }

        function saveCollapsedPreference(value) {
            try {
                window.localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0");
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

        function isCollapseButton(button) {
            if (!button || !button.matches || !button.matches(".sirk-quick-command-toolbar-host .mc-shared-toolbar-button")) return false;
            return /^(Zwiń kategorie|Rozwiń kategorie|Collapse categories|Expand categories)$/i.test(String(button.title || "").trim());
        }

        function currentCollapsed(panel) {
            var browser = panel && panel.querySelector(".sirk-quick-command-browser");
            return !!(browser && browser.classList.contains("is-collapsed"));
        }

        function copyStatus(source, target) {
            if (!source || !target) return;
            target.textContent = source.textContent;
            target.className = source.className;
            target.scrollTop = source.scrollTop;
        }

        function wrapCollapseButton(button) {
            if (!isCollapseButton(button) || button.__sirkPreserveQuickOutput) return;
            var original = button.onclick;
            if (typeof original !== "function") return;
            button.__sirkPreserveQuickOutput = true;
            button.onclick = function (event) {
                var panel = button.closest(".sirk-desktop-commands-panel");
                var previousStatus = panel && panel.querySelector(".sirk-quick-command-status");
                var previousScroll = previousStatus ? previousStatus.scrollTop : 0;
                var result = original.call(this, event);
                if (panel) saveCollapsedPreference(currentCollapsed(panel));
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
            };
        }

        function restoreCollapsedPreference(panel) {
            if (!panel || panel.__sirkQuickCollapsedRestored) return;
            var button = panel.querySelector(".sirk-quick-command-toolbar-host .mc-shared-toolbar-button");
            var buttons = panel.querySelectorAll(".sirk-quick-command-toolbar-host .mc-shared-toolbar-button");
            for (var index = 0; index < buttons.length; index += 1) {
                if (isCollapseButton(buttons[index])) {
                    button = buttons[index];
                    break;
                }
            }
            if (!button || !panel.querySelector(".sirk-quick-command-browser")) return;

            var preferred = readCollapsedPreference();
            panel.__sirkQuickCollapsedRestored = true;
            if (preferred == null || preferred === currentCollapsed(panel)) return;
            button.click();
        }

        function scan(root) {
            var scope = root && root.querySelectorAll ? root : document;
            Array.prototype.forEach.call(
                scope.querySelectorAll(".sirk-quick-command-toolbar-host .mc-shared-toolbar-button"),
                wrapCollapseButton
            );
            if (root && root.nodeType === 1 && root.matches && root.matches(".sirk-quick-command-toolbar-host .mc-shared-toolbar-button")) {
                wrapCollapseButton(root);
            }

            var panel = root && root.closest ? root.closest(".sirk-desktop-commands-panel") : null;
            if (!panel && scope.querySelector) panel = scope.querySelector(".sirk-desktop-commands-panel");
            restoreCollapsedPreference(panel);
        }

        scan(document);
        if (typeof MutationObserver === "function") {
            new MutationObserver(function (records) {
                records.forEach(function (record) {
                    Array.prototype.forEach.call(record.addedNodes || [], scan);
                });
            }).observe(document.documentElement, { childList: true, subtree: true });
        }
    }

    installQuickCommandsLayoutContract();
    window.MeshPluginCore = meshCore;
}());
