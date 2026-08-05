(function () {
    "use strict";

    function ensureModeStyles() {
        if (document.getElementById("sirk-script-mode-layout-styles")) return;
        var style = document.createElement("style");
        style.id = "sirk-script-mode-layout-styles";
        style.textContent = [
            ".mc-shared-page .mc-tree-label{min-width:0!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere!important;word-break:break-word!important;line-height:1.28!important}",
            ".mc-shared-page :is(.mc-tree-script,.mc-tree-folder-header,.mc-tree-root,.mc-catalog-results){height:auto!important;min-height:36px!important;align-items:flex-start!important}",
            ".mc-shared-page .mc-tree-script-row{align-items:flex-start!important;min-width:0!important}",
            ".mc-shared-page .mc-tree-script{min-width:0!important;flex:1 1 auto!important}",
            ".mc-shared-page .mc-tree-script-actions{flex:0 0 auto!important;align-self:flex-start!important}",
            ".mc-shared-page-mycommands.is-edit-mode .mc-shared-layout{grid-template-columns:96px max-content minmax(260px,1fr)!important}",
            ".mc-shared-page-mycommands.is-edit-mode .mc-shared-layout.is-collapsed{grid-template-columns:56px max-content minmax(260px,1fr)!important}",
            ".mc-shared-page-mycommands.is-edit-mode .mc-shared-secondary{width:max-content!important;min-width:500px!important;max-width:none!important}",
            ".mc-shared-page-mycommands.is-edit-mode .mc-tree-script-row{display:flex!important;width:max-content!important;min-width:500px!important;align-items:flex-start!important}",
            ".mc-shared-page-mycommands.is-edit-mode .mc-tree-script{width:max-content!important;min-width:360px!important;flex:1 0 auto!important}",
            ".mc-shared-page-mycommands.is-edit-mode .mc-tree-script .mc-tree-label{white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:normal!important;word-break:normal!important}",
            ".mc-shared-page-mycommands.is-edit-mode .mc-tree-script-actions{width:132px!important;min-width:132px!important;flex:0 0 132px!important;justify-content:flex-end!important}",
            ".mc-shared-page-mycommands.is-multi-mode .mc-shared-layout{grid-template-columns:96px minmax(480px,52%) minmax(260px,1fr)!important}",
            ".mc-shared-page-myscripts.is-multi-mode .mc-shared-layout{grid-template-columns:minmax(180px,240px) minmax(480px,48%) minmax(260px,1fr)!important}",
            ".mc-shared-page:not(.mc-shared-page-mycommands):not(.mc-shared-page-myscripts).is-multi-mode .mc-shared-layout{grid-template-columns:minmax(140px,220px) minmax(440px,48%) minmax(260px,1fr)!important}",
            ".mc-shared-page.is-multi-mode .mc-shared-layout.is-collapsed{grid-template-columns:56px minmax(480px,52%) minmax(260px,1fr)!important}",
            "@media(max-width:1100px){.mc-shared-page-mycommands.is-multi-mode .mc-shared-layout{grid-template-columns:82px minmax(380px,55%) minmax(220px,1fr)!important}.mc-shared-page-myscripts.is-multi-mode .mc-shared-layout{grid-template-columns:minmax(150px,200px) minmax(380px,52%) minmax(220px,1fr)!important}.mc-shared-page.is-multi-mode .mc-shared-layout.is-collapsed{grid-template-columns:56px minmax(380px,55%) minmax(220px,1fr)!important}}",
            "@media(max-width:800px){.mc-shared-page-mycommands:is(.is-edit-mode,.is-multi-mode) .mc-shared-layout,.mc-shared-page-mycommands:is(.is-edit-mode,.is-multi-mode) .mc-shared-layout.is-collapsed{grid-template-columns:1fr!important}.mc-shared-page-mycommands.is-edit-mode .mc-shared-secondary,.mc-shared-page-mycommands.is-edit-mode .mc-tree-script-row,.mc-shared-page-mycommands.is-edit-mode .mc-tree-script{width:100%!important;min-width:0!important;max-width:none!important}.mc-shared-page-mycommands.is-edit-mode .mc-tree-script .mc-tree-label{white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important}}"
        ].join("");
        (document.head || document.documentElement).appendChild(style);
    }

    function updateModeClass(context, key, active) {
        var page = context.root && context.root.closest
            ? context.root.closest(".mc-shared-page")
            : null;
        if (!page) return;
        if (key === "manage") page.classList.toggle("is-edit-mode", active);
        if (key === "multi") page.classList.toggle("is-multi-mode", active);
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
