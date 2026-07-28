(function () {
    "use strict";

    if (window.__sirkSettingsPrimaryNavigationLoaded) return;
    window.__sirkSettingsPrimaryNavigationLoaded = true;

    var activeRoot = "modules";
    var needsDefaultSelection = true;
    var scheduled = false;
    var labels = {
        pl: { modules: "Moduły", portal: "Portal", integrations: "Integracje", server: "Serwer" },
        en: { modules: "Modules", portal: "Portal", integrations: "Integrations", server: "Server" }
    };

    function language() {
        try { return localStorage.getItem("sirkPortal.language") === "en" ? "en" : "pl"; }
        catch (error) { return document.documentElement.lang === "en" ? "en" : "pl"; }
    }

    function label(key) { return labels[language()][key]; }
    function normalized(value) { return String(value || "").replace(/^\s*[▸▼]?\s*/, "").trim().toLowerCase(); }
    function workspace() { var content = document.getElementById("sirkStandaloneContent"); return content && (content.querySelector("[data-portal-settings] .sirk-layout") || content.querySelector(".sirk-settings-module-workspace")); }
    function directButtons(primary) { return primary ? Array.prototype.slice.call(primary.querySelectorAll(":scope > .sirk-nav-item")) : []; }
    function settingsButton(primary) { var marked = primary && primary.querySelector(":scope > [data-settings-base-primary]"); if (marked) return marked; var found = directButtons(primary).find(function (button) { var value = normalized(button.textContent); return value === "settings" || value === "ustawienia"; }); if (found) found.setAttribute("data-settings-base-primary", "1"); return found || null; }
    function serverButton(primary) { var marked = primary && primary.querySelector(":scope > [data-server-base-primary]"); if (marked) return marked; var found = directButtons(primary).find(function (button) { var value = normalized(button.textContent); return value === "server" || value === "serwer"; }); if (found) found.setAttribute("data-server-base-primary", "1"); return found || null; }
    function active(button) { return !!(button && (button.classList.contains("active") || button.classList.contains("is-active"))); }

    function asset(name) {
        var base = String(window.__SIRK_PLATFORM_ASSET_BASE__ || "").replace(/\/$/, "");
        var version = encodeURIComponent(String(window.__SIRK_PLATFORM_PORTAL_VERSION__ || "1"));
        return base ? base + "/vendor/sirk-portal/" + name + "?v=" + version : "";
    }

    function loadOverlayFix() {
        if (document.getElementById("sirk-update-release-theme-fix")) return;
        var source = asset("update-release-theme-fix.js");
        if (!source) return;
        var script = document.createElement("script");
        script.id = "sirk-update-release-theme-fix";
        script.src = source;
        script.async = false;
        (document.head || document.documentElement).appendChild(script);
    }

    function ensureStyle() {
        if (document.getElementById("sirkSettingsPrimaryNavigationStyle")) return;
        var style = document.createElement("style");
        style.id = "sirkSettingsPrimaryNavigationStyle";
        style.textContent = ".sirk-settings-root-menu{display:grid;gap:6px;width:100%}.sirk-settings-root-menu>.sirk-settings-root-button{display:flex!important;align-items:center;width:100%!important;min-height:42px!important;padding:10px 14px!important;box-sizing:border-box!important;text-align:left!important;cursor:pointer!important;pointer-events:auto!important;border-radius:7px!important}.sirk-settings-root-button.sirk-settings-root-active{background:var(--sirk-active-bg,rgba(77,107,216,.14))!important;color:var(--sirk-text,#172033)!important;font-weight:700!important;box-shadow:inset 3px 0 0 var(--sirk-active-accent,#4d6bd8)!important}.sirk-settings-primary-projected>summary{display:none!important}.sirk-settings-primary-projected>.sirk-settings-nav-group-body{display:block!important;padding:0!important}.sirk-settings-primary-projected{margin:0!important;padding:0!important;border:0!important;background:transparent!important}";
        (document.head || document.documentElement).appendChild(style);
    }

    function menu(primary, anchor) { var node = primary.querySelector(":scope > [data-settings-root-menu]"); if (!node) { node = document.createElement("div"); node.className = "sirk-settings-root-menu"; node.setAttribute("data-settings-root-menu", "1"); primary.insertBefore(node, anchor || null); } return node; }
    function rootButton(host, key, target) {
        var button = host.querySelector(':scope > [data-settings-root="' + key + '"]');
        if (!button) {
            button = document.createElement("button");
            button.type = "button";
            button.className = "sirk-nav-item sirk-settings-root-button";
            button.setAttribute("data-settings-root", key);
            button.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                activeRoot = key;
                needsDefaultSelection = key !== "server";
                if (target && !active(target)) target.click();
                schedule();
            });
            host.appendChild(button);
        }
        button.textContent = label(key);
        return button;
    }
    function groupKey(group) { var marker = group && group.getAttribute("data-source-settings-group"); if (marker === "integrations") return "integrations"; var summary = group && group.querySelector(":scope > summary"); var value = normalized(summary && summary.textContent); if (value === "moduły" || value === "modules") return "modules"; if (value === "portal") return "portal"; if (value === "integracje" || value === "integrations") return "integrations"; return ""; }
    function groups(secondary) { return Array.prototype.slice.call(secondary.querySelectorAll(":scope > details.sirk-settings-nav-group")).map(function (node) { return { node: node, key: groupKey(node) }; }).filter(function (entry) { return !!entry.key; }); }

    function project(secondary) {
        var target = null;
        groups(secondary).forEach(function (entry) { var selected = entry.key === activeRoot; entry.node.hidden = !selected; entry.node.classList.toggle("sirk-settings-primary-projected", selected); if (selected) { entry.node.open = true; target = entry.node; } });
        secondary.setAttribute("data-settings-primary-section", activeRoot);
        if (!target) return;
        var selectedLeaf = target.querySelector(".sirk-nav-item.active,.sirk-nav-item.is-active");
        if (selectedLeaf) { needsDefaultSelection = false; return; }
        if (!needsDefaultSelection) return;
        var firstLeaf = target.querySelector(".sirk-settings-nav-leaf,.sirk-nav-item");
        if (!firstLeaf || firstLeaf.getAttribute("data-settings-default-opening") === "1") return;
        firstLeaf.setAttribute("data-settings-default-opening", "1");
        needsDefaultSelection = false;
        window.setTimeout(function () { firstLeaf.removeAttribute("data-settings-default-opening"); if (firstLeaf.isConnected) firstLeaf.click(); }, 0);
    }

    function restore(secondary) { groups(secondary).forEach(function (entry) { entry.node.hidden = false; entry.node.classList.remove("sirk-settings-primary-projected"); }); secondary.removeAttribute("data-settings-primary-section"); }
    function hideTechnical(button, marker) { if (!button) return; button.hidden = true; button.style.display = "none"; button.setAttribute("aria-hidden", "true"); button.setAttribute("tabindex", "-1"); if (marker) button.setAttribute(marker, "1"); }
    function apply() {
        var root = workspace();
        if (!root) return;
        var primary = root.querySelector(":scope > .sirk-column-primary");
        var secondary = root.querySelector(":scope > .sirk-column-secondary");
        if (!primary || !secondary) return;
        ensureStyle();
        var base = settingsButton(primary);
        var server = serverButton(primary);
        if (!base) return;
        hideTechnical(base, "data-settings-base-primary");
        hideTechnical(server, "data-server-base-primary");
        var host = menu(primary, null);
        var buttons = {
            modules: rootButton(host, "modules", base),
            portal: rootButton(host, "portal", base),
            integrations: rootButton(host, "integrations", base),
            server: rootButton(host, "server", server)
        };
        if (active(server)) activeRoot = "server";
        else if (active(base) && activeRoot === "server") activeRoot = "modules";
        Object.keys(buttons).forEach(function (key) {
            var selected = key === "server" ? active(server) : active(base) && key === activeRoot;
            buttons[key].classList.toggle("sirk-settings-root-active", selected);
            buttons[key].setAttribute("aria-current", selected ? "page" : "false");
        });
        if (active(base)) project(secondary); else restore(secondary);
    }
    function schedule() { if (scheduled) return; scheduled = true; window.requestAnimationFrame(function () { scheduled = false; apply(); }); }

    var observationRoot = document.getElementById("sirkStandaloneContent") || document.documentElement;
    if (observationRoot) new MutationObserver(schedule).observe(observationRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "open", "hidden"] });
    window.addEventListener("sirkportal:languagechange", schedule);
    loadOverlayFix();
    schedule();
}());