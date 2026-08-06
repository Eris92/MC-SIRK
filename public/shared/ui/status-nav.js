(function () {
    "use strict";

    function svg(path) { return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + "</svg>"; }
    var statuses = [
        { key: "", title: "All", icon: svg('<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h8"/>') },
        { key: "pending", title: "Pending", icon: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>') },
        { key: "executing", title: "Executing", icon: svg('<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/>') },
        { key: "approved", title: "Approved", icon: svg('<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16.5 9"/>') },
        { key: "completed", title: "Completed", icon: svg('<path d="M4 5h16v14H4z"/><path d="m8 12 2.5 2.5L16 9"/>') },
        { key: "failed", title: "Failed", icon: svg('<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>') },
        { key: "rejected", title: "Rejected", icon: svg('<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>') }
    ];

    function applyTheme(element) {
        if (window.MeshThemeAdapter) window.MeshThemeAdapter.status(element);
    }

    window.SharedStatusNav = {
        list: function (counts) {
            return statuses.map(function (item) {
                return { key: item.key, title: item.title, icon: item.icon, badge: counts && counts[item.key] };
            });
        },
        mount: function (host, options) {
            host.innerHTML = "";
            options = options || {};
            this.list(options.counts).forEach(function (item) {
                var button = document.createElement("button");
                button.type = "button";
                button.className = "mc-shared-nav-item mc-portal-nav-item sirk-management-item sirk-result-status sirk-result-status-" + (item.key || "all");
                var icon = document.createElement("span");
                icon.className = "sirk-management-item-icon sirk-result-status-icon mc-portal-nav-icon";
                icon.innerHTML = item.icon;
                var label = document.createElement("span");
                label.className = "mc-portal-nav-label";
                label.textContent = item.title + (item.badge == null ? "" : " (" + item.badge + ")");
                button.appendChild(icon);
                button.appendChild(label);
                button.classList.toggle("active", item.key === options.selected);
                button.classList.toggle("is-active", item.key === options.selected);
                button.onclick = function () {
                    if (typeof options.onSelect === "function") options.onSelect(item.key);
                };
                host.appendChild(button);
                if (window.MeshThemeAdapter) window.MeshThemeAdapter.nav(button);
                applyTheme(button);
            });
        }
    };
}());

(function () {
    "use strict";

    var ITEM_SELECTOR = [
        ".mc-shared-page-approvalcenter button.mc-shared-nav-item",
        ".mc-shared-page-approvalcenter button.mc-tree-folder-header",
        ".mc-shared-page-approvalcenter button.mc-tree-script",
        ".mc-shared-page-mycommands button.mc-shared-nav-item",
        ".mc-shared-page-mycommands button.mc-tree-folder-header",
        ".mc-shared-page-mycommands button.mc-tree-script",
        ".mc-shared-page-myscripts button.mc-shared-nav-item",
        ".mc-shared-page-myscripts button.mc-tree-folder-header",
        ".mc-shared-page-myscripts button.mc-tree-script",
        ".sirk-quick-command-browser nav > button"
    ].join(",");
    var ICON_SELECTOR = [
        ".sirk-shared-list-icon",
        ".sirk-quick-command-icon",
        ".mc-nav-icon",
        ".mc-approval-nav-icon",
        ".mc-portal-nav-icon",
        ".sirk-management-item-icon",
        ".mc-tree-fallback-icon",
        ".mc-tree-folder-icon",
        ".mc-tree-icon",
        "img"
    ].join(",");
    var LABEL_SELECTOR = [
        ".sirk-shared-list-label",
        ".sirk-quick-command-label",
        ".mc-approval-label",
        ".mc-approval-nav-label",
        ".mc-portal-nav-label",
        ".mc-tree-label"
    ].join(",");
    var STATUS_CLASSES = ["text-warning", "text-info", "text-success", "text-danger", "text-primary"];
    var scheduled = false;
    var pendingRoot = null;

    function statusClass(element) {
        var value = String(element && element.className || "");
        if (/pending/i.test(value)) return "text-warning";
        if (/executing/i.test(value)) return "text-info";
        if (/(approved|completed|ready)/i.test(value)) return "text-success";
        if (/(failed|rejected|error)/i.test(value)) return "text-danger";
        if (/sirk-result-status-all/i.test(value)) return "text-primary";
        return "";
    }

    function moveStatusToIcon(element) {
        if (!element || !element.classList) return;
        var icon = typeof element.querySelector === "function" ? element.querySelector(ICON_SELECTOR) : null;
        var desired = statusClass(element);
        STATUS_CLASSES.forEach(function (name) {
            element.classList.remove(name);
            if (icon && name !== desired) icon.classList.remove(name);
        });
        if (icon && desired) icon.classList.add(desired);
    }

    function normalizeItem(element) {
        if (!element || !element.classList) return element;
        var selected = element.classList.contains("active") ||
            element.classList.contains("is-active") ||
            element.getAttribute("aria-selected") === "true" ||
            element.getAttribute("aria-current") === "page";
        var icon = typeof element.querySelector === "function" ? element.querySelector(ICON_SELECTOR) : null;
        var label = typeof element.querySelector === "function" ? element.querySelector(LABEL_SELECTOR) : null;

        element.classList.add("sirk-shared-list-item");
        element.classList.toggle("active", selected);
        element.classList.toggle("is-active", selected);
        element.setAttribute("aria-selected", selected ? "true" : "false");
        if (icon) icon.classList.add("sirk-shared-list-icon");
        if (label) label.classList.add("sirk-shared-list-label");

        if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.nav === "function") {
            window.MeshThemeAdapter.nav(element);
        }
        moveStatusToIcon(element);
        return element;
    }

    function normalize(root) {
        if (!root || typeof root.querySelectorAll !== "function") return root;
        if (root.matches && root.matches(ITEM_SELECTOR)) normalizeItem(root);
        Array.prototype.forEach.call(root.querySelectorAll(ITEM_SELECTOR), normalizeItem);
        return root;
    }

    function schedule(root) {
        if (root && (!pendingRoot || root === document)) pendingRoot = root;
        if (scheduled) return;
        scheduled = true;
        Promise.resolve().then(function () {
            var target = pendingRoot || document;
            pendingRoot = null;
            scheduled = false;
            normalize(target);
        });
    }

    function wrapThemeAdapter() {
        var adapter = window.MeshThemeAdapter;
        if (!adapter || adapter.__sirkSharedListContract) return;
        adapter.__sirkSharedListContract = true;

        var originalRefresh = adapter.refresh;
        var originalStatus = adapter.status;
        adapter.refresh = function (root) {
            var result = typeof originalRefresh === "function" ? originalRefresh.call(adapter, root) : root;
            normalize(root || document);
            return result;
        };
        adapter.status = function (element) {
            var result = typeof originalStatus === "function" ? originalStatus.call(adapter, element) : element;
            if (element && element.classList && element.classList.contains("sirk-shared-list-item")) {
                moveStatusToIcon(element);
            }
            return result;
        };
        adapter.listItem = normalizeItem;
    }

    function install() {
        wrapThemeAdapter();
        normalize(document);
        if (window.__sirkSharedListObserver || typeof MutationObserver !== "function") return;
        var observer = new MutationObserver(function (records) {
            records.forEach(function (record) {
                Array.prototype.forEach.call(record.addedNodes || [], function (node) {
                    if (node && node.nodeType === 1) schedule(node);
                });
            });
        });
        observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
        window.__sirkSharedListObserver = observer;
    }

    window.SirkSharedListContract = {
        normalize: normalize,
        normalizeItem: normalizeItem,
        schedule: schedule
    };
    install();
}());
