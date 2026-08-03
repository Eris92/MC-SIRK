(function () {
    "use strict";

    function storageKey(options) {
        if (options.layoutStorageKey) return String(options.layoutStorageKey);
        var preset = String(options.preset || "standard").toLowerCase();
        return "sirkPlatform.layout." + preset + ".collapsed";
    }

    window.SharedPage = {
        mount: function (options) {
            options = options || {};
            var host = typeof options.container === "string"
                ? document.querySelector(options.container)
                : options.container;
            var preset = String(options.preset || "standard").toLowerCase();

            host.innerHTML = "";
            host.className = "mc-shared-page mc-shared-page-" + preset;
            host.setAttribute("data-module-preset", preset);
            host.setAttribute("data-frontend", "meshcentral");

            var tabsHost = document.createElement("div");
            tabsHost.className = "mc-shared-tabs";
            var toolbarHost = document.createElement("div");
            toolbarHost.className = "mc-shared-toolbar-host";
            var layoutHost = document.createElement("div");
            layoutHost.className = "mc-shared-layout-host";

            host.appendChild(tabsHost);
            host.appendChild(toolbarHost);
            host.appendChild(layoutHost);

            var layout = window.SharedLayout.mount({
                container: layoutHost,
                storageKey: storageKey(options)
            });
            var toolbar = window.SharedToolbar.mount({
                container: toolbarHost,
                preset: options.preset || "standard",
                buttons: options.buttons || {},
                handlers: options.handlers || {},
                customButtons: options.customButtons || []
            });
            var tabs = window.SharedTabs.mount({
                container: tabsHost,
                tabs: options.tabs || [],
                active: options.activeTab,
                onSelect: options.onTab
            });
            return {
                root: host,
                tabs: tabs,
                toolbar: toolbar,
                layout: layout,
                primary: layout.primary,
                secondary: layout.secondary,
                details: layout.details,
                frontend: "meshcentral"
            };
        }
    };
}());
