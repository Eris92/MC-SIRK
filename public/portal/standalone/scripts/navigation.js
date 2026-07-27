(function () {
    "use strict";

    function asset(name) {
        var base = String(window.__SIRK_PLATFORM_ASSET_BASE__ || "").replace(/\/$/, "");
        var version = encodeURIComponent(String(window.__SIRK_PLATFORM_PORTAL_VERSION__ || ""));
        return base ? base + "/" + name + "?v=" + version : name;
    }

    function approvalGeneralActive(workspace) {
        var secondary = workspace && workspace.querySelector(":scope > .sirk-column-secondary");
        if (!secondary) return false;
        var active = secondary.querySelector(".sirk-settings-nav-leaf.active,.sirk-settings-nav-leaf.is-active");
        if (!active || String(active.textContent || "").trim() !== "Ogólne") return false;
        var group = active.closest("details.sirk-settings-nav-group");
        var summary = group && group.querySelector(":scope > summary");
        return String(summary && summary.textContent || "").trim() === "Akceptacje";
    }

    function removeProvidersFromApprovalGeneral() {
        var workspace = document.querySelector("[data-portal-settings] .sirk-layout,.sirk-settings-module-workspace");
        if (!workspace || !approvalGeneralActive(workspace)) return;
        var form = workspace.querySelector("[data-settings-form]");
        if (!form) return;
        Array.prototype.forEach.call(form.querySelectorAll("[data-settings-section]"), function (section) {
            var summary = section.querySelector(":scope > summary");
            if (String(summary && summary.textContent || "").trim() === "Providers") section.remove();
        });
    }

    function startCleanup() {
        var root = document.getElementById("sirkStandaloneContent") || document.documentElement;
        var scheduled = false;
        new MutationObserver(function () {
            if (scheduled) return;
            scheduled = true;
            window.requestAnimationFrame(function () {
                scheduled = false;
                removeProvidersFromApprovalGeneral();
            });
        }).observe(root, { childList: true, subtree: true });
        removeProvidersFromApprovalGeneral();
    }

    var script = document.createElement("script");
    script.src = asset("navigation-base.js");
    script.async = false;
    script.onload = startCleanup;
    (document.head || document.documentElement).appendChild(script);
}());
