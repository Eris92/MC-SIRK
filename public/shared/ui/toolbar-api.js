(function () {
    "use strict";
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
                    if (!item) return;
                    // Favorites is a view filter, not a script-only action. It must remain
                    // available in Results so an empty favorites filter can always be cleared.
                    item.disabled = key === "favorites" ? false : value === false;
                },
                setVisible: function (key, value) { if (context.buttons[key]) context.buttons[key].hidden = value === false; },
                setActive: function (key, value) { if (context.buttons[key]) context.buttons[key].classList.toggle("is-active", value === true); },
                setTitle: function (key, value) {
                    var item = context.buttons[key];
                    if (!item) return;
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
