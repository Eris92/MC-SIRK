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
            "#sirkPortalRoot .sirk-overview-system[data-sirk-overview-navigation],#sirkPortalRoot .sirk-overview-health[data-sirk-overview-navigation]{cursor:pointer!important}",
            "#sirkPortalRoot .sirk-overview-system[data-sirk-overview-navigation]:hover,#sirkPortalRoot .sirk-overview-health[data-sirk-overview-navigation]:hover{border-color:var(--sirk-active-accent,#4d6bd8)!important;background:var(--sirk-hover,rgba(96,165,250,.08))!important}",
            "#sirkPortalRoot .sirk-overview-system[data-sirk-overview-navigation]:focus-visible,#sirkPortalRoot .sirk-overview-health[data-sirk-overview-navigation]:focus-visible{outline:2px solid var(--sirk-active-accent,#4d6bd8)!important;outline-offset:2px!important}"
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
