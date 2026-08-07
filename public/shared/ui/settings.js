(function () {
    "use strict";

    window.SharedSettings = {
        section: function (title, content, expanded) {
            var root = document.createElement("section");
            root.className = "mc-shared-settings-section";
            var header = document.createElement("button");
            header.type = "button";
            header.className = "mc-shared-settings-header";
            header.textContent = title;
            var panel = document.createElement("div");
            panel.className = "mc-shared-settings-content";
            panel.hidden = expanded !== true;
            if (content) panel.appendChild(content);
            header.onclick = function () { panel.hidden = !panel.hidden; };
            root.appendChild(header);
            root.appendChild(panel);
            if (window.MeshThemeAdapter) window.MeshThemeAdapter.button(header);
            return root;
        },
        form: function (title) {
            var form = document.createElement("div");
            form.className = "mc-shared-settings-form";
            if (title) {
                var heading = document.createElement("h3");
                heading.textContent = title;
                form.appendChild(heading);
            }
            return form;
        }
    };

    function normalizeMode(value) {
        value = String(value || "auto").toLowerCase();
        return ["auto", "classic", "modern"].indexOf(value) >= 0 ? value : "auto";
    }

    function mode() {
        var adminData = window.SirkPlatformAdminData;
        var adminMode = adminData && adminData.uiSettings && adminData.uiSettings.iconMode;
        if (adminMode != null && adminMode !== "") return normalizeMode(adminMode);

        var bootstrap = window.SirkPlatformRuntime && window.SirkPlatformRuntime.state && window.SirkPlatformRuntime.state.bootstrap;
        return normalizeMode(bootstrap && bootstrap.ui && bootstrap.ui.iconMode);
    }

    window.SirkIconMode = {
        get: mode,
        set: function (value) {
            value = normalizeMode(value);
            if (window.SirkPlatformAdminData) {
                window.SirkPlatformAdminData.uiSettings = window.SirkPlatformAdminData.uiSettings || {};
                window.SirkPlatformAdminData.uiSettings.iconMode = value;
            }
            var runtime = window.SirkPlatformRuntime;
            if (runtime && runtime.state && runtime.state.bootstrap) {
                runtime.state.bootstrap.ui = runtime.state.bootstrap.ui || {};
                runtime.state.bootstrap.ui.iconMode = value;
            }
            if (runtime && typeof runtime.refreshMenus === "function") runtime.refreshMenus();
            return value;
        },
        useModern: function () {
            var value = mode();
            if (value === "modern") return true;
            if (value === "classic") return false;
            return !!(window.MeshThemeAdapter && window.MeshThemeAdapter.isModern && window.MeshThemeAdapter.isModern());
        }
    };
}());
