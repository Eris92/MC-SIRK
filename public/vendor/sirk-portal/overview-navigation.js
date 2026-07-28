(function () {
    "use strict";

    if (window.__sirkOverviewNavigationLoaded) return;
    window.__sirkOverviewNavigationLoaded = true;

    var pending = null;
    var scheduled = false;

    function normalized(value) {
        return String(value || "").replace(/^\s*[▸▼]?\s*/, "").trim().toLowerCase();
    }

    function settingsButton() {
        return document.querySelector('#sirkStandaloneRoot [data-view="settings"]');
    }

    function openSettings(root, leaf) {
        pending = { root: root, leaf: leaf || [], attempts: 0 };
        var button = settingsButton();
        if (button) button.click();
        else if (window.location.hash !== "#settings") window.location.hash = "#settings";
        schedule();
    }

    function clickPendingTarget() {
        if (!pending) return;
        pending.attempts += 1;
        if (pending.attempts > 80) {
            pending = null;
            return;
        }

        var rootButton = document.querySelector('[data-settings-root="' + pending.root + '"]');
        if (!rootButton) return;
        var rootActive = rootButton.classList.contains("sirk-settings-root-active") || rootButton.classList.contains("active") || rootButton.classList.contains("is-active");
        if (!rootActive) {
            rootButton.click();
            return;
        }

        if (!pending.leaf.length) {
            pending = null;
            return;
        }

        var workspace = rootButton.closest(".sirk-layout") || document.querySelector(".sirk-settings-module-workspace");
        var secondary = workspace && workspace.querySelector(":scope > .sirk-column-secondary");
        if (!secondary) return;
        var leaf = Array.prototype.find.call(secondary.querySelectorAll("button,.sirk-nav-item"), function (node) {
            return pending.leaf.indexOf(normalized(node.textContent)) >= 0 && !node.hidden;
        });
        if (!leaf) return;
        leaf.click();
        pending = null;
    }

    function activateCard(card, root, leaf, titlePl, titleEn) {
        if (!card || card.getAttribute("data-sirk-overview-navigation") === root) return;
        card.setAttribute("data-sirk-overview-navigation", root);
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.title = document.documentElement.lang === "en" ? titleEn : titlePl;
        card.addEventListener("click", function (event) {
            event.preventDefault();
            openSettings(root, leaf);
        });
        card.addEventListener("keydown", function (event) {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            openSettings(root, leaf);
        });
    }

    function decorateCards() {
        activateCard(
            document.querySelector("#sirkStandaloneContent .sirk-overview-system"),
            "server",
            ["aktualizacje", "updates"],
            "Otwórz Ustawienia → Serwer → Aktualizacje",
            "Open Settings → Server → Updates"
        );
        activateCard(
            document.querySelector("#sirkStandaloneContent .sirk-overview-health"),
            "integrations",
            [],
            "Otwórz Ustawienia → Integracje",
            "Open Settings → Integrations"
        );
    }

    function ensureStyle() {
        if (document.getElementById("sirkOverviewNavigationStyle")) return;
        var style = document.createElement("style");
        style.id = "sirkOverviewNavigationStyle";
        style.textContent = [
            "#sirkPortalRoot .sirk-overview-link,#sirkPortalRoot .sirk-overview-system[data-sirk-overview-navigation],#sirkPortalRoot .sirk-overview-health[data-sirk-overview-navigation]{cursor:pointer!important;transition:background-color .14s ease,border-color .14s ease!important;transform:none!important;box-shadow:none!important}",
            "#sirkPortalRoot .sirk-overview-link:hover,#sirkPortalRoot .sirk-overview-system[data-sirk-overview-navigation]:hover,#sirkPortalRoot .sirk-overview-health[data-sirk-overview-navigation]:hover{border-color:var(--sirk-active-accent,#4d6bd8)!important;background:var(--sirk-hover,rgba(96,165,250,.08))!important;transform:none!important;box-shadow:none!important}",
            "#sirkPortalRoot .sirk-overview-link:focus-visible,#sirkPortalRoot .sirk-overview-system[data-sirk-overview-navigation]:focus-visible,#sirkPortalRoot .sirk-overview-health[data-sirk-overview-navigation]:focus-visible{outline:2px solid var(--sirk-active-accent,#4d6bd8)!important;outline-offset:2px!important;border-color:var(--sirk-active-accent,#4d6bd8)!important;background:var(--sirk-hover,rgba(96,165,250,.08))!important;transform:none!important;box-shadow:none!important}"
        ].join("");
        (document.head || document.documentElement).appendChild(style);
    }

    function apply() {
        ensureStyle();
        decorateCards();
        clickPendingTarget();
    }

    function schedule() {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(function () {
            scheduled = false;
            apply();
        });
    }

    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    window.addEventListener("hashchange", schedule);
    window.addEventListener("sirkportal:languagechange", schedule);
    window.setInterval(function () { if (pending) apply(); }, 100);
    schedule();
}());

(function () {
    "use strict";
    if (window.__sirkManagementLayoutRepairLoaded) return;
    window.__sirkManagementLayoutRepairLoaded = true;
    var queued = false;
    var refreshing = false;
    var folderState = Object.create(null);

    function managementHost() {
        var tool = document.querySelector('#sirkPortalRoot [data-portal-management-tool="refresh"]');
        return tool && tool.closest(".") || tool && tool.closest("[data-view]") || tool && tool.closest(".sirk-portal-view-host");
    }

    function shell() {
        var tool = document.querySelector('#sirkPortalRoot [data-portal-management-tool="refresh"]');
        return tool && tool.closest(".sirk-standalone-view-scroll");
    }

    function depth(node) {
        var value = parseInt(node && node.style && node.style.getPropertyValue("--sirk-depth") || "0", 10);
        return isFinite(value) ? value : 0;
    }

    function ensureStyle() {
        if (document.getElementById("sirkManagementLayoutRepairStyle")) return;
        var style = document.createElement("style");
        style.id = "sirkManagementLayoutRepairStyle";
        style.textContent = [
            "#sirkPortalRoot .sirk-management-repaired .sirk-layout{grid-template-columns:220px minmax(360px,420px) minmax(0,1fr)!important}",
            "#sirkPortalRoot .sirk-management-repaired.is-collapsed .sirk-layout{grid-template-columns:64px minmax(360px,420px) minmax(0,1fr)!important}",
            "#sirkPortalRoot .sirk-management-repaired.is-management-edit-mode .sirk-layout{grid-template-columns:220px minmax(500px,560px) minmax(0,1fr)!important}",
            "#sirkPortalRoot .sirk-management-repaired.is-collapsed.is-management-edit-mode .sirk-layout{grid-template-columns:64px minmax(500px,560px) minmax(0,1fr)!important}",
            "#sirkPortalRoot .sirk-management-repaired:not(.is-collapsed) .sirk-column-primary .sirk-nav-item{justify-content:flex-start!important;gap:10px!important;padding:7px 8px!important;font-size:14px!important}",
            "#sirkPortalRoot .sirk-management-repaired.is-collapsed .sirk-column-primary{padding:6px!important}",
            "#sirkPortalRoot .sirk-management-repaired.is-collapsed .sirk-column-primary .sirk-nav-item{justify-content:center!important;gap:0!important;padding:6px 0!important;font-size:0!important;overflow:hidden!important}",
            "#sirkPortalRoot .sirk-management-repaired.is-collapsed .sirk-column-primary .sirk-nav-icon{width:28px!important;height:28px!important;flex-basis:28px!important}",
            "#sirkPortalRoot .sirk-management-repaired .sirk-column-secondary{overflow:auto!important}",
            "#sirkPortalRoot .sirk-management-repaired .sirk-script-row{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;width:100%!important}",
            "#sirkPortalRoot .sirk-management-repaired .sirk-script-open{min-width:0!important;width:100%!important}",
            "#sirkPortalRoot .sirk-management-repaired .sirk-script-label{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere!important;line-height:1.25!important;max-height:2.5em!important}",
            "#sirkPortalRoot .sirk-management-repaired .sirk-script-actions{position:static!important;display:inline-flex!important;flex-wrap:nowrap!important;background:var(--sirk-panel,#fff)!important;padding-left:5px!important}",
            "#sirkPortalRoot .sirk-management-repaired .sirk-folder-heading{position:relative!important;padding-right:28px!important;cursor:pointer!important;text-transform:none!important;font-size:13px!important}",
            "#sirkPortalRoot .sirk-management-repaired .sirk-folder-heading:after{content:'›';position:absolute;right:9px;top:50%;transform:translateY(-50%) rotate(0deg);font-size:18px;transition:transform .12s ease}",
            "#sirkPortalRoot .sirk-management-repaired .sirk-folder-heading[data-sirk-folder-expanded=\"1\"]:after{transform:translateY(-50%) rotate(90deg)}",
            "#sirkPortalRoot .sirk-management-repaired .sirk-folder-hidden{display:none!important}",
            "#sirkPortalRoot .sirk-management-repaired [data-sirk-results-proxy]{order:-999}"
        ].join("");
        (document.head || document.documentElement).appendChild(style);
    }

    function markHost() {
        var currentShell = shell();
        if (!currentShell) return null;
        var host = currentShell.parentElement;
        if (!host) return null;
        host.classList.add("sirk-management-repaired");
        return host;
    }

    function folderKey(node) {
        return String(node.getAttribute("data-folder-path") || node.textContent || "").trim();
    }

    function applyFolders() {
        var currentShell = shell();
        if (!currentShell) return;
        var list = currentShell.querySelector(".sirk-layout > .sirk-column-secondary > .sirk-list");
        if (!list) return;
        var collapsed = [];
        Array.prototype.forEach.call(list.children, function (node) {
            var level = depth(node);
            while (collapsed.length && level <= collapsed[collapsed.length - 1]) collapsed.pop();
            var hidden = collapsed.length > 0;
            node.classList.toggle("sirk-folder-hidden", hidden);
            if (!node.classList.contains("sirk-folder-heading")) return;
            var key = folderKey(node);
            if (!(key in folderState)) folderState[key] = false;
            var expanded = folderState[key] === true;
            node.setAttribute("data-sirk-folder-expanded", expanded ? "1" : "0");
            node.setAttribute("aria-expanded", expanded ? "true" : "false");
            node.setAttribute("role", "button");
            node.setAttribute("tabindex", "0");
            if (!expanded) collapsed.push(level);
        });
    }

    function ensureResultsInFavorites() {
        var currentShell = shell();
        if (!currentShell) return;
        var favorite = currentShell.querySelector('[data-portal-management-tool="favorites"]');
        var primary = currentShell.querySelector(".sirk-layout > .sirk-column-primary > .sirk-list");
        if (!favorite || !primary || !favorite.classList.contains("is-active")) return;
        if (primary.querySelector('[data-management-root="@results"],[data-sirk-results-proxy]')) return;
        var button = document.createElement("button");
        button.type = "button";
        button.className = "sirk-nav-item";
        button.setAttribute("data-sirk-results-proxy", "1");
        button.innerHTML = '<span class="sirk-nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4z"></path><path d="M8 9h8M8 13h8"></path></svg></span><span>' + (document.documentElement.lang === "en" ? "Results" : "Wyniki") + '</span>';
        primary.insertBefore(button, primary.firstChild);
    }

    function robustRefresh(button) {
        if (refreshing || !window.SirkPlatformCore || !window.SirkPlatformPortalManagement) return;
        refreshing = true;
        button.disabled = true;
        button.classList.add("is-active");
        Promise.resolve(window.SirkPlatformCore.post("myscripts", "refresh", {}))
            .catch(function () { return null; })
            .then(function () {
                var currentShell = shell();
                var host = currentShell && currentShell.parentElement;
                if (host) return window.SirkPlatformPortalManagement.mount(host);
            })
            .finally(function () {
                refreshing = false;
                button.disabled = false;
                button.classList.remove("is-active");
                schedule();
            });
    }

    function apply() {
        queued = false;
        ensureStyle();
        if (!markHost()) return;
        applyFolders();
        ensureResultsInFavorites();
    }

    function schedule() {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(apply);
    }

    document.addEventListener("click", function (event) {
        var refresh = event.target.closest && event.target.closest('#sirkPortalRoot [data-portal-management-tool="refresh"]');
        if (refresh) {
            event.preventDefault();
            event.stopImmediatePropagation();
            robustRefresh(refresh);
            return;
        }
        var proxy = event.target.closest && event.target.closest("#sirkPortalRoot [data-sirk-results-proxy]");
        if (proxy) {
            event.preventDefault();
            var currentShell = shell();
            var favorites = currentShell && currentShell.querySelector('[data-portal-management-tool="favorites"]');
            if (favorites && favorites.classList.contains("is-active")) favorites.click();
            window.setTimeout(function () {
                var results = shell() && shell().querySelector('[data-management-root="@results"]');
                if (results) results.click();
            }, 0);
            return;
        }
        var heading = event.target.closest && event.target.closest("#sirkPortalRoot .sirk-management-repaired .sirk-folder-heading");
        if (heading) {
            event.preventDefault();
            event.stopImmediatePropagation();
            var key = folderKey(heading);
            folderState[key] = !(folderState[key] === true);
            applyFolders();
        }
    }, true);

    document.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        var heading = event.target.closest && event.target.closest("#sirkPortalRoot .sirk-management-repaired .sirk-folder-heading");
        if (!heading) return;
        event.preventDefault();
        var key = folderKey(heading);
        folderState[key] = !(folderState[key] === true);
        applyFolders();
    }, true);

    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    window.addEventListener("sirkportal:languagechange", schedule);
    schedule();
}());
