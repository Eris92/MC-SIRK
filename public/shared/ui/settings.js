(function () {
    "use strict";
    window.SharedSettings = {
        section: function (title, content, expanded) {
            var root = document.createElement("section"); root.className = "mc-shared-settings-section";
            var header = document.createElement("button"); header.type = "button"; header.className = "mc-shared-settings-header"; header.textContent = title;
            var panel = document.createElement("div"); panel.className = "mc-shared-settings-content"; panel.hidden = expanded !== true;
            if (content) panel.appendChild(content); header.onclick = function () { panel.hidden = !panel.hidden; };
            root.appendChild(header); root.appendChild(panel); return root;
        },
        form: function (title) { var form = document.createElement("div"); form.className = "mc-shared-settings-form"; if (title) { var h = document.createElement("h3"); h.textContent = title; form.appendChild(h); } return form; }
    };
}());

(function () {
    "use strict";

    if (window.__sirkNativeThemeLifecycleInstalled) return;
    window.__sirkNativeThemeLifecycleInstalled = true;
    var pending = false;

    function pluginRoot(node) {
        if (!node) return null;
        if (node.nodeType !== 1) node = node.parentElement;
        if (!node) return null;
        if (node.matches && node.matches(".mc-shared-page,#sirk-platform-admin,.sirk-desktop-commands-panel,.mc-results-viewer,.mc-move-dialog")) return node;
        return node.closest ? node.closest(".mc-shared-page,#sirk-platform-admin,.sirk-desktop-commands-panel,.mc-results-viewer,.mc-move-dialog") : null;
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

    function syncNativeContainers(root) {
        var adapter = window.MeshThemeAdapter;
        if (!adapter || !root) return;
        var modern = adapter.isModern();
        sanitizeGeneratedStyles();
        adapter.refresh(root);

        Array.prototype.forEach.call(root.querySelectorAll(".mc-shared-toolbar-button,.mc-tree-script-action,.sirk-desktop-commands-toggle,.sirk-quick-command-fallback-close"), function (button) {
            var outputToggle = button.classList.contains("sirk-quick-command-output-toggle");
            var outputActive = outputToggle && button.classList.contains("is-active");
            var outputPressed = outputToggle ? button.getAttribute("aria-pressed") : null;

            if (modern) {
                button.classList.toggle("active", !outputToggle && (button.classList.contains("is-active") || button.getAttribute("aria-pressed") === "true"));
            } else {
                button.classList.remove("active");
            }

            // Show/Hide output is a status action, not a selected navigation mode.
            // Keep its logical state for accessibility but apply a neutral native button class.
            if (outputToggle) {
                button.classList.remove("is-active");
                button.setAttribute("aria-pressed", "false");
            }
            adapter.button(button);
            if (outputToggle) {
                if (outputActive) button.classList.add("is-active");
                button.setAttribute("aria-pressed", outputPressed == null ? "false" : outputPressed);
            }
        });
        Array.prototype.forEach.call(root.querySelectorAll(".sirk-quick-command-output-toggle,.sirk-quick-command-details-toggle"), function (button) {
            var attention = button.classList.contains("has-output-attention") || button.classList.contains("has-attention");
            button.classList.toggle("text-danger", modern && attention);
            button.classList.toggle("border-danger", modern && attention);
        });
        Array.prototype.forEach.call(root.querySelectorAll(".mc-tree-credential-action:not(.mc-tree-action-disabled)"), function (button) {
            button.classList.toggle("text-warning", modern);
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

    function schedule(root) {
        if (pending) return;
        pending = true;
        window.setTimeout(function () {
            pending = false;
            sanitizeGeneratedStyles();
            var targets = root ? [root] : Array.prototype.slice.call(document.querySelectorAll(".mc-shared-page,#sirk-platform-admin,.sirk-desktop-commands-panel,.mc-results-viewer,.mc-move-dialog"));
            targets.forEach(syncNativeContainers);
        }, 0);
    }

    if (typeof MutationObserver === "function") {
        new MutationObserver(function (records) {
            var root = null;
            records.some(function (record) {
                root = pluginRoot(record.target);
                if (root) return true;
                return Array.prototype.some.call(record.addedNodes || [], function (node) {
                    root = pluginRoot(node);
                    return !!root;
                });
            });
            if (root) schedule(root);
        }).observe(document.body || document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class", "aria-pressed", "aria-selected", "data-bs-theme"]
        });
        if (document.head) {
            new MutationObserver(function () { sanitizeGeneratedStyles(); }).observe(document.head, { childList: true, subtree: true });
        }
    }
    schedule();
}());
