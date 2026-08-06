(function () {
    "use strict";

    function svg(path) {
        return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + "</svg>";
    }

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
        if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.status === "function") {
            window.MeshThemeAdapter.status(element);
        }
    }

    window.SharedStatusNav = {
        list: function (counts) {
            return statuses.map(function (item) {
                return {
                    key: item.key,
                    title: item.title,
                    icon: item.icon,
                    badge: counts && counts[item.key]
                };
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
                if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.nav === "function") {
                    window.MeshThemeAdapter.nav(button);
                }
                applyTheme(button);
            });
        }
    };
}());

(function () {
    "use strict";

    var CONTRACT_VERSION = "1.8.15";
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
        ".sirk-quick-command-browser .sirk-quick-command-categories > button",
        ".sirk-quick-command-browser .sirk-quick-command-tree > button"
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
    var COPY_SELECTOR = ".sirk-shared-list-copy,.sirk-quick-command-copy";
    var STATUS_CLASSES = ["text-warning", "text-info", "text-success", "text-danger", "text-primary"];
    var scheduled = false;
    var pendingRoots = [];

    function statusClass(element) {
        var value = String(element && element.className || "");
        if (/pending/i.test(value)) return "text-warning";
        if (/executing/i.test(value)) return "text-info";
        if (/(approved|completed|ready)/i.test(value)) return "text-success";
        if (/(failed|rejected|error)/i.test(value)) return "text-danger";
        if (/sirk-result-status-all/i.test(value)) return "text-primary";
        return "";
    }

    function directApprovalIndicator(element) {
        if (!element || !element.children) return null;
        for (var index = 0; index < element.children.length; index += 1) {
            var child = element.children[index];
            if (child && child.classList && child.classList.contains("mc-tree-approval")) return child;
        }
        return null;
    }

    function ensureCopy(element, icon, label) {
        if (!element || !label) return null;
        var copy = typeof element.querySelector === "function" ? element.querySelector(COPY_SELECTOR) : null;
        if (!copy) {
            copy = document.createElement("span");
            copy.className = "sirk-shared-list-copy sirk-quick-command-copy";
            if (icon && icon.parentNode === element) element.insertBefore(copy, icon.nextSibling);
            else element.insertBefore(copy, label);
        } else {
            copy.classList.add("sirk-shared-list-copy", "sirk-quick-command-copy");
        }

        if (label.parentNode !== copy) copy.appendChild(label);
        var approval = directApprovalIndicator(element) ||
            (typeof copy.querySelector === "function" ? copy.querySelector(".mc-tree-approval") : null);
        if (approval && approval.parentNode !== copy) copy.appendChild(approval);
        copy.classList.toggle("has-approval", !!approval);
        return copy;
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

    function isSelected(element) {
        return !!(element && element.classList && (
            element.classList.contains("active") ||
            element.classList.contains("is-active") ||
            element.getAttribute("aria-selected") === "true" ||
            element.getAttribute("aria-current") === "page"
        ));
    }

    function normalizeItem(element) {
        if (!element || !element.classList) return element;
        var selected = isSelected(element);

        if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.nav === "function") {
            window.MeshThemeAdapter.nav(element);
        }

        var icon = typeof element.querySelector === "function" ? element.querySelector(ICON_SELECTOR) : null;
        var label = typeof element.querySelector === "function" ? element.querySelector(LABEL_SELECTOR) : null;

        element.classList.add("sirk-shared-list-item");
        element.setAttribute("data-sirk-list-contract", "1");
        element.setAttribute("data-sirk-list-contract-version", CONTRACT_VERSION);
        element.setAttribute("data-sirk-list-selected", selected ? "1" : "0");
        element.classList.toggle("active", selected);
        element.classList.toggle("is-active", selected);
        element.setAttribute("aria-selected", selected ? "true" : "false");

        if (icon) icon.classList.add("sirk-shared-list-icon");
        if (label) {
            label.classList.add("sirk-shared-list-label", "sirk-quick-command-label");
            ensureCopy(element, icon, label);
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

    function queueRoot(root) {
        if (!root || pendingRoots.indexOf(root) >= 0) return;
        pendingRoots.push(root);
    }

    function schedule(root) {
        queueRoot(root || document);
        if (scheduled) return;
        scheduled = true;
        Promise.resolve().then(function () {
            var roots = pendingRoots.slice();
            pendingRoots = [];
            scheduled = false;
            roots.forEach(normalize);
        });
    }

    function installExactQuickStyle() {
        var existing = document.getElementById("sirk-exact-quick-list-contract");
        if (existing) existing.remove();

        var owner = 'html.sirk-platform-native-ui body button.sirk-shared-list-item.sirk-shared-list-item[data-sirk-list-contract="1"][data-sirk-list-contract="1"]';
        var selected = owner + '[data-sirk-list-selected="1"],' + owner + '.active,' + owner + '.is-active,' + owner + '[aria-selected="true"]';
        var style = document.createElement("style");
        style.id = "sirk-exact-quick-list-contract";
        style.setAttribute("data-sirk-list-contract-version", CONTRACT_VERSION);
        style.textContent = [
            owner + "{display:grid!important;grid-template-columns:24px minmax(0,1fr)!important;gap:8px!important;align-items:start!important;width:100%!important;min-width:0!important;min-height:36px!important;margin:0 0 3px!important;padding:8px!important;box-sizing:border-box!important;text-align:left!important;cursor:pointer!important;font:inherit!important;font-size:inherit!important;font-weight:inherit!important;line-height:1.28!important;white-space:normal!important;background:transparent!important;color:inherit!important;border:1px solid transparent!important;border-radius:0!important;outline:0!important;box-shadow:none!important;text-decoration:none!important;transform:none!important;scale:none!important;zoom:1!important}",
            owner + ":hover," + owner + ":focus-visible{background:var(--bs-list-group-action-hover-bg,rgba(127,127,127,.12))!important;color:var(--bs-list-group-action-hover-color,inherit)!important;border-color:transparent!important;border-radius:0!important;outline:0!important;box-shadow:none!important;transform:none!important;scale:none!important;zoom:1!important}",
            selected + "{background:transparent!important;color:inherit!important;border-color:var(--bs-list-group-active-border-color,var(--bs-border-color,currentColor))!important;border-radius:0!important;outline:0!important;box-shadow:none!important;transform:none!important;scale:none!important;zoom:1!important}",
            ".sirk-shared-list-icon{display:grid!important;place-items:center!important;width:20px!important;min-width:20px!important;max-width:20px!important;height:20px!important;flex:0 0 20px!important;object-fit:contain!important}",
            ".sirk-shared-list-icon svg{display:block!important;width:20px!important;height:20px!important}",
            ".sirk-shared-list-copy{display:block!important;min-width:0!important}",
            ".sirk-shared-list-copy.has-approval{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:start!important;gap:6px!important;min-width:0!important}",
            ".sirk-shared-list-label{display:block!important;min-width:0!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere!important;word-break:break-word!important;line-height:1.28!important;color:inherit!important}",
            ".sirk-shared-list-copy .mc-tree-approval{display:inline-flex!important;align-items:center!important;justify-content:center!important;align-self:start!important;flex:0 0 auto!important;margin:0!important;padding:0!important;line-height:1.28!important;white-space:nowrap!important}",
            ".mc-tree-folder-header.sirk-shared-list-item{grid-template-columns:20px minmax(0,1fr)!important;padding-left:calc(8px + (var(--mc-tree-depth,0) * 12px))!important}",
            ".mc-tree-script.sirk-shared-list-item{padding-left:calc(8px + (var(--mc-tree-depth,0) * 12px))!important}",
            ".mc-tree-script-row{margin:0!important;transform:none!important;scale:none!important;zoom:1!important}",
            ".mc-tree-script-row>.sirk-shared-list-item{flex:1 1 auto!important;min-width:0!important;margin:0 0 3px!important}",
            ".mc-shared-page[data-mesh-ui=\"modern\"] :is(.mc-shared-primary,.mc-shared-secondary,.mc-shared-details),.sirk-desktop-commands-panel[data-mesh-ui=\"modern\"] :is(.sirk-quick-command-categories,.sirk-quick-command-tree,.sirk-quick-command-details){background-color:var(--bs-body-bg)!important;color:inherit!important}",
            ".mc-approval-provider.sirk-shared-list-item,.mc-approval-status.sirk-shared-list-item{font:inherit!important;font-size:inherit!important;font-weight:inherit!important}",
            ".mc-shared-layout.is-collapsed .mc-shared-primary>button.sirk-shared-list-item[data-sirk-list-contract=\"1\"],.sirk-quick-command-browser.is-collapsed .mc-shared-primary>button.sirk-shared-list-item[data-sirk-list-contract=\"1\"]{display:flex!important;align-items:center!important;justify-content:center!important;width:48px!important;min-width:48px!important;height:42px!important;min-height:42px!important;margin:0 auto 3px!important;padding:6px!important;font-size:0!important}",
            ".mc-shared-layout.is-collapsed .mc-shared-primary>button.sirk-shared-list-item[data-sirk-list-contract=\"1\"] .sirk-shared-list-copy,.sirk-quick-command-browser.is-collapsed .mc-shared-primary>button.sirk-shared-list-item[data-sirk-list-contract=\"1\"] .sirk-shared-list-copy{display:none!important}",
            ".mc-shared-layout.is-collapsed .mc-shared-primary>button.sirk-shared-list-item[data-sirk-list-contract=\"1\"] .sirk-shared-list-icon,.sirk-quick-command-browser.is-collapsed .mc-shared-primary>button.sirk-shared-list-item[data-sirk-list-contract=\"1\"] .sirk-shared-list-icon{width:28px!important;min-width:28px!important;max-width:28px!important;height:28px!important;flex-basis:28px!important}",
            ".mc-shared-layout.is-collapsed .mc-shared-primary>button.sirk-shared-list-item[data-sirk-list-contract=\"1\"] .sirk-shared-list-icon svg,.sirk-quick-command-browser.is-collapsed .mc-shared-primary>button.sirk-shared-list-item[data-sirk-list-contract=\"1\"] .sirk-shared-list-icon svg{width:24px!important;height:24px!important}"
        ].join("");
        (document.head || document.documentElement).appendChild(style);
        document.documentElement.setAttribute("data-sirk-list-contract-version", CONTRACT_VERSION);
        return style;
    }

    function wrapThemeAdapter() {
        var adapter = window.MeshThemeAdapter;
        if (!adapter) return;
        if (!adapter.__sirkSharedListOriginalRefresh) {
            adapter.__sirkSharedListOriginalRefresh = adapter.refresh;
        }
        if (!adapter.__sirkSharedListOriginalStatus) {
            adapter.__sirkSharedListOriginalStatus = adapter.status;
        }

        adapter.refresh = function (root) {
            var original = adapter.__sirkSharedListOriginalRefresh;
            var result = typeof original === "function" ? original.call(adapter, root) : root;
            schedule(root || document);
            return result;
        };
        adapter.status = function (element) {
            var original = adapter.__sirkSharedListOriginalStatus;
            var result = typeof original === "function" ? original.call(adapter, element) : element;
            if (element && element.classList && element.classList.contains("sirk-shared-list-item")) {
                moveStatusToIcon(element);
            }
            return result;
        };
        adapter.listItem = normalizeItem;
        adapter.__sirkSharedListContractVersion = CONTRACT_VERSION;
    }

    function installObserver() {
        if (window.__sirkSharedListObserver && typeof window.__sirkSharedListObserver.disconnect === "function") {
            window.__sirkSharedListObserver.disconnect();
        }
        if (typeof MutationObserver !== "function") return;

        var observer = new MutationObserver(function (records) {
            records.forEach(function (record) {
                Array.prototype.forEach.call(record.addedNodes || [], function (node) {
                    if (node && node.nodeType === 1) queueRoot(node);
                });
            });
            schedule();
        });
        observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
        observer.__sirkContractVersion = CONTRACT_VERSION;
        window.__sirkSharedListObserver = observer;
    }

    function install() {
        installExactQuickStyle();
        wrapThemeAdapter();
        normalize(document);
        installObserver();
    }

    window.SirkSharedListContract = {
        version: CONTRACT_VERSION,
        normalize: normalize,
        normalizeItem: normalizeItem,
        schedule: schedule,
        installStyle: installExactQuickStyle,
        reinstall: install
    };
    install();
}());
