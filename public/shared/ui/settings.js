(function () {
    "use strict";
    window.SharedSettings = {
        section: function (title, content, expanded) {
            var root = document.createElement("section"); root.className = "mc-shared-settings-section";
            var header = document.createElement("button"); header.type = "button"; header.className = "mc-shared-settings-header"; header.textContent = title;
            var panel = document.createElement("div"); panel.className = "mc-shared-settings-content"; panel.hidden = expanded !== true;
            if (content) panel.appendChild(content); header.onclick = function () { panel.hidden = !panel.hidden; };
            root.appendChild(header); root.appendChild(panel);
            if (window.MeshThemeAdapter) window.MeshThemeAdapter.button(header);
            return root;
        },
        form: function (title) { var form = document.createElement("div"); form.className = "mc-shared-settings-form"; if (title) { var h = document.createElement("h3"); h.textContent = title; form.appendChild(h); } return form; }
    };
}());

(function () {
    "use strict";

    if (window.__sirkNativeThemeLifecycleInstalled) return;
    window.__sirkNativeThemeLifecycleInstalled = true;
    var pending = false;
    var pendingRoots = [];
    var ROOT_SELECTOR = ".mc-shared-page,#sirk-platform-admin,.sirk-desktop-commands-panel,.mc-results-viewer,.mc-move-dialog";
    var QUICK_OUTPUT_HIDDEN_KEY = "mc-sirk-quickcommands-output-hidden-v2";
    var QUICK_OUTPUT_ATTENTION_KEY = "mc-sirk-quickcommands-output-attention-v2";

    function pluginRoot(node) {
        if (!node) return null;
        if (node.nodeType !== 1) node = node.parentElement;
        if (!node) return null;
        if (node.matches && node.matches(ROOT_SELECTOR)) return node;
        if (node.closest) {
            var parent = node.closest(ROOT_SELECTOR);
            if (parent) return parent;
        }
        return node.querySelector ? node.querySelector(ROOT_SELECTOR) : null;
    }

    function sanitizeQuickAttentionStyle(style) {
        if (!style || !style.textContent || style.getAttribute("data-native-theme-sanitized") === "1") return;
        style.textContent = style.textContent
            .replace(/\.sirk-desktop-commands \.sirk-quick-command-details-toggle\.has-attention\{[^}]*\}/g, "")
            .replace(/\[data-bs-theme=dark\][^{]*\.sirk-quick-command-details-toggle\.has-attention[^}]*\}/g, "")
            .replace(/\.sirk-desktop-commands \.sirk-quick-command-output-toggle\.has-output-attention\{[^}]*\}/g, "")
            .replace(/\[data-bs-theme=dark\][^{]*\.sirk-quick-command-output-toggle\.has-output-attention[^}]*\}/g, "");
        style.setAttribute("data-native-theme-sanitized", "1");
    }

    function sanitizeGeneratedStyles() {
        sanitizeQuickAttentionStyle(document.getElementById("sirk-quick-commands-layout-contract"));
        sanitizeQuickAttentionStyle(document.getElementById("sirk-quick-output-state-style"));
        var edit = document.getElementById("sirk-platform-fixed-edit-actions-style");
        if (edit && edit.textContent && edit.getAttribute("data-native-theme-sanitized") !== "1") {
            edit.textContent = edit.textContent.replace(/\.mc-tree-credential-action:not\(\.mc-tree-action-disabled\)\{[^}]*\}/g, "");
            edit.setAttribute("data-native-theme-sanitized", "1");
        }
    }

    function readQuickBoolean(key, fallback) {
        try {
            var value = window.localStorage.getItem(key);
            if (value == null || value === "") return fallback;
            return /^(1|true|yes|on)$/i.test(String(value));
        } catch (error) { return fallback; }
    }

    function writeQuickBoolean(key, value) {
        try { window.localStorage.setItem(key, value === true ? "1" : "0"); }
        catch (error) {}
    }

    function actualQuickOutputHidden(panel) {
        if (!panel) return false;
        var browser = panel.querySelector(".sirk-quick-command-browser");
        return panel.getAttribute("data-sirk-output-hidden") === "1" ||
            !!(browser && browser.classList.contains("is-details-collapsed"));
    }

    function transientQuickOutput(value) {
        return /^(Ładowanie poleceń|Loading commands|Polecenie wysłano do agenta|Command sent to the agent|Lista poleceń została odświeżona|Command list refreshed)/i.test(String(value || "").trim());
    }

    function quickOutputButton(panel) {
        if (!panel) return null;
        return panel.querySelector(".sirk-quick-command-output-toggle,.sirk-quick-command-details-toggle") ||
            Array.prototype.find.call(
                panel.querySelectorAll(".sirk-quick-command-toolbar-host .mc-shared-toolbar-button"),
                function (button) {
                    return /^(Ukryj wynik|Pokaż wynik|Hide output|Show output)$/i.test(String(button.title || "").trim());
                }
            );
    }

    function syncQuickOutputAttention(panel) {
        if (!panel) return;
        var hidden = actualQuickOutputHidden(panel);
        var status = panel.querySelector(".sirk-quick-command-status");
        var current = status ? String(status.textContent || "").trim() : "";
        var previous = String(panel.__sirkNativeLastQuickOutput || "");
        var pendingOutput = panel.__sirkNativeQuickOutputPending === true;
        var active = readQuickBoolean(QUICK_OUTPUT_ATTENTION_KEY, false);
        var button = quickOutputButton(panel);

        writeQuickBoolean(QUICK_OUTPUT_HIDDEN_KEY, hidden);
        panel.__sirkNativeLastQuickOutput = current;

        if (!current) {
            pendingOutput = false;
            active = false;
        } else if (transientQuickOutput(current)) {
            pendingOutput = true;
        } else {
            if (hidden && (pendingOutput || current !== previous)) active = true;
            pendingOutput = false;
        }

        if (!hidden) active = false;
        panel.__sirkNativeQuickOutputPending = pendingOutput;
        writeQuickBoolean(QUICK_OUTPUT_ATTENTION_KEY, active);
        if (button) button.classList.toggle("has-output-attention", active);
    }

    function syncNativeButton(button) {
        var adapter = window.MeshThemeAdapter;
        if (!adapter || !button) return;
        var modern = adapter.isModern();
        var outputToggle = button.classList.contains("sirk-quick-command-output-toggle");
        var outputActive = outputToggle && button.classList.contains("is-active");
        var outputPressed = outputToggle ? button.getAttribute("aria-pressed") : null;

        if (modern) {
            button.classList.toggle("active", !outputToggle && (button.classList.contains("is-active") || button.getAttribute("aria-pressed") === "true"));
        } else {
            button.classList.remove("active");
        }

        if (outputToggle) {
            button.classList.remove("is-active");
            button.setAttribute("aria-pressed", "false");
        }
        adapter.button(button);
        if (outputToggle) {
            if (outputActive) button.classList.add("is-active");
            button.setAttribute("aria-pressed", outputPressed == null ? "false" : outputPressed);
        }
    }

    function syncNativeContainers(root) {
        var adapter = window.MeshThemeAdapter;
        if (!adapter || !root) return;
        var modern = adapter.isModern();
        sanitizeGeneratedStyles();
        if (root.matches && root.matches(".sirk-desktop-commands-panel")) syncQuickOutputAttention(root);
        Array.prototype.forEach.call(root.querySelectorAll(".sirk-desktop-commands-panel"), syncQuickOutputAttention);
        adapter.refresh(root);

        Array.prototype.forEach.call(root.querySelectorAll(".mc-shared-toolbar-button,.mc-tree-script-action,.sirk-desktop-commands-toggle,.sirk-quick-command-fallback-close"), syncNativeButton);
        Array.prototype.forEach.call(root.querySelectorAll(".sirk-quick-command-output-toggle,.sirk-quick-command-details-toggle"), function (button) {
            var attention = button.classList.contains("has-output-attention") || button.classList.contains("has-attention");
            button.classList.toggle("text-danger", modern && attention);
            button.classList.toggle("border-danger", modern && attention);
        });
        Array.prototype.forEach.call(root.querySelectorAll(".mc-tree-credential-action:not(.mc-tree-action-disabled)"), function (button) {
            button.classList.toggle("text-warning", modern);
        });
        Array.prototype.forEach.call(root.querySelectorAll(".mc-tree-favorite-action"), function (button) {
            var selected = button.classList.contains("active") ||
                button.classList.contains("is-active") ||
                button.getAttribute("aria-pressed") === "true";
            button.classList.toggle("text-warning", modern && selected);
        });
        Array.prototype.forEach.call(root.querySelectorAll(".mc-shared-tabs"), function (tabs) {
            tabs.classList.toggle("nav", modern);
            tabs.classList.toggle("nav-tabs", modern);
        });
        Array.prototype.forEach.call(root.querySelectorAll(".mc-catalog-navigation,.mc-catalog-roots,.mc-approval-status-list,.mc-admin-tabs,.mc-admin-settings-subnav,.mc-admin-settings-nav"), function (list) {
            list.classList.toggle("list-group", modern);
        });
        Array.prototype.forEach.call(root.querySelectorAll(".mc-shared-primary,.mc-shared-secondary"), function (column) {
            column.classList.toggle("border-end", modern);
        });
        Array.prototype.forEach.call(root.querySelectorAll(".mc-results-viewer-header,.mc-admin-section-header"), function (header) {
            header.classList.toggle("border-bottom", modern);
        });
        Array.prototype.forEach.call(root.querySelectorAll(".mc-shared-settings-header"), function (button) {
            adapter.button(button);
        });
    }

    function installSynchronousToolbarTheme() {
        var toolbarApi = window.SharedToolbarApi;
        if (!toolbarApi || typeof toolbarApi.create !== "function" || toolbarApi.create.__sirkNativeStateSync) return;
        var originalCreate = toolbarApi.create;
        var wrappedCreate = function (context) {
            var api = originalCreate.call(toolbarApi, context);
            var originalSetActive = api.setActive;
            var originalSetTitle = api.setTitle;

            api.setActive = function (key, value) {
                var result = originalSetActive.call(api, key, value);
                syncNativeButton(api.buttons && api.buttons[key]);
                return result;
            };
            api.setTitle = function (key, value) {
                var result = originalSetTitle.call(api, key, value);
                if (key === "favorites") syncNativeButton(api.buttons && api.buttons[key]);
                return result;
            };
            return api;
        };
        wrappedCreate.__sirkNativeStateSync = true;
        wrappedCreate.originalCreate = originalCreate;
        toolbarApi.create = wrappedCreate;
    }

    function addPendingRoot(root) {
        if (!root) return;
        if (pendingRoots.indexOf(root) < 0) pendingRoots.push(root);
    }

    function schedule(root) {
        if (root) addPendingRoot(root);
        if (pending) return;
        pending = true;
        Promise.resolve().then(function () {
            pending = false;
            sanitizeGeneratedStyles();
            var targets = pendingRoots.splice(0);
            if (!targets.length) targets = Array.prototype.slice.call(document.querySelectorAll(ROOT_SELECTOR));
            targets.forEach(syncNativeContainers);
        });
    }

    window.__sirkSyncNativeButton = syncNativeButton;
    window.__sirkSyncNativeContainers = syncNativeContainers;
    window.__sirkScheduleNativeContainers = schedule;
    installSynchronousToolbarTheme();

    if (typeof MutationObserver === "function") {
        new MutationObserver(function (records) {
            records.forEach(function (record) {
                if (record.type === "characterData") {
                    var changedRoot = pluginRoot(record.target);
                    if (changedRoot) addPendingRoot(changedRoot);
                }
                Array.prototype.forEach.call(record.addedNodes || [], function (node) {
                    var root = pluginRoot(node);
                    if (root) addPendingRoot(root);
                });
            });
            if (pendingRoots.length) schedule();
        }).observe(document.body || document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true
        });
        if (document.head) {
            new MutationObserver(function () { sanitizeGeneratedStyles(); }).observe(document.head, { childList: true, subtree: true });
        }
    }
    schedule();
}());
