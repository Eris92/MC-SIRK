(function () {
    "use strict";

    window.SirkPortalUiContract = window.SirkPortalUiContract || {};
    window.SirkPortalUiContract.decorate = function (root) {
        if (!root) return;
        root.querySelectorAll(".sirk-standalone-card,.sirk-card").forEach(function (node) {
            node.classList.add("sirk-card");
        });
        root.querySelectorAll("button").forEach(function (node) {
            if (!node.classList.contains("sirk-button")) node.classList.add("sirk-button");
        });
    };

    var activeRoot = "modules";
    var needsDefaultSelection = true;
    var scheduled = false;
    var labels = {
        pl: { modules: "Moduły", portal: "Portal", integrations: "Integracje" },
        en: { modules: "Modules", portal: "Portal", integrations: "Integrations" }
    };

    function language() {
        try { return localStorage.getItem("sirkPortal.language") === "en" ? "en" : "pl"; }
        catch (error) { return document.documentElement.lang === "en" ? "en" : "pl"; }
    }

    function label(key) { return labels[language()][key]; }

    function normalized(value) {
        return String(value || "").replace(/^\s*[▸▼]?\s*/, "").trim().toLowerCase();
    }

    function settingsWorkspace() {
        var content = document.getElementById("sirkStandaloneContent");
        return content && (content.querySelector("[data-portal-settings] .sirk-layout") ||
            content.querySelector(".sirk-settings-module-workspace"));
    }

    function directButtons(primary) {
        return primary ? Array.prototype.slice.call(primary.querySelectorAll(":scope > .sirk-nav-item")) : [];
    }

    function baseSettingsButton(primary) {
        var marked = primary && primary.querySelector(":scope > [data-settings-base-primary]");
        if (marked) return marked;
        var found = directButtons(primary).find(function (button) {
            var value = normalized(button.textContent);
            return value === "settings" || value === "ustawienia";
        });
        if (found) found.setAttribute("data-settings-base-primary", "1");
        return found || null;
    }

    function serverButton(primary) {
        return directButtons(primary).find(function (button) {
            var value = normalized(button.textContent);
            return value === "server" || value === "serwer";
        }) || null;
    }

    function isActive(button) {
        return !!(button && (button.classList.contains("active") || button.classList.contains("is-active")));
    }

    function ensureStyle() {
        if (document.getElementById("sirkSettingsPrimaryNavigationStyle")) return;
        var style = document.createElement("style");
        style.id = "sirkSettingsPrimaryNavigationStyle";
        style.textContent = [
            ".sirk-settings-root-menu{display:grid;gap:4px;width:100%}",
            ".sirk-settings-root-menu>.sirk-settings-root-button{width:100%;box-sizing:border-box;text-align:left}",
            ".sirk-settings-root-button.sirk-settings-root-active{background:var(--sirk-active-bg,rgba(77,107,216,.14))!important;color:var(--sirk-text,#172033)!important;font-weight:700!important;box-shadow:inset 3px 0 0 var(--sirk-active-accent,#4d6bd8)!important}",
            ".sirk-settings-primary-projected>summary{display:none!important}",
            ".sirk-settings-primary-projected>.sirk-settings-nav-group-body{display:block!important;padding:0!important}",
            ".sirk-settings-primary-projected{margin:0!important;padding:0!important;border:0!important;background:transparent!important}"
        ].join("");
        (document.head || document.documentElement).appendChild(style);
    }

    function rootMenu(primary, server) {
        var menu = primary.querySelector(":scope > [data-settings-root-menu]");
        if (!menu) {
            menu = document.createElement("div");
            menu.className = "sirk-settings-root-menu";
            menu.setAttribute("data-settings-root-menu", "1");
            primary.insertBefore(menu, server || null);
        }
        return menu;
    }

    function rootButton(menu, key, base) {
        var button = menu.querySelector(':scope > [data-settings-root="' + key + '"]');
        if (!button) {
            button = document.createElement("button");
            button.type = "button";
            button.className = "sirk-nav-item sirk-settings-root-button";
            button.setAttribute("data-settings-root", key);
            button.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                activeRoot = key;
                needsDefaultSelection = true;
                if (isActive(base)) schedule();
                else {
                    base.click();
                    schedule();
                }
            });
            menu.appendChild(button);
        }
        button.textContent = label(key);
        return button;
    }

    function groupKey(group) {
        if (!group) return "";
        var marker = group.getAttribute("data-source-settings-group");
        if (marker === "integrations") return "integrations";
        var summary = group.querySelector(":scope > summary");
        var value = normalized(summary && summary.textContent);
        if (value === "moduły" || value === "modules") return "modules";
        if (value === "portal") return "portal";
        if (value === "integracje" || value === "integrations") return "integrations";
        return "";
    }

    function settingsGroups(secondary) {
        return Array.prototype.slice.call(secondary.querySelectorAll(":scope > details.sirk-settings-nav-group"))
            .map(function (group) { return { node: group, key: groupKey(group) }; })
            .filter(function (entry) { return !!entry.key; });
    }

    function projectSecondary(secondary) {
        var groups = settingsGroups(secondary);
        var target = null;
        groups.forEach(function (entry) {
            var selected = entry.key === activeRoot;
            entry.node.hidden = !selected;
            entry.node.classList.toggle("sirk-settings-primary-projected", selected);
            if (selected) {
                entry.node.open = true;
                target = entry.node;
            }
        });
        secondary.setAttribute("data-settings-primary-section", activeRoot);
        if (!target) return;

        var selectedLeaf = target.querySelector(".sirk-nav-item.active,.sirk-nav-item.is-active");
        if (selectedLeaf) {
            needsDefaultSelection = false;
            return;
        }
        if (!needsDefaultSelection) return;
        var firstLeaf = target.querySelector(".sirk-settings-nav-leaf,.sirk-nav-item");
        if (!firstLeaf || firstLeaf.getAttribute("data-settings-default-opening") === "1") return;
        firstLeaf.setAttribute("data-settings-default-opening", "1");
        needsDefaultSelection = false;
        window.setTimeout(function () {
            firstLeaf.removeAttribute("data-settings-default-opening");
            if (firstLeaf.isConnected) firstLeaf.click();
        }, 0);
    }

    function restoreProjection(secondary) {
        settingsGroups(secondary).forEach(function (entry) {
            entry.node.hidden = false;
            entry.node.classList.remove("sirk-settings-primary-projected");
        });
        secondary.removeAttribute("data-settings-primary-section");
    }

    function applySettingsPrimaryNavigation() {
        var workspace = settingsWorkspace();
        if (!workspace) return;
        var primary = workspace.querySelector(":scope > .sirk-column-primary");
        var secondary = workspace.querySelector(":scope > .sirk-column-secondary");
        if (!primary || !secondary) return;

        ensureStyle();
        var base = baseSettingsButton(primary);
        var server = serverButton(primary);
        if (!base) return;

        base.hidden = true;
        base.style.display = "none";
        base.setAttribute("aria-hidden", "true");
        base.setAttribute("tabindex", "-1");

        var menu = rootMenu(primary, server);
        var buttons = {
            modules: rootButton(menu, "modules", base),
            portal: rootButton(menu, "portal", base),
            integrations: rootButton(menu, "integrations", base)
        };
        if (server) primary.appendChild(server);

        Object.keys(buttons).forEach(function (key) {
            buttons[key].classList.toggle("sirk-settings-root-active", isActive(base) && key === activeRoot);
            buttons[key].setAttribute("aria-current", isActive(base) && key === activeRoot ? "page" : "false");
        });

        if (isActive(base)) projectSecondary(secondary);
        else restoreProjection(secondary);
    }

    function schedule() {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(function () {
            scheduled = false;
            applySettingsPrimaryNavigation();
        });
    }

    var observationRoot = document.getElementById("sirkStandaloneContent") || document.documentElement;
    if (observationRoot) {
        new MutationObserver(schedule).observe(observationRoot, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class", "open", "hidden"]
        });
    }
    window.addEventListener("sirkportal:languagechange", schedule);
    schedule();
}());
