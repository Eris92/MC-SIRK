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
        { key: "superseded", title: "Superseded", icon: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12h8M13 9l3 3-3 3"/>') },
        { key: "failed", title: "Failed", icon: svg('<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>') },
        { key: "rejected", title: "Rejected", icon: svg('<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>') }
    ];

    function applyTheme(button, icon) {
        if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.nav === "function") {
            window.MeshThemeAdapter.nav(button);
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
                var key = item.key || "all";
                var button = document.createElement("button");
                button.type = "button";
                button.className = "mc-shared-nav-item mc-portal-nav-item sirk-management-item sirk-shared-list-item";

                var icon = document.createElement("span");
                icon.className = "sirk-management-item-icon mc-portal-nav-icon sirk-shared-list-icon";
                icon.innerHTML = item.icon;

                var copy = document.createElement("span");
                copy.className = "sirk-shared-list-copy";
                var label = document.createElement("span");
                label.className = "mc-portal-nav-label sirk-shared-list-label";
                label.textContent = item.title + (item.badge == null ? "" : " (" + item.badge + ")");
                copy.appendChild(label);

                var selected = item.key === options.selected;
                button.appendChild(icon);
                button.appendChild(copy);
                button.classList.toggle("active", selected);
                button.classList.toggle("is-active", selected);
                button.setAttribute("aria-selected", selected ? "true" : "false");
                button.onclick = function () {
                    if (typeof options.onSelect === "function") options.onSelect(item.key);
                };
                host.appendChild(button);
                applyTheme(button, icon);
            });
        }
    };
}());
