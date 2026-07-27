(function () {
    "use strict";

    function asset(name) {
        var base = String(window.__SIRK_PLATFORM_ASSET_BASE__ || "").replace(/\/$/, "");
        var version = encodeURIComponent(String(window.__SIRK_PLATFORM_PORTAL_VERSION__ || ""));
        return base ? base + "/" + name + "?v=" + version : name;
    }

    if (document.getElementById("sirk-portal-view-mode-base")) return;
    var script = document.createElement("script");
    script.id = "sirk-portal-view-mode-base";
    script.src = asset("portal-view-mode-base.js");
    script.async = false;
    (document.head || document.documentElement).appendChild(script);
}());
