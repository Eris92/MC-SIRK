(function () {
    "use strict";

    if (window.__sirkPlatformStandaloneNavigationLoaded) return;
    window.__sirkPlatformStandaloneNavigationLoaded = true;

    var moveRequestsMode = null;
    var forwardingMoveRequestClick = false;
    var overviewPermissionSaving = false;

    function asset(name) {
        var base = String(window.__SIRK_PLATFORM_ASSET_BASE__ || "").replace(/\/$/, "");
        var version = encodeURIComponent(String(window.__SIRK_PLATFORM_PORTAL_VERSION__ || ""));
        return base ? base + "/" + name + "?v=" + version : "";
    }

    function loadStyle(id, name) {
        if (document.getElementById(id)) return;
        var source = asset(name);
        if (!source) return;
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

    function runtimeModules() {
        var runtime = window.SirkPlatformRuntime;
        return runtime && runtime.state && runtime.state.bootstrap && runtime.state.bootstrap.modules || {};
    }

    function commandsEnabled() {
        var modules = runtimeModules();
        return !!(modules.mycommands && modules.mycommands.enabled === true);
    }

    function normalizeDeviceWorkspace() {
        var content = document.getElementById("sirkStandaloneContent");
        var workspace = content && content.querySelector(":scope > .sirk-device-workspace");
        if (!workspace) return;
        var header = workspace.querySelector(":scope > .sirk-device-compact-header");
        var tabs = workspace.querySelector(":scope > .sirk-device-tabs,:scope > .sirk-device-compact-tabs");
        if (!header || !tabs) return;
        var commandsTab = tabs.querySelector('[data-device-tab="commands"]');
        if (commandsTab && !commandsEnabled()) {
            var active = commandsTab.classList.contains("is-active") || commandsTab.getAttribute("aria-selected") === "true";
            commandsTab.remove();
            if (active) {
                var overviewTab = tabs.querySelector('[data-device-tab="general"]');
                if (overviewTab) overviewTab.click();
            }
        }
        [".sirk-device-compact-back", ".sirk-device-compact-icon", ".sirk-device-compact-main"].forEach(function (selector) {
            var element = header.querySelector(selector);
            if (element) element.remove();
        });
        tabs.className = "sirk-device-compact-tabs";
        tabs.removeAttribute("role");
        if (tabs.parentNode !== header) header.insertBefore(tabs, header.firstChild);
        header.setAttribute("data-compact-tabs-mounted", "1");
    }

    function groupByLabel(host, label) {
        var result = null;
        if (!host) return null;
        Array.prototype.some.call(host.querySelectorAll(":scope > details.sirk-settings-nav-group"), function (group) {
            var summary = group.querySelector(":scope > summary");
            if (String(summary && summary.textContent || "").trim() !== label) return false;
            result = group;
            return true;
        });
        return result;
    }

    function bindExpandableGroups(secondary) {
        Array.prototype.forEach.call(secondary.querySelectorAll("details.sirk-settings-nav-group"), function (group) {
            var summary = group.querySelector(":scope > summary");
            if (!summary || summary.getAttribute("data-sirk-expand-bound") === "1") return;
            summary.setAttribute("data-sirk-expand-bound", "1");
            summary.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                group.open = !group.open;
                group.setAttribute("data-sirk-user-open", group.open ? "1" : "0");
            });
        });
        Array.prototype.forEach.call(secondary.querySelectorAll('details.sirk-settings-nav-group[data-sirk-user-open]'), function (group) {
            group.open = group.getAttribute("data-sirk-user-open") === "1";
        });
    }

    function normalizeServerNavigation(primary, secondary) {
        var activePrimary = primary && primary.querySelector(":scope > .sirk-nav-item.active,:scope > .sirk-nav-item.is-active");
        if (!activePrimary || String(activePrimary.textContent || "").trim() !== "Server") return;
        if (secondary.querySelector(":scope > .sirk-settings-nav-group")) return;
        var buttons = {};
        Array.prototype.forEach.call(secondary.querySelectorAll(":scope > .sirk-nav-item"), function (button) {
            buttons[String(button.textContent || "").trim()] = button;
        });
        var labels = { "Debug · Config": "Config", "Debug · Logi": "Logi", "Debug · Błędy": "Błędy", "System · Backupy": "Backupy" };
        Object.keys(labels).forEach(function (source) { if (buttons[source]) buttons[source].textContent = labels[source]; });
        var update = buttons["System · Aktualizacje"];
        var history = buttons["System · Historia"];
        var channel = buttons["System · Kanał aktualizacji"];
        if (!update || !history || !channel) return;
        var group = document.createElement("details");
        group.className = "sirk-settings-nav-group";
        var summary = document.createElement("summary");
        summary.textContent = "Aktualizacje";
        group.appendChild(summary);
        update.textContent = "Sprawdź";
        history.textContent = "Historia";
        channel.textContent = "Kanał";
        secondary.insertBefore(group, update);
        group.appendChild(update);
        group.appendChild(history);
        group.appendChild(channel);
        group.open = update.classList.contains("active") || history.classList.contains("active") || channel.classList.contains("active");
    }

    function ensureMoveRequestsNavigation(secondary) {
        var modulesGroup = groupByLabel(secondary, "Moduły");
        var modulesBody = modulesGroup && modulesGroup.querySelector(":scope > .sirk-settings-nav-group-body");
        var approvalsGroup = groupByLabel(modulesBody, "Akceptacje");
        if (!modulesBody || !approvalsGroup) return;
        Array.prototype.forEach.call(secondary.querySelectorAll(".sirk-nav-item"), function (button) {
            if (button.getAttribute("data-move-request-nav") === "1" || button.getAttribute("data-move-reset-bound") === "1") return;
            button.setAttribute("data-move-reset-bound", "1");
            button.addEventListener("click", function () { if (!forwardingMoveRequestClick) moveRequestsMode = null; });
        });
        var moveGroup = groupByLabel(modulesBody, "Przenoszenie urządzeń");
        if (!moveGroup) {
            moveGroup = document.createElement("details");
            moveGroup.className = "sirk-settings-nav-group";
            var summary = document.createElement("summary");
            summary.textContent = "Przenoszenie urządzeń";
            moveGroup.appendChild(summary);
            var body = document.createElement("div");
            body.className = "sirk-settings-nav-group-body";
            moveGroup.appendChild(body);
            approvalsGroup.parentNode.insertBefore(moveGroup, approvalsGroup.nextSibling);
            ["Ogólne", "Permissions"].forEach(function (label) {
                var button = document.createElement("button");
                button.type = "button";
                button.className = "sirk-nav-item sirk-settings-nav-leaf";
                button.textContent = label;
                button.setAttribute("data-move-request-nav", "1");
                button.addEventListener("click", function () {
                    var approvalBody = approvalsGroup.querySelector(":scope > .sirk-settings-nav-group-body");
                    var target = null;
                    Array.prototype.some.call(approvalBody.querySelectorAll(":scope > .sirk-nav-item"), function (candidate) {
                        if (String(candidate.textContent || "").trim() !== label) return false;
                        target = candidate;
                        return true;
                    });
                    if (!target) return;
                    moveRequestsMode = label === "Permissions" ? "permissions" : "general";
                    moveGroup.open = true;
                    moveGroup.setAttribute("data-sirk-user-open", "1");
                    forwardingMoveRequestClick = true;
                    target.click();
                    forwardingMoveRequestClick = false;
                });
                body.appendChild(button);
            });
        }
        if (moveRequestsMode) {
            moveGroup.open = true;
            moveGroup.setAttribute("data-sirk-user-open", "1");
        }
        Array.prototype.forEach.call(moveGroup.querySelectorAll('[data-move-request-nav="1"]'), function (button) {
            var selected = moveRequestsMode === "permissions" ? "Permissions" : "Ogólne";
            button.classList.toggle("active", !!moveRequestsMode && String(button.textContent || "").trim() === selected);
        });
    }

    function filterMoveRequestsSections(workspace) {
        var form = workspace.querySelector("[data-settings-form]");
        if (!form) return;
        var secondary = workspace.querySelector(":scope > .sirk-column-secondary");
        var modulesBody = groupByLabel(secondary, "Moduły");
        modulesBody = modulesBody && modulesBody.querySelector(":scope > .sirk-settings-nav-group-body");
        var approvalsGroup = groupByLabel(modulesBody, "Akceptacje");
        var approvalsActive = !!(approvalsGroup && approvalsGroup.querySelector(".sirk-nav-item.active,.sirk-nav-item.is-active"));
        if (!approvalsActive && !moveRequestsMode) return;
        Array.prototype.forEach.call(form.querySelectorAll(":scope > [data-settings-section]"), function (section) {
            var summary = section.querySelector(":scope > summary");
            var value = String(summary && summary.textContent || "").trim().toLowerCase();
            var move = value.indexOf("moverequests") >= 0;
            if ((moveRequestsMode && !move) || (!moveRequestsMode && move)) section.remove();
        });
        if (moveRequestsMode) {
            Array.prototype.forEach.call(form.querySelectorAll(":scope > [data-settings-field]"), function (field) {
                var label = field.querySelector("[data-settings-field-copy] strong");
                if (String(label && label.textContent || "").trim() === "Widoczność zakładki") field.remove();
            });
        }
    }

    function removeModuleCardWrappers(workspace) {
        Array.prototype.forEach.call(workspace.querySelectorAll("[data-settings-form] [data-settings-section].sirk-card"), function (section) {
            section.classList.remove("sirk-card");
            section.classList.add("sirk-settings-section-plain");
        });
    }

    function normalizeUnifiedModuleToggle(workspace) {
        var form = workspace.querySelector("[data-settings-form]");
        if (!form || form.getAttribute("data-overview-permissions-form") === "1") return;
        var candidates = [];
        var technical = [];
        Array.prototype.forEach.call(form.querySelectorAll("[data-settings-field]"), function (field) {
            var label = field.querySelector("[data-settings-field-copy] strong");
            var value = String(label && label.textContent || "").trim();
            if (["Widoczność zakładki", "Enabled", "Włącz i pokaż"].indexOf(value) >= 0) candidates.push(field);
            if (["Show In Menu", "Show On Device", "Host Button Enabled", "Menu Enabled"].indexOf(value) >= 0) technical.push(field);
        });
        technical.forEach(function (field) { field.remove(); });
        if (!candidates.length) return;
        var primary = candidates[0];
        var label = primary.querySelector("[data-settings-field-copy] strong");
        var copy = primary.querySelector("[data-settings-field-copy]");
        var description = copy && copy.querySelector("small");
        var input = primary.querySelector('input[type="checkbox"]');
        var linked = [];
        if (label) label.textContent = "Włącz i pokaż";
        if (!description && copy) { description = document.createElement("small"); copy.appendChild(description); }
        if (description) description.textContent = "Jednocześnie włącza funkcję modułu i pokazuje jego zakładkę w Portalu.";
        candidates.slice(1).forEach(function (field) {
            var linkedInput = field.querySelector('input[type="checkbox"]');
            if (linkedInput) linked.push(linkedInput);
            field.remove();
        });
        if (!input) return;
        input.checked = [input].concat(linked).every(function (item) { return item.checked; });
        input.onchange = function () {
            linked.forEach(function (item) {
                item.checked = input.checked;
                item.dispatchEvent(new Event("change", { bubbles: true }));
            });
        };
    }

    function settingsApiUrl(action) {
        var url = new URL(window.__SIRK_PLATFORM_API_BASE__ || "/api", window.location.href);
        var clean = url.pathname.replace(/\/+$/, "");
        if (/\/api$/.test(clean)) {
            url.pathname = clean + "/admin/settings";
            url.search = "";
            return url.href;
        }
        url.searchParams.set("pin", "SIRKPortal");
        url.searchParams.set("action", action);
        return url.href;
    }

    function parseSettingsResponse(response) {
        return response.text().then(function (body) {
            var value;
            try { value = JSON.parse(body || "{}"); }
            catch (error) { throw new Error("Endpoint ustawień zwrócił odpowiedź inną niż JSON."); }
            if (!response.ok || value.ok === false) throw new Error(value.error && value.error.message || value.error || ("HTTP " + response.status));
            return value.value || value.snapshot || value;
        });
    }

    function loadSettingsSnapshot() {
        return fetch(settingsApiUrl("portal-admin-snapshot"), {
            credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" }
        }).then(parseSettingsResponse);
    }

    function saveSettingsSnapshot(snapshot, cardGroups) {
        var modules = {};
        (snapshot.modules || []).forEach(function (item) { modules[item.key] = item.enabled === true; });
        var moduleOptions = JSON.parse(JSON.stringify(snapshot.moduleSettings || {}));
        moduleOptions.portal = moduleOptions.portal || {};
        moduleOptions.portal.views = moduleOptions.portal.views || {};
        var overview = moduleOptions.portal.views.overview = moduleOptions.portal.views.overview || {};
        overview.devicesCardAccessGroupIds = cardGroups.devices;
        overview.systemStatusCardAccessGroupIds = cardGroups.system;
        overview.integrationsCardAccessGroupIds = cardGroups.integrations;
        var integrations = snapshot.integrations && snapshot.integrations.values || {};
        var base = new URL(window.__SIRK_PLATFORM_API_BASE__ || "/api", window.location.href);
        if (/\/api$/.test(base.pathname.replace(/\/+$/, ""))) {
            var standalone = new URLSearchParams();
            standalone.set("payload", JSON.stringify({ modules: modules, moduleOptions: moduleOptions, portal: moduleOptions.portal, integrations: integrations, secrets: {} }));
            return fetch(settingsApiUrl("save-settings"), {
                method: "POST", credentials: "same-origin",
                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "application/json" },
                body: standalone.toString()
            }).then(parseSettingsResponse);
        }
        var body = new URLSearchParams();
        body.set("modules", JSON.stringify(modules));
        body.set("moduleOptions", JSON.stringify(moduleOptions));
        body.set("integrations", JSON.stringify(integrations));
        body.set("secrets", "{}");
        return fetch(settingsApiUrl("save-settings"), {
            method: "POST", credentials: "same-origin",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "application/json" },
            body: body.toString()
        }).then(parseSettingsResponse);
    }

    function groupSelector(title, groups, selected) {
        var section = document.createElement("section");
        section.className = "sirk-card";
        var strong = document.createElement("strong");
        strong.textContent = title;
        section.appendChild(strong);
        var small = document.createElement("small");
        small.textContent = "Brak wyboru oznacza widoczność dla wszystkich. Site Admin widzi kafelek zawsze.";
        section.appendChild(small);
        var list = document.createElement("div");
        list.style.cssText = "display:grid;gap:8px;margin-top:12px";
        groups.forEach(function (group) {
            var row = document.createElement("label");
            row.style.cssText = "display:flex;align-items:center;gap:9px";
            var input = document.createElement("input");
            input.type = "checkbox";
            input.value = String(group.id);
            input.checked = selected.indexOf(String(group.id)) >= 0;
            row.appendChild(input);
            var text = document.createElement("span");
            text.textContent = group.name + (group.name === group.id ? "" : " (" + group.id + ")");
            row.appendChild(text);
            list.appendChild(row);
        });
        section.appendChild(list);
        return section;
    }

    function selectedGroups(section) {
        return Array.prototype.filter.call(section.querySelectorAll('input[type="checkbox"]'), function (input) {
            return input.checked;
        }).map(function (input) { return String(input.value); });
    }

    function showOverviewPermissions(workspace, button) {
        loadSettingsSnapshot().then(function (snapshot) {
            var details = workspace.querySelector(":scope > .sirk-column-details");
            if (!details) return;
            var portal = snapshot.moduleSettings && snapshot.moduleSettings.portal || {};
            var overview = portal.views && portal.views.overview || {};
            var groups = snapshot.userGroups || [];
            details.innerHTML = "";
            var form = document.createElement("div");
            form.setAttribute("data-settings-form", "1");
            form.setAttribute("data-overview-permissions-form", "1");
            var devices = groupSelector("Pokaż Devices", groups, Array.isArray(overview.devicesCardAccessGroupIds) ? overview.devicesCardAccessGroupIds.map(String) : []);
            var system = groupSelector("Pokaż stan systemu", groups, Array.isArray(overview.systemStatusCardAccessGroupIds) ? overview.systemStatusCardAccessGroupIds.map(String) : []);
            var integrations = groupSelector("Pokaż Integrations", groups, Array.isArray(overview.integrationsCardAccessGroupIds) ? overview.integrationsCardAccessGroupIds.map(String) : []);
            form.appendChild(devices);
            form.appendChild(system);
            form.appendChild(integrations);
            var actions = document.createElement("div");
            actions.className = "sirk-toolbar-group sirk-toolbar-left";
            var save = document.createElement("button");
            save.type = "button";
            save.className = "sirk-button";
            save.textContent = "Zapisz";
            var message = document.createElement("span");
            save.onclick = function () {
                if (overviewPermissionSaving) return;
                overviewPermissionSaving = true;
                save.disabled = true;
                message.textContent = "Zapisywanie…";
                saveSettingsSnapshot(snapshot, {
                    devices: selectedGroups(devices),
                    system: selectedGroups(system),
                    integrations: selectedGroups(integrations)
                }).then(function () {
                    message.textContent = "Zapisano.";
                    overviewPermissionSaving = false;
                    save.disabled = false;
                }).catch(function (error) {
                    message.textContent = error.message || String(error);
                    message.setAttribute("data-error", "1");
                    overviewPermissionSaving = false;
                    save.disabled = false;
                });
            };
            actions.appendChild(save);
            actions.appendChild(message);
            details.appendChild(form);
            details.appendChild(actions);
            button.classList.add("active");
        }).catch(function (error) { window.alert(error.message || String(error)); });
    }

    function ensureOverviewPermissions(secondary, workspace) {
        var modules = groupByLabel(secondary, "Moduły");
        var body = modules && modules.querySelector(":scope > .sirk-settings-nav-group-body");
        var overview = groupByLabel(body, "Overview");
        var overviewBody = overview && overview.querySelector(":scope > .sirk-settings-nav-group-body");
        if (!overviewBody || overviewBody.querySelector('[data-overview-permissions-nav="1"]')) return;
        var button = document.createElement("button");
        button.type = "button";
        button.className = "sirk-nav-item sirk-settings-nav-leaf";
        button.textContent = "Permissions";
        button.setAttribute("data-overview-permissions-nav", "1");
        button.onclick = function () {
            Array.prototype.forEach.call(secondary.querySelectorAll(".sirk-nav-item.active,.sirk-nav-item.is-active"), function (item) {
                item.classList.remove("active", "is-active");
            });
            overview.open = true;
            overview.setAttribute("data-sirk-user-open", "1");
            showOverviewPermissions(workspace, button);
        };
        overviewBody.appendChild(button);
    }

    function currentUserGroupIds() {
        var runtime = window.SirkPlatformRuntime;
        var bootstrap = runtime && runtime.state && runtime.state.bootstrap || {};
        var user = bootstrap.user || {};
        var result = [];
        [user.groupIds, user.groups, user.userGroups].forEach(function (value) {
            if (!Array.isArray(value)) return;
            value.forEach(function (item) {
                var id = typeof item === "string" ? item : item && (item.id || item._id);
                if (id && result.indexOf(String(id)) < 0) result.push(String(id));
            });
        });
        if (user.links && typeof user.links === "object") Object.keys(user.links).forEach(function (id) { if (result.indexOf(id) < 0) result.push(id); });
        return result;
    }

    function siteAdmin() {
        var modules = runtimeModules();
        return !!(modules.portal && modules.portal.access && modules.portal.access.siteAdmin === true);
    }

    function allowedForGroups(groups) {
        if (siteAdmin() || !Array.isArray(groups) || !groups.length) return true;
        var current = currentUserGroupIds();
        return groups.some(function (id) { return current.indexOf(String(id)) >= 0; });
    }

    function applyOverviewCardPermissions() {
        var modules = runtimeModules();
        var config = modules.portal && modules.portal.config && modules.portal.config.views && modules.portal.config.views.overview || {};
        [
            ["sirkOverviewDeviceCount", config.devicesCardAccessGroupIds],
            ["sirkOverviewSystemStatus", config.systemStatusCardAccessGroupIds],
            ["sirkOverviewHealthBadge", config.integrationsCardAccessGroupIds]
        ].forEach(function (entry) {
            var marker = document.getElementById(entry[0]);
            if (!marker || allowedForGroups(entry[1])) return;
            var card = marker.closest(".sirk-standalone-card");
            if (card) card.remove();
        });
    }

    function normalizeSettingsNavigation() {
        var content = document.getElementById("sirkStandaloneContent");
        var workspace = content && (content.querySelector("[data-portal-settings] .sirk-layout") || content.querySelector(".sirk-settings-module-workspace"));
        if (!workspace) return;
        var primary = workspace.querySelector(":scope > .sirk-column-primary");
        var settingsButton = null;
        var activateSettings = false;
        if (primary) {
            Array.prototype.forEach.call(primary.querySelectorAll(":scope > .sirk-nav-item"), function (button) {
                var label = String(button.textContent || "").trim();
                if (label === "Settings") settingsButton = button;
                if (label !== "Settings" && label !== "Server") {
                    if (button.classList.contains("active") || button.classList.contains("is-active")) activateSettings = true;
                    button.remove();
                }
            });
            if (activateSettings && settingsButton && !settingsButton.classList.contains("active") && !settingsButton.classList.contains("is-active")) {
                settingsButton.click();
                return;
            }
        }
        var secondary = workspace.querySelector(":scope > .sirk-column-secondary");
        if (!secondary) return;
        normalizeServerNavigation(primary, secondary);
        ensureMoveRequestsNavigation(secondary);
        ensureOverviewPermissions(secondary, workspace);
        bindExpandableGroups(secondary);
        filterMoveRequestsSections(workspace);
        removeModuleCardWrappers(workspace);
        normalizeUnifiedModuleToggle(workspace);
    }

    function observeWorkspace() {
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
                applyOverviewCardPermissions();
            });
        });
        observer.observe(content, { childList: true, subtree: true });
        normalizeDeviceWorkspace();
        normalizeSettingsNavigation();
        applyOverviewCardPermissions();
    }

    function navigate(view) {
        var next = "#" + String(view || "overview");
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
    observeWorkspace();
    loadScript("sirk-platform-portal-terminal-connect", "portal-terminal-connect.js");
    if (!bind()) {
        var attempts = 0;
        var timer = window.setInterval(function () {
            attempts += 1;
            if (bind() || attempts > 100) window.clearInterval(timer);
        }, 50);
    }
}());