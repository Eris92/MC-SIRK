(function () {
    "use strict";

    var MODERN_CLASSES = [
        "btn", "btn-primary", "btn-secondary", "btn-success", "btn-danger", "btn-warning", "btn-sm",
        "nav", "nav-tabs", "nav-link", "list-group", "list-group-item", "list-group-item-action",
        "card", "modal", "modal-content", "form-control", "form-select", "form-check-input", "table", "table-sm",
        "table-hover", "text-body-secondary", "border", "border-end", "border-bottom",
        "alert", "alert-info", "alert-danger"
    ];
    var CLASSIC_CLASSES = ["style3x", "style3sel", "style10", "style10s", "bar", "sbar"];
    var OWNED_CLASSES = MODERN_CLASSES.concat(CLASSIC_CLASSES);
    var PLUGIN_ROOT_SELECTOR = ".mc-shared-page,#sirk-platform-admin,.sirk-desktop-commands-panel,.mc-results-viewer,.mc-move-dialog-overlay,.mc-move-dialog";
    var scheduled = false;
    var scheduledRoot = null;

    function isModern() {
        if (typeof document === "undefined") return false;
        var anchor = document.getElementById("LeftMenuMyDevices") || document.querySelector("#page_leftbar .nav-link");
        if (anchor) return String(anchor.tagName || "").toLowerCase() === "a" || anchor.classList.contains("nav-link");
        return !!document.querySelector(".navbar,.nav-link[data-bs-toggle],body[data-bs-theme]");
    }

    function syncOwnedClasses(element, desired) {
        if (!element || !element.classList) return element;
        desired = desired || [];
        var wanted = Object.create(null);
        desired.forEach(function (name) { wanted[name] = true; });

        OWNED_CLASSES.forEach(function (name) {
            if (!wanted[name] && element.classList.contains(name)) element.classList.remove(name);
        });
        desired.forEach(function (name) {
            if (!element.classList.contains(name)) element.classList.add(name);
        });
        return element;
    }

    function active(element) {
        return !!(element && element.classList && (
            element.classList.contains("active") || element.classList.contains("is-active") ||
            element.getAttribute("aria-selected") === "true" ||
            element.getAttribute("aria-current") === "page" ||
            element.getAttribute("aria-pressed") === "true"
        ));
    }

    function buttonVariant(element) {
        if (!element || !element.classList) return "secondary";
        if (element.classList.contains("sirk-action-approve")) return "success";
        if (element.classList.contains("sirk-action-reject") || element.classList.contains("mc-admin-error-action")) return "danger";
        if (element.classList.contains("mc-command-run-button") || element.classList.contains("mc-admin-primary") || element.classList.contains("sirk-primary-action")) return "primary";
        return "secondary";
    }

    function applyButton(element, variant) {
        if (!element) return element;
        var selected = active(element);
        if (isModern()) syncOwnedClasses(element, ["btn", "btn-" + (variant || buttonVariant(element)), "btn-sm"]);
        else syncOwnedClasses(element, [selected ? "style10s" : "style10"]);
        return element;
    }

    function applyNav(element) {
        if (!element) return element;
        var selected = active(element);
        if (isModern()) {
            syncOwnedClasses(element, ["list-group-item", "list-group-item-action"]);
            element.classList.toggle("active", selected);
        } else {
            syncOwnedClasses(element, [selected ? "style10s" : "style10"]);
        }
        return element;
    }

    function applyTab(element) {
        if (!element) return element;
        var selected = active(element);
        if (isModern()) {
            syncOwnedClasses(element, ["nav-link"]);
            element.classList.toggle("active", selected);
        } else {
            syncOwnedClasses(element, [selected ? "style3sel" : "style3x"]);
        }
        return element;
    }

    function applyCard(element) {
        if (!element) return element;
        if (element.classList && element.classList.contains("mc-move-dialog")) {
            syncOwnedClasses(element, [isModern() ? "modal-content" : "style10"]);
        } else {
            syncOwnedClasses(element, [isModern() ? "card" : "style10"]);
        }
        return element;
    }

    function applyControl(element) {
        if (!element) return element;
        if (isModern()) {
            var type = String(element.type || "").toLowerCase();
            if (type === "checkbox" || type === "radio") syncOwnedClasses(element, ["form-check-input"]);
            else if (String(element.tagName || "").toLowerCase() === "select") syncOwnedClasses(element, ["form-select"]);
            else syncOwnedClasses(element, ["form-control"]);
        } else {
            syncOwnedClasses(element, []);
        }
        return element;
    }

    function applyTable(element) {
        if (!element) return element;
        syncOwnedClasses(element, isModern() ? ["table", "table-sm", "table-hover"] : ["style10"]);
        return element;
    }

    function applyMuted(element) {
        if (!element) return element;
        var modern = isModern();
        if (modern && !element.classList.contains("text-body-secondary")) element.classList.add("text-body-secondary");
        else if (!modern && element.classList.contains("text-body-secondary")) element.classList.remove("text-body-secondary");
        return element;
    }

    function applyStatus(element) {
        if (!element || !element.classList) return element;
        var names = ["text-warning", "text-info", "text-success", "text-danger", "text-primary"];
        var desired = "";
        if (isModern()) {
            if (/pending/i.test(element.className)) desired = "text-warning";
            else if (/executing/i.test(element.className)) desired = "text-info";
            else if (/(approved|completed|ready)/i.test(element.className)) desired = "text-success";
            else if (/(failed|rejected|error)/i.test(element.className)) desired = "text-danger";
            else desired = "text-primary";
        }
        names.forEach(function (name) {
            if (name !== desired && element.classList.contains(name)) element.classList.remove(name);
        });
        if (desired && !element.classList.contains(desired)) element.classList.add(desired);
        return element;
    }

    function queryAll(root, selector, callback) {
        if (!root || typeof root.querySelectorAll !== "function") return;
        if (root.matches && root.matches(selector)) callback(root);
        Array.prototype.forEach.call(root.querySelectorAll(selector), callback);
    }

    function refresh(root) {
        if (!root && typeof document === "undefined") return null;
        root = root || document;
        var modern = isModern();
        queryAll(root, ".mc-shared-page,#sirk-platform-admin,.sirk-desktop-commands-panel", function (element) {
            var value = modern ? "modern" : "classic";
            if (element.getAttribute("data-mesh-ui") !== value) element.setAttribute("data-mesh-ui", value);
        });
        queryAll(root, ".mc-move-dialog-overlay", function (element) { syncOwnedClasses(element, modern ? ["modal"] : []); });
        queryAll(root, ".mc-shared-toolbar-button,.mc-tree-script-action,.mc-results-view-button,.mc-results-copy-button,.mc-definition-remove,.mc-command-run-button,.mc-admin-primary,.mc-admin-secondary,.mc-admin-toolbar button,.mc-admin-inline-actions button,.mc-admin-table-actions button,.mc-move-dialog-actions button,.sirk-quick-command-fallback-close,.sirk-quick-command-submit", function (element) { applyButton(element); });
        queryAll(root, ".mc-shared-nav-item,.mc-approval-provider,.mc-approval-status,.mc-catalog-results,.mc-tree-root,.mc-tree-script,.mc-tree-folder-header,.sirk-quick-command-browser button,.mc-admin-tabs>button,.mc-admin-settings-subnav button,.mc-admin-settings-nav button", applyNav);
        queryAll(root, ".mc-shared-tab", applyTab);
        queryAll(root, ".mc-shared-card,.mc-approval-request-card,.mc-definition-section,.mc-script-editor-card,.mc-multi-editor-card,.mc-script-definition-card,.mc-script-credentials-card,.mc-admin-card,.mc-admin-provider-card,.mc-admin-permission-folder,.mc-results-debug,.sirk-desktop-commands-panel,.sirk-quick-command-details,.mc-move-dialog,.mc-results-viewer", applyCard);
        queryAll(root, PLUGIN_ROOT_SELECTOR, function (pluginRootElement) {
            queryAll(pluginRootElement, "input:not([type=button]):not([type=submit]):not([type=reset]),textarea,select", applyControl);
        });
        queryAll(root, ".mc-results-table,.mc-definition-table,.mc-admin-table", applyTable);
        queryAll(root, ".mc-shared-muted,.mc-admin-subtitle,.mc-admin-card-description,.mc-admin-field-description,.mc-admin-table-secondary,.sirk-quick-command-description", applyMuted);
        queryAll(root, "[class*='sirk-result-status-'],[class*='mc-results-status-'],[class*='mc-approval-request-status-'],.mc-admin-state", applyStatus);
        return root;
    }

    function schedule(root) {
        if (!root && typeof document === "undefined") return;
        if (root === document || !scheduledRoot) scheduledRoot = root || document;
        if (scheduled) return;
        scheduled = true;
        Promise.resolve().then(function () {
            var target = scheduledRoot || (typeof document !== "undefined" ? document : null);
            scheduled = false;
            scheduledRoot = null;
            refresh(target);
        });
    }

    function pluginRoot(node) {
        if (!node || node.nodeType !== 1) return null;
        if (node.matches && node.matches(PLUGIN_ROOT_SELECTOR)) return node;
        if (node.closest) {
            var parent = node.closest(PLUGIN_ROOT_SELECTOR);
            if (parent) return parent;
        }
        if (node.querySelector) return node.querySelector(PLUGIN_ROOT_SELECTOR);
        return null;
    }

    function installObserver() {
        if (typeof document === "undefined" || window.__sirkMeshThemeObserver || typeof MutationObserver !== "function") return;
        var target = document.body || document.documentElement;
        if (!target) return;

        var contentObserver = new MutationObserver(function (records) {
            var roots = [];
            records.forEach(function (record) {
                Array.prototype.forEach.call(record.addedNodes || [], function (node) {
                    var root = pluginRoot(node);
                    if (root && roots.indexOf(root) < 0) roots.push(root);
                });
            });
            roots.forEach(refresh);
        });
        contentObserver.observe(target, { childList: true, subtree: true });
        window.__sirkMeshThemeObserver = contentObserver;

        var themeObserver = new MutationObserver(function () { schedule(document); });
        if (document.documentElement) {
            themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-bs-theme"] });
        }
        if (document.body && document.body !== document.documentElement) {
            themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class", "data-bs-theme"] });
        }
        window.__sirkMeshThemeAttributeObserver = themeObserver;
    }

    window.MeshThemeAdapter = {
        isModern: isModern,
        refresh: refresh,
        schedule: schedule,
        button: applyButton,
        nav: applyNav,
        tab: applyTab,
        card: applyCard,
        control: applyControl,
        table: applyTable,
        status: applyStatus
    };
    if (typeof document !== "undefined") {
        installObserver();
        schedule(document);
    }
}());

(function () {
    "use strict";

    function svg(path) { return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>'; }

    var definitions = {
        collapse: { title: "Collapse", icon: svg('<path d="m15 18-6-6 6-6"/>'), expandIcon: svg('<path d="m9 18 6-6-6-6"/>'), side: "left", order: 10, handler: "onCollapse" },
        favorites: { title: "Favorites", icon: svg('<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>'), side: "left", order: 20, handler: "onFavorites" },
        link: { title: "Copy link", icon: svg('<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>'), side: "left", order: 30, handler: "onLink" },
        manage: { title: "Edit", icon: svg('<path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>'), side: "left", order: 40, handler: "onManage" },
        multi: { title: "Multi-device execution", icon: svg('<circle cx="12" cy="12" r="8"/><path d="m9 12 2 2 4-5"/>'), side: "left", order: 41, handler: "onMulti" },
        refresh: { title: "Refresh", icon: svg('<path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M6.1 8A7 7 0 0 1 18 6l2 5M4 13l2 5a7 7 0 0 0 11.9-2"/>'), side: "left", order: 50, handler: "onRefresh" },
        search: { title: "Search", icon: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'), side: "left", order: 70, handler: "onSearchToggle", search: true },
        clear: { title: "Clear", icon: svg('<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/>'), side: "right", order: 110, handler: "onClear" },
        settings: { title: "Settings", icon: svg('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5L9 6.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 3.1h5l.4-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2.1-1.5a7 7 0 0 0 .1-1Z"/>'), side: "right", order: 140, handler: "onSettings" }
    };

    var presets = {
        myscripts: { collapse: true, favorites: true, link: false, manage: true, refresh: true, multi: false, search: true, clear: false, settings: false },
        mycommands: { collapse: true, favorites: true, link: true, manage: true, refresh: true, multi: true, search: true, clear: false, settings: false },
        standard: { collapse: false, link: true, manage: false, refresh: true, multi: false, search: true, clear: false, favorites: false, settings: true },
        minimal: { collapse: false, refresh: true, search: true }
    };

    function clone(value) {
        var result = {};
        Object.keys(value || {}).forEach(function (key) { result[key] = value[key]; });
        return result;
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
}());