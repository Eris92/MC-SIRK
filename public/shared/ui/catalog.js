(function () {
    "use strict";

    function setSelected(button, selected) {
        if (!button || !button.classList) return;
        button.classList.toggle("active", selected);
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-selected", selected ? "true" : "false");
    }

    function selectOnly(button) {
        var host = button && button.parentNode;
        Array.prototype.slice.call(host && host.children || []).forEach(function (item) {
            setSelected(item, item === button);
        });
    }

    function applyTheme(button) {
        if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.nav === "function") {
            window.MeshThemeAdapter.nav(button);
        }
        if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.status === "function") {
            window.MeshThemeAdapter.status(button);
        }
    }

    function createResultsButton(host, active, onClick) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "mc-shared-nav-item mc-portal-nav-item sirk-management-item mc-catalog-results sirk-result-status sirk-result-status-all";
        button.title = "Results";
        button.setAttribute("aria-label", "Results");

        var icon = document.createElement("span");
        icon.className = "mc-tree-fallback-icon sirk-management-item-icon sirk-result-status-icon mc-portal-nav-icon";
        icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h8"/></svg>';

        var copy = document.createElement("span");
        copy.className = "sirk-shared-list-copy";
        var label = document.createElement("span");
        label.className = "mc-tree-label mc-portal-nav-label";
        label.textContent = "Results";
        copy.appendChild(label);

        button.appendChild(icon);
        button.appendChild(copy);
        setSelected(button, active === true);
        button.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (button.disabled) return;
            selectOnly(button);
            if (typeof onClick === "function") onClick(event, button);
        }, true);
        host.appendChild(button);
        applyTheme(button);
        return button;
    }

    function removeRoots(host) {
        Array.prototype.slice.call(host && host.children || []).forEach(function (child) {
            if (child && child.getAttribute && child.getAttribute("data-sirk-catalog-root") === "1") {
                host.removeChild(child);
            }
        });
    }

    function rootHost(host, anchor) {
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
                if (String(value || "") !== "") throw new Error("Catalog root host only supports clearing.");
                removeRoots(host);
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
            var anchor = document.createComment("catalog-roots");

            function addResults() {
                createResultsButton(host, options.resultsActive, options.onResults);
            }

            if (options.resultsPosition !== "end") addResults();
            host.appendChild(anchor);
            if (options.resultsPosition === "end") addResults();

            var state = window.SharedDirectoryTree.mount({
                rootsContainer: rootHost(host, anchor),
                treeContainer: options.treeContainer || document.createElement("div"),
                tree: options.tree,
                state: options.state,
                search: options.search || "",
                emptyText: options.emptyText,
                emptyFolderText: options.emptyFolderText,
                filterScript: options.filterScript,
                scriptActions: options.scriptActions,
                onRootSelect: options.onRootSelect,
                onScript: options.onScript
            });

            if (options.resultsActive) {
                Array.prototype.slice.call(host.children || []).forEach(function (button) {
                    if (button && button.getAttribute && button.getAttribute("data-sirk-catalog-root") === "1") {
                        setSelected(button, false);
                    }
                });
            }
            return state;
        }
    };
}());
