(function () {
    "use strict";

    var state = {
        snapshot: null,
        active: "overview",
        settingsKey: "portal",
        debugKey: "config",
        pluginView: "installed",
        plugins: [],
        marketplace: [],
        search: "",
        resumeMessage: ""
    };
    var SERVICE_RESTART_KEY = "sirkPortal.serviceRestartState";

    var settingsItems = [
        ["portal", "Portal"], ["approvalcenter", "Approval Center"], ["moverequests", "Move Request"],
        ["mycommands", "Commands"], ["myscripts", "Scripts"], ["folderpermissions", "Uprawnienia folderów"],
        ["myjira", "Jira"], ["defendertools", "Defender"]
    ];

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
    function clone(value) { return JSON.parse(JSON.stringify(value == null ? {} : value)); }

    function serviceRestartState() {
        try {
            var value = JSON.parse(sessionStorage.getItem(SERVICE_RESTART_KEY) || "null");
            return value && typeof value === "object" ? value : null;
        } catch (error) { return null; }
    }

    function saveServiceRestartState(value) {
        try { sessionStorage.setItem(SERVICE_RESTART_KEY, JSON.stringify(value)); } catch (error) {}
    }

    function clearServiceRestartState() {
        try { sessionStorage.removeItem(SERVICE_RESTART_KEY); } catch (error) {}
    }

    function restartScreen(host) {
        host.innerHTML = '<div class="sirk-restart-screen" role="status" aria-live="polite"><div class="sirk-restart-spinner" aria-hidden="true"></div><h2>Ładowanie usługi…</h2><p>Portal czeka na powrót usługi. Po zakończeniu wrócisz do ustawień serwera.</p></div>';
    }

    function waitForService(host, marker) {
        restartScreen(host);
        var started = Date.now();
        function poll() {
            if (Date.now() - started < 4500) { window.setTimeout(poll, 800); return; }
            get("server-state").then(function () {
                saveServiceRestartState({ completed: true, active: "server" });
                window.location.reload();
            }).catch(function () {
                if (Date.now() - started > 120000) {
                    host.innerHTML = '<div class="sirk-card" data-error="1">Nie udało się potwierdzić powrotu usługi. Odśwież stronę, aby spróbować ponownie.</div>';
                    return;
                }
                window.setTimeout(poll, 1200);
            });
        }
        poll();
    }

    function apiUrl(action, extra) {
        var url = new URL(window.__SIRK_PLATFORM_API_BASE__, window.location.href);
        if (url.pathname.replace(/\/+$/, "") === "/api" && action === "portal-admin-snapshot") url.pathname = "/api/admin/settings";
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

    function get(action, extra) {
        return fetch(apiUrl(action, extra), {
            credentials: "same-origin",
            cache: "no-store",
            headers: { Accept: "application/json" }
        }).then(parse).then(function (value) { return action === "portal-admin-snapshot" && value.value ? { snapshot: value.value } : value; });
    }

    function post(action, payload) {
        var body = new URLSearchParams();
        body.set("payload", JSON.stringify(payload || {}));
        return fetch(apiUrl(action), {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: body.toString()
        }).then(parse);
    }

    function postSettings(payload) {
        var base = new URL(window.__SIRK_PLATFORM_API_BASE__, window.location.href);
        if (base.pathname.replace(/\/+$/, "") === "/api") {
            var standaloneBody = new URLSearchParams();
            var standalonePayload = clone(payload || {});
            standalonePayload.portal = clone(standalonePayload.moduleOptions && standalonePayload.moduleOptions.portal || {});
            standaloneBody.set("payload", JSON.stringify(standalonePayload));
            return fetch(new URL("/api/admin/settings", window.location.href).href, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" }, body: standaloneBody.toString() }).then(parse).then(function (value) { return { snapshot: value.value || value.snapshot || value }; });
        }
        var body = new URLSearchParams();
        ["modules", "moduleOptions", "integrations", "secrets"].forEach(function (key) {
            body.set(key, JSON.stringify(payload[key] || {}));
        });
        return fetch(apiUrl("save-settings"), {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: body.toString()
        }).then(parse);
    }

    function status(host, text, error) {
        host.textContent = text || "";
        host.setAttribute("data-error", error ? "1" : "0");
    }

    function applySearch(details) {
        var query = String(state.search || "").trim().toLowerCase();
        Array.prototype.forEach.call(details.querySelectorAll("[data-search-item]"), function (item) {
            item.hidden = !!query && String(item.textContent || "").toLowerCase().indexOf(query) < 0;
        });
    }

    function draftPayload() {
        var snapshot = state.snapshot || {};
        var payload = {
            modules: {},
            moduleOptions: clone(snapshot.moduleSettings || {}),
            integrations: clone(snapshot.integrations && snapshot.integrations.values || {}),
            secrets: {}
        };
        (snapshot.modules || []).forEach(function (module) { payload.modules[module.key] = module.enabled === true; });
        return payload;
    }

    function field(host, label, value, onChange, options) {
        options = options || {};
        var wrapper = el("label", "sirk-card");
        wrapper.setAttribute("data-search-item", "1");
        wrapper.appendChild(el("strong", "", label));
        if (options.description) wrapper.appendChild(el("small", "", options.description));
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
            input.value = value == null ? "" : value;
            input.oninput = function () {
                onChange(input.type === "number" ? Number(input.value) : input.value);
            };
        }
        input.setAttribute("data-settings-input", "1");
        wrapper.appendChild(input);
        host.appendChild(wrapper);
        return input;
    }

    function objectForm(host, object, depth) {
        object = object && typeof object === "object" && !Array.isArray(object) ? object : {};
        Object.keys(object).sort().forEach(function (key) {
            var value = object[key];
            var title = key.replace(/([A-Z])/g, " $1").replace(/^./, function (c) { return c.toUpperCase(); });
            if (value && typeof value === "object" && !Array.isArray(value)) {
                var section = el("section", "sirk-card");
                section.setAttribute("data-search-item", "1");
                section.appendChild(el("h3", "", title));
                objectForm(section, value, depth + 1);
                host.appendChild(section);
            } else if (Array.isArray(value)) {
                field(host, title, value.join(", "), function (next) {
                    object[key] = String(next || "").split(",").map(function (item) { return item.trim(); }).filter(Boolean);
                }, { description: "Wartości rozdzielone przecinkami." });
            } else {
                field(host, title, value, function (next) { object[key] = next; }, { type: typeof value === "boolean" ? "boolean" : undefined });
            }
        });
        if (!Object.keys(object).length && depth === 0) host.appendChild(el("div", "sirk-card", "Brak ustawień w tej sekcji."));
    }

    function renderOverview(host) {
        var grid = el("div");
        grid.setAttribute("data-card-grid", "1");
        (state.snapshot && state.snapshot.modules || []).forEach(function (module) {
            var card = el("article", "sirk-card");
            card.setAttribute("data-search-item", "1");
            card.appendChild(el("h3", "", module.name || module.key));
            card.appendChild(el("p", "", module.ready ? "Ready" : (module.error || "Not ready")));
            card.appendChild(el("strong", "", module.enabled ? "Włączony" : "Wyłączony"));
            grid.appendChild(card);
        });
        host.appendChild(grid);
    }

    function settingsValue(key, payload) {
        if (key === "folderpermissions") {
            return {
                portalViews: (payload.moduleOptions.portal || {}).views || {},
                scripts: (payload.moduleOptions.myscripts || {}).folderPermissions || {},
                commands: (payload.moduleOptions.mycommands || {}).folderPermissions || {}
            };
        }
        return payload.moduleOptions[key] || {};
    }

    function renderSettings(host, secondary) {
        settingsItems.forEach(function (item) {
            var button = el("button", item[0] === state.settingsKey ? "sirk-nav-item active" : "sirk-nav-item", item[1]);
            button.type = "button";
            button.onclick = function () {
                state.settingsKey = item[0];
                renderActive(host.parentNode, secondary, host);
            };
            secondary.appendChild(button);
        });

        var payload = draftPayload();
        var value = clone(settingsValue(state.settingsKey, payload));
        var form = el("div");
        form.setAttribute("data-settings-form", "1");
        var module = (state.snapshot.modules || []).find(function (item) { return item.key === state.settingsKey; });
        if (module && state.settingsKey !== "folderpermissions") {
            field(form, "Moduł włączony", payload.modules[state.settingsKey] === true, function (checked) {
                payload.modules[state.settingsKey] = checked;
            }, { type: "boolean" });
        }
        if (state.settingsKey === "portal") {
            field(form, "Widok domyślny", value.defaultView || "overview", function (next) { value.defaultView = next; }, {
                choices: [["overview", "Overview"], ["devices", "Devices"], ["approvals", "Approval"], ["automation", "Automation"], ["management", "Management"]]
            });
            ["showLauncher", "showNativeLink", "forceNewLogin", "forcePortalInterface", "keepSessionsAfterRestart"].forEach(function (key) {
                field(form, key, value[key] === true, function (next) { value[key] = next; }, { type: "boolean" });
            });
            if (value.views) {
                var views = el("section", "sirk-card");
                views.appendChild(el("h3", "", "Widoczność pozycji Portalu"));
                objectForm(views, value.views, 0);
                form.appendChild(views);
            }
        } else {
            objectForm(form, value, 0);
        }
        var actions = el("div", "sirk-toolbar-group sirk-toolbar-left");
        var save = el("button", "sirk-button", "Zapisz");
        var message = el("span");
        save.type = "button";
        save.onclick = function () {
            if (state.settingsKey === "folderpermissions") {
                payload.moduleOptions.portal = payload.moduleOptions.portal || {};
                payload.moduleOptions.myscripts = payload.moduleOptions.myscripts || {};
                payload.moduleOptions.mycommands = payload.moduleOptions.mycommands || {};
                payload.moduleOptions.portal.views = value.portalViews || {};
                payload.moduleOptions.myscripts.folderPermissions = value.scripts || {};
                payload.moduleOptions.mycommands.folderPermissions = value.commands || {};
            } else {
                payload.moduleOptions[state.settingsKey] = value;
            }
            save.disabled = true;
            status(message, "Zapisywanie…", false);
            postSettings(payload).then(function (result) {
                state.snapshot = result.snapshot;
                status(message, "Zapisano.", false);
            }).catch(function (error) {
                status(message, error.message, true);
            }).then(function () { save.disabled = false; });
        };
        actions.appendChild(save);
        actions.appendChild(message);
        host.appendChild(form);
        host.appendChild(actions);
        applySearch(host);
    }

    function pluginStatus(plugin) {
        if (plugin.updateStatus === "available") return "Dostępna " + (plugin.availableVersion || "");
        if (plugin.updateStatus === "current") return "Aktualna";
        if (plugin.updateStatus === "incompatible") return "Niezgodna";
        if (plugin.updateStatus === "error") return "Błąd: " + (plugin.updateError || "");
        return "Brak danych";
    }

    function renderInstalledPlugins(host, message) {
        clear(host);
        var table = el("table");
        table.setAttribute("data-settings-table", "1");
        var head = el("thead");
        var row = el("tr");
        ["Wtyczka", "Wersja", "Dostępna", "Stan", "Aktualizacja", "Akcje"].forEach(function (title) { row.appendChild(el("th", "", title)); });
        head.appendChild(row);
        table.appendChild(head);
        var body = el("tbody");
        state.plugins.forEach(function (plugin) {
            var tr = el("tr");
            tr.setAttribute("data-search-item", "1");
            var name = el("td");
            name.appendChild(el("strong", "", plugin.name || plugin.shortName));
            name.appendChild(el("small", "", plugin.shortName || ""));
            tr.appendChild(name);
            tr.appendChild(el("td", "", plugin.version || "—"));
            tr.appendChild(el("td", "", plugin.availableVersion || "—"));
            tr.appendChild(el("td", "", plugin.status === 1 ? "Włączona" : "Wyłączona"));
            tr.appendChild(el("td", "", pluginStatus(plugin)));
            var actions = el("td");
            var actionList = [];
            if (plugin.updateAvailable && plugin.updateCompatible) actionList.push(["update", "Aktualizuj"]);
            actionList.push(plugin.status === 1 ? ["disable", "Wyłącz"] : ["enable", "Włącz"]);
            actionList.push(["remove", "Usuń"]);
            actionList.forEach(function (action) {
                var button = el("button", "sirk-button", action[1]);
                button.type = "button";
                button.disabled = plugin.protected === true;
                button.onclick = function () {
                    var question = action[0] === "update"
                        ? "Zaktualizować " + (plugin.name || plugin.shortName) + "? Przed aktualizacją zostanie utworzony backup."
                        : action[1] + " wtyczkę " + (plugin.name || plugin.shortName) + "?";
                    if (!window.confirm(question)) return;
                    button.disabled = true;
                    status(message, "Wykonywanie operacji…", false);
                    post("plugin-operation", { operation: action[0], id: plugin.id }).then(function (result) {
                        state.plugins = result.plugins || [];
                        renderInstalledPlugins(host, message);
                        status(message, result.result && result.result.backupPath ? "Operacja zakończona. Backup: " + result.result.backupPath : "Operacja zakończona.", false);
                    }).catch(function (error) {
                        status(message, error.message, true);
                        button.disabled = false;
                    });
                };
                actions.appendChild(button);
            });
            tr.appendChild(actions);
            body.appendChild(tr);
        });
        table.appendChild(body);
        host.appendChild(table);
        applySearch(host);
    }

    function renderMarketplace(host, message) {
        clear(host);
        var grid = el("div");
        grid.setAttribute("data-card-grid", "1");
        var installedNames = state.plugins.map(function (plugin) { return String(plugin.shortName || "").toLowerCase(); });
        state.marketplace.forEach(function (item) {
            var card = el("article", "sirk-card");
            card.setAttribute("data-search-item", "1");
            card.appendChild(el("h3", "", item.name));
            card.appendChild(el("small", "", "v" + item.version + " · " + item.author + " · " + item.category));
            card.appendChild(el("p", "", item.description || ""));
            var installed = installedNames.indexOf(String(item.shortName || "").toLowerCase()) >= 0;
            var install = el("button", "sirk-button", installed ? "Zainstalowana" : "Instaluj");
            install.type = "button";
            install.disabled = installed;
            install.onclick = function () {
                if (!window.confirm("Zainstalować " + item.name + "? Kod wtyczki działa z uprawnieniami serwera MeshCentral.")) return;
                install.disabled = true;
                status(message, "Dodawanie wtyczki…", false);
                post("plugin-operation", { operation: "add", configUrl: item.configUrl }).then(function (result) {
                    state.plugins = result.plugins || [];
                    var added = state.plugins.find(function (plugin) {
                        return String(plugin.shortName || "").toLowerCase() === String(item.shortName || "").toLowerCase();
                    });
                    if (!added || added.status === 1) return result;
                    return post("plugin-operation", { operation: "enable", id: added.id });
                }).then(function (result) {
                    state.plugins = result.plugins || state.plugins;
                    status(message, "Wtyczka została zainstalowana i włączona.", false);
                    renderMarketplace(host, message);
                }).catch(function (error) {
                    status(message, error.message, true);
                    install.disabled = false;
                });
            };
            card.appendChild(install);
            if (item.homepage) {
                var link = el("a", "", "Repozytorium");
                link.href = item.homepage;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                card.appendChild(link);
            }
            grid.appendChild(card);
        });
        host.appendChild(grid);
        applySearch(host);
    }

    function renderPlugins(host) {
        var controls = el("div", "sirk-toolbar");
        var left = el("div", "sirk-toolbar-group sirk-toolbar-left");
        var installed = el("button", state.pluginView === "installed" ? "sirk-button active" : "sirk-button", "Zainstalowane");
        var available = el("button", state.pluginView === "available" ? "sirk-button active" : "sirk-button", "Dostępne");
        var add = el("button", "sirk-button", "Dodaj z URL");
        var check = el("button", "sirk-button", "Sprawdź aktualizacje");
        var message = el("span");
        [installed, available, add, check].forEach(function (button) { button.type = "button"; left.appendChild(button); });
        left.appendChild(message);
        controls.appendChild(left);
        host.appendChild(controls);
        var content = el("div");
        host.appendChild(content);

        function draw() {
            installed.classList.toggle("active", state.pluginView === "installed");
            available.classList.toggle("active", state.pluginView === "available");
            if (state.pluginView === "installed") renderInstalledPlugins(content, message);
            else renderMarketplace(content, message);
        }

        installed.onclick = function () { state.pluginView = "installed"; draw(); };
        available.onclick = function () { state.pluginView = "available"; draw(); };
        add.onclick = function () {
            var url = window.prompt("URL pliku config.json wtyczki:");
            if (!url) return;
            status(message, "Dodawanie…", false);
            post("plugin-operation", { operation: "add", configUrl: url.trim() }).then(function (result) {
                state.plugins = result.plugins || [];
                status(message, "Wtyczka została dodana.", false);
                draw();
            }).catch(function (error) { status(message, error.message, true); });
        };
        check.onclick = function () {
            check.disabled = true;
            status(message, "Sprawdzanie aktualizacji…", false);
            get("plugin-state").then(function (result) {
                state.plugins = result.plugins || [];
                draw();
                status(message, "Sprawdzanie zakończone.", false);
            }).catch(function (error) {
                status(message, error.message, true);
            }).then(function () { check.disabled = false; });
        };

        Promise.all([get("plugin-state"), get("", { asset: "marketplace.json" })]).then(function (values) {
            state.plugins = values[0].plugins || [];
            state.marketplace = values[1].plugins || [];
            draw();
            status(message, "", false);
        }).catch(function (error) {
            status(message, error.message, true);
        });
    }

    function renderServer(host) {
        var message = el("div", "sirk-card", "Ładowanie stanu usług…");
        host.appendChild(message);
        get("server-state").then(function (result) {
            clear(host);
            if (state.resumeMessage) {
                host.appendChild(el("div", "sirk-card sirk-update-success", state.resumeMessage));
                state.resumeMessage = "";
            }
            if (!(result.services || []).length) {
                host.appendChild(el("div", "sirk-card", "Nie znaleziono usługi przypisanej do instalacji."));
                return;
            }
            (result.services || []).forEach(function (service) {
                var card = el("article", "sirk-card");
                card.setAttribute("data-search-item", "1");
                card.appendChild(el("h3", "", service.displayName || service.name));
                card.appendChild(el("p", "", "Stan: " + service.state + " · Start: " + service.startMode + " · PID: " + (service.processId || "—")));
                var restart = el("button", "sirk-button", "Restartuj usługę");
                restart.type = "button";
                restart.onclick = function () {
                    if (!window.confirm("Zrestartować usługę " + (service.displayName || service.name) + "?")) return;
                    restart.disabled = true;
                    var marker = { pending: true, active: "server", startedAt: Date.now() };
                    saveServiceRestartState(marker);
                    post("server-restart", { serviceName: service.name }).then(function () {
                        waitForService(host, marker);
                    }).catch(function (error) {
                        clearServiceRestartState();
                        card.appendChild(el("div", "sirk-card", error.message));
                        restart.disabled = false;
                    });
                };
                card.appendChild(restart);
                host.appendChild(card);
            });
            applySearch(host);
        }).catch(function (error) {
            message.textContent = error.message;
            message.setAttribute("data-error", "1");
        });
    }

    function renderDebug(host, secondary) {
        [["config", "Config"], ["logs", "Logi"], ["errors", "Błędy"]].forEach(function (item) {
            var button = el("button", item[0] === state.debugKey ? "sirk-nav-item active" : "sirk-nav-item", item[1]);
            button.type = "button";
            button.onclick = function () {
                state.debugKey = item[0];
                renderActive(host.parentNode, secondary, host);
            };
            secondary.appendChild(button);
        });
        var snapshot = state.snapshot || {};
        var value = state.debugKey === "logs"
            ? snapshot.diagnostics && snapshot.diagnostics.logs || "Brak logów."
            : state.debugKey === "errors"
                ? snapshot.diagnostics && snapshot.diagnostics.errors || snapshot.moduleLoadErrors || "Brak błędów."
                : { plugin: snapshot.plugin, modules: snapshot.modules, moduleSettings: snapshot.moduleSettings, integrations: snapshot.integrations, migration: snapshot.migration, generatedAt: snapshot.generatedAt };
        var pre = el("pre", "sirk-card", typeof value === "string" ? value : JSON.stringify(value, null, 2));
        pre.setAttribute("data-debug-output", "1");
        host.appendChild(pre);
    }

    function renderActive(layout, secondary, details) {
        clear(secondary);
        clear(details);
        var overview = state.active === "overview";
        layout.classList.toggle("sirk-settings-overview", overview);
        secondary.hidden = overview || state.active === "plugins" || state.active === "server";
        if (overview) renderOverview(details);
        else if (state.active === "settings") renderSettings(details, secondary);
        else if (state.active === "plugins") renderPlugins(details);
        else if (state.active === "server") renderServer(details);
        else if (state.active === "debug") renderDebug(details, secondary);
        else if (window.SirkSystemUpdates) {
            secondary.hidden = false;
            [["updates", "Aktualizacje"], ["backups", "Backupy"], ["history", "Historia"], ["channel", "Kanał aktualizacji"]].forEach(function (item, index) {
                var button = el("button", index === 0 ? "sirk-nav-item active" : "sirk-nav-item", item[1]);
                button.type = "button";
                button.onclick = function () {
                    Array.prototype.forEach.call(secondary.children, function (node) { node.classList.toggle("active", node === button); });
                    window.SirkSystemUpdates.mount(details, item[0]);
                };
                secondary.appendChild(button);
            });
            window.SirkSystemUpdates.mount(details, "updates");
        }
        applySearch(details);
    }

    function mount(host) {
        var marker = serviceRestartState();
        if (marker && marker.active) state.active = marker.active;
        if (marker && marker.completed) {
            clearServiceRestartState();
            state.resumeMessage = "Usługa została ponownie uruchomiona. Strona jest aktualna.";
        }
        clear(host);
        host.innerHTML = '<section class="sirk-standalone-view-scroll" data-portal-settings>' +
            '<div class="sirk-toolbar"><div class="sirk-toolbar-group sirk-toolbar-left">' +
            '<button type="button" class="sirk-button" data-settings-collapse aria-label="Zwiń menu">☰</button>' +
            '<button type="button" class="sirk-button" data-settings-refresh>Odśwież</button>' +
            '<input type="search" data-settings-search placeholder="Szukaj…" aria-label="Szukaj"></div></div>' +
            '<div class="sirk-layout-host"><div class="sirk-layout">' +
            '<aside class="sirk-column-primary" data-settings-primary></aside>' +
            '<aside class="sirk-column-secondary" data-settings-secondary></aside>' +
            '<div class="sirk-column-details" data-settings-details></div>' +
            '</div></div></section>';

        var layout = host.querySelector(".sirk-layout");
        var primary = host.querySelector("[data-settings-primary]");
        var secondary = host.querySelector("[data-settings-secondary]");
        var details = host.querySelector("[data-settings-details]");
        var search = host.querySelector("[data-settings-search]");
        search.value = state.search;
        search.oninput = function () { state.search = search.value; applySearch(details); };
        host.querySelector("[data-settings-collapse]").onclick = function () { layout.classList.toggle("is-collapsed"); };
        host.querySelector("[data-settings-refresh]").onclick = function () {
            details.innerHTML = '<div class="sirk-card">Odświeżanie…</div>';
            get("portal-admin-snapshot").then(function (result) {
                state.snapshot = result.snapshot;
                renderActive(layout, secondary, details);
            }).catch(function (error) {
                details.innerHTML = "";
                details.appendChild(el("div", "sirk-card", error.message));
            });
        };

        [["overview", "Overview"], ["settings", "Settings"], ["plugins", "Wtyczki"], ["server", "Serwer"], ["debug", "Debug"], ["system", "System"]].forEach(function (item) {
            var button = el("button", item[0] === state.active ? "sirk-nav-item active" : "sirk-nav-item", item[1]);
            button.type = "button";
            button.onclick = function () {
                state.active = item[0];
                Array.prototype.forEach.call(primary.children, function (node) { node.classList.toggle("active", node === button); });
                renderActive(layout, secondary, details);
            };
            primary.appendChild(button);
        });

        get("portal-admin-snapshot").then(function (result) {
            state.snapshot = result.snapshot;
            renderActive(layout, secondary, details);
        }).catch(function (error) {
            details.appendChild(el("div", "sirk-card", error.message));
        });
    }

    window.SirkPortalSettings = { mount: mount };
}());
