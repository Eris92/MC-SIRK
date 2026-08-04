(function () {
    "use strict";

    window.MeshPluginCore = window.MeshPluginCore || {};
    window.SirkPlatformCore = window.SirkPlatformCore || {};

    var meshCore = window.MeshPluginCore;
    var sirkCore = window.SirkPlatformCore;

    if (meshCore !== sirkCore) {
        var initialOwner = meshCore.activePlugin || sirkCore.activePlugin || null;
        meshCore.activePlugin = initialOwner;

        Object.defineProperty(sirkCore, "activePlugin", {
            configurable: true,
            enumerable: true,
            get: function () {
                return meshCore.activePlugin || null;
            },
            set: function (value) {
                meshCore.activePlugin = value || null;
            }
        });
    }

    if (!sirkCore.__nativeMenuContractInstalled) {
        sirkCore.__nativeMenuContractInstalled = true;

        sirkCore.setPluginMenuActive = function (main, left, active) {
            if (main) {
                main.classList.remove("fullselect", "semiselect", "active");
                main.removeAttribute("aria-current");
                if (active) {
                    main.classList.add("fullselect");
                    main.setAttribute("aria-current", "page");
                }
            }
            if (left) {
                left.classList.remove("lbbuttonsel", "lbbuttonsel2", "active");
                left.removeAttribute("aria-current");
                if (active) {
                    left.classList.add("lbbuttonsel2");
                    left.setAttribute("aria-current", "page");
                }
            }
        };

        var originalEnsureMenu = sirkCore.ensureMenu;
        if (typeof originalEnsureMenu === "function") {
            sirkCore.ensureMenu = function (definition) {
                var result = originalEnsureMenu.call(sirkCore, definition);
                var left = definition && definition.leftId && typeof document !== "undefined"
                    ? document.getElementById(definition.leftId)
                    : null;
                if (left) {
                    left.classList.remove("active");
                    var image = left.querySelector("img.sirk-platform-menu-icon");
                    if (image) {
                        image.style.width = "40px";
                        image.style.height = "40px";
                        image.style.objectFit = "contain";
                        image.style.display = "block";
                        image.style.margin = "auto";
                    }
                }
                return result;
            };
        }
    }

    window.MeshPluginCore = meshCore;
}());
