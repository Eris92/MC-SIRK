(function () {
    "use strict";

    window.SharedLayout = {
        mount: function (options) {
            options = options || {};
            var host = typeof options.container === "string" ? document.querySelector(options.container) : options.container;
            if (!host) throw new Error("Layout container not found.");

            var root = document.createElement("div");
            root.className = "mc-shared-layout";
            var primary = document.createElement("aside");
            primary.className = "mc-shared-primary";
            var secondary = document.createElement("section");
            secondary.className = "mc-shared-secondary";
            var details = document.createElement("section");
            details.className = "mc-shared-details";
            root.appendChild(primary);
            root.appendChild(secondary);
            root.appendChild(details);
            host.appendChild(root);

            var api = {
                root: root,
                primary: primary,
                secondary: secondary,
                details: details,
                setCollapsed: function (value) {
                    root.classList.toggle("is-collapsed", value === true);
                },
                clear: function () {
                    primary.innerHTML = "";
                    secondary.innerHTML = "";
                    details.innerHTML = "";
                }
            };
            api.setCollapsed(options.collapsed === true);
            return api;
        }
    };
}());
