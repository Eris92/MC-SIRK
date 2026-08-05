(function () {
    "use strict";

    var QUICK_PREFERENCES_KEY = "sirkPlatform.mycommands.preferences";
    var QUICK_OUTPUT_HIDDEN_KEY = "mc-sirk-quickcommands-output-hidden-v2";
    var QUICK_OUTPUT_ATTENTION_KEY = "mc-sirk-quickcommands-output-attention-v2";
    var QUICK_OUTPUT_LEGACY_HIDDEN_KEY = "mc-sirk-quickcommands-details-collapsed";
    var QUICK_OUTPUT_OLD_PREFERRED_KEY = "mc-sirk-quickcommands-details-preferred-collapsed";
    var QUICK_OUTPUT_OLD_ATTENTION_KEY = "mc-sirk-quickcommands-details-attention";

    function resolve(value) {
        return typeof value === "string"
            ? document.querySelector(value)
            : value;
    }

    function isQuickToolbar(host) {
        return !!(host && host.classList && host.classList.contains("sirk-quick-command-toolbar-host"));
    }

    function parseStoredBoolean(value) {
        if (value == null || value === "") return null;
        if (/^(1|true|yes|on)$/i.test(String(value))) return true;
        if (/^(0|false|no|off)$/i.test(String(value))) return false;
        return null;
    }

    function readStoredBoolean(key, fallback) {
        try {
            var value = parseStoredBoolean(window.localStorage.getItem(key));
            return value == null ? fallback : value;
        } catch (error) {
            return fallback;
        }
    }

    function writeStoredBoolean(key, value) {
        try { window.localStorage.setItem(key, value === true ? "1" : "0"); }
        catch (error) {}
    }

    function quickOutputHidden() {
        return readStoredBoolean(
            QUICK_OUTPUT_HIDDEN_KEY,
            readStoredBoolean(QUICK_OUTPUT_LEGACY_HIDDEN_KEY, false)
        );
    }

    function disableLegacyQuickOutputController() {
        writeStoredBoolean(QUICK_OUTPUT_OLD_PREFERRED_KEY, false);
        writeStoredBoolean(QUICK_OUTPUT_OLD_ATTENTION_KEY, false);
    }

    function setQuickOutputHidden(value) {
        var hidden = value === true;
        writeStoredBoolean(QUICK_OUTPUT_HIDDEN_KEY, hidden);
        writeStoredBoolean(QUICK_OUTPUT_LEGACY_HIDDEN_KEY, hidden);
        if (!hidden) writeStoredBoolean(QUICK_OUTPUT_ATTENTION_KEY, false);
        disableLegacyQuickOutputController();
        return hidden;
    }

    function quickOutputPanel(host) {
        return host && typeof host.closest === "function"
            ? host.closest(".sirk-desktop-commands-panel")
            : null;
    }

    function actualQuickOutputHidden(panel) {
        var browser = panel && panel.querySelector(".sirk-quick-command-browser");
        return !!(browser && browser.classList.contains("is-details-collapsed"));
    }

    function applyQuickOutputLayout(panel, hidden) {
        if (!panel) return;
        if (hidden) panel.setAttribute("data-sirk-output-hidden", "1");
        else panel.removeAttribute("data-sirk-output-hidden");
    }

    function quickOutputTitle(hidden, current) {
        var english = /^(Hide output|Show output)$/i.test(String(current || "").trim());
        if (hidden) return english ? "Show output" : "Pokaż wynik";
        return english ? "Hide output" : "Ukryj wynik";
    }

    function syncQuickOutputButton(item, hidden) {
        if (!item) return;
        var title = quickOutputTitle(hidden, item.title);
        item.title = title;
        item.setAttribute("aria-label", title);
        item.setAttribute("aria-pressed", hidden ? "false" : "true");
        item.classList.add("sirk-quick-command-details-toggle");
        item.classList.add("sirk-quick-command-output-toggle");
        item.classList.toggle("is-active", !hidden);
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

    function cloneDefinition(definition) {
        var value = {};
        Object.keys(definition || {}).forEach(function (key) {
            value[key] = definition[key];
        });
        return value;
    }

    function quickDefinitions(options) {
        var definitions = window.SharedToolbarConfig.resolve(
            options.preset,
            options.buttons
        ).slice();

        (options.customButtons || []).forEach(function (definition, index) {
            var value = cloneDefinition(definition);
            value.side = value.side || "right";
            value.key = value.key || ("custom-" + (definitions.length + index));
            definitions.push(value);
        });

        definitions.sort(function (a, b) {
            return Number(a.order || 500) - Number(b.order || 500);
        });
        return definitions;
    }

    function addStableDefinitions(options, add, context) {
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
    }

    function keepQuickToolbarOnOneLine(root, left, right, searchWrap, searchInput) {
        root.style.flexWrap = "nowrap";
        root.style.alignItems = "center";
        left.style.flex = "1 1 auto";
        left.style.flexWrap = "nowrap";
        left.style.width = "auto";
        left.style.minWidth = "0";
        right.style.flex = "0 0 auto";
        right.style.flexWrap = "nowrap";
        right.style.width = "auto";
        right.style.marginLeft = "auto";
        searchWrap.style.flex = "1 1 120px";
        searchWrap.style.minWidth = "80px";
        searchWrap.style.maxWidth = "300px";
        searchInput.style.width = "100%";
        searchInput.style.minWidth = "0";
    }

    function alignQuickCollapseWithMyScripts(api) {
        if (!api) return api;
        var originalSetActive = api.setActive;
        var originalSetIcon = api.setIcon;

        if (typeof originalSetActive === "function") {
            api.setActive = function (key, value) {
                if (key === "collapse") return originalSetActive.call(api, key, false);
                return originalSetActive.call(api, key, value);
            };
        }

        if (typeof originalSetIcon === "function") {
            api.setIcon = function (key, value) {
                if (key === "collapse") {
                    var definition = window.SharedToolbarConfig && window.SharedToolbarConfig.definitions && window.SharedToolbarConfig.definitions.collapse;
                    if (definition) {
                        if (value === definition.icon) value = definition.expandIcon;
                        else if (value === definition.expandIcon) value = definition.icon;
                    }
                }
                return originalSetIcon.call(api, key, value);
            };
        }
        return api;
    }

    window.SharedToolbar = {
        mount: function (options) {
            options = options || {};
            var host = resolve(options.container);
            if (!host) throw new Error("Toolbar container not found.");
            var quickToolbar = isQuickToolbar(host);
            var outputPanel = quickToolbar ? quickOutputPanel(host) : null;
            var outputHidden = quickToolbar ? quickOutputHidden() : false;

            if (quickToolbar) {
                disableLegacyQuickOutputController();
                writeStoredBoolean(QUICK_OUTPUT_LEGACY_HIDDEN_KEY, outputHidden);
                applyQuickOutputLayout(outputPanel, outputHidden);
            }

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
            if (quickToolbar) alignQuickCollapseWithMyScripts(api);
            var handlers = options.handlers || {};

            function add(definition) {
                if (quickToolbar && definition && definition.key === "details") {
                    definition = cloneDefinition(definition);
                    definition.title = quickOutputTitle(outputHidden, definition.title);
                }

                var item = button(definition);
                context.buttons[definition.key] = item;
                var group = context.groups[definition.side] || right;
                group.appendChild(item);
                if (quickToolbar && definition.key === "details") syncQuickOutputButton(item, outputHidden);

                item.onclick = function (event) {
                    if (definition.search) {
                        api.showSearch(!context.state.searchVisible);
                        return;
                    }

                    var handler = definition.onClick || handlers[definition.handler];
                    if (quickToolbar && definition.key === "details") {
                        var targetHidden = !quickOutputHidden();
                        var actualHidden = actualQuickOutputHidden(outputPanel);
                        setQuickOutputHidden(targetHidden);
                        applyQuickOutputLayout(outputPanel, targetHidden);
                        syncQuickOutputButton(item, targetHidden);

                        var outputResult;
                        if (actualHidden !== targetHidden && typeof handler === "function") {
                            outputResult = handler(api, event, definition);
                        }

                        disableLegacyQuickOutputController();
                        window.setTimeout(function () {
                            var current = outputPanel && outputPanel.querySelector(".sirk-quick-command-details-toggle");
                            applyQuickOutputLayout(outputPanel, quickOutputHidden());
                            syncQuickOutputButton(current, quickOutputHidden());
                        }, 0);
                        return outputResult;
                    }

                    var quickFavorites = quickToolbar && definition.key === "favorites";
                    var nextQuickFavorites = quickFavorites ? !buttonPressed(item) : null;
                    var favoriteFromResults = definition.key === "favorites" && resultsActive();
                    var catalogRoot = favoriteFromResults ? firstCatalogRoot() : null;
                    if (catalogRoot) catalogRoot.click();

                    if (typeof handler === "function") handler(api, event, definition);
                    if (quickFavorites) writeQuickFavoritesOnly(nextQuickFavorites);

                    // With an empty favorites filter Results has no catalog root to click
                    // before the toggle. After Show all renders the roots again, leave
                    // Results immediately so the user is never trapped in that view.
                    if (favoriteFromResults && !catalogRoot) leaveResultsAfterFavoritesRender();
                };
                return item;
            }

            if (quickToolbar) quickDefinitions(options).forEach(add);
            else addStableDefinitions(options, add, context);

            if (context.buttons.search) left.appendChild(searchWrap);
            if (quickToolbar) keepQuickToolbarOnOneLine(root, left, right, searchWrap, searchInput);
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
