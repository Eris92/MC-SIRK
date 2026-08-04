(function () {
    "use strict";

    var QUICK_PREFERENCES_KEY = "sirkPlatform.mycommands.preferences";

    function resolve(value) {
        return typeof value === "string"
            ? document.querySelector(value)
            : value;
    }

    function isQuickToolbar(host) {
        return !!(host && host.classList && host.classList.contains("sirk-quick-command-toolbar-host"));
    }

    function readQuickPreferences() {
        try {
            var value = JSON.parse(window.localStorage.getItem(QUICK_PREFERENCES_KEY) || "{}");
            return value && typeof value === "object" && !Array.isArray(value) ? value : {};
        } catch (error) {
            return {};
        }
    }

    function writeQuickFavoritesOnly(value) {
        try {
            var preferences = readQuickPreferences();
            preferences.quickFavoritesOnly = value === true;
            window.localStorage.setItem(QUICK_PREFERENCES_KEY, JSON.stringify(preferences));
        } catch (error) {}
    }

    function readQuickFavoritesOnly() {
        var preferences = readQuickPreferences();
        if (typeof preferences.quickFavoritesOnly === "boolean") return preferences.quickFavoritesOnly;
        if (typeof preferences.favoritesOnly === "boolean") {
            writeQuickFavoritesOnly(preferences.favoritesOnly);
            return preferences.favoritesOnly;
        }
        return null;
    }

    function buttonPressed(item) {
        return !!(item && (
            item.classList.contains("is-active") ||
            item.getAttribute("aria-pressed") === "true"
        ));
    }

    function restoreQuickFavorites(item) {
        if (!item) return;
        window.setTimeout(function () {
            if (item.isConnected === false || typeof item.click !== "function") return;
            var preferred = readQuickFavoritesOnly();
            if (preferred == null || preferred === buttonPressed(item)) return;
            item.__sirkQuickFavoritesRestoring = true;
            try {
                item.click();
            } finally {
                item.__sirkQuickFavoritesRestoring = false;
            }
        }, 0);
    }

    function button(definition) {
        var value = document.createElement("button");
        value.type = "button";
        value.className = "btn btn-secondary btn-sm mc-shared-toolbar-button mc-portal-toolbar-button";
        value.title = definition.title || definition.key;
        value.setAttribute("aria-label", value.title);
        value.innerHTML = '<span class="mc-shared-toolbar-icon mc-portal-toolbar-icon"></span>';
        var icon = definition.icon || definition.title || definition.key;
        if (String(icon).indexOf("<svg") === 0) value.firstChild.innerHTML = icon;
        else value.firstChild.textContent = icon;
        return value;
    }

    function activePage() {
        var pages = Array.prototype.slice.call(document.querySelectorAll(".mc-shared-page"));
        for (var index = pages.length - 1; index >= 0; index -= 1) {
            var page = pages[index];
            if (!page.hidden && page.offsetParent !== null) return page;
        }
        return document.getElementById("SirkPlatformWorkspace") || null;
    }

    function resultsActive() {
        var page = activePage();
        return !!(page && page.querySelector(".mc-catalog-results.active,.mc-catalog-results.is-active"));
    }

    function firstCatalogRoot() {
        var page = activePage();
        return page ? page.querySelector(".mc-tree-root") : null;
    }

    function leaveResultsAfterFavoritesRender() {
        window.setTimeout(function () {
            var root = firstCatalogRoot();
            if (root) root.click();
        }, 0);
    }

    window.SharedToolbar = {
        mount: function (options) {
            options = options || {};
            var host = resolve(options.container);
            if (!host) throw new Error("Toolbar container not found.");
            var quickToolbar = isQuickToolbar(host);

            var root = document.createElement("div");
            root.className = "mc-shared-toolbar mc-portal-toolbar";
            var left = document.createElement("div");
            left.className = "mc-shared-toolbar-group mc-shared-toolbar-left";
            var center = document.createElement("div");
            center.className = "mc-shared-toolbar-group mc-shared-toolbar-center";
            var right = document.createElement("div");
            right.className = "mc-shared-toolbar-group mc-shared-toolbar-right";
            root.appendChild(left);
            root.appendChild(center);
            root.appendChild(right);

            var searchWrap = document.createElement("div");
            searchWrap.className = "mc-shared-toolbar-search";
            searchWrap.hidden = true;
            var searchInput = document.createElement("input");
            searchInput.type = "search";
            searchInput.className = "mc-portal-filter";
            searchInput.placeholder = options.searchPlaceholder || "Search";
            searchWrap.appendChild(searchInput);

            var context = {
                root: root,
                groups: { left: left, center: center, right: right },
                buttons: {},
                searchWrap: searchWrap,
                searchInput: searchInput,
                state: { search: "", searchVisible: false },
                onSearch: options.handlers && options.handlers.onSearch
            };
            var api = window.SharedToolbarApi.create(context);
            var handlers = options.handlers || {};

            function add(definition) {
                var item = button(definition);
                context.buttons[definition.key] = item;
                var group = context.groups[definition.side] || right;
                group.appendChild(item);
                item.onclick = function (event) {
                    if (definition.search) {
                        api.showSearch(!context.state.searchVisible);
                        return;
                    }

                    var quickFavorites = quickToolbar && definition.key === "favorites";
                    var nextQuickFavorites = quickFavorites ? !buttonPressed(item) : null;
                    var favoriteFromResults = definition.key === "favorites" && resultsActive();
                    var catalogRoot = favoriteFromResults ? firstCatalogRoot() : null;
                    if (catalogRoot) catalogRoot.click();

                    var handler = definition.onClick || handlers[definition.handler];
                    if (typeof handler === "function") handler(api, event, definition);
                    if (quickFavorites) writeQuickFavoritesOnly(nextQuickFavorites);

                    // With an empty favorites filter Results has no catalog root to click
                    // before the toggle. After Show all renders the roots again, leave
                    // Results immediately so the user is never trapped in that view.
                    if (favoriteFromResults && !catalogRoot) leaveResultsAfterFavoritesRender();
                };
                return item;
            }

            window.SharedToolbarConfig.resolve(
                options.preset,
                options.buttons
            ).forEach(add);

            (options.customButtons || []).sort(function (a, b) {
                return Number(a.order || 500) - Number(b.order || 500);
            }).forEach(function (definition) {
                definition.side = definition.side || "right";
                definition.key = definition.key || ("custom-" + Object.keys(context.buttons).length);
                add(definition);
            });

            if (context.buttons.search) left.appendChild(searchWrap);
            api.addButton = add;

            var timer = 0;
            searchInput.oninput = function () {
                context.state.search = searchInput.value || "";
                clearTimeout(timer);
                timer = setTimeout(function () {
                    if (typeof handlers.onSearch === "function") handlers.onSearch(context.state.search, api);
                }, 120);
            };

            if (context.buttons.clear && typeof handlers.onClear !== "function") {
                context.buttons.clear.onclick = function () { api.clearSearch(true); };
            }

            center.hidden = center.childNodes.length === 0;
            right.hidden = right.childNodes.length === 0;
            root.hidden = Object.keys(context.buttons).length === 0;
            host.appendChild(root);
            if (quickToolbar) restoreQuickFavorites(context.buttons.favorites);
            return api;
        }
    };
}());
