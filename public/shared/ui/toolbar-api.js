(function () {
    "use strict";

    function ensureModeStyles() {
        if (document.getElementById("sirk-script-mode-layout-styles")) return;
        var style = document.createElement("style");
        style.id = "sirk-script-mode-layout-styles";
        style.textContent = [
            ".mc-shared-page{--sirk-primary-collapsed-track:64px;--sirk-edit-details-track:minmax(260px,1fr);--sirk-actions-button-width:36px;--sirk-actions-gap:4px;--sirk-actions-width:calc((var(--sirk-actions-button-width) * 4) + (var(--sirk-actions-gap) * 3));--sirk-actions-column-gap:12px}",
            ".mc-shared-page .mc-tree-label{min-width:0!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere!important;word-break:break-word!important;line-height:1.28!important}",
            ".mc-shared-page :is(.mc-tree-script,.mc-tree-folder-header,.mc-tree-root,.mc-catalog-results){height:auto!important;min-height:36px!important;align-items:flex-start!important}",
            ".mc-shared-page .mc-tree-script-row{align-items:flex-start!important;min-width:0!important}",
            ".mc-shared-page .mc-tree-script{min-width:0!important;flex:1 1 auto!important}",
            ".mc-shared-page .mc-tree-script-actions{flex:0 0 auto!important;align-self:flex-start!important}",
            ".mc-shared-page.is-edit-mode .mc-shared-layout{grid-template-columns:var(--sirk-mode-primary-width,220px) calc(var(--sirk-mode-secondary-width,340px) + var(--sirk-actions-width) + var(--sirk-actions-column-gap)) var(--sirk-edit-details-track)!important}",
            ".mc-shared-page.is-edit-mode .mc-shared-layout.is-collapsed{grid-template-columns:var(--sirk-primary-collapsed-track) calc(var(--sirk-mode-secondary-width,340px) + var(--sirk-actions-width) + var(--sirk-actions-column-gap)) var(--sirk-edit-details-track)!important}",
            ".mc-shared-page.is-edit-mode .mc-shared-secondary{width:auto!important;min-width:0!important;max-width:none!important}",
            ".mc-shared-page.is-edit-mode .mc-tree-script-row{display:grid!important;grid-template-columns:var(--sirk-mode-row-width,316px) var(--sirk-actions-width)!important;column-gap:var(--sirk-actions-column-gap)!important;width:100%!important;min-width:0!important;align-items:start!important}",
            ".mc-shared-page.is-edit-mode .mc-tree-script{width:100%!important;min-width:0!important;flex:none!important}",
            ".mc-shared-page.is-edit-mode .mc-tree-script-actions{display:flex!important;width:var(--sirk-actions-width)!important;min-width:var(--sirk-actions-width)!important;flex:0 0 var(--sirk-actions-width)!important;gap:var(--sirk-actions-gap)!important;justify-content:flex-start!important;align-self:start!important;box-sizing:border-box!important}",
            ".mc-shared-page.is-edit-mode .mc-tree-script-actions button{width:var(--sirk-actions-button-width)!important;min-width:var(--sirk-actions-button-width)!important;flex:0 0 var(--sirk-actions-button-width)!important;box-sizing:border-box!important}",
            ".mc-shared-page-mycommands.is-multi-mode .mc-shared-layout{grid-template-columns:var(--sirk-mode-primary-width,220px) minmax(480px,52%) var(--sirk-edit-details-track)!important}",
            ".mc-shared-page-mycommands.is-multi-mode .mc-shared-layout.is-collapsed{grid-template-columns:var(--sirk-primary-collapsed-track) minmax(480px,52%) var(--sirk-edit-details-track)!important}",
            ".mc-shared-page:not(.mc-shared-page-mycommands):not(.mc-shared-page-myscripts).is-multi-mode .mc-shared-layout{grid-template-columns:var(--sirk-mode-primary-width,220px) minmax(440px,48%) var(--sirk-edit-details-track)!important}",
            "@media(max-width:1000px){.mc-shared-page{--sirk-edit-details-track:minmax(220px,1fr)}.mc-shared-page-mycommands.is-multi-mode .mc-shared-layout{grid-template-columns:var(--sirk-mode-primary-width,190px) minmax(380px,55%) var(--sirk-edit-details-track)!important}.mc-shared-page-mycommands.is-multi-mode .mc-shared-layout.is-collapsed{grid-template-columns:var(--sirk-primary-collapsed-track) minmax(380px,55%) var(--sirk-edit-details-track)!important}}",
            "@media(max-width:800px){.mc-shared-page:is(.is-edit-mode,.is-multi-mode) .mc-shared-layout,.mc-shared-page:is(.is-edit-mode,.is-multi-mode) .mc-shared-layout.is-collapsed{grid-template-columns:1fr!important}.mc-shared-page.is-edit-mode .mc-shared-secondary,.mc-shared-page.is-edit-mode .mc-tree-script{width:100%!important;min-width:0!important;max-width:none!important}.mc-shared-page.is-edit-mode .mc-tree-script-row{grid-template-columns:minmax(0,1fr)!important;width:100%!important}.mc-shared-page.is-edit-mode .mc-tree-script-actions{width:auto!important;min-width:0!important;flex-wrap:wrap!important;margin-top:4px}}"
        ].join("");
        (document.head || document.documentElement).appendChild(style);
    }

    function cssPixels(value) {
        value = Number(value);
        if (!isFinite(value) || value <= 0) return "";
        return String(Math.round(value * 100) / 100) + "px";
    }

    function setGeometryProperty(page, name, value) {
        value = cssPixels(value);
        if (value && page.style && typeof page.style.setProperty === "function") {
            page.style.setProperty(name, value);
        }
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

        // The collapsed track is always controlled by the shared 64 px contract.
        // Store the live expanded width only when the navigation is currently open.
        if (!(layout.classList && layout.classList.contains("is-collapsed"))) {
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

        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            var children = group && group.children ? group.children : [];
            if (!children.length) continue;

            var gap = 4;
            try {
                if (window.getComputedStyle) {
                    var computed = window.getComputedStyle(group);
                    var parsedGap = parseFloat(computed.columnGap || computed.gap || "");
                    if (isFinite(parsedGap) && parsedGap >= 0) gap = parsedGap;
                }
            } catch (error) {}

            var width = 0;
            for (var j = 0; j < children.length; j++) {
                var child = children[j];
                var rect = child && child.getBoundingClientRect ? child.getBoundingClientRect() : null;
                width += rect && rect.width ? rect.width : 36;
            }
            if (children.length > 1) width += gap * (children.length - 1);
            widest = Math.max(widest, width);
        }

        // Keep a small gutter for borders, focus rings and scrollbar rounding.
        return widest > 0 ? Math.ceil(widest + 16) : 0;
    }

    function measureActionGeometry(page) {
        if (!page || !page.classList || !page.classList.contains("is-edit-mode")) return 0;
        var width = measuredActionWidth(page);
        if (width > 0) setGeometryProperty(page, "--sirk-actions-width", width);
        return width;
    }

    function nextFrame(callback) {
        if (window.requestAnimationFrame) return window.requestAnimationFrame(callback);
        if (typeof setTimeout === "function") return setTimeout(callback, 0);
        callback();
        return 0;
    }

    function scheduleActionGeometry(page) {
        if (!page || page.__sirkActionMeasureScheduled) return;
        page.__sirkActionMeasureScheduled = true;
        var attempts = 0;

        function run() {
            attempts++;
            var width = measureActionGeometry(page);
            if (!width && attempts < 3 && page.classList.contains("is-edit-mode")) {
                nextFrame(run);
                return;
            }
            page.__sirkActionMeasureScheduled = false;
        }

        nextFrame(run);
    }

    function clearModeGeometry(page) {
        if (!page) return;
        if (page.style && typeof page.style.removeProperty === "function") {
            page.style.removeProperty("--sirk-mode-primary-width");
            page.style.removeProperty("--sirk-mode-secondary-width");
            page.style.removeProperty("--sirk-mode-row-width");
            page.style.removeProperty("--sirk-actions-width");
        }
        try { delete page.__sirkModeGeometryCaptured; }
        catch (error) { page.__sirkModeGeometryCaptured = false; }
        page.__sirkActionMeasureScheduled = false;
    }

    function updateModeClass(context, key, active) {
        var page = context.root && context.root.closest
            ? context.root.closest(".mc-shared-page")
            : null;
        if (!page) return;

        var className = key === "manage"
            ? "is-edit-mode"
            : key === "multi"
                ? "is-multi-mode"
                : "";
        if (!className) return;

        var alreadyActive = page.classList.contains(className);
        if (active && !alreadyActive) captureModeGeometry(page);
        page.classList.toggle(className, active);
        if (active && className === "is-edit-mode") scheduleActionGeometry(page);

        if (!active &&
            !page.classList.contains("is-edit-mode") &&
            !page.classList.contains("is-multi-mode")) {
            clearModeGeometry(page);
        }
    }

    function markQuickOutputOwner(key, item) {
        if (key !== "details" || !item || typeof item.closest !== "function") return;
        if (item.closest(".sirk-quick-command-toolbar-host")) {
            item.__sirkStableOutputState = true;
        }
    }

    window.SharedToolbarApi = {
        create: function (context) {
            ensureModeStyles();
            return {
                root: context.root,
                buttons: context.buttons,
                groups: context.groups,
                state: context.state,
                searchInput: context.searchInput,
                setEnabled: function (key, value) {
                    var item = context.buttons[key];
                    if (!item) return;
                    // Favorites is a view filter, not a script-only action. It must remain
                    // available in Results so an empty favorites filter can always be cleared.
                    item.disabled = key === "favorites" ? false : value === false;
                },
                setVisible: function (key, value) { if (context.buttons[key]) context.buttons[key].hidden = value === false; },
                setActive: function (key, value) {
                    var item = context.buttons[key];
                    if (!item) return;
                    markQuickOutputOwner(key, item);
                    var active = value === true;
                    item.classList.toggle("is-active", active);
                    item.setAttribute("aria-pressed", active ? "true" : "false");
                    updateModeClass(context, key, active);
                },
                setTitle: function (key, value) {
                    var item = context.buttons[key];
                    if (!item) return;
                    markQuickOutputOwner(key, item);
                    item.title = String(value || "");
                    item.setAttribute("aria-label", item.title);
                    // syncToolbar updates the title after the active state. Preserve the
                    // favorites filter indicator in Results as well as in the catalog.
                    if (key === "favorites") item.classList.toggle("is-active", /^Show all\b/i.test(item.title));
                },
                setIcon: function (key, value) { var item = context.buttons[key], icon = item && item.querySelector(".mc-shared-toolbar-icon"), text = String(value || ""); if (!icon) return; if (text.indexOf("<svg") === 0) icon.innerHTML = text; else icon.textContent = text; },
                setBadge: function (key, value) {
                    var button = context.buttons[key]; if (!button) return;
                    var badge = button.querySelector(".mc-shared-toolbar-badge");
                    if (value == null || value === "") { if (badge) badge.remove(); return; }
                    if (!badge) { badge = document.createElement("span"); badge.className = "mc-shared-toolbar-badge"; button.appendChild(badge); }
                    badge.textContent = String(value);
                },
                showSearch: function (value, focus) { context.state.searchVisible = value !== false; context.searchWrap.hidden = !context.state.searchVisible; this.setActive("search", context.state.searchVisible); if (context.state.searchVisible && focus !== false) context.searchInput.focus(); },
                clearSearch: function (notify) { context.searchInput.value = ""; context.state.search = ""; if (notify !== false && typeof context.onSearch === "function") context.onSearch("", this); }
            };
        }
    };
}());
