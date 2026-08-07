(function () {
    "use strict";

    function cssPixels(value) {
        value = Number(value);
        if (!isFinite(value) || value <= 0) return "";
        return String(Math.round(value * 100) / 100) + "px";
    }

    function setGeometryProperty(page, name, value) {
        value = cssPixels(value);
        if (value && page.style && typeof page.style.setProperty === "function") page.style.setProperty(name, value);
    }

    function captureModeGeometry(page) {
        if (!page || page.__sirkModeGeometryCaptured) return;
        var layout = page.querySelector && page.querySelector(".mc-shared-layout");
        var primary = page.querySelector && page.querySelector(".mc-shared-primary");
        var secondary = page.querySelector && page.querySelector(".mc-shared-secondary");
        if (!layout || !primary || !secondary) return;

        var primaryRect = primary.getBoundingClientRect ? primary.getBoundingClientRect() : null;
        var secondaryRect = secondary.getBoundingClientRect ? secondary.getBoundingClientRect() : null;
        var row = secondary.querySelector && secondary.querySelector(".mc-tree-script-row");
        var rowRect = row && row.getBoundingClientRect ? row.getBoundingClientRect() : null;

        if (!layout.classList.contains("is-collapsed")) {
            setGeometryProperty(page, "--sirk-mode-primary-width", primaryRect && primaryRect.width);
        }
        setGeometryProperty(page, "--sirk-mode-secondary-width", secondaryRect && secondaryRect.width);
        setGeometryProperty(page, "--sirk-mode-row-width", rowRect && rowRect.width);
        page.__sirkModeGeometryCaptured = true;
    }

    function measuredActionWidth(page) {
        if (!page || typeof page.querySelectorAll !== "function") return 0;
        var groups = page.querySelectorAll(".mc-tree-script-actions") || [];
        var widest = 0;

        for (var i = 0; i < groups.length; i += 1) {
            var group = groups[i];
            var children = group && group.children ? group.children : [];
            if (!children.length) continue;
            var gap = 4;
            try {
                var computed = window.getComputedStyle && window.getComputedStyle(group);
                var parsedGap = computed && parseFloat(computed.columnGap || computed.gap || "");
                if (isFinite(parsedGap) && parsedGap >= 0) gap = parsedGap;
            } catch (error) {}

            var width = 0;
            for (var j = 0; j < children.length; j += 1) {
                var rect = children[j].getBoundingClientRect ? children[j].getBoundingClientRect() : null;
                width += rect && rect.width ? rect.width : 36;
            }
            if (children.length > 1) width += gap * (children.length - 1);
            widest = Math.max(widest, width);
        }
        return widest > 0 ? Math.ceil(widest + 16) : 0;
    }

    function isActionMode(page) {
        return !!(page && page.classList && (
            page.classList.contains("is-edit-mode") || page.classList.contains("is-multi-mode")
        ));
    }

    function nextFrame(callback) {
        if (window.requestAnimationFrame) return window.requestAnimationFrame(callback);
        return window.setTimeout(callback, 0);
    }

    function scheduleActionGeometry(page) {
        if (!page || page.__sirkActionMeasureScheduled) return;
        page.__sirkActionMeasureScheduled = true;
        var attempts = 0;
        function run() {
            attempts += 1;
            var width = isActionMode(page) ? measuredActionWidth(page) : 0;
            if (width > 0) setGeometryProperty(page, "--sirk-actions-width", width);
            if (!width && attempts < 3 && isActionMode(page)) {
                nextFrame(run);
                return;
            }
            page.__sirkActionMeasureScheduled = false;
        }
        nextFrame(run);
    }

    function clearModeGeometry(page) {
        if (!page) return;
        ["--sirk-mode-primary-width", "--sirk-mode-secondary-width", "--sirk-mode-row-width", "--sirk-actions-width"].forEach(function (name) {
            if (page.style && typeof page.style.removeProperty === "function") page.style.removeProperty(name);
        });
        page.__sirkModeGeometryCaptured = false;
        page.__sirkActionMeasureScheduled = false;
    }

    function updateModeClass(context, key, active) {
        var page = context.root && context.root.closest ? context.root.closest(".mc-shared-page") : null;
        if (!page) return;
        var className = key === "manage" ? "is-edit-mode" : key === "multi" ? "is-multi-mode" : "";
        if (!className) return;

        if (active && !page.classList.contains(className)) captureModeGeometry(page);
        page.classList.toggle(className, active);
        if (active) scheduleActionGeometry(page);
        if (!active && !page.classList.contains("is-edit-mode") && !page.classList.contains("is-multi-mode")) {
            clearModeGeometry(page);
        }
    }

    window.SharedToolbarApi = {
        create: function (context) {
            return {
                root: context.root,
                buttons: context.buttons,
                groups: context.groups,
                state: context.state,
                searchInput: context.searchInput,
                setEnabled: function (key, value) {
                    var item = context.buttons[key];
                    if (item) item.disabled = key === "favorites" ? false : value === false;
                },
                setVisible: function (key, value) {
                    if (context.buttons[key]) context.buttons[key].hidden = value === false;
                },
                setActive: function (key, value) {
                    var item = context.buttons[key];
                    if (!item) return;
                    var active = value === true;
                    item.classList.toggle("is-active", active);
                    item.setAttribute("aria-pressed", active ? "true" : "false");
                    updateModeClass(context, key, active);
                    if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.button === "function") {
                        window.MeshThemeAdapter.button(item);
                    }
                },
                setTitle: function (key, value) {
                    var item = context.buttons[key];
                    if (!item) return;
                    item.title = String(value || "");
                    item.setAttribute("aria-label", item.title);
                },
                setIcon: function (key, value) {
                    var item = context.buttons[key];
                    var icon = item && item.querySelector(".mc-shared-toolbar-icon");
                    var text = String(value || "");
                    if (!icon) return;
                    if (text.indexOf("<svg") === 0) icon.innerHTML = text;
                    else icon.textContent = text;
                },
                setBadge: function (key, value) {
                    var item = context.buttons[key];
                    if (!item) return;
                    var badge = item.querySelector(".mc-shared-toolbar-badge");
                    if (value == null || value === "") {
                        if (badge) badge.remove();
                        return;
                    }
                    if (!badge) {
                        badge = document.createElement("span");
                        badge.className = "mc-shared-toolbar-badge";
                        item.appendChild(badge);
                    }
                    badge.textContent = String(value);
                },
                showSearch: function (value, focus) {
                    context.state.searchVisible = value !== false;
                    context.searchWrap.hidden = !context.state.searchVisible;
                    this.setActive("search", context.state.searchVisible);
                    if (context.state.searchVisible && focus !== false) context.searchInput.focus();
                },
                clearSearch: function (notify) {
                    context.searchInput.value = "";
                    context.state.search = "";
                    if (notify !== false && typeof context.onSearch === "function") context.onSearch("", this);
                }
            };
        }
    };
}());
