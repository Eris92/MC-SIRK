(function () {
    "use strict";

    if (window.__sirkSettingsStructureLoaded) return;
    window.__sirkSettingsStructureLoaded = true;

    var activeCustom = "";
    var saving = false;
    var INTEGRATIONS = [
        { key: "ad", label: "AD" },
        { key: "defender", label: "Defender" },
        { key: "entra", label: "Entra" },
        { key: "jira", label: "Jira" },
        { key: "zabbix", label: "Zabbix" },
        { key: "sms", label: "SMS" }
    ];

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value == null ? {} : value));
    }

    function workspace() {
        var content = document.getElementById("sirkStandaloneContent");
        return content && (content.querySelector("[data-portal-settings] .sirk-layout") || content.querySelector(".sirk-settings-module-workspace"));
    }

    function settingsActive(root) {
        var primary = root && root.querySelector(":scope > .sirk-column-primary");
        var active = primary && primary.querySelector(":scope > .sirk-nav-item.active,:scope > .sirk-nav-item.is-active");
        return String(active && active.textContent || "").trim() === "Settings";
    }

    function findGroup(host, label) {
        var result = null;
        if (!host) return result;
        Array.prototype.some.call(host.querySelectorAll(":scope > details.sirk-settings-nav-group"), function (group) {
            var summary = group.querySelector(":scope > summary");
            if (String(summary && summary.textContent || "").trim() !== label) return false;
            result = group;
            return true;
        });
        return result;
    }

    function findLeaf(group, label) {
        var body = group && group.querySelector(":scope > .sirk-settings-nav-group-body");
        var result = null;
        if (!body) return result;
        Array.prototype.some.call(body.querySelectorAll(":scope > .sirk-nav-item"), function (button) {
            if (String(button.textContent || "").trim() !== label) return false;
            result = button;
            return true;
        });
        return result;
    }

    function apiUrl(action) {
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

    function parse(response) {
        return response.text().then(function (body) {
            var value;
            try { value = JSON.parse(body || "{}"); }
            catch (error) { throw new Error("Endpoint ustawień zwrócił odpowiedź inną niż JSON."); }
            if (!response.ok || value.ok === false) {
                throw new Error(value.error && value.error.message || value.error || ("HTTP " + response.status));
            }
            return value.value || value.snapshot || value;
        });
    }

    function loadSnapshot() {
        return fetch(apiUrl("portal-admin-snapshot"), {
            credentials: "same-origin",
            cache: "no-store",
            headers: { Accept: "application/json" }
        }).then(parse);
    }

    function moduleStates(snapshot) {
        var result = {};
        (snapshot.modules || []).forEach(function (item) { result[item.key] = item.enabled === true; });
        return result;
    }

    function saveSnapshot(snapshot, modules, moduleOptions, integrations) {
        var base = new URL(window.__SIRK_PLATFORM_API_BASE__ || "/api", window.location.href);
        var clean = base.pathname.replace(/\/+$/, "");
        if (/\/api$/.test(clean)) {
            var standalone = new URLSearchParams();
            standalone.set("payload", JSON.stringify({
                modules: modules,
                moduleOptions: moduleOptions,
                portal: moduleOptions.portal || {},
                integrations: integrations,
                secrets: {}
            }));
            return fetch(clean + "/admin/settings", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "application/json" },
                body: standalone.toString()
            }).then(parse);
        }
        var body = new URLSearchParams();
        body.set("modules", JSON.stringify(modules));
        body.set("moduleOptions", JSON.stringify(moduleOptions));
        body.set("integrations", JSON.stringify(integrations));
        body.set("secrets", "{}");
        return fetch(apiUrl("save-settings"), {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "application/json" },
            body: body.toString()
        }).then(parse);
    }

    function booleanField(label, checked, description) {
        var row = el("label", "sirk-card");
        row.setAttribute("data-settings-field", "boolean");
        var copy = el("span");
        copy.setAttribute("data-settings-field-copy", "1");
        copy.appendChild(el("strong", "", label));
        if (description) copy.appendChild(el("small", "", description));
        var input = el("input");
        input.type = "checkbox";
        input.checked = checked === true;
        input.setAttribute("data-settings-input", "1");
        row.appendChild(copy);
        row.appendChild(input);
        return { row: row, input: input };
    }

    function valueField(host, object, key, value) {
        var title = key.replace(/([A-Z])/g, " $1").replace(/^./, function (character) { return character.toUpperCase(); });
        var row = el("label", "sirk-card");
        row.setAttribute("data-settings-field", "value");
        var copy = el("span");
        copy.setAttribute("data-settings-field-copy", "1");
        copy.appendChild(el("strong", "", title));
        var input = el(typeof value === "string" && value.length > 120 ? "textarea" : "input");
        if (input.tagName === "INPUT") input.type = typeof value === "number" ? "number" : "text";
        input.value = value == null ? "" : String(value);
        input.setAttribute("data-settings-input", "1");
        input.oninput = function () {
            object[key] = typeof value === "number" ? Number(input.value) : input.value;
        };
        row.appendChild(copy);
        row.appendChild(input);
        host.appendChild(row);
    }

    function objectForm(host, object) {
        object = object && typeof object === "object" && !Array.isArray(object) ? object : {};
        Object.keys(object).sort().forEach(function (key) {
            var value = object[key];
            if (value && typeof value === "object" && !Array.isArray(value)) {
                var section = el("details", "sirk-settings-section-plain");
                section.open = true;
                section.setAttribute("data-settings-section", "1");
                section.appendChild(el("summary", "", key.replace(/([A-Z])/g, " $1").replace(/^./, function (character) { return character.toUpperCase(); })));
                var body = el("div");
                body.setAttribute("data-settings-section-body", "1");
                objectForm(body, value);
                section.appendChild(body);
                host.appendChild(section);
            } else if (typeof value === "boolean") {
                var field = booleanField(key.replace(/([A-Z])/g, " $1").replace(/^./, function (character) { return character.toUpperCase(); }), value);
                field.input.onchange = function () { object[key] = field.input.checked; };
                host.appendChild(field.row);
            } else if (Array.isArray(value)) {
                valueField(host, object, key, value.join(", "));
            } else {
                valueField(host, object, key, value);
            }
        });
    }

    function groupSelector(title, groups, selected) {
        var card = el("section", "sirk-card");
        card.appendChild(el("strong", "", title));
        card.appendChild(el("small", "", "Brak wyboru oznacza dostęp dla wszystkich. Site administrator ma dostęp zawsze."));
        var list = el("div");
        list.style.cssText = "display:grid;gap:8px;margin-top:12px";
        (groups || []).forEach(function (group) {
            var row = el("label");
            row.style.cssText = "display:flex;align-items:center;gap:9px";
            var input = el("input");
            input.type = "checkbox";
            input.value = String(group.id);
            input.checked = selected.indexOf(String(group.id)) >= 0;
            row.appendChild(input);
            row.appendChild(el("span", "", String(group.name || group.id)));
            list.appendChild(row);
        });
        card.appendChild(list);
        return {
            card: card,
            values: function () {
                return Array.prototype.filter.call(list.querySelectorAll('input[type="checkbox"]'), function (input) { return input.checked; })
                    .map(function (input) { return String(input.value); });
            }
        };
    }

    function setActive(root, button, key) {
        var secondary = root.querySelector(":scope > .sirk-column-secondary");
        Array.prototype.forEach.call(secondary.querySelectorAll(".sirk-nav-item.active,.sirk-nav-item.is-active"), function (item) {
            item.classList.remove("active", "is-active");
        });
        button.classList.add("active");
        var group = button.closest("details.sirk-settings-nav-group");
        if (group) group.open = true;
        activeCustom = key;
    }

    function appendActions(details, save, message) {
        var actions = el("div", "sirk-toolbar-group sirk-toolbar-left");
        actions.appendChild(save);
        actions.appendChild(message);
        details.appendChild(actions);
    }

    function renderMove(root, mode, button) {
        setActive(root, button, "move:" + mode);
        var details = root.querySelector(":scope > .sirk-column-details");
        details.setAttribute("data-custom-settings-key", activeCustom);
        details.innerHTML = '<div class="sirk-card">Ładowanie…</div>';
        loadSnapshot().then(function (snapshot) {
            if (activeCustom !== "move:" + mode) return;
            var modules = moduleStates(snapshot);
            var moduleOptions = clone(snapshot.moduleSettings || {});
            var integrations = clone(snapshot.integrations && snapshot.integrations.values || {});
            var move = moduleOptions.moverequests = moduleOptions.moverequests || {};
            var approval = moduleOptions.approvalcenter = moduleOptions.approvalcenter || {};
            approval.providers = approval.providers || {};
            var provider = approval.providers.moverequests = approval.providers.moverequests || {};
            details.innerHTML = "";
            var form = el("div");
            form.setAttribute("data-settings-form", "1");
            var save = el("button", "sirk-button", "Zapisz");
            save.type = "button";
            var message = el("span");
            if (mode === "general") {
                var enabled = booleanField("Włącz i pokaż", modules.moverequests === true, "Włącza przenoszenie urządzeń i pokazuje przycisk w widoku urządzenia.");
                var approvals = booleanField("Włącz akceptacje", provider.enabled !== false, "Wnioski o przeniesienie urządzeń będą obsługiwane przez Akceptacje.");
                form.appendChild(enabled.row);
                form.appendChild(approvals.row);
                save.onclick = function () {
                    if (saving) return;
                    saving = true;
                    save.disabled = true;
                    message.textContent = "Zapisywanie…";
                    modules.moverequests = enabled.input.checked;
                    move.enabled = enabled.input.checked;
                    provider.enabled = approvals.input.checked;
                    saveSnapshot(snapshot, modules, moduleOptions, integrations).then(function () {
                        saving = false;
                        renderMove(root, mode, button);
                    }).catch(function (error) {
                        saving = false;
                        save.disabled = false;
                        message.textContent = error.message || String(error);
                    });
                };
            } else {
                var selector = groupSelector("Dostęp grup MeshCentral", snapshot.userGroups || [], Array.isArray(move.accessGroupIds) ? move.accessGroupIds.map(String) : []);
                form.appendChild(selector.card);
                save.onclick = function () {
                    if (saving) return;
                    saving = true;
                    save.disabled = true;
                    message.textContent = "Zapisywanie…";
                    move.accessGroupIds = selector.values();
                    saveSnapshot(snapshot, modules, moduleOptions, integrations).then(function () {
                        saving = false;
                        renderMove(root, mode, button);
                    }).catch(function (error) {
                        saving = false;
                        save.disabled = false;
                        message.textContent = error.message || String(error);
                    });
                };
            }
            details.appendChild(form);
            appendActions(details, save, message);
        }).catch(function (error) {
            details.innerHTML = "";
            details.appendChild(el("div", "sirk-card", error.message || String(error)));
        });
    }

    function renderIntegration(root, item, button) {
        setActive(root, button, "integration:" + item.key);
        var details = root.querySelector(":scope > .sirk-column-details");
        details.setAttribute("data-custom-settings-key", activeCustom);
        details.innerHTML = '<div class="sirk-card">Ładowanie…</div>';
        loadSnapshot().then(function (snapshot) {
            if (activeCustom !== "integration:" + item.key) return;
            var modules = moduleStates(snapshot);
            var moduleOptions = clone(snapshot.moduleSettings || {});
            var integrations = clone(snapshot.integrations && snapshot.integrations.values || {});
            integrations[item.key] = integrations[item.key] && typeof integrations[item.key] === "object" ? integrations[item.key] : {};
            details.innerHTML = "";
            var form = el("div");
            form.setAttribute("data-settings-form", "1");
            objectForm(form, integrations[item.key]);
            var save = el("button", "sirk-button", "Zapisz");
            save.type = "button";
            var message = el("span");
            save.onclick = function () {
                if (saving) return;
                saving = true;
                save.disabled = true;
                message.textContent = "Zapisywanie…";
                saveSnapshot(snapshot, modules, moduleOptions, integrations).then(function () {
                    saving = false;
                    renderIntegration(root, item, button);
                }).catch(function (error) {
                    saving = false;
                    save.disabled = false;
                    message.textContent = error.message || String(error);
                });
            };
            details.appendChild(form);
            appendActions(details, save, message);
        }).catch(function (error) {
            details.innerHTML = "";
            details.appendChild(el("div", "sirk-card", error.message || String(error)));
        });
    }

    function renderOverviewPermissions(root, button) {
        setActive(root, button, "overview:permissions");
        var details = root.querySelector(":scope > .sirk-column-details");
        details.setAttribute("data-custom-settings-key", activeCustom);
        details.innerHTML = '<div class="sirk-card">Ładowanie…</div>';
        loadSnapshot().then(function (snapshot) {
            if (activeCustom !== "overview:permissions") return;
            var modules = moduleStates(snapshot);
            var moduleOptions = clone(snapshot.moduleSettings || {});
            var integrations = clone(snapshot.integrations && snapshot.integrations.values || {});
            moduleOptions.portal = moduleOptions.portal || {};
            moduleOptions.portal.views = moduleOptions.portal.views || {};
            var overview = moduleOptions.portal.views.overview = moduleOptions.portal.views.overview || {};
            details.innerHTML = "";
            var form = el("div");
            form.setAttribute("data-settings-form", "1");
            var devices = groupSelector("Pokaż Devices", snapshot.userGroups || [], Array.isArray(overview.devicesCardAccessGroupIds) ? overview.devicesCardAccessGroupIds.map(String) : []);
            var system = groupSelector("Pokaż stan systemu", snapshot.userGroups || [], Array.isArray(overview.systemStatusCardAccessGroupIds) ? overview.systemStatusCardAccessGroupIds.map(String) : []);
            var integrationCards = groupSelector("Pokaż Integrations", snapshot.userGroups || [], Array.isArray(overview.integrationsCardAccessGroupIds) ? overview.integrationsCardAccessGroupIds.map(String) : []);
            form.appendChild(devices.card);
            form.appendChild(system.card);
            form.appendChild(integrationCards.card);
            var save = el("button", "sirk-button", "Zapisz");
            save.type = "button";
            var message = el("span");
            save.onclick = function () {
                if (saving) return;
                saving = true;
                save.disabled = true;
                message.textContent = "Zapisywanie…";
                overview.devicesCardAccessGroupIds = devices.values();
                overview.systemStatusCardAccessGroupIds = system.values();
                overview.integrationsCardAccessGroupIds = integrationCards.values();
                saveSnapshot(snapshot, modules, moduleOptions, integrations).then(function () {
                    saving = false;
                    renderOverviewPermissions(root, button);
                }).catch(function (error) {
                    saving = false;
                    save.disabled = false;
                    message.textContent = error.message || String(error);
                });
            };
            details.appendChild(form);
            appendActions(details, save, message);
        }).catch(function (error) {
            details.innerHTML = "";
            details.appendChild(el("div", "sirk-card", error.message || String(error)));
        });
    }

    function createGroup(label, marker) {
        var group = el("details", "sirk-settings-nav-group");
        group.setAttribute("data-source-settings-group", marker);
        group.appendChild(el("summary", "", label));
        group.appendChild(el("div", "sirk-settings-nav-group-body"));
        return group;
    }

    function customButton(label, key, handler) {
        var button = el("button", "sirk-nav-item sirk-settings-nav-leaf", label);
        button.type = "button";
        button.setAttribute("data-source-settings-nav", key);
        button.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            handler(button);
        };
        return button;
    }

    function ensureNavigation(root) {
        if (!root || !settingsActive(root)) return;
        var secondary = root.querySelector(":scope > .sirk-column-secondary");
        if (!secondary) return;
        if (secondary.getAttribute("data-source-settings-click-bound") !== "1") {
            secondary.setAttribute("data-source-settings-click-bound", "1");
            secondary.addEventListener("click", function (event) {
                var button = event.target && event.target.closest && event.target.closest(".sirk-nav-item");
                if (!button || button.hasAttribute("data-source-settings-nav")) return;
                activeCustom = "";
                var details = root.querySelector(":scope > .sirk-column-details");
                if (details) details.removeAttribute("data-custom-settings-key");
            }, true);
        }

        var modules = findGroup(secondary, "Moduły");
        var modulesBody = modules && modules.querySelector(":scope > .sirk-settings-nav-group-body");
        if (modulesBody) {
            var approvals = findGroup(modulesBody, "Akceptacje");
            var move = findGroup(modulesBody, "Przenoszenie urządzeń");
            if (!move || move.getAttribute("data-source-settings-group") !== "move") {
                if (move) move.remove();
                move = createGroup("Przenoszenie urządzeń", "move");
                var moveBody = move.querySelector(":scope > .sirk-settings-nav-group-body");
                moveBody.appendChild(customButton("Ogólne", "move:general", function (button) { renderMove(root, "general", button); }));
                moveBody.appendChild(customButton("Permissions", "move:permissions", function (button) { renderMove(root, "permissions", button); }));
                if (approvals && approvals.nextSibling) modulesBody.insertBefore(move, approvals.nextSibling);
                else modulesBody.appendChild(move);
            }

            var overview = findGroup(modulesBody, "Overview");
            if (overview) {
                var oldPermissions = findLeaf(overview, "Permissions");
                if (!oldPermissions || !oldPermissions.hasAttribute("data-source-settings-nav")) {
                    if (oldPermissions) oldPermissions.remove();
                    overview.querySelector(":scope > .sirk-settings-nav-group-body").appendChild(customButton("Permissions", "overview:permissions", function (button) {
                        renderOverviewPermissions(root, button);
                    }));
                }
            }
        }

        var portal = findGroup(secondary, "Portal");
        var integrationsGroup = findGroup(secondary, "Integracje");
        if (!integrationsGroup || integrationsGroup.getAttribute("data-source-settings-group") !== "integrations") {
            if (integrationsGroup) integrationsGroup.remove();
            integrationsGroup = createGroup("Integracje", "integrations");
            var integrationBody = integrationsGroup.querySelector(":scope > .sirk-settings-nav-group-body");
            INTEGRATIONS.forEach(function (item) {
                integrationBody.appendChild(customButton(item.label, "integration:" + item.key, function (button) {
                    renderIntegration(root, item, button);
                }));
            });
            if (portal && portal.nextSibling) secondary.insertBefore(integrationsGroup, portal.nextSibling);
            else secondary.appendChild(integrationsGroup);
        }

        Array.prototype.forEach.call(secondary.querySelectorAll("[data-source-settings-nav]"), function (button) {
            var key = button.getAttribute("data-source-settings-nav");
            button.classList.toggle("active", key === activeCustom);
            if (key === activeCustom) {
                var group = button.closest("details.sirk-settings-nav-group");
                if (group) group.open = true;
            }
        });
    }

    function activeLegacySection(root) {
        var secondary = root.querySelector(":scope > .sirk-column-secondary");
        var active = secondary && secondary.querySelector(".sirk-nav-item.active,.sirk-nav-item.is-active");
        var group = active && active.closest("details.sirk-settings-nav-group");
        var summary = group && group.querySelector(":scope > summary");
        return {
            leaf: String(active && active.textContent || "").trim(),
            group: String(summary && summary.textContent || "").trim()
        };
    }

    function cleanupLegacyForm(root) {
        if (!root || activeCustom) return;
        var active = activeLegacySection(root);
        var form = root.querySelector("[data-settings-form]");
        if (!form) return;
        if (active.group === "Akceptacje" && active.leaf === "Ogólne") {
            Array.prototype.forEach.call(form.querySelectorAll("[data-settings-section]"), function (section) {
                var summary = section.querySelector(":scope > summary");
                var label = String(summary && summary.textContent || "").trim().toLowerCase();
                if (label === "providers" || label.indexOf("moverequests") >= 0) section.remove();
            });
        }
        if (active.group === "Monitoring" && active.leaf === "Ogólne") {
            Array.prototype.forEach.call(form.querySelectorAll("[data-settings-section]"), function (section) {
                var summary = section.querySelector(":scope > summary");
                if (String(summary && summary.textContent || "").trim().toLowerCase() === "integracje") section.remove();
            });
        }
        Array.prototype.forEach.call(form.querySelectorAll(".sirk-card"), function (card) {
            var text = String(card.textContent || "").trim();
            if (text === "Ten moduł nie ma osobnej konfiguracji Permissions." || text === "Brak ustawień w tej sekcji." || text === "Brak ustawień ogólnych dla tego modułu.") card.remove();
        });
    }

    function refresh() {
        var root = workspace();
        if (!root || !settingsActive(root)) return;
        ensureNavigation(root);
        cleanupLegacyForm(root);
    }

    var observationRoot = document.getElementById("sirkStandaloneContent") || document.documentElement;
    var scheduled = false;
    new MutationObserver(function () {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(function () {
            scheduled = false;
            refresh();
        });
    }).observe(observationRoot, { childList: true, subtree: true });

    window.addEventListener("sirkportal:languagechange", refresh);
    refresh();
}());
