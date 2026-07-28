(function () {
    "use strict";

    if (window.__sirkUpdateReleaseThemeFixLoaded) return;
    window.__sirkUpdateReleaseThemeFixLoaded = true;

    var TIMER_KEY = "sirkPortal.updateStartedAt";
    var interval = 0;
    var scheduled = false;
    var VARIABLES = ["--sirk-bg", "--sirk-panel", "--sirk-input", "--sirk-text", "--sirk-muted", "--sirk-border", "--sirk-hover", "--sirk-active-accent"];
    var FALLBACK = {
        light: {
            "--sirk-bg": "#f3f6fb",
            "--sirk-panel": "#ffffff",
            "--sirk-input": "#ffffff",
            "--sirk-text": "#172033",
            "--sirk-muted": "#657187",
            "--sirk-border": "#dce3ec",
            "--sirk-hover": "#eef3f9",
            "--sirk-active-accent": "#3867d6"
        },
        dark: {
            "--sirk-bg": "#0b1220",
            "--sirk-panel": "#111827",
            "--sirk-input": "#0f172a",
            "--sirk-text": "#e7edf7",
            "--sirk-muted": "#94a3b8",
            "--sirk-border": "#2a374a",
            "--sirk-hover": "#182338",
            "--sirk-active-accent": "#6f8cff"
        }
    };

    function sourceRoot() {
        return document.getElementById("sirkPortalRoot") || document.documentElement;
    }

    function darkMode() {
        var root = sourceRoot();
        if (root && root.classList.contains("sirk-theme-dark")) return true;
        if (document.documentElement.classList.contains("sirk-theme-dark") || document.body.classList.contains("sirk-theme-dark")) return true;
        try { return localStorage.getItem("sirkPortal.theme") === "dark"; }
        catch (error) { return false; }
    }

    function copyTheme(target) {
        if (!target) return;
        var root = sourceRoot();
        var computed = root ? window.getComputedStyle(root) : null;
        var dark = darkMode();
        var fallback = FALLBACK[dark ? "dark" : "light"];
        VARIABLES.forEach(function (name) {
            var value = computed && computed.getPropertyValue(name);
            value = value && value.trim() || fallback[name];
            target.style.setProperty(name, value);
        });
        target.classList.toggle("sirk-theme-dark", dark);
        target.classList.toggle("sirk-theme-light", !dark);
        target.style.colorScheme = dark ? "dark" : "light";
    }

    function ensureStyle() {
        if (document.getElementById("sirkUpdateReleaseThemeFixStyle")) return;
        var style = document.createElement("style");
        style.id = "sirkUpdateReleaseThemeFixStyle";
        style.textContent = [
            "#sirkUpdateFullscreen{background:var(--sirk-bg)!important;color:var(--sirk-text)!important}",
            "#sirkUpdateFullscreen>div{background:var(--sirk-panel)!important;color:var(--sirk-text)!important;border-color:var(--sirk-border)!important}",
            "#sirkUpdateFullscreen pre{background:var(--sirk-bg)!important;color:var(--sirk-text)!important;border-color:var(--sirk-border)!important}",
            "#sirkUpdateFullscreen progress{color-scheme:inherit}",
            "#sirkUpdateFullscreen .sirk-update-spinner-row{display:flex;align-items:center;gap:12px;min-height:34px}",
            "#sirkUpdateFullscreen .sirk-update-stopwatch{display:inline-flex!important;align-items:center;min-width:72px;margin:0!important;color:var(--sirk-muted)!important;font:700 15px/1.2 Segoe UI,Arial,sans-serif}",
            "#sirkReleaseOverlay{inset:0!important;display:grid!important;place-items:center!important;padding:20px!important;background:rgba(15,23,42,.62)!important;pointer-events:auto!important;color:var(--sirk-text)!important}",
            "#sirkReleaseOverlay>section{position:relative!important;top:auto!important;right:auto!important;width:min(720px,calc(100vw - 40px))!important;max-height:min(760px,90vh)!important;overflow:auto!important;padding:26px!important;background:var(--sirk-panel)!important;color:var(--sirk-text)!important;border-color:var(--sirk-border)!important;box-shadow:0 24px 80px rgba(0,0,0,.35)!important;pointer-events:auto!important}",
            "#sirkReleaseOverlay h2,#sirkReleaseOverlay li{color:var(--sirk-text)!important}",
            "#sirkReleaseOverlay a{color:var(--sirk-active-accent)!important}",
            "#sirkReleaseOverlay .sirk-button{background:var(--sirk-input)!important;color:var(--sirk-text)!important;border-color:var(--sirk-border)!important}",
            "#sirkReleaseOverlay.sirk-theme-dark>section{background:#111827!important;color:#e7edf7!important;border-color:#2a374a!important}",
            "#sirkReleaseOverlay.sirk-theme-dark h2,#sirkReleaseOverlay.sirk-theme-dark li{color:#e7edf7!important}",
            "#sirkReleaseOverlay.sirk-theme-dark .sirk-button{background:#0f172a!important;color:#e7edf7!important;border-color:#2a374a!important}",
            "#sirkPortalRoot #sirkStandaloneRoot.is-collapsed .sirk-layout[data-sirk-local-collapsed=\"0\"][data-sirk-layout-columns=\"3\"]{grid-template-columns:var(--sirk-ui-primary-width,184px) var(--sirk-ui-secondary-width,236px) minmax(0,1fr)!important}",
            "#sirkPortalRoot #sirkStandaloneRoot.is-collapsed .sirk-layout[data-sirk-local-collapsed=\"0\"][data-sirk-layout-columns=\"2\"]{grid-template-columns:var(--sirk-ui-primary-width,184px) minmax(0,1fr)!important}",
            "#sirkPortalRoot #sirkStandaloneRoot.is-collapsed .sirk-layout[data-sirk-local-collapsed=\"0\"]>.sirk-column-primary{width:auto!important;min-width:0!important;max-width:none!important;padding:12px!important}",
            "#sirkPortalRoot #sirkStandaloneRoot.is-collapsed .sirk-layout[data-sirk-local-collapsed=\"0\"]>.sirk-column-primary .sirk-nav-item{justify-content:flex-start!important;gap:10px!important;padding:9px 11px!important;font-size:14px!important}",
            "#sirkPortalRoot #sirkStandaloneRoot.is-collapsed .sirk-layout[data-sirk-local-collapsed=\"0\"]>.sirk-column-primary .sirk-nav-icon{flex:0 0 24px!important;width:24px!important;height:24px!important}",
            "#sirkPortalRoot #sirkStandaloneRoot.is-collapsed .sirk-layout[data-sirk-local-collapsed=\"0\"]>.sirk-column-primary .sirk-nav-item>span:not(.sirk-nav-icon),#sirkPortalRoot #sirkStandaloneRoot.is-collapsed .sirk-layout[data-sirk-local-collapsed=\"0\"]>.sirk-column-primary .sirk-portal-nav-label{display:inline!important;visibility:visible!important;opacity:1!important;max-width:none!important}",
            "#sirkPortalRoot .sirk-layout[data-sirk-local-collapsed=\"1\"][data-sirk-layout-columns=\"3\"]{grid-template-columns:var(--sirk-ui-collapsed-width,56px) var(--sirk-ui-secondary-width,236px) minmax(0,1fr)!important}",
            "#sirkPortalRoot .sirk-layout[data-sirk-local-collapsed=\"1\"][data-sirk-layout-columns=\"2\"]{grid-template-columns:var(--sirk-ui-collapsed-width,56px) minmax(0,1fr)!important}",
            "#sirkPortalRoot .sirk-layout[data-sirk-local-collapsed=\"1\"]>.sirk-column-primary{width:var(--sirk-ui-collapsed-width,56px)!important;min-width:var(--sirk-ui-collapsed-width,56px)!important;max-width:var(--sirk-ui-collapsed-width,56px)!important;padding:8px 6px!important}",
            "#sirkPortalRoot .sirk-layout[data-sirk-local-collapsed=\"1\"]>.sirk-column-primary .sirk-nav-item{justify-content:center!important;gap:0!important;padding:6px 0!important;font-size:0!important}",
            "#sirkPortalRoot .sirk-layout[data-sirk-local-collapsed=\"1\"]>.sirk-column-primary .sirk-nav-item>span:not(.sirk-nav-icon),#sirkPortalRoot .sirk-layout[data-sirk-local-collapsed=\"1\"]>.sirk-column-primary .sirk-portal-nav-label{display:none!important}",
            "@media(max-width:720px){#sirkReleaseOverlay{padding:10px!important}#sirkReleaseOverlay>section{width:calc(100vw - 20px)!important;max-height:calc(100vh - 20px)!important}}"
        ].join("");
        (document.head || document.documentElement).appendChild(style);
    }

    function startedAt() {
        var value = 0;
        try { value = Number(sessionStorage.getItem(TIMER_KEY) || 0); }
        catch (error) {}
        if (!value) {
            value = Date.now();
            try { sessionStorage.setItem(TIMER_KEY, String(value)); }
            catch (error) {}
        }
        return value;
    }

    function formatElapsed(started) {
        var seconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
        var hours = Math.floor(seconds / 3600);
        var minutes = Math.floor((seconds % 3600) / 60);
        var rest = seconds % 60;
        return (hours ? String(hours).padStart(2, "0") + ":" : "") + String(minutes).padStart(2, "0") + ":" + String(rest).padStart(2, "0");
    }

    function mountTimer(overlay) {
        if (!overlay) return;
        var spinner = overlay.querySelector(".sirk-restart-spinner");
        if (!spinner || spinner.style.display === "none") return;
        var row = spinner.parentElement && spinner.parentElement.classList.contains("sirk-update-spinner-row") ? spinner.parentElement : null;
        if (!row) {
            row = document.createElement("div");
            row.className = "sirk-update-spinner-row";
            spinner.parentNode.insertBefore(row, spinner);
            row.appendChild(spinner);
        }
        var watch = row.querySelector(".sirk-update-stopwatch");
        if (!watch) {
            watch = document.createElement("span");
            watch.className = "sirk-update-stopwatch";
            watch.setAttribute("role", "timer");
            watch.setAttribute("aria-label", "Czas trwania aktualizacji");
            row.appendChild(watch);
        }
        watch.textContent = formatElapsed(startedAt());
    }

    function makeReleaseBlocking(overlay) {
        if (!overlay) return;
        var dialog = overlay.querySelector(":scope > section");
        if (!dialog) return;
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-label", "Informacje o aktualizacji");
        var close = dialog.querySelector(".sirk-release-close");
        if (close) close.remove();
    }

    function localCollapsed(layout) {
        if (!layout) return false;
        if (layout.classList.contains("is-collapsed")) return true;
        var node = layout.parentElement;
        while (node && node.id !== "sirkStandaloneRoot" && node.id !== "sirkPortalRoot") {
            if (node.classList && node.classList.contains("is-collapsed")) return true;
            node = node.parentElement;
        }
        return false;
    }

    function isolateAllLayouts() {
        var portal = document.getElementById("sirkPortalRoot");
        if (!portal) return;
        Array.prototype.forEach.call(portal.querySelectorAll(".sirk-layout"), function (layout) {
            var primary = layout.querySelector(":scope > .sirk-column-primary");
            var secondary = layout.querySelector(":scope > .sirk-column-secondary");
            if (!primary || !secondary) return;
            var details = layout.querySelector(":scope > .sirk-column-details");
            var collapsed = localCollapsed(layout);
            var value = collapsed ? "1" : "0";
            if (layout.getAttribute("data-sirk-local-collapsed") !== value) layout.setAttribute("data-sirk-local-collapsed", value);
            var columns = details ? "3" : "2";
            if (layout.getAttribute("data-sirk-layout-columns") !== columns) layout.setAttribute("data-sirk-layout-columns", columns);
        });
    }

    function apply() {
        ensureStyle();
        isolateAllLayouts();
        var update = document.getElementById("sirkUpdateFullscreen");
        var release = document.getElementById("sirkReleaseOverlay");
        if (update) {
            copyTheme(update);
            mountTimer(update);
        }
        if (release) {
            copyTheme(release);
            makeReleaseBlocking(release);
        }
    }

    function schedule() {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(function () {
            scheduled = false;
            apply();
        });
    }

    var observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    window.addEventListener("sirkportal:themechange", schedule);
    window.addEventListener("storage", schedule);
    interval = window.setInterval(apply, 1000);
    window.addEventListener("beforeunload", function () { if (interval) window.clearInterval(interval); });
    apply();
}());