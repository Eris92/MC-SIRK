(function () {
    "use strict";

    function resolve(value) {
        return typeof value === "string" ? document.querySelector(value) : value;
    }

    function clone(value) {
        var result = {};
        Object.keys(value || {}).forEach(function (key) { result[key] = value[key]; });
        return result;
    }

    function createButton(definition) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-secondary btn-sm mc-shared-toolbar-button mc-portal-toolbar-button";
        button.title = definition.title || definition.key;
        button.setAttribute("aria-label", button.title);
        button.innerHTML = '<span class="mc-shared-toolbar-icon mc-portal-toolbar-icon"></span>';
        var icon = String(definition.icon || definition.title || definition.key || "");
        if (icon.indexOf("<svg") === 0) button.firstChild.innerHTML = icon;
        else button.firstChild.textContent = icon;
        return button;
    }

    function definitions(options) {
        var items = window.SharedToolbarConfig.resolve(options.preset, options.buttons).slice();
        (options.customButtons || []).forEach(function (definition, index) {
            var item = clone(definition);
            item.key = item.key || ("custom-" + index);
            item.side = item.side || "right";
            item.order = Number(item.order || 500);
            items.push(item);
        });
        return items.sort(function (a, b) {
            if (a.side !== b.side) return a.side === "left" ? -1 : 1;
            return Number(a.order || 500) - Number(b.order || 500);
        });
    }

    window.SharedToolbar = {
        mount: function (options) {
            options = options || {};
            var host = resolve(options.container);
            if (!host) throw new Error("Toolbar container not found.");
            var handlers = options.handlers || {};

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
                onSearch: handlers.onSearch
            };
            var api = window.SharedToolbarApi.create(context);

            function add(definition) {
                var button = createButton(definition);
                context.buttons[definition.key] = button;
                (context.groups[definition.side] || right).appendChild(button);
                button.onclick = function (event) {
                    if (definition.search) {
                        api.showSearch(!context.state.searchVisible);
                        return;
                    }
                    var handler = definition.onClick || handlers[definition.handler];
                    if (typeof handler === "function") return handler(api, event, definition);
                };
                return button;
            }

            definitions(options).forEach(add);
            api.addButton = add;
            if (context.buttons.search) center.appendChild(searchWrap);

            var searchTimer = 0;
            searchInput.oninput = function () {
                context.state.search = searchInput.value || "";
                window.clearTimeout(searchTimer);
                searchTimer = window.setTimeout(function () {
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
            return api;
        }
    };
}());
