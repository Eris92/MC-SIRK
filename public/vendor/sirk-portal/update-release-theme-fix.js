(function () {
    "use strict";

    if (window.__sirkUpdateReleaseThemeFixLoaded) return;
    window.__sirkUpdateReleaseThemeFixLoaded = true;

    var TIMER_KEY = "sirkPortal.updateStartedAt";
    var interval = 0;
    var scheduled = false;
    var VARIABLES = ["--sirk-bg", "--sirk-panel", "--sirk-input", "--sirk-text", "--sirk-muted", "--sirk-border", "--sirk-hover", "--sirk-active-accent"];

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
        VARIABLES.forEach(function (name) {
            var value = computed && computed.getPropertyValue(name);
            if (value && value.trim()) target.style.setProperty(name, value.trim());
        });
        var dark = darkMode();
        target.classList.toggle("sirk-theme-dark", dark);
        target.classList.toggle("sirk-theme-light", !dark);
        target.style.colorScheme = dark ? "dark" : "light";
    }

    function ensureStyle() {
        if (document.getElementById("sirkUpdateReleaseThemeFixStyle")) return;
        var style = document.createElement("style");
        style.id = "sirkUpdateReleaseThemeFixStyle";
        style.textContent = [
            "#sirkUpdateFullscreen{background:var(--sirk-bg,#f3f6fb)!important;color:var(--sirk-text,#172033)!important}",
            "#sirkUpdateFullscreen>div{background:var(--sirk-panel,#fff)!important;color:var(--sirk-text,#172033)!important;border-color:var(--sirk-border,#dce3ec)!important}",
            "#sirkUpdateFullscreen pre{background:var(--sirk-bg,#f3f6fb)!important;color:var(--sirk-text,#172033)!important;border-color:var(--sirk-border,#dce3ec)!important}",
            "#sirkUpdateFullscreen progress{color-scheme:inherit}",
            "#sirkUpdateFullscreen .sirk-update-spinner-row{display:flex;align-items:center;gap:12px;min-height:34px}",
            "#sirkUpdateFullscreen .sirk-update-stopwatch{display:inline-flex!important;align-items:center;min-width:72px;margin:0!important;color:var(--sirk-muted,#657187)!important;font:700 15px/1.2 Segoe UI,Arial,sans-serif}",
            "#sirkReleaseOverlay{color:var(--sirk-text,#172033)!important}",
            "#sirkReleaseOverlay>section{background:var(--sirk-panel,#fff)!important;color:var(--sirk-text,#172033)!important;border-color:var(--sirk-border,#dce3ec)!important}",
            "#sirkReleaseOverlay a{color:var(--sirk-active-accent,#4d6bd8)!important}",
            "#sirkReleaseOverlay .sirk-button{background:var(--sirk-input,var(--sirk-panel,#fff))!important;color:var(--sirk-text,#172033)!important;border-color:var(--sirk-border,#dce3ec)!important}"
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

    function apply() {
        ensureStyle();
        var update = document.getElementById("sirkUpdateFullscreen");
        var release = document.getElementById("sirkReleaseOverlay");
        if (update) {
            copyTheme(update);
            mountTimer(update);
        }
        if (release) copyTheme(release);
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
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("sirkportal:themechange", schedule);
    window.addEventListener("storage", schedule);
    interval = window.setInterval(apply, 1000);
    window.addEventListener("beforeunload", function () { if (interval) window.clearInterval(interval); });
    apply();
}());
