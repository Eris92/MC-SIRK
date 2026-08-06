(function () {
    "use strict";

    var MODERN_CLASSES = [
        "btn", "btn-primary", "btn-secondary", "btn-success", "btn-danger", "btn-sm",
        "nav", "nav-tabs", "nav-link", "list-group", "list-group-item", "list-group-item-action",
        "card", "card-body", "form-control", "form-select", "form-check-input",
        "table", "table-sm", "table-hover", "table-responsive", "text-body-secondary",
        "border", "border-end", "border-bottom", "alert", "alert-info", "alert-danger"
    ];
    var CLASSIC_CLASSES = ["style3x", "style3sel", "style10", "style10s", "bar", "sbar"];
    var scheduled = false;

    function classList(element) {
        return element && element.classList;
    }

    function isModern() {
        var anchor = document.getElementById("LeftMenuMyDevices") || document.querySelector("#page_leftbar .nav-link");
        if (anchor) {
            return String(anchor.tagName || "").toLowerCase() === "a" ||
                !!(anchor.classList && anchor.classList.contains("nav-link"));
        }
        return !!document.querySelector(".navbar,.nav-link[data-bs-toggle],body[data-bs-theme]");
    }

    function removeClasses(element, names) {
        if (!classList(element)) return;
        names.forEach(function (name) { element.classList.remove(name); });
    }

    function resetVisualClasses(element) {
        removeClasses(element, MODERN_CLASSES);
        removeClasses(element, CLASSIC_CLASSES);
    }

    function active(element) {
        return !!(element && element.classList && (
            element.classList.contains("active") ||
            element.classList.contains("is-active") ||
            element.getAttribute("aria-selected") === "true" ||
            element.getAttribute("aria-current") === "page" ||
            element.getAttribute("aria-pressed") === "true"
        ));
    }

    function buttonVariant(element) {
        if (!element || !element.classList) return "secondary";
        if (element.classList.contains("sirk-action-approve")) return "success";
        if (element.classList.contains("sirk-action-reject") || element.classList.contains("mc-admin-error-action")) return "danger";
        if (element.classList.contains("mc-command-run-button") ||
            element.classList.contains("mc-admin-primary") ||
            element.classList.contains("sirk-primary-action")) return "primary";
        return "secondary";
    }

    function applyButton(element, variant) {
        if (!element) return element;
        resetVisualClasses(element);
        variant = variant || buttonVariant(element);
        if (isModern()) {
            element.classList.add("btn", "btn-" + variant, "btn-sm");
        } else {
            element.classList.add(active(element) ? "style10s" : "style10");
        }
        return element;
    }

    function applyNav(element) {
        if (!element) return element;
        resetVisualClasses(element);
        if (isModern()) {
            element.classList.add("list-group-item", "list-group-item-action");
            element.classList.toggle("active", active(element));
        } else {
            element.classList.add(active(element) ? "style10s" : "style10");
        }
        return element;
    }

    function applyTab(element) {
        if (!element) return element;
        resetVisualClasses(element);
        if (isModern()) {
            element.classList.add("nav-link");
            element.classList.toggle("active", active(element));
        } else {
            element.classList.add(active(element) ? "style3sel" : "style3x");
        }
        return element;
    }

    function applyCard(element) {
        if (!element) return element;
        resetVisualClasses(element);
        element.classList.add(isModern() ? "card" : "style10");
        return element;
    }

    function applyPanel(element) {
        if (!element) return element;
        resetVisualClasses(element);
        element.classList.add(isModern() ? "card" : "style10");
        return element;
    }

    function applyControl(element) {
        if (!element) return element;
        resetVisualClasses(element);
        if (isModern()) {
            var type = String(element.type || "").toLowerCase();
            if (type === "checkbox" || type === "radio") element.classList.add("form-check-input");
            else if (String(element.tagName || "").toLowerCase() === "select") element.classList.add("form-select");
            else element.classList.add("form-control");
        }
        return element;
    }

    function applyTable(element) {
        if (!element) return element;
        resetVisualClasses(element);
        if (isModern()) element.classList.add("table", "table-sm", "table-hover");
        else element.classList.add("style10");
        return element;
    }

    function applyMuted(element) {
        if (!element) return element;
        element.classList.remove("text-body-secondary");
        if (isModern()) element.classList.add("text-body-secondary");
        return element;
    }

    function applyStatus(element) {
        if (!element || !element.classList) return element;
        ["text-warning", "text-info", "text-success", "text-danger", "text-primary"].forEach(function (name) {
            element.classList.remove(name);
        });
        if (!isModern()) return element;
        if (element.className.match(/(?:pending)/i)) element.classList.add("text-warning");
        else if (element.className.match(/(?:executing)/i)) element.classList.add("text-info");
        else if (element.className.match(/(?:approved|completed|ready)/i)) element.classList.add("text-success");
        else if (element.className.match(/(?:failed|rejected|error)/i)) element.classList.add("text-danger");
        else element.classList.add("text-primary");
        return element;
    }

    function queryAll(root, selector, callback) {
        if (!root || typeof root.querySelectorAll !== "function") return;
        if (root.matches && root.matches(selector)) callback(root);
        Array.prototype.forEach.call(root.querySelectorAll(selector), callback);
    }

    function refresh(root) {
        root = root || document;
        var modern = isModern();
        if (root.setAttribute && root.matches && root.matches(".mc-shared-page,#sirk-platform-admin,.sirk-desktop-commands-panel")) {
            root.setAttribute("data-mesh-ui", modern ? "modern" : "classic");
        }
        queryAll(root, ".mc-shared-page,#sirk-platform-admin,.sirk-desktop-commands-panel", function (element) {
            element.setAttribute("data-mesh-ui", modern ? "modern" : "classic");
        });

        queryAll(root, ".mc-shared-toolbar-button,.mc-tree-script-action,.mc-results-view-button,.mc-results-copy-button,.mc-definition-remove,.mc-command-run-button,.mc-admin-primary,.mc-admin-secondary,.mc-admin-toolbar button,.mc-admin-inline-actions button,.mc-admin-table-actions button,.mc-move-dialog-actions button,.sirk-quick-command-fallback-close,.sirk-quick-command-submit", function (element) {
            applyButton(element);
        });
        queryAll(root, ".mc-shared-nav-item,.mc-approval-provider,.mc-approval-status,.mc-catalog-results,.mc-tree-root,.mc-tree-script,.mc-tree-folder-header,.sirk-quick-command-browser button,.mc-admin-tabs>button,.mc-admin-settings-subnav button,.mc-admin-settings-nav button", applyNav);
        queryAll(root, ".mc-shared-tab", applyTab);
        queryAll(root, ".mc-shared-card,.mc-approval-request-card,.mc-definition-section,.mc-script-editor-card,.mc-multi-editor-card,.mc-script-definition-card,.mc-script-credentials-card,.mc-admin-card,.mc-admin-provider-card,.mc-admin-permission-folder,.mc-results-debug", applyCard);
        queryAll(root, ".sirk-desktop-commands-panel,.sirk-quick-command-details,.mc-move-dialog,.mc-results-viewer", applyPanel);
        queryAll(root, "input:not([type=button]):not([type=submit]):not([type=reset]),textarea,select", applyControl);
        queryAll(root, ".mc-results-table,.mc-definition-table,.mc-admin-table", applyTable);
        queryAll(root, ".mc-shared-muted,.mc-admin-subtitle,.mc-admin-card-description,.mc-admin-field-description,.mc-admin-table-secondary,.sirk-quick-command-description", applyMuted);
        queryAll(root, "[class*='sirk-result-status-'],[class*='mc-results-status-'],[class*='mc-approval-request-status-'],.mc-admin-state", applyStatus);
        return root;
    }

    function schedule(root) {
        if (scheduled) return;
        scheduled = true;
        window.setTimeout(function () {
            scheduled = false;
            refresh(root || document);
        }, 0);
    }

    function installObserver() {
        if (window.__sirkMeshThemeObserver || typeof MutationObserver !== "function") return;
        var target = document.body || document.documentElement;
        if (!target) return;
        window.__sirkMeshThemeObserver = new MutationObserver(function (records) {
            var relevant = false;
            records.some(function (record) {
                if (record.type === "attributes") {
                    relevant = true;
                    return true;
                }
                return Array.prototype.some.call(record.addedNodes || [], function (node) {
                    if (!node || node.nodeType !== 1) return false;
                    if (node.matches && node.matches(".mc-shared-page,#sirk-platform-admin,.sirk-desktop-commands-panel,.mc-results-viewer,.mc-move-dialog")) return true;
                    return !!(node.querySelector && node.querySelector(".mc-shared-page,#sirk-platform-admin,.sirk-desktop-commands-panel,.mc-results-viewer,.mc-move-dialog"));
                });
            });
            if (relevant) schedule(document);
        });
        window.__sirkMeshThemeObserver.observe(target, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class", "data-bs-theme"]
        });
    }

    window.MeshThemeAdapter = {
        isModern: isModern,
        refresh: refresh,
        schedule: schedule,
        button: applyButton,
        nav: applyNav,
        tab: applyTab,
        card: applyCard,
        panel: applyPanel,
        control: applyControl,
        table: applyTable,
        status: applyStatus
    };

    installObserver();
    schedule(document);
}());
