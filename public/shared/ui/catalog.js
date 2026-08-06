(function () {
    "use strict";

    var CATALOG_CONTRACT_VERSION = "1.8.16";

    function createResultsButton(host, active, onClick) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "mc-shared-nav-item mc-portal-nav-item sirk-management-item mc-catalog-results sirk-result-status sirk-result-status-all";
        button.title = "Results";
        button.setAttribute("aria-label", "Results");

        var icon = document.createElement("span");
        icon.className = "mc-tree-fallback-icon sirk-management-item-icon sirk-result-status-icon mc-portal-nav-icon";
        icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h8"/></svg>';
        button.appendChild(icon);

        var label = document.createElement("span");
        label.className = "mc-tree-label mc-portal-nav-label";
        label.textContent = "Results";
        button.appendChild(label);

        button.classList.toggle("active", active === true);
        button.classList.toggle("is-active", active === true);
        button.onclick = onClick;
        host.appendChild(button);
        return button;
    }

    function removeDirectRoots(host) {
        Array.prototype.slice.call(host && host.children || []).forEach(function (child) {
            if (child && child.getAttribute && child.getAttribute("data-sirk-catalog-root") === "1") {
                host.removeChild(child);
            }
        });
    }

    function directRootHost(host, anchor) {
        var roots = {
            appendChild: function (button) {
                if (!button) return button;
                button.setAttribute("data-sirk-catalog-root", "1");
                button.classList.add("sirk-shared-catalog-root");
                host.insertBefore(button, anchor);
                return button;
            }
        };

        Object.defineProperty(roots, "innerHTML", {
            configurable: false,
            enumerable: true,
            get: function () { return ""; },
            set: function (value) {
                if (String(value || "") !== "") {
                    throw new Error("Shared catalog root host accepts only a clear operation.");
                }
                removeDirectRoots(host);
            }
        });
        return roots;
    }

    window.SharedCatalogView = {
        mount: function (options) {
            options = options || {};
            var host = options.primaryContainer;
            if (!host) throw new Error("Catalog primary container not found.");

            host.innerHTML = "";
            host.classList.add("sirk-shared-catalog-primary");
            host.setAttribute("data-sirk-catalog-contract-version", CATALOG_CONTRACT_VERSION);

            var rootAnchor = document.createComment("sirk-catalog-roots");
            function addResults() {
                return createResultsButton(host, options.resultsActive, function () {
                    if (typeof options.onResults === "function") options.onResults();
                });
            }

            if (options.resultsPosition !== "end") addResults();
            host.appendChild(rootAnchor);
            if (options.resultsPosition === "end") addResults();

            var roots = directRootHost(host, rootAnchor);
            var treeContainer = options.treeContainer || document.createElement("div");
            var state = window.SharedDirectoryTree.mount({
                rootsContainer: roots,
                treeContainer: treeContainer,
                tree: options.tree,
                state: options.state,
                search: options.search || "",
                emptyText: options.emptyText,
                emptyFolderText: options.emptyFolderText,
                filterScript: options.filterScript,
                scriptActions: options.scriptActions,
                onRootSelect: function (root) {
                    if (typeof options.onRootSelect === "function") options.onRootSelect(root);
                },
                onScript: function (script) {
                    if (typeof options.onScript === "function") options.onScript(script);
                }
            });

            if (options.resultsActive) {
                Array.prototype.slice.call(host.children || []).forEach(function (button) {
                    if (!button || !button.classList || button.getAttribute("data-sirk-catalog-root") !== "1") return;
                    button.classList.remove("active", "is-active");
                    button.setAttribute("aria-selected", "false");
                    button.setAttribute("data-sirk-list-selected", "0");
                });
            }
            if (window.SirkSharedListContract && typeof window.SirkSharedListContract.schedule === "function") {
                window.SirkSharedListContract.schedule(host);
            }
            return state;
        }
    };
}());
