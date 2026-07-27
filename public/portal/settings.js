(function () {
    "use strict";

    var state = { snapshot: null, active: "overview", settingsKey: "portal", debugKey: "config" };
    var settingsItems = [
        ["portal", "Portal"], ["approvalcenter", "Approval Center"], ["moverequests", "Move Request"],
        ["mycommands", "Commands"], ["myscripts", "Scripts"], ["folderpermissions", "Uprawnienia folderów"],
        ["myjira", "Jira"], ["defendertools", "Defender"]
    ];

    function apiUrl(action, extra) {
        var url = new URL(window.__SIRK_PLATFORM_API_BASE__, window.location.href);
        url.searchParams.set("pin", "SIRKPortal");
        if (action) url.searchParams.set("action", action);
        Object.keys(extra || {}).forEach(function (key) { url.searchParams.set(key, extra[key]); });
        return url.href;
    }

    function parse(response) {
        return response.text().then(function (text) {
            var value;
            try { value = JSON.parse(text || "{}"); }
            catch (error) { throw new Error(text || ("HTTP " + response.status)); }
            if (!response.ok || value.ok === false) throw new Error(value.error || ("HTTP " + response.status));
            return value;
        });
    }

    function get(action) {
        return fetch(apiUrl(action), { credentials: "same-origin", headers: { Accept: "application/json" } }).then(parse);
    }

    function post(action, payload) {
        var body = new URLSearchParams();
        body.set("payload", JSON.stringify(payload || {}));
        return fetch(apiUrl(action), {
            method: "POST", credentials: "same-origin",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: body.toString()
        }).then(parse);
    }

    function postSettings(payload) {
        var body = new URLSearchParams();
        ["modules", "moduleOptions", "integrations", "secrets"].forEach(function (key) {
            body.set(key, JSON.stringify(payload[key] || {}));
        });
        return fetch(apiUrl("save-settings"), {
            method: "POST", credentials: "same-origin",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: body.toString()
        }).then(parse);
    }

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

    function notice(host, text, error) {
        var node = el("div", error ? "sirk-settings-notice is-error" : "sirk-settings-notice", text);
        host.appendChild(node);
        return node;
    }

    function renderOverview(host) {
        var snapshot = state.snapshot || {};
        var grid = el("div", "sirk-settings-grid");
        (snapshot.modules || []).forEach(function (module) {
            var card = el("article", "sirk-settings-card");
            card.appendChild(el("h3", "", module.name || module.key));
            card.appendChild(el("p", "", module.ready ? "Ready" : (module.error || "Not ready")));
            card.appendChild(el("span", module.ready ? "sirk-settings-state is-ready" : "sirk-settings-state is-error", module.ready ? "Ready" : "Error"));
            grid.appendChild(card);
        });
        host.appendChild(grid);
    }

    function editorValue(key) {
        var snapshot = state.snapshot || {};
        if (key === "portal") return (snapshot.moduleSettings || {}).portal || {};
        if (key === "folderpermissions") return {
            portalViews: ((snapshot.moduleSettings || {}).portal || {}).views || {},
            scripts: ((snapshot.moduleSettings || {}).myscripts || {}).folderPermissions || {},
            commands: ((snapshot.moduleSettings || {}).mycommands || {}).folderPermissions || {}
        };
        return (snapshot.moduleSettings || {})[key] || {};
    }

    function renderSettings(host, secondary) {
        settingsItems.forEach(function (item) {
            var button = el("button", item[0] === state.settingsKey ? "sirk-nav-item is-active" : "sirk-nav-item", item[1]);
            button.type = "button";
            button.onclick = function () { state.settingsKey = item[0]; renderActive(host.parentNode, secondary, host); };
            secondary.appendChild(button);
        });
        var card = el("section", "sirk-settings-card sirk-settings-editor-card");
        card.appendChild(el("h3", "", settingsItems.find(function (item) { return item[0] === state.settingsKey; })[1]));
        card.appendChild(el("p", "", "Natywny edytor konfiguracji. Zapis jest wykonywany przez API Portalu."));
        var textarea = el("textarea", "sirk-settings-editor");
        textarea.spellcheck = false;
        textarea.value = JSON.stringify(editorValue(state.settingsKey), null, 2);
        card.appendChild(textarea);
        var actions = el("div", "sirk-settings-actions");
        var save = el("button", "sirk-button", "Zapisz");
        var status = el("span", "sirk-settings-status", "");
        save.type = "button";
        save.onclick = function () {
            var value;
            try { value = JSON.parse(textarea.value || "{}"); }
            catch (error) { status.textContent = "Nieprawidłowy JSON: " + error.message; return; }
            var snapshot = state.snapshot || {};
            var payload = {
                modules: {},
                moduleOptions: JSON.parse(JSON.stringify(snapshot.moduleSettings || {})),
                integrations: JSON.parse(JSON.stringify(snapshot.integrations && snapshot.integrations.values || {})),
                secrets: {}
            };
            (snapshot.modules || []).forEach(function (module) { payload.modules[module.key] = module.enabled === true; });
            if (state.settingsKey === "folderpermissions") {
                payload.moduleOptions.portal = payload.moduleOptions.portal || {};
                payload.moduleOptions.myscripts = payload.moduleOptions.myscripts || {};
                payload.moduleOptions.mycommands = payload.moduleOptions.mycommands || {};
                payload.moduleOptions.portal.views = value.portalViews || {};
                payload.moduleOptions.myscripts.folderPermissions = value.scripts || {};
                payload.moduleOptions.mycommands.folderPermissions = value.commands || {};
            } else payload.moduleOptions[state.settingsKey] = value;
            save.disabled = true;
            status.textContent = "Zapisywanie…";
            postSettings(payload).then(function (result) {
                state.snapshot = result.snapshot;
                status.textContent = "Zapisano";
            }).catch(function (error) { status.textContent = error.message; }).then(function () { save.disabled = false; });
        };
        actions.appendChild(save); actions.appendChild(status); card.appendChild(actions); host.appendChild(card);
    }

    function renderPlugins(host) {
        var toolbar = el("div", "sirk-settings-actions");
        var add = el("button", "sirk-button", "Dodaj wtyczkę");
        var status = el("span", "sirk-settings-status", "Ładowanie…");
        toolbar.appendChild(add); toolbar.appendChild(status); host.appendChild(toolbar);
        var list = el("div", "sirk-settings-list"); host.appendChild(list);
        function draw(plugins) {
            clear(list);
            (plugins || []).forEach(function (plugin) {
                var row = el("article", "sirk-settings-list-item");
                var text = el("div", ""); text.appendChild(el("strong", "", plugin.name || plugin.shortName));
                text.appendChild(el("small", "", (plugin.version || "—") + " · " + (plugin.status === 1 ? "Włączona" : "Wyłączona")));
                row.appendChild(text);
                var actions = el("div", "sirk-settings-actions");
                [plugin.status === 1 ? ["disable", "Wyłącz"] : ["enable", "Włącz"], ["remove", "Usuń"]].forEach(function (action) {
                    var button = el("button", "sirk-button", action[1]); button.type = "button"; button.disabled = plugin.protected === true;
                    button.onclick = function () {
                        if (!window.confirm(action[1] + " wtyczkę " + (plugin.name || plugin.shortName) + "?")) return;
                        button.disabled = true; status.textContent = "Wykonywanie operacji…";
                        post("plugin-operation", { operation: action[0], id: plugin.id }).then(function (result) { draw(result.plugins); status.textContent = "Operacja zakończona"; }).catch(function (error) { status.textContent = error.message; button.disabled = false; });
                    };
                    actions.appendChild(button);
                });
                row.appendChild(actions); list.appendChild(row);
            });
        }
        add.onclick = function () {
            var url = window.prompt("URL pliku config.json wtyczki:");
            if (!url) return;
            status.textContent = "Dodawanie…";
            post("plugin-operation", { operation: "add", configUrl: url.trim() }).then(function (result) { draw(result.plugins); status.textContent = "Wtyczka dodana"; }).catch(function (error) { status.textContent = error.message; });
        };
        get("plugin-state").then(function (result) { draw(result.plugins); status.textContent = ""; }).catch(function (error) { status.textContent = error.message; });
    }

    function renderServer(host) {
        var status = notice(host, "Ładowanie stanu usług…");
        var list = el("div", "sirk-settings-list"); host.appendChild(list);
        get("server-state").then(function (result) {
            status.remove();
            if (!(result.services || []).length) { notice(host, "Nie znaleziono usługi przypisanej do instalacji."); return; }
            result.services.forEach(function (service) {
                var card = el("article", "sirk-settings-card");
                card.appendChild(el("h3", "", service.displayName || service.name));
                card.appendChild(el("p", "", "Stan: " + service.state + " · Start: " + service.startMode + " · PID: " + (service.processId || "—")));
                var restart = el("button", "sirk-button", "Restartuj usługę"); restart.type = "button";
                restart.onclick = function () {
                    if (!window.confirm("Zrestartować usługę?")) return;
                    restart.disabled = true;
                    post("server-restart", { serviceName: service.name }).then(function () { window.setTimeout(function () { window.location.reload(); }, 8000); }).catch(function (error) { notice(card, error.message, true); restart.disabled = false; });
                };
                card.appendChild(restart); list.appendChild(card);
            });
        }).catch(function (error) { status.textContent = error.message; status.classList.add("is-error"); });
    }

    function renderDebug(host, secondary) {
        [["config", "Config"], ["logs", "Logi"], ["errors", "Błędy"]].forEach(function (item) {
            var button = el("button", item[0] === state.debugKey ? "sirk-nav-item is-active" : "sirk-nav-item", item[1]);
            button.type = "button"; button.onclick = function () { state.debugKey = item[0]; renderActive(host.parentNode, secondary, host); }; secondary.appendChild(button);
        });
        var snapshot = state.snapshot || {};
        var value = state.debugKey === "logs" ? snapshot.diagnostics && snapshot.diagnostics.logs || "Brak logów."
            : state.debugKey === "errors" ? snapshot.diagnostics && snapshot.diagnostics.errors || snapshot.moduleLoadErrors || "Brak błędów."
                : { plugin: snapshot.plugin, modules: snapshot.modules, moduleSettings: snapshot.moduleSettings, integrations: snapshot.integrations, migration: snapshot.migration, generatedAt: snapshot.generatedAt };
        host.appendChild(el("pre", "sirk-settings-debug", typeof value === "string" ? value : JSON.stringify(value, null, 2)));
    }

    function renderActive(layout, secondary, details) {
        clear(secondary); clear(details);
        if (state.active === "overview") renderOverview(details);
        else if (state.active === "settings") renderSettings(details, secondary);
        else if (state.active === "plugins") renderPlugins(details);
        else if (state.active === "server") renderServer(details);
        else if (state.active === "debug") renderDebug(details, secondary);
        else if (window.SirkSystemUpdates) {
            [["updates", "Aktualizacje"], ["backups", "Backupy"], ["history", "Historia"], ["channel", "Kanał aktualizacji"]].forEach(function (item, index) {
                var button = el("button", index === 0 ? "sirk-nav-item is-active" : "sirk-nav-item", item[1]);
                button.type = "button"; button.onclick = function () { Array.prototype.forEach.call(secondary.children, function (node) { node.classList.toggle("is-active", node === button); }); window.SirkSystemUpdates.mount(details, item[0]); }; secondary.appendChild(button);
            });
            window.SirkSystemUpdates.mount(details, "updates");
        }
    }

    function mount(host) {
        clear(host);
        host.innerHTML = '<section class="sirk-standalone-view-scroll"><div class="sirk-toolbar-host"><div class="sirk-toolbar"><strong>Ustawienia</strong></div></div><div class="sirk-layout-host"><div class="sirk-layout"><aside class="sirk-column-primary" data-settings-primary></aside><aside class="sirk-column-secondary" data-settings-secondary></aside><div class="sirk-column-details" data-settings-details></div></div></div></section>';
        var primary = host.querySelector("[data-settings-primary]");
        var secondary = host.querySelector("[data-settings-secondary]");
        var details = host.querySelector("[data-settings-details]");
        [["overview", "Overview"], ["settings", "Settings"], ["plugins", "Wtyczki"], ["server", "Serwer"], ["debug", "Debug"], ["system", "System"]].forEach(function (item) {
            var button = el("button", item[0] === state.active ? "sirk-nav-item is-active" : "sirk-nav-item", item[1]);
            button.type = "button";
            button.onclick = function () {
                state.active = item[0];
                Array.prototype.forEach.call(primary.children, function (node) { node.classList.toggle("is-active", node === button); });
                renderActive(host, secondary, details);
            };
            primary.appendChild(button);
        });
        get("portal-admin-snapshot").then(function (result) { state.snapshot = result.snapshot; renderActive(host, secondary, details); }).catch(function (error) { notice(details, error.message, true); });
    }

    window.SirkPortalSettings = { mount: mount };
}());
