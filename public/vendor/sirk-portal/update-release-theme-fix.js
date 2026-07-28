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
            "#sirkReleaseOverlay{inset:0!important;display:block!important;padding:18px!important;background:transparent!important;pointer-events:none!important;color:var(--sirk-text,#172033)!important}",
            "#sirkReleaseOverlay>section{position:absolute!important;top:18px!important;right:18px!important;width:min(620px,calc(100vw - 36px))!important;max-height:calc(100vh - 36px)!important;padding:24px!important;background:var(--sirk-panel,#fff)!important;color:var(--sirk-text,#172033)!important;border-color:var(--sirk-border,#dce3ec)!important;box-shadow:0 18px 55px rgba(0,0,0,.32)!important;pointer-events:auto!important}",
            "#sirkReleaseOverlay a{color:var(--sirk-active-accent,#4d6bd8)!important}",
            "#sirkReleaseOverlay .sirk-button{background:var(--sirk-input,var(--sirk-panel,#fff))!important;color:var(--sirk-text,#172033)!important;border-color:var(--sirk-border,#dce3ec)!important}",
            "#sirkReleaseOverlay .sirk-release-close{position:absolute;top:10px;right:10px;width:36px;height:36px;border:1px solid var(--sirk-border,#dce3ec);border-radius:8px;background:var(--sirk-input,var(--sirk-panel,#fff));color:var(--sirk-text,#172033);font:700 22px/1 Segoe UI,Arial,sans-serif;cursor:pointer}",
            "#sirkReleaseOverlay .sirk-release-close:hover,#sirkReleaseOverlay .sirk-release-close:focus-visible{background:var(--sirk-hover,rgba(96,165,250,.12));outline:2px solid var(--sirk-active-accent,#4d6bd8);outline-offset:1px}",
            "@media(max-width:720px){#sirkReleaseOverlay>section{top:10px!important;right:10px!important;width:calc(100vw - 20px)!important;max-height:calc(100vh - 20px)!important}}"
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

    function rememberRelease(overlay) {
        var heading = overlay && overlay.querySelector("h2");
        var match = heading && String(heading.textContent || "").match(/—\s*(\S+)\s*$/);
        if (match) {
            try { localStorage.setItem("sirkPortal.releaseSeen." + match[1], "1"); }
            catch (error) {}
        }
    }

    function makeReleaseNonBlocking(overlay) {
        if (!overlay) return;
        overlay.removeAttribute("role");
        overlay.removeAttribute("aria-modal");
        var dialog = overlay.querySelector(":scope > section");
        if (!dialog) return;
        dialog.setAttribute("role", "region");
        dialog.setAttribute("aria-label", "Informacje o aktualizacji");
        var close = dialog.querySelector(".sirk-release-close");
        if (!close) {
            close = document.createElement("button");
            close.type = "button";
            close.className = "sirk-release-close";
            close.setAttribute("aria-label", "Zamknij informacje o aktualizacji");
            close.textContent = "×";
            close.onclick = function () {
                rememberRelease(overlay);
                overlay.remove();
            };
            dialog.insertBefore(close, dialog.firstChild);
        }
    }

    function apply() {
        ensureStyle();
        var update = document.getElementById("sirkUpdateFullscreen");
        var release = document.getElementById("sirkReleaseOverlay");
        if (update) {
            copyTheme(update);
            mountTimer(update);
        }
        if (release) {
            copyTheme(release);
            makeReleaseNonBlocking(release);
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
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("sirkportal:themechange", schedule);
    window.addEventListener("storage", schedule);
    interval = window.setInterval(apply, 1000);
    window.addEventListener("beforeunload", function () { if (interval) window.clearInterval(interval); });
    apply();
}());