(function () {
    "use strict";

    if (window.__sirkUnifiedSettingsLoaded) return;
    window.__sirkUnifiedSettingsLoaded = true;
    window.__sirkSettingsStructureLoaded = true;

    var legacySettings = window.SirkPortalSettings;
    var state = {
        snapshot: null,
        selected: "module:overview:general",
        search: "",
        saving: false
    };

    var MODULES = [
        { key: "overview", label: "Overview", view: "overview", overview: true },
        { key: "devices", label: "Urządzenia", view: "devices" },
        { key: "commands", label: "Commands", module: "mycommands", approvalProvider: "mycommands" },
        { key: "approvals", label: "Akceptacje", view: "approvals", module: "approvalcenter", approvalHub: true },
        { key: "move", label: "Przenoszenie urządzeń", module: "moverequests", approvalProvider: "moverequests" },
        { key: "automation", label: "Automatyzacja", view: "automation", module: "myscripts", approvalProvider: "myscripts" },
        { key: "monitoring", label: "Monitoring", view: "monitoring" },
        { key: "assets", label: "Zasoby", view: "assets", module: "myjira" },
        { key: "management", label: "Zarządzanie", view: "management" },
        { key: "reports", label: "Raporty", view: "reports" },
        { key: "security", label: "Bezpieczeństwo", view: "security", module: "defendertools" }
    ];

    var PROVIDERS = [
        { key: "mycommands", label: "Commands" },
        { key: "moverequests", label: "Przenoszenie urządzeń" },
        { key: "myscripts", label: "Automatyzacja" }
    ];

    var INTEGRATIONS = [
        { key: "ad", label: "AD" },
        { key: "defender", label: "Defender" },
        { key: "entra", label: "Entra" },
        { key: "jira", label: "Jira" },
        { key: "zabbix", label: "Zabbix" },
        { key: "sms", label: "SMS" }
    ];

    var DEFAULT_VIEWS = [
        ["overview", "Overview"], ["devices", "Urządzenia"], ["approvals", "Akceptacje"],
        ["automation", "Automatyzacja"], ["monitoring", "Monitoring"], ["assets", "Zasoby"],
        ["management", "Zarządzanie"], ["reports", "Raporty"], ["security", "Bezpieczeństwo"]
    ];

    var HIDDEN_GENERAL = {
        enabled: true,
        accessgroupids: true,
        folderpermissions: true,
        showinmenu: true,
        showondevice: true,
        hostbuttonenabled: true,
        menuenabled: true,
        providers: true
    };

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value == null ? {} : value));
    }

    function normalizeKey(value) {
        return String(value || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
    }

    function labelFor(key) {
        var labels = {
            retentionDays: "Retention Days",
            maxMultiHostNodes: "Max Multi Host Nodes",
            multiHostConcurrency: "Multi Host Concurrency"
        };
        return labels[key] || String(key || "").replace(/([A-Z])/g, " $1").replace(/^./, function (character) {
            return character.toUpperCase();
        });
    }

    function apiUrl(action) {
        var url = new URL(window.__SIRK_PLATFORM_API_BASE__ || "/api", window.location.href);
        var clean = url.pathname.replace(/\/+$/, "");
        if (/\/api$/i.test(clean)) {
            url.pathname = clean + "/admin/settings";
            url.search = "";
            return url.href;
        }
        url.searchParams.set("pin", "SIRKPortal");
        url.searchParams.set("action", action);
        return url.href;
    }

    function parseResponse(response) {
        return response.text().then(function (body) {
            var value;
            try {
                value = JSON.parse(body || "{}");
            } catch (error) {
                throw new Error("Endpoint ustawień zwrócił HTML lub inną odpowiedź zamiast JSON (HTTP " + response.status + ").");
            }
            if (!response.ok || value.ok === false) {
                var message = value && value.error;
                if (message && typeof message === "object") message = message.message;
                throw new Error(String(message || ("HTTP " + response.status)));
            }
            return value.value || value.snapshot || value;
        });
    }

    function loadSnapshot() {
        return fetch(apiUrl("portal-admin-snapshot"), {
            credentials: "same-origin",
            cache: "no-store",
            headers: { Accept: "application/json", "Cache-Control": "no-store" }
        }).then(parseResponse);
    }

    function moduleStates(snapshot) {
        var result = {};
        (snapshot.modules || []).forEach(function (item) {
            result[item.key] = item.enabled === true;
        });
        return result;
    }

    function saveSnapshot(snapshot, modules, moduleOptions, integrations) {
        var base = new URL(window.__SIRK_PLATFORM_API_BASE__ || "/api", window.location.href);
        var clean = base.pathname.replace(/\/+$/, "");
        if (/\/api$/i.test(clean)) {
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
                cache: "no-store",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    Accept: "application/json"
                },
                body: standalone.toString()
            }).then(parseResponse);
        }

        var body = new URLSearchParams();
        body.set("modules", JSON.stringify(modules));
        body.set("moduleOptions", JSON.stringify(moduleOptions));
        body.set("integrations", JSON.stringify(integrations));
        body.set("secrets", "{}");
        return fetch(apiUrl("save-settings"), {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                Accept: "application/json"
            },
            body: body.toString()
        }).then(parseResponse);
    }

    function field(host, label, value, onChange, options) {
        options = options || {};
        var row = el("label", "sirk-card");
        row.setAttribute("data-settings-field", options.type === "boolean" ? "boolean" : "value");
        row.setAttribute("data-search-item", "1");
        var copy = el("span");
        copy.setAttribute("data-settings-field-copy", "1");
        copy.appendChild(el("strong", "", label));
        if (options.description) copy.appendChild(el("small", "", options.description));
        row.appendChild(copy);

        var input;
        if (options.type === "boolean") {
            input = el("input");
            input.type = "checkbox";
            input.checked = value === true;
            input.onchange = function () { onChange(input.checked); };
        } else if (options.choices) {
            input = el("select");
            options.choices.forEach(function (choice) {
                var option = el("option", "", choice[1]);
                option.value = choice[0];
                option.selected = String(value == null ? "" : value) === String(choice[0]);
                input.appendChild(option);
            });
            input.onchange = function () { onChange(input.value); };
        } else {
            input = el(options.multiline ? "textarea" : "input");
            if (!options.multiline) input.type = options.type || (typeof value === "number" ? "number" : "text");
            if (options.min != null) input.min = String(options.min);
            if (options.max != null) input.max = String(options.max);
            input.value = value == null ? "" : String(value);
            input.oninput = function () {
                onChange(input.type === "number" ? Number(input.value) : input.value);
            };
        }
        input.setAttribute("data-settings-input", "1");
        row.appendChild(input);
        host.appendChild(row);
        return input;
    }

    function hasRenderableSettings(object) {
        if (!object || typeof object !== "object" || Array.isArray(object)) return false;
        return Object.keys(object).some(function (key) {
            if (HIDDEN_GENERAL[normalizeKey(key)]) return false;
            var value = object[key];
            return !(value && typeof value === "object" && !Array.isArray(value)) || hasRenderableSettings(value);
        });
    }

    function objectForm(host, object) {
        object = object && typeof object === "object" && !Array.isArray(object) ? object : {};
        Object.keys(object).sort().forEach(function (key) {
            if (HIDDEN_GENERAL[normalizeKey(key)]) return;
            var value = object[key];
            if (value && typeof value === "object" && !Array.isArray(value)) {
                if (!hasRenderableSettings(value)) return;
                var section = el("details", "sirk-settings-section-plain");
                section.open = true;
                section.setAttribute("data-settings-section", "1");
                section.setAttribute("data-search-item", "1");
                section.appendChild(el("summary", "", labelFor(key)));
                var body = el("div");
                body.setAttribute("data-settings-section-body", "1");
                objectForm(body, value);
                section.appendChild(body);
                host.appendChild(section);
                return;
            }
            if (Array.isArray(value)) {
                field(host, labelFor(key), value.join(", "), function (next) {
                    object[key] = String(next || "").split(",").map(function (item) { return item.trim(); }).filter(Boolean);
                }, { description: "Wartości rozdzielone przecinkami." });
                return;
            }
            field(host, labelFor(key), value, function (next) { object[key] = next; }, {
                type: typeof value === "boolean" ? "boolean" : undefined
            });
        });
    }

    function groupSelector(title, groups, selected, description) {
        selected = Array.isArray(selected) ? selected.map(String) : [];
        var card = el("section", "sirk-card");
        card.setAttribute("data-search-item", "1");
        card.appendChild(el("strong", "", title));
        card.appendChild(el("small", "", description || "Brak wyboru oznacza dostęp dla wszystkich. Site administrator ma dostęp zawsze."));
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
            var name = el("span", "", String(group.name || group.id));
            name.title = String(group.id || "");
            row.appendChild(name);
            list.appendChild(row);
        });
        if (!(groups || []).length) list.appendChild(el("small", "", "MeshCentral nie zwrócił żadnych grup użytkowników."));
        card.appendChild(list);
        return {
            card: card,
            values: function () {
                return Array.prototype.filter.call(list.querySelectorAll('input[type="checkbox"]'), function (input) {
                    return input.checked;
                }).map(function (input) { return String(input.value); });
            }
        };
    }

    function settingsParts() {
        var parts = String(state.selected || "module:overview:general").split(":");
        return { kind: parts[0], key: parts[1], section: parts[2] || "" };
    }

    function findModule(key) {
        return MODULES.find(function (item) { return item.key === key; }) || MODULES[0];
    }

    function navButton(host, key, label, onSelect) {
        var button = el("button", "sirk-nav-item sirk-settings-nav-leaf" + (key === state.selected ? " active" : ""), label);
        button.type = "button";
        button.onclick = function () {
            state.selected = key;
            onSelect();
        };
        host.appendChild(button);
        return button;
    }

    function navGroup(host, label, open, marker) {
        var group = el("details", "sirk-settings-nav-group");
        if (marker) group.setAttribute(marker, "1");
        group.open = open === true;
        group.appendChild(el("summary", "", label));
        var body = el("div", "sirk-settings-nav-group-body");
        group.appendChild(body);
        host.appendChild(group);
        return body;
    }

    function ensurePayload(snapshot) {
        var payload = {
            modules: moduleStates(snapshot),
            moduleOptions: clone(snapshot.moduleSettings || {}),
            integrations: clone(snapshot.integrations && snapshot.integrations.values || {})
        };
        payload.moduleOptions.portal = payload.moduleOptions.portal || {};
        payload.moduleOptions.portal.views = payload.moduleOptions.portal.views || {};
        payload.moduleOptions.approvalcenter = payload.moduleOptions.approvalcenter || {};
        payload.moduleOptions.approvalcenter.providers = payload.moduleOptions.approvalcenter.providers || {};
        return payload;
    }

    function unifiedToggle(form, payload, definition) {
        var view = definition.view ? (payload.moduleOptions.portal.views[definition.view] = payload.moduleOptions.portal.views[definition.view] || {}) : null;
        var moduleConfig = definition.module ? (payload.moduleOptions[definition.module] = payload.moduleOptions[definition.module] || {}) : null;
        var moduleEnabled = definition.module ? payload.modules[definition.module] === true : true;
        var viewEnabled = view ? view.enabled !== false : true;
        var checked = moduleEnabled && viewEnabled;
        field(form, "Włącz i pokaż", checked, function (next) {
            if (definition.module) {
                payload.modules[definition.module] = next;
                moduleConfig.enabled = next;
            }
            if (view) view.enabled = next;
        }, {
            type: "boolean",
            description: "Jednocześnie włącza funkcję modułu i pokazuje jego zakładkę lub przycisk w Portalu."
        });
    }

    function approvalToggle(form, payload, definition) {
        if (!definition.approvalProvider) return;
        var provider = payload.moduleOptions.approvalcenter.providers[definition.approvalProvider] =
            payload.moduleOptions.approvalcenter.providers[definition.approvalProvider] || {};
        field(form, "Włącz akceptacje", provider.enabled !== false, function (next) {
            provider.enabled = next;
        }, {
            type: "boolean",
            description: "Operacje tego modułu będą obsługiwane przez moduł Akceptacje."
        });
    }

    function renderOverviewGeneral(form, payload) {
        var view = payload.moduleOptions.portal.views.overview = payload.moduleOptions.portal.views.overview || {};
        field(form, "Pokaż Devices", view.showDevicesCard !== false, function (next) { view.showDevicesCard = next; }, {
            type: "boolean",
            description: "Pokazuje kafelek urządzeń na stronie głównej."
        });
        field(form, "Pokaż stan systemu", view.showSystemStatusCard !== false, function (next) { view.showSystemStatusCard = next; }, {
            type: "boolean",
            description: "Pokazuje kafelek wersji i stanu aktualizacji."
        });
        field(form, "Pokaż Integrations", view.showIntegrationsCard !== false, function (next) { view.showIntegrationsCard = next; }, {
            type: "boolean",
            description: "Pokazuje kafelek stanu integracji."
        });
    }

    function renderModuleGeneral(form, payload, definition) {
        unifiedToggle(form, payload, definition);
        approvalToggle(form, payload, definition);

        if (definition.overview) {
            renderOverviewGeneral(form, payload);
            return;
        }

        if (definition.approvalHub) {
            var approval = payload.moduleOptions.approvalcenter;
            if (approval.retentionDays == null) approval.retentionDays = 365;
            field(form, "Retention Days", approval.retentionDays, function (next) {
                approval.retentionDays = Math.max(1, Math.min(3650, Number(next) || 365));
            }, { type: "number", min: 1, max: 3650 });
            return;
        }

        if (definition.module) {
            var moduleConfig = payload.moduleOptions[definition.module] = payload.moduleOptions[definition.module] || {};
            objectForm(form, moduleConfig);
        }
    }

    function renderOverviewPermissions(form, payload, snapshot, saveHooks) {
        var view = payload.moduleOptions.portal.views.overview = payload.moduleOptions.portal.views.overview || {};
        var groups = snapshot.userGroups || [];
        var devices = groupSelector("Pokaż Devices", groups, view.devicesCardAccessGroupIds);
        var system = groupSelector("Pokaż stan systemu", groups, view.systemStatusCardAccessGroupIds);
        var integrations = groupSelector("Pokaż Integrations", groups, view.integrationsCardAccessGroupIds);
        form.appendChild(devices.card);
        form.appendChild(system.card);
        form.appendChild(integrations.card);
        saveHooks.push(function () {
            view.devicesCardAccessGroupIds = devices.values();
            view.systemStatusCardAccessGroupIds = system.values();
            view.integrationsCardAccessGroupIds = integrations.values();
        });
    }

    function renderApprovalPermissions(form, payload, snapshot, saveHooks) {
        var providers = payload.moduleOptions.approvalcenter.providers;
        var groups = snapshot.userGroups || [];
        var rendered = 0;

        PROVIDERS.forEach(function (definition) {
            var provider = providers[definition.key] = providers[definition.key] || {};
            if (provider.enabled === false) return;
            rendered += 1;
            provider.levels = provider.levels && typeof provider.levels === "object" ? provider.levels : {};

            var section = el("details", "sirk-settings-section-plain");
            section.open = true;
            section.setAttribute("data-settings-section", "1");
            section.setAttribute("data-search-item", "1");
            section.appendChild(el("summary", "", definition.label));
            var body = el("div");
            body.setAttribute("data-settings-section-body", "1");

            field(body, "Pozwól wykonać bez akceptacji", provider.allowNoApproval === true, function (next) {
                provider.allowNoApproval = next;
            }, { type: "boolean" });
            field(body, "Pokaż w Akceptacjach", provider.showTab !== false, function (next) {
                provider.showTab = next;
            }, { type: "boolean" });
            field(body, "Pokaż na Overview", provider.showOverview !== false, function (next) {
                provider.showOverview = next;
            }, { type: "boolean" });

            var level1 = groupSelector("Poziom 1 — zatwierdzający", groups, provider.levels["1"] || provider.levels[1] || []);
            var level2 = groupSelector("Poziom 2 — zatwierdzający", groups, provider.levels["2"] || provider.levels[2] || []);
            var level3 = groupSelector("Poziom 3 — zatwierdzający", groups, provider.levels["3"] || provider.levels[3] || []);
            body.appendChild(level1.card);
            body.appendChild(level2.card);
            body.appendChild(level3.card);
            section.appendChild(body);
            form.appendChild(section);

            saveHooks.push(function () {
                provider.levels = {
                    "1": level1.values(),
                    "2": level2.values(),
                    "3": level3.values()
                };
            });
        });

        if (!rendered) {
            var info = el("div", "sirk-card", "Włącz akceptacje w przynajmniej jednym module, aby skonfigurować poziomy zatwierdzania.");
            info.setAttribute("data-search-item", "1");
            form.appendChild(info);
        }
    }

    function renderStandardPermissions(form, payload, definition, snapshot, saveHooks) {
        var groups = snapshot.userGroups || [];
        var moduleConfig = definition.module ? (payload.moduleOptions[definition.module] = payload.moduleOptions[definition.module] || {}) : null;
        var view = definition.view ? (payload.moduleOptions.portal.views[definition.view] = payload.moduleOptions.portal.views[definition.view] || {}) : null;
        var selected = moduleConfig && Array.isArray(moduleConfig.accessGroupIds) && moduleConfig.accessGroupIds.length
            ? moduleConfig.accessGroupIds
            : view && Array.isArray(view.accessGroupIds) ? view.accessGroupIds : [];
        var selector = groupSelector("Dostęp grup MeshCentral", groups, selected);
        form.appendChild(selector.card);
        saveHooks.push(function () {
            var values = selector.values();
            if (moduleConfig) moduleConfig.accessGroupIds = values.slice();
            if (view) view.accessGroupIds = values.slice();
        });
    }

    function renderModulePermissions(form, payload, definition, snapshot, saveHooks) {
        if (definition.overview) {
            renderOverviewPermissions(form, payload, snapshot, saveHooks);
            return;
        }
        if (definition.approvalHub) {
            renderApprovalPermissions(form, payload, snapshot, saveHooks);
            return;
        }
        renderStandardPermissions(form, payload, definition, snapshot, saveHooks);
    }

    function renderPortalVisibility(form, payload) {
        var portal = payload.moduleOptions.portal;
        field(form, "Widok domyślny", portal.defaultView || "overview", function (next) {
            portal.defaultView = next;
        }, { choices: DEFAULT_VIEWS });
        [
            ["showLauncher", "showLauncher"],
            ["showNativeLink", "showNativeLink"],
            ["forceNewLogin", "forceNewLogin"],
            ["forcePortalInterface", "forcePortalInterface"],
            ["keepSessionsAfterRestart", "keepSessionsAfterRestart"]
        ].forEach(function (item) {
            var checked = item[0] === "showNativeLink" ? portal[item[0]] !== false : portal[item[0]] === true;
            field(form, item[1], checked, function (next) { portal[item[0]] = next; }, { type: "boolean" });
        });
    }

    function bannerDefaults() {
        return {
            enabled: false,
            showOnPortal: true,
            showOnLogin: false,
            activeTemplate: "success",
            templates: {
                success: { name: "Aktualizacja", text: "System został pomyślnie zaktualizowany.", backgroundColor: "#dcfce7", textColor: "#166534", fontSize: 16, durationMinutes: 60, noEnd: false },
                warning: { name: "Ostrzeżenie", text: "W systemie występują drobne problemy. Trwają prace nad ich usunięciem.", backgroundColor: "#fef3c7", textColor: "#92400e", fontSize: 16, durationMinutes: 60, noEnd: false },
                critical: { name: "Awaria", text: "Część funkcji systemu jest obecnie niedostępna.", backgroundColor: "#fee2e2", textColor: "#991b1b", fontSize: 16, durationMinutes: 60, noEnd: true }
            }
        };
    }

    function renderPortalBanner(form, payload) {
        var defaults = bannerDefaults();
        var banner = payload.moduleOptions.portal.banner =
            Object.assign({}, defaults, payload.moduleOptions.portal.banner || {});
        banner.templates = Object.assign({}, defaults.templates, banner.templates || {});

        field(form, "Włącz baner", banner.enabled === true, function (next) { banner.enabled = next; }, { type: "boolean" });
        field(form, "Pokaż w Portalu", banner.showOnPortal !== false, function (next) { banner.showOnPortal = next; }, { type: "boolean" });
        field(form, "Pokaż na stronie logowania", banner.showOnLogin === true, function (next) { banner.showOnLogin = next; }, { type: "boolean" });
        field(form, "Aktywny szablon", banner.activeTemplate || "success", function (next) { banner.activeTemplate = next; }, {
            choices: [["success", "Zielony — aktualizacja"], ["warning", "Żółty — ostrzeżenie"], ["critical", "Czerwony — awaria"]]
        });

        [
            { key: "success", label: "Zielony — aktualizacja" },
            { key: "warning", label: "Żółty — ostrzeżenie" },
            { key: "critical", label: "Czerwony — awaria" }
        ].forEach(function (definition) {
            var template = banner.templates[definition.key] =
                Object.assign({}, defaults.templates[definition.key], banner.templates[definition.key] || {});
            var section = el("details", "sirk-settings-section-plain");
            section.setAttribute("data-settings-section", "1");
            section.setAttribute("data-search-item", "1");
            section.open = definition.key === banner.activeTemplate;
            section.appendChild(el("summary", "", definition.label));
            var body = el("div");
            body.setAttribute("data-settings-section-body", "1");
            field(body, "Tekst", template.text, function (next) { template.text = next; }, { multiline: true });
            field(body, "Kolor tła", template.backgroundColor, function (next) { template.backgroundColor = next; }, { type: "color" });
            field(body, "Kolor tekstu", template.textColor, function (next) { template.textColor = next; }, { type: "color" });
            field(body, "Rozmiar tekstu", template.fontSize, function (next) { template.fontSize = Number(next) || 16; }, { type: "number", min: 10, max: 48 });
            field(body, "Czas wyświetlania (minuty)", template.durationMinutes, function (next) {
                template.durationMinutes = Math.max(1, Number(next) || 60);
            }, { type: "number", min: 1 });
            field(body, "Bez wskazania końca", template.noEnd === true, function (next) { template.noEnd = next; }, { type: "boolean" });
            section.appendChild(body);
            form.appendChild(section);
        });
    }

    function renderIntegration(form, payload, key) {
        var config = payload.integrations[key] =
            payload.integrations[key] && typeof payload.integrations[key] === "object" ? payload.integrations[key] : {};
        if (!hasRenderableSettings(config)) {
            var info = el("div", "sirk-card", key === "sms"
                ? "Konfiguracja integracji SMS nie została jeszcze zdefiniowana."
                : "Ta integracja nie ma jeszcze zdefiniowanych pól konfiguracyjnych.");
            info.setAttribute("data-search-item", "1");
            form.appendChild(info);
            return;
        }
        objectForm(form, config);
    }

    function renderNavigation(secondary, rerender) {
        var selected = settingsParts();
        var modulesBody = navGroup(secondary, "Moduły", selected.kind === "module");
        MODULES.forEach(function (definition) {
            var body = navGroup(modulesBody, definition.label,
                selected.kind === "module" && selected.key === definition.key,
                definition.overview ? "data-overview-settings-group" : "");
            navButton(body, "module:" + definition.key + ":general", "Ogólne", rerender);
            navButton(body, "module:" + definition.key + ":permissions", "Permissions", rerender);
        });

        var portalBody = navGroup(secondary, "Portal", selected.kind === "portal");
        navButton(portalBody, "portal:visibility", "Widoczność", rerender);
        navButton(portalBody, "portal:banner", "Baner", rerender);

        var integrationBody = navGroup(secondary, "Integracje", selected.kind === "integration");
        INTEGRATIONS.forEach(function (item) {
            navButton(integrationBody, "integration:" + item.key, item.label, rerender);
        });
    }

    function applySearch(host) {
        var query = String(state.search || "").trim().toLowerCase();
        Array.prototype.forEach.call(host.querySelectorAll("[data-search-item]"), function (item) {
            item.hidden = !!query && String(item.textContent || "").toLowerCase().indexOf(query) < 0;
        });
    }

    function saveCurrent(details, payload, saveHooks, rerender) {
        if (state.saving) return;
        state.saving = true;
        var button = details.querySelector("[data-unified-save]");
        var message = details.querySelector("[data-unified-save-message]");
        if (button) button.disabled = true;
        if (message) {
            message.textContent = "Zapisywanie…";
            message.removeAttribute("data-error");
        }
        saveHooks.forEach(function (hook) { hook(); });
        saveSnapshot(state.snapshot, payload.modules, payload.moduleOptions, payload.integrations)
            .then(function () { return loadSnapshot(); })
            .then(function (snapshot) {
                state.snapshot = snapshot;
                state.saving = false;
                rerender();
            })
            .catch(function (error) {
                state.saving = false;
                if (button) button.disabled = false;
                if (message) {
                    message.textContent = error.message || String(error);
                    message.setAttribute("data-error", "1");
                }
            });
    }

    function renderSettingsContent(workspace) {
        var secondary = workspace.querySelector(":scope > .sirk-column-secondary");
        var details = workspace.querySelector(":scope > .sirk-column-details");
        secondary.innerHTML = "";
        details.innerHTML = "";
        var rerender = function () { renderSettingsContent(workspace); };
        renderNavigation(secondary, rerender);

        if (!state.snapshot) {
            details.appendChild(el("div", "sirk-card", "Ładowanie ustawień…"));
            return;
        }

        var payload = ensurePayload(state.snapshot);
        var saveHooks = [];
        var form = el("div");
        form.setAttribute("data-settings-form", "1");
        var selected = settingsParts();

        if (selected.kind === "module") {
            var definition = findModule(selected.key);
            if (selected.section === "permissions") {
                renderModulePermissions(form, payload, definition, state.snapshot, saveHooks);
            } else {
                renderModuleGeneral(form, payload, definition);
            }
        } else if (selected.kind === "portal") {
            if (selected.key === "banner") renderPortalBanner(form, payload);
            else renderPortalVisibility(form, payload);
        } else if (selected.kind === "integration") {
            renderIntegration(form, payload, selected.key);
        }

        details.appendChild(form);
        var actions = el("div", "sirk-toolbar-group sirk-toolbar-left");
        var save = el("button", "sirk-button", "Zapisz");
        save.type = "button";
        save.setAttribute("data-unified-save", "1");
        var message = el("span");
        message.setAttribute("data-unified-save-message", "1");
        save.onclick = function () { saveCurrent(details, payload, saveHooks, rerender); };
        actions.appendChild(save);
        actions.appendChild(message);
        details.appendChild(actions);
        applySearch(details);
    }

    function openLegacyServer(host) {
        if (!legacySettings || typeof legacySettings.mount !== "function") {
            host.innerHTML = '<div class="sirk-card" data-error="1">Renderer ustawień serwera nie jest dostępny.</div>';
            return;
        }
        legacySettings.mount(host);
        window.requestAnimationFrame(function () {
            var primary = host.querySelector("[data-settings-primary]");
            if (!primary) return;
            var settingsButton = null;
            var serverButton = null;
            Array.prototype.forEach.call(primary.querySelectorAll(":scope > .sirk-nav-item"), function (button) {
                var text = String(button.textContent || "").trim();
                if (text === "Settings") settingsButton = button;
                if (text === "Server") serverButton = button;
            });
            if (settingsButton) settingsButton.onclick = function () { mount(host); };
            if (serverButton && !serverButton.classList.contains("active")) serverButton.click();
        });
    }

    function mount(host) {
        host.innerHTML = '<section class="sirk-standalone-view-scroll" data-portal-settings>' +
            '<div class="sirk-toolbar"><div class="sirk-toolbar-group sirk-toolbar-left">' +
            '<button type="button" class="sirk-button" data-unified-collapse aria-label="Zwiń menu">☰</button>' +
            '<button type="button" class="sirk-button" data-unified-refresh>Odśwież</button>' +
            '<input type="search" data-settings-search placeholder="Szukaj…" aria-label="Szukaj"></div></div>' +
            '<div class="sirk-layout-host"><div class="sirk-settings-module-workspace" style="display:grid;grid-template-columns:184px 236px minmax(0,1fr);width:100%;min-width:0;min-height:0">' +
            '<aside class="sirk-column-primary"></aside>' +
            '<aside class="sirk-column-secondary"></aside>' +
            '<div class="sirk-column-details"></div>' +
            '</div></div></section>';

        var workspace = host.querySelector(".sirk-settings-module-workspace");
        var primary = workspace.querySelector(":scope > .sirk-column-primary");
        var details = workspace.querySelector(":scope > .sirk-column-details");
        var search = host.querySelector("[data-settings-search]");
        search.value = state.search;
        search.oninput = function () {
            state.search = search.value;
            applySearch(details);
        };

        var settingsButton = el("button", "sirk-nav-item active", "Settings");
        settingsButton.type = "button";
        var serverButton = el("button", "sirk-nav-item", "Server");
        serverButton.type = "button";
        settingsButton.onclick = function () {};
        serverButton.onclick = function () { openLegacyServer(host); };
        primary.appendChild(settingsButton);
        primary.appendChild(serverButton);

        host.querySelector("[data-unified-collapse]").onclick = function () {
            var collapsed = workspace.getAttribute("data-collapsed") === "1";
            workspace.setAttribute("data-collapsed", collapsed ? "0" : "1");
            primary.hidden = !collapsed;
            workspace.style.gridTemplateColumns = collapsed
                ? "184px 236px minmax(0,1fr)"
                : "236px minmax(0,1fr)";
        };

        host.querySelector("[data-unified-refresh]").onclick = function () {
            details.innerHTML = '<div class="sirk-card">Odświeżanie…</div>';
            loadSnapshot().then(function (snapshot) {
                state.snapshot = snapshot;
                renderSettingsContent(workspace);
            }).catch(function (error) {
                details.innerHTML = "";
                var card = el("div", "sirk-card", error.message || String(error));
                card.setAttribute("data-error", "1");
                details.appendChild(card);
            });
        };

        renderSettingsContent(workspace);
        loadSnapshot().then(function (snapshot) {
            state.snapshot = snapshot;
            renderSettingsContent(workspace);
        }).catch(function (error) {
            details.innerHTML = "";
            var card = el("div", "sirk-card", error.message || String(error));
            card.setAttribute("data-error", "1");
            details.appendChild(card);
        });
    }

    window.SirkPortalSettings = { mount: mount };
}());
