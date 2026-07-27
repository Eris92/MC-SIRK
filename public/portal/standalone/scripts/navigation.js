(function () {
    "use strict";

    if (window.__sirkPlatformStandaloneNavigationLoaded) return;
    window.__sirkPlatformStandaloneNavigationLoaded = true;

    function asset(name) {
        var base = String(window.__SIRK_PLATFORM_ASSET_BASE__ || "").replace(/\/$/, "");
        var version = encodeURIComponent(String(window.__SIRK_PLATFORM_PORTAL_VERSION__ || ""));
        return base ? base + "/" + name + "?v=" + version : "";
    }

    function loadStyle(id, name) {
        var source = asset(name);
        if (!source || document.getElementById(id)) return;
        var link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = source;
        (document.head || document.documentElement).appendChild(link);
    }

    function loadScript(id, name, onload) {
        var existing = document.getElementById(id);
        if (existing) {
            if (typeof onload === "function") onload();
            return;
        }
        var source = asset(name);
        if (!source) return;
        var script = document.createElement("script");
        script.id = id;
        script.src = source;
        script.async = false;
        if (typeof onload === "function") script.onload = onload;
        (document.head || document.documentElement).appendChild(script);
    }

    function loadUiContract() {
        loadStyle("sirk-platform-portal-ui-contract-style", "vendor/sirk-portal/portal-ui-contract.css");
        loadStyle("sirk-platform-portal-cleanup-style", "portal-cleanup.css");
        loadScript("sirk-platform-portal-ui-contract-script", "vendor/sirk-portal/portal-ui-contract.js");
        loadScript("sirk-platform-portal-cleanup-script", "portal-cleanup.js");
    }

    function replacePortalIcons() {
        if (!window.SirkIcons) return;
        var map = {
            overview: "home", devices: "devices", approvals: "approval",
            automation: "automation", monitoring: "monitoring", assets: "assets",
            management: "management", reports: "reports", security: "security", settings: "settings"
        };
        Object.keys(map).forEach(function (view) {
            var button = document.querySelector('.sirk-standalone-nav [data-view="' + view + '"]');
            var host = button && button.querySelector(":scope > span");
            if (host) host.innerHTML = window.SirkIcons.svg(map[view], "sirk-nav-svg");
        });
        var sidebar = document.querySelector('.sirk-standalone-controls [data-action="sidebar"]');
        if (sidebar) sidebar.innerHTML = window.SirkIcons.svg("chevron-left", "sirk-control-svg");
        var nativeLink = document.querySelector(".sirk-standalone-native > span");
        if (nativeLink) nativeLink.innerHTML = window.SirkIcons.svg("external-link", "sirk-nav-svg");
    }

    function normalizeDeviceWorkspace() {
        var content = document.getElementById("sirkStandaloneContent");
        var workspace = content && content.querySelector(":scope > .sirk-device-workspace");
        if (!workspace) return;
        var header = workspace.querySelector(":scope > .sirk-device-compact-header");
        var tabs = workspace.querySelector(":scope > .sirk-device-tabs,:scope > .sirk-device-compact-tabs");
        if (!header || !tabs) return;
        [".sirk-device-compact-back", ".sirk-device-compact-icon", ".sirk-device-compact-main"].forEach(function (selector) {
            var element = header.querySelector(selector);
            if (element) element.remove();
        });
        tabs.className = "sirk-device-compact-tabs";
        tabs.removeAttribute("role");
        if (tabs.parentNode !== header) header.insertBefore(tabs, header.firstChild);
        header.setAttribute("data-compact-tabs-mounted", "1");
    }

    function normalizeSettingsNavigation() {
        var content = document.getElementById("sirkStandaloneContent");
        var workspace = content && content.querySelector(".sirk-settings-module-workspace");
        if (!workspace) return;

        var primary = workspace.querySelector(":scope > .sirk-column-primary");
        var activateSettings = false;
        var settingsPrimaryButton = null;
        if (primary) {
            Array.prototype.forEach.call(primary.querySelectorAll(":scope > .sirk-nav-item"), function (button) {
                var label = String(button.textContent || "").trim();
                if (label === "Settings") settingsPrimaryButton = button;
                if (label !== "Settings" && label !== "Server") {
                    if (button.classList.contains("active") || button.classList.contains("is-active")) activateSettings = true;
                    button.remove();
                }
            });
            if (activateSettings && settingsPrimaryButton && !settingsPrimaryButton.classList.contains("active") && !settingsPrimaryButton.classList.contains("is-active")) {
                settingsPrimaryButton.click();
                return;
            }
        }

        var secondary = workspace.querySelector(":scope > .sirk-column-secondary");
        if (!secondary) return;
        var moduleButton = null;
        var settingsButton = null;
        Array.prototype.forEach.call(secondary.querySelectorAll(":scope > .sirk-nav-item"), function (button) {
            var label = String(button.textContent || "").trim();
            if (label === "Moduły") moduleButton = button;
            else if (label === "Ustawienia") settingsButton = button;
        });
        if (!moduleButton || !settingsButton) return;

        secondary.insertBefore(settingsButton, moduleButton.nextSibling);
        var divider = secondary.querySelector(":scope > .sirk-settings-nav-divider");
        if (!divider) {
            divider = document.createElement("div");
            divider.className = "sirk-settings-nav-divider";
            divider.setAttribute("aria-hidden", "true");
            divider.style.height = "1px";
            divider.style.margin = "8px 4px";
            divider.style.background = "var(--sirk-border,#dce3ec)";
        }
        secondary.insertBefore(divider, settingsButton.nextSibling);
    }

    function observeDeviceWorkspace() {
        var content = document.getElementById("sirkStandaloneContent");
        if (!content) return;
        var scheduled = false;
        var observer = new MutationObserver(function () {
            if (scheduled) return;
            scheduled = true;
            window.requestAnimationFrame(function () {
                scheduled = false;
                normalizeDeviceWorkspace();
                normalizeSettingsNavigation();
            });
        });
        observer.observe(content, { childList: true, subtree: true });
        normalizeDeviceWorkspace();
        normalizeSettingsNavigation();
    }

    function navigate(view) {
        view = String(view || "overview");
        var next = "#" + view;
        if (window.location.hash === next) window.dispatchEvent(new HashChangeEvent("hashchange"));
        else window.location.hash = next;
    }

    function bind() {
        var root = document.getElementById("sirkStandaloneRoot");
        if (!root) return false;
        Array.prototype.forEach.call(root.querySelectorAll(".sirk-standalone-nav [data-view]"), function (button) {
            if (button.getAttribute("data-standalone-nav-bound") === "1") return;
            button.setAttribute("data-standalone-nav-bound", "1");
            button.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                navigate(button.getAttribute("data-view"));
            });
        });
        return true;
    }

    loadUiContract();
    loadStyle("sirk-platform-system-updates-style", "system-updates.css");
    loadStyle("sirk-platform-settings-style", "settings.css");
    loadScript("sirk-platform-system-updates-script", "system-updates.js");
    loadScript("sirk-platform-settings-script", "settings.js");
    loadScript("sirk-platform-icon-registry", "shared/icon-registry.js", replacePortalIcons);
    observeDeviceWorkspace();
    loadScript("sirk-platform-portal-terminal-connect", "portal-terminal-connect.js");

    if (!bind()) {
        var attempts = 0;
        var timer = window.setInterval(function () {
            attempts += 1;
            if (bind() || attempts > 100) window.clearInterval(timer);
        }, 50);
    }
}());