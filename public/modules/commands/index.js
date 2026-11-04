(function () {
    "use strict";

    window.__sirkNativeCommandAutoRun = true;

    var sourceTree = null;
    var catalog = [];
    var tree = null;
    var mode = "commands";
    var status = "";
    var treeState = { selectedRoot: "", selectedScript: "", expanded: {} };
    var outputs = Object.create(null);
    var pollSequence = 0;
    var siteAdmin = false;
    var vuln = { nodeId: "", sequence: 0, data: null, error: null, loading: false, risk: "", exploit: "", sort: "severity", page: 1, showExcluded: false };
    var VULN_PAGE_SIZE = 100;
    var VULN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/><path d="M12 8v5M12 16h.01"/></svg>';
    var tools = window.SharedScriptTools.create({ storageKey: "sirkPlatform.mycommands.preferences", deepLinkParameter: "mycommand" });
    tools.restoreTreeState(treeState);

    var PL = {
        Results: "Wyniki", Scripts: "Skrypty", Network: "Sieć", System: "System", Other: "Inne",
        "Registry Editor": "Edytor rejestru",
        "Local Security Policy": "Lokalne zasady zabezpieczeń", "Windows Firewall": "Zapora Windows",
        MMC: "MMC", Services: "Usługi", "Device Manager": "Menedżer urządzeń", "Event Viewer": "Podgląd zdarzeń",
        "Task Manager": "Menedżer zadań", "Printer Management": "Zarządzanie drukarkami",
        "Certificates (computer)": "Certyfikaty komputera", "Certificates (user)": "Certyfikaty użytkownika",
        "Indexing Options": "Opcje indeksowania", "Disk Cleanup": "Oczyszczanie dysku",
        "Flush DNS": "Wyczyść DNS", "Check DNS": "Sprawdź DNS", "Check port": "Sprawdź port",
        "Open ports": "Otwarte porty", "Filter by port": "Filtruj po porcie"
    };

    var ICONS = {
        powershell: '<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="m8 9 3 3-3 3M13 15h4"/></svg>',
        cmd: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m7 10 3 2-3 2M12 15h5"/></svg>',
        regedit: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></svg>',
        secpol: '<svg viewBox="0 0 24 24"><path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/><path d="m9 12 2 2 4-5"/></svg>',
        firewall: '<svg viewBox="0 0 24 24"><path d="M3 5h18v14H3zM3 10h18M8 5v5M16 10v4M8 14v5"/></svg>',
        mmc: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h5M7 16h8"/></svg>',
        services: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12h2M3 12h2M12 3v2M12 19v2M17 7l1.5-1.5M5.5 18.5 7 17M17 17l1.5 1.5M5.5 5.5 7 7"/></svg>',
        devices: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
        events: '<svg viewBox="0 0 24 24"><path d="M5 3h14v18H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
        taskmgr: '<svg viewBox="0 0 24 24"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>',
        printers: '<svg viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4V9h16v9h-2M7 14h10v7H7z"/></svg>',
        certlm: '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="5"/><path d="m9 14-1 7 4-2 4 2-1-7"/></svg>',
        certcu: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 21c1-5 3-7 7-7s6 2 7 7"/></svg>',
        indexing: '<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M10 7v6M7 10h6"/></svg>',
        cleanup: '<svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></svg>',
        flushdns: '<svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z"/><path d="M8 10h8M8 14h5M18 3v5M15.5 5.5 18 8l2.5-2.5"/></svg>',
        "network-settings": '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4M7 9h10M7 13h6"/><circle cx="18" cy="15" r="3"/><path d="M18 10v2M18 18v2M13 15h2M21 15h2"/></svg>',
        dns: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
        port: '<svg viewBox="0 0 24 24"><path d="M4 8h16v8H4zM8 12h.01M12 12h.01M16 12h.01"/></svg>',
        netstat: '<svg viewBox="0 0 24 24"><path d="M4 17V7M9 17v-5M14 17V4M19 17v-8"/></svg>',
        "netstat-port": '<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9h8M8 13h5"/><circle cx="17" cy="16" r="2"/></svg>'
    };

    ICONS["network-adapter-properties"] = ICONS["network-settings"];

    var MENU_ICONS = {
        scripts: '<svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6V3Z"/><path d="m9 11 2 2-2 2M13 15h3"/></svg>',
        network: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
        system: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></svg>',
        other: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>'
    };

    function language() {
        try { return localStorage.getItem("sirkPortal.language") === "en" ? "en" : "pl"; }
        catch (error) { return "pl"; }
    }
    function tr(value) { value = String(value == null ? "" : value); return language() === "pl" && PL[value] ? PL[value] : value; }
    function msg(pl, en) { return language() === "pl" ? pl : en; }
    function node(shell) { return shell.state.nodeId || window.SirkPlatformRuntime.state.nodeId || window.selectedNode || ""; }
    function stringValue(value) { if (value == null) return ""; if (typeof value === "string") return value; try { return JSON.stringify(value, null, 2); } catch (error) { return String(value); } }
    function isAdmin(shell) { return !!(shell.state.bootstrap && shell.state.bootstrap.access && shell.state.bootstrap.access.siteAdmin); }
    function sync(shell) { tools.syncToolbar(shell.state.page && shell.state.page.toolbar, mode, treeState.selectedScript, { canEdit: isAdmin(shell), enableMulti: true }); }
    function note(shell, title, message, error) { var host = shell.state.page.details; host.innerHTML = ""; var card = shell.card(title, message); if (error) card.classList.add("mc-shared-error"); host.appendChild(card); sync(shell); }
    function empty(shell) { note(shell, msg("Wynik", "Output"), tools.state.favoritesOnly && !tools.state.favorites.length ? msg("Brak ulubionych poleceń.", "No favorite commands.") : msg("Wybierz polecenie lub skrypt, aby je uruchomić.", "Select a command or script to run it.")); }
    function confirmExecution(item, trigger) {
        if (!item || item.confirmExecution !== true) return Promise.resolve(true);
        if (!tools || typeof tools.openConfirmationDialog !== "function") return Promise.reject(new Error("Native MeshCentral confirmation dialog is unavailable."));
        return tools.openConfirmationDialog({
            title: item.label || item.name || msg("Potwierdź wykonanie", "Confirm execution"),
            message: msg("Uruchomić teraz: ", "Run now: ") + (item.label || item.name || item.path) + "?",
            trigger: trigger, item: item,
            primaryLabel: item.requiresApproval ? msg("Poproś o akceptację", "Request") : msg("Uruchom", "Run")
        });
    }
    function parameterValues(item, trigger) {
        if (!Array.isArray(item && item.variables) || !item.variables.length) return Promise.resolve({});
        if (!tools || typeof tools.openParameterDialog !== "function") return Promise.reject(new Error("Native MeshCentral parameter dialog is unavailable."));
        return tools.openParameterDialog({
            item: item, trigger: trigger,
            primaryLabel: item.requiresApproval ? msg("Poproś o akceptację", "Request") : msg("Uruchom", "Run")
        });
    }
    function commandPath(category, command) { return "@command/" + category.key + "/" + command.id; }
    function tonedIcon(markup, tone) { return String(markup || "").replace("<svg ", "<svg class=\"sirk-command-icon sirk-command-icon-" + String(tone || "other") + "\" "); }

    function buildTree() {
        var children = [{ type: "directory", name: msg("Skrypty", "Scripts"), path: "@menu/scripts", iconMarkup: tonedIcon(MENU_ICONS.scripts, "scripts"), children: sourceTree && Array.isArray(sourceTree.children) ? sourceTree.children : [] }];
        (catalog || []).forEach(function (category) {
            var visibleCommands = (category.commands || []).filter(function (command) { return command.showWithoutDesktop === true || siteAdmin || tools.state.editMode; });
            if (!visibleCommands.length) return;
            children.push({
                type: "directory", name: tr(category.title), path: "@menu/" + category.key, iconMarkup: tonedIcon(MENU_ICONS[category.key] || MENU_ICONS.other, category.key),
                children: visibleCommands.map(function (command) {
                    return {
                        type: "script", kind: "command", name: tr(command.label), label: tr(command.label),
                        description: tr(command.description || ""), path: commandPath(category, command), commandId: command.id,
                        variables: command.variables || [], approvalLevels: command.approvalLevels || [],
                        requiresApproval: command.requiresApproval === true, runAsUser: command.runAsUser,
                        confirmExecution: command.confirmExecution === true, multiHost: true,
                        showOnDesktop: command.showOnDesktop === true, showWithoutDesktop: command.showWithoutDesktop === true,
                        iconMarkup: tonedIcon(ICONS[command.id] || ICONS.mmc, category.key)
                    };
                })
            });
        });
        return { type: "directory", name: msg("Polecenia", "Commands"), path: "", children: children };
    }

    function renderOutput(host, value) { host.innerHTML = ""; if (window.SharedResultsView && typeof window.SharedResultsView.mountResult === "function") { window.SharedResultsView.mountResult(host, value || msg("Brak wyniku.", "No output.")); return; } var pre = document.createElement("pre"); pre.className = "mc-shared-output"; pre.textContent = stringValue(value) || msg("Brak wyniku.", "No output."); host.appendChild(pre); }
    function renderWaiting(host, value) { host.innerHTML = ""; var pre = document.createElement("pre"); pre.className = "mc-shared-output"; pre.textContent = value; host.appendChild(pre); }
    function pollOutput(shell, item, responseId, outputHost, sequence, attempt) {
        if (sequence !== pollSequence || treeState.selectedScript !== item.path) return;
        shell.api("output", { id: responseId }).then(function (response) {
            if (sequence !== pollSequence || treeState.selectedScript !== item.path) return;
            if (response.ready) { var value = response.output || (response.status ? msg("Polecenie zakończone: ", "Command completed: ") + response.status : msg("Polecenie zakończone bez wyniku.", "Command completed without output.")); outputs[item.path] = value; renderOutput(outputHost, value); return; }
            if (attempt >= 300) { renderWaiting(outputHost, msg("Przekroczono czas oczekiwania na wynik.", "Command output timeout reached.")); return; }
            renderWaiting(outputHost, msg("Oczekiwanie na wynik agenta…", "Waiting for agent output…"));
            window.setTimeout(function () { pollOutput(shell, item, responseId, outputHost, sequence, attempt + 1); }, 1000);
        }).catch(function (error) { if (sequence === pollSequence) renderWaiting(outputHost, error.message || String(error)); });
    }

    function execute(shell, item, button, values, outputHost) {
        return confirmExecution(item, button || document.activeElement).then(function (confirmed) {
            if (!confirmed) return;
            if (button) button.disabled = true;
            outputHost.classList.remove("mc-shared-error"); renderWaiting(outputHost, msg("Wysyłanie polecenia…", "Submitting command…"));
            var payload = { nodeId: node(shell), nodeName: window.currentNode && window.currentNode.name || "", variableValues: values || {}, confirmedExecution: item.confirmExecution === true, note: "" };
            if (item.kind === "command") payload.commandId = item.commandId; else payload.scriptPath = item.path;
            return shell.post("execute", payload).then(function (response) {
                var request = response.request || {}, result = request.result || {};
                if (request.status === "pending") { outputs[item.path] = msg("Oczekiwanie na akceptację.", "Waiting for approval."); renderWaiting(outputHost, outputs[item.path]); return; }
                if (result.id) { var immediate = result.output || result.message || msg("Oczekiwanie na wynik agenta…", "Waiting for agent output…"); outputs[item.path] = immediate; renderWaiting(outputHost, immediate); pollSequence++; pollOutput(shell, item, result.id, outputHost, pollSequence, 0); return; }
                var value = result.output || result.message || request.status || msg("Polecenie wysłane.", "Command submitted."); outputs[item.path] = stringValue(value); renderOutput(outputHost, outputs[item.path]);
            }).catch(function (error) {
                outputs[item.path] = error.message || String(error);
                renderWaiting(outputHost, outputs[item.path]);
                outputHost.classList.add("mc-shared-error");
            }).then(function () { if (button) button.disabled = false; });
        }).catch(function (error) {
            outputs[item.path] = error.message || String(error);
            renderWaiting(outputHost, outputs[item.path]);
            outputHost.classList.add("mc-shared-error");
        });
    }

    function showDefinition(shell, item, autoExecute) {
        var host = shell.state.page.details; host.innerHTML = "";
        var card = shell.card(item.label || item.name, item.description || item.path);
        if (typeof tools.appendRebootNotice === "function") tools.appendRebootNotice(card, item);
        var button = shell.element("button", "btn btn-primary mc-command-run-button", item.requiresApproval ? msg("Poproś o akceptację", "Request") : "▶ " + msg("Uruchom", "Run")); button.type = "button"; card.appendChild(button);
        var outputHost = document.createElement("div"); outputHost.className = "mc-command-inline-result";
        if (outputs[item.path]) renderOutput(outputHost, outputs[item.path]); else renderWaiting(outputHost, autoExecute ? msg("Uruchamianie…", "Starting…") : msg("Wybierz Uruchom, aby zobaczyć wynik.", "Select Run to see the result."));
        card.appendChild(outputHost);
        button.onclick = function () {
            parameterValues(item, button).then(function (values) {
                if (values == null) return;
                return execute(shell, item, button, values, outputHost);
            }).catch(function (error) {
                outputs[item.path] = error.message || String(error);
                renderWaiting(outputHost, outputs[item.path]);
                outputHost.classList.add("mc-shared-error");
            });
        };
        host.appendChild(card); sync(shell);
        if (autoExecute === true) window.setTimeout(function () { button.click(); }, 0);
    }

    function show(shell, item, executeOnSelect) {
        pollSequence++;
        if (item.kind === "command") { showDefinition(shell, item, executeOnSelect === true); return; }
        shell.api("script", { path: item.path }).then(function (response) {
            var script = response.script;
            showDefinition(shell, script, executeOnSelect === true);
        }).catch(function (error) { shell.error(shell.state.page.details, error); });
    }

    function multi(shell, item) {
        var trigger = document.activeElement;
        confirmExecution(item, trigger).then(function (confirmed) {
            if (!confirmed) return null;
            return parameterValues(item, trigger);
        }).then(function (values) {
            if (values == null) return;
            treeState.selectedScript = item.path;
            tools.openMultiExecution(shell, item, node(shell), function (ids) {
                var payload = { nodeIds: ids, label: item.label || item.name, variableValues: values || {}, confirmedExecution: item.confirmExecution === true, note: "" };
                if (item.kind === "command") payload.commandId = item.commandId; else payload.scriptPath = item.path;
                return shell.post("multi-execute", payload).then(function (response) {
                    note(shell, msg("Wynik Multi", "Multi-device result"), JSON.stringify({ total: response.total, submitted: response.submitted, pending: response.pending, failed: response.failed }, null, 2), response.failed > 0);
                    return response;
                });
            });
        }).catch(function (error) {
            note(shell, msg("Multi-device execution", "Multi-device execution"), error.message || String(error), true);
        });
    }

    function openCommandEditor(shell, item) {
        shell.api("command-definition", { id: item.commandId }).then(function (response) {
            var value = response.definition || {}, host = shell.state.page.details; host.innerHTML = "";
            var card = shell.card(msg("Edytuj polecenie", "Edit command"), item.label || item.commandId);
            var label = document.createElement("input"); label.type = "text"; label.value = value.label || item.label || "";
            var description = document.createElement("textarea"); description.rows = 3; description.value = value.description || item.description || "";
            var confirmLabel = document.createElement("label"), confirm = document.createElement("input"); confirm.type = "checkbox"; confirm.checked = value.confirmExecution === true; confirmLabel.appendChild(confirm); confirmLabel.appendChild(document.createTextNode(" " + msg("Potwierdź przed uruchomieniem", "Confirm before execution")));
            var desktopLabel = document.createElement("label"), desktop = document.createElement("input"); desktop.type = "checkbox"; desktop.checked = value.showOnDesktop === true; desktopLabel.appendChild(desktop); desktopLabel.appendChild(document.createTextNode(" " + msg("Dostępne podczas połączenia z pulpitem (Quick commands)", "Available during a Desktop connection (Quick commands)")));
            var offlineLabel = document.createElement("label"), offline = document.createElement("input"); offline.type = "checkbox"; offline.checked = value.showWithoutDesktop === true; offlineLabel.appendChild(offline); offlineLabel.appendChild(document.createTextNode(" " + msg("Dostępne bez połączenia z pulpitem (My Commands)", "Available without a Desktop connection (My Commands)")));
            function row(title, control) { var host = document.createElement("label"); host.className = "mc-script-form-row"; host.appendChild(shell.element("span", "mc-script-form-label", title)); host.appendChild(control); return host; }
            card.appendChild(row(msg("Nazwa", "Label"), label)); card.appendChild(row(msg("Opis", "Description"), description)); card.appendChild(row(msg("Pulpit", "Desktop"), desktopLabel)); card.appendChild(row(msg("Bez pulpitu", "Without Desktop"), offlineLabel)); card.appendChild(row(msg("Wykonanie", "Execution"), confirmLabel));
            var actions = document.createElement("div"); actions.className = "mc-script-manage-actions"; var save = shell.element("button", "btn btn-primary", msg("Zapisz", "Save")); save.type = "button";
            save.onclick = function () { save.disabled = true; shell.post("command-definition", { id: item.commandId, label: label.value, description: description.value, confirmExecution: confirm.checked, showOnDesktop: desktop.checked, showWithoutDesktop: offline.checked }).then(function (result) { catalog = result.catalog || catalog; tree = buildTree(); tools.state.editMode = false; shell.render(); }).catch(function (error) { save.disabled = false; shell.error(host, error); }); };
            actions.appendChild(save); card.appendChild(actions); host.appendChild(card); label.focus();
        }).catch(function (error) { shell.error(shell.state.page.details, error); });
    }

    function actions(shell, item) {
        return tools.scriptActions(item, {
            canEdit: isAdmin(shell),
            enableMulti: item.kind === "command" || item.multiHost === true,
            onEdit: function (script) { treeState.selectedScript = script.path; if (script.kind === "command") { openCommandEditor(shell, script); return; } tools.openDefinitionEditor(shell, script, function (result) { if (result && result.tree) sourceTree = result.tree; tree = buildTree(); tools.state.editMode = false; shell.render(); }); },
            onCredentials: function (script) { treeState.selectedScript = script.path; tools.openCredentialsEditor(shell, script, function () { note(shell, msg("Dane logowania zapisane", "Credentials saved"), msg("Zaszyfrowane dane zostały zaktualizowane.", "Encrypted credentials were updated.")); }); },
            onMulti: function (script) { multi(shell, script); },
            onFavoriteChanged: function (script) { if (tools.state.favoritesOnly && !tools.isFavorite(script.path)) treeState.selectedScript = ""; shell.render(); },
            onLinkCopied: function () {}
        });
    }

    function filterItem(item) { return tools.filterScript(item); }
    function primary(shell, treeHost) {
        if (!window.SharedCatalogView || typeof window.SharedCatalogView.mount !== "function") throw new Error("Commands catalog dependency is unavailable.");
        window.SharedCatalogView.mount({
            primaryContainer: shell.state.page.primary, treeContainer: treeHost, tree: tree, state: treeState, search: shell.state.search,
            resultsActive: mode === "results", emptyText: tools.state.favoritesOnly ? msg("Brak ulubionych poleceń.", "No favorite commands found.") : msg("Nie znaleziono poleceń.", "No commands found."),
            filterScript: filterItem, scriptActions: function (item) { return actions(shell, item); },
            onResults: function () { mode = "results"; treeState.selectedScript = ""; shell.render(); },
            extraItems: [{
                key: "vulnerabilities", label: msg("Podatności", "Vulnerabilities"), iconMarkup: VULN_ICON, active: mode === "vulnerabilities",
                onClick: function () { mode = "vulnerabilities"; treeState.selectedScript = ""; vuln.data = null; vuln.error = null; vuln.page = 1; shell.render(); }
            }],
            onRootSelect: function () { mode = "commands"; treeState.selectedScript = ""; tools.saveTreeState(treeState); window.setTimeout(shell.render, 0); },
            onScript: function (item) {
                mode = "commands";
                treeState.selectedScript = item.path;
                tools.saveTreeState(treeState);
                show(shell, item, true);
            }
        });
        var resultsLabel = shell.state.page.primary.querySelector(".mc-catalog-results .mc-tree-label"); if (resultsLabel) resultsLabel.textContent = msg("Wyniki", "Results");
    }

    function results(shell) {
        primary(shell, document.createElement("div"));
        window.SharedResultsView.mountStatus(shell.state.page.secondary, { selected: status, onSelect: function (value) { status = value; shell.render(); } }); sync(shell);
        return shell.api("results", { status: status, q: shell.state.search, page: 1, perPage: 200 }).then(function (response) { window.SharedResultsView.mountTable(shell.state.page.details, { title: msg("Wyniki poleceń", "Command results"), kind: "commands", rows: response.rows || [], emptyText: msg("Brak wyników dla wybranego statusu.", "No command results match the selected status.") }); sync(shell); });
    }
    // #423: node-scoped Nessus findings from the #422 backend read contract.
    var VULN_STATUS = {
        not_imported: ["Brak zaimportowanych danych Nessus. Stan podatności jest nieznany.", "No Nessus data has been imported. Vulnerability state is unknown."],
        error: ["Import danych Nessus nie powiódł się. Stan podatności jest nieznany.", "Nessus data import failed. Vulnerability state is unknown."],
        host_unmatched: ["Nie znaleziono tego hosta w danych Nessus. Stan podatności jest nieznany.", "This host was not found in the Nessus data. Vulnerability state is unknown."],
        ambiguous: ["Nazwa hosta pasuje do wielu wpisów Nessus. Brak jednoznacznego dopasowania.", "The host name matches several Nessus entries. No unambiguous match."],
        stale: ["Ostatni skan tego hosta jest nieaktualny. Wyniki mogą nie odpowiadać bieżącemu stanowi.", "The latest scan of this host is stale. Results may not reflect the current state."],
        no_findings: ["Ostatni skan nie wykazał podatności.", "The latest scan reported no vulnerabilities."],
        available: ["Wykryto podatności w ostatnim skanie.", "Vulnerabilities were found in the latest scan."]
    };
    var RISK_ORDER = ["critical", "high", "medium", "low", "info"];
    var RISK_LABELS = { critical: ["Krytyczne", "Critical"], high: ["Wysokie", "High"], medium: ["Średnie", "Medium"], low: ["Niskie", "Low"], info: ["Info", "Info"] };
    function riskLabel(risk) { var label = RISK_LABELS[risk]; return label ? msg(label[0], label[1]) : String(risk || "—"); }
    function formatDate(value) { if (!value) return "—"; var date = new Date(value); return isNaN(date.getTime()) ? String(value) : date.toLocaleString(); }
    function loadVulnerabilities(shell, force) {
        var nodeId = node(shell);
        if (!force && vuln.nodeId === nodeId && (vuln.data || vuln.error || vuln.loading)) return;
        var sequence = ++vuln.sequence;
        vuln.nodeId = nodeId; vuln.data = null; vuln.error = null; vuln.loading = true;
        shell.api("vulnerabilities", { nodeId: nodeId, detail: "1" }).then(function (response) {
            if (sequence !== vuln.sequence || node(shell) !== nodeId) return;
            vuln.loading = false; vuln.data = response;
            if (mode === "vulnerabilities") shell.render();
        }).catch(function (error) {
            if (sequence !== vuln.sequence || node(shell) !== nodeId) return;
            vuln.loading = false; vuln.error = error && error.message || String(error);
            if (mode === "vulnerabilities") shell.render();
        });
    }
    function vulnerabilityRows() {
        var host = vuln.data && vuln.data.host;
        var rows = host && Array.isArray(host.findings) ? host.findings.slice() : [];
        if (!vuln.showExcluded) rows = rows.filter(function (row) { return row.excluded !== true && row.repaired !== true; });
        if (vuln.risk) rows = rows.filter(function (row) { return row.risk === vuln.risk; });
        if (vuln.exploit) rows = rows.filter(function (row) { return (row.exploit === true) === (vuln.exploit === "yes"); });
        if (vuln.sort === "score") rows.sort(function (a, b) { return (b.score || 0) - (a.score || 0) || RISK_ORDER.indexOf(a.risk) - RISK_ORDER.indexOf(b.risk); });
        else rows.sort(function (a, b) { return RISK_ORDER.indexOf(a.risk) - RISK_ORDER.indexOf(b.risk) || (b.score || 0) - (a.score || 0); });
        return rows;
    }
    function vulnerabilitySelect(shell, title, value, options, onChange) {
        var label = shell.element("label", "mc-script-form-row");
        label.appendChild(shell.element("span", "mc-script-form-label", title));
        var select = document.createElement("select");
        options.forEach(function (option) { var item = document.createElement("option"); item.value = option[0]; item.textContent = option[1]; select.appendChild(item); });
        select.value = value; select.onchange = function () { onChange(select.value); };
        label.appendChild(select);
        return label;
    }
    function vulnerabilityDetails(row) {
        var fields = row.fields || {};
        return JSON.stringify({ meshTable: true, title: msg("Szczegóły podatności", "Vulnerability details"), columns: ["Field", "Value"], rows: Object.keys(fields).map(function (key) { return { Field: key, Value: String(fields[key] == null ? "" : fields[key]) }; }).concat([{ Field: "Occurrences", Value: String(row.occurrences || 1) }])
            .concat(row.repaired && row.repair ? [{ Field: msg("Naprawione", "Repaired"), Value: (row.repair.value || (row.repair.repairedAt ? formatDate(row.repair.repairedAt) : "—")) + (row.repair.by ? " (" + row.repair.by + ")" : "") + (row.repair.source === "portal" ? msg(" — z portalu, ukryte do następnego skanu", " — from the portal, hidden until the next scan") : msg(" — z CSV", " — from CSV")) }] : [])
            .concat(row.excluded ? [{ Field: msg("Wykluczenie", "Exclusion"), Value: (row.exclusion && row.exclusion.reason || "—") + (row.exclusion && row.exclusion.expires ? " (" + row.exclusion.expires + ")" : "") }] : [])
            .concat(row.note ? [{ Field: msg("Opis", "Description"), Value: row.note.reason }] : [])
            .concat(row.remediation ? [{ Field: msg("Naprawa", "Remediation"), Value: row.remediation.scriptPath }] : [])
            .concat(row.remediation && row.remediation.rollbackScriptPath ? [{ Field: msg("Rollback", "Rollback"), Value: row.remediation.rollbackScriptPath }] : []) });
    }
    function remediationLabel(scriptPath) {
        var item = window.SharedDirectoryTree.find(tree, scriptPath);
        return item ? (item.label || item.name || scriptPath) : scriptPath;
    }
    // Per-row Fix / Undo actions open the normal Commands launch (rights,
    // parameters, confirmation) of the pinned My Commands script on this device.
    function appendRemediationButton(shell, cell, scriptPath, label, primaryStyle) {
        var item = window.SharedDirectoryTree.find(tree, scriptPath);
        var button = shell.element("button", "btn btn-sm " + (primaryStyle ? "btn-primary" : "btn-secondary"), label);
        button.type = "button";
        button.title = remediationLabel(scriptPath);
        button.disabled = !item || !filterItem(item);
        if (button.disabled) button.title += " — " + msg("polecenie jest dla Ciebie niedostępne", "the command is not available to you");
        button.onclick = function () {
            mode = "commands";
            treeState.selectedScript = scriptPath;
            tools.saveTreeState(treeState);
            show(shell, item, true);
        };
        cell.appendChild(button);
    }
    function renderRemediation(shell, cell, row) {
        cell.classList.add("mc-vuln-actions");
        if (row.excluded) { cell.textContent = msg("wykluczone", "excluded"); return; }
        if (row.repaired) {
            cell.appendChild(document.createTextNode(msg("naprawione ", "repaired ")));
            if (row.remediation && row.remediation.rollbackScriptPath) appendRemediationButton(shell, cell, row.remediation.rollbackScriptPath, msg("Cofnij", "Undo"), false);
            return;
        }
        if (!row.remediation) { cell.textContent = row.note ? row.note.reason : "—"; return; }
        appendRemediationButton(shell, cell, row.remediation.scriptPath, msg("Napraw", "Fix"), true);
        if (row.remediation.rollbackScriptPath) appendRemediationButton(shell, cell, row.remediation.rollbackScriptPath, msg("Cofnij", "Undo"), false);
    }
    function vulnerabilities(shell) {
        primary(shell, document.createElement("div"));
        loadVulnerabilities(shell, false);
        var data = vuln.data, host = data && data.host, counts = host && host.counts || {};
        var items = [{ key: "", title: msg("Wszystkie", "All"), icon: VULN_ICON, badge: host ? host.findingsCount : null }].concat(RISK_ORDER.map(function (risk) {
            return { key: risk, title: riskLabel(risk), icon: VULN_ICON, badge: host ? counts[risk] || 0 : null };
        }));
        window.SharedResultsView.mountStatus(shell.state.page.secondary, { selected: vuln.risk, items: items, onSelect: function (value) { vuln.risk = value; vuln.page = 1; shell.render(); } });
        var details = shell.state.page.details; details.innerHTML = "";
        if (vuln.loading || (!data && !vuln.error)) { details.appendChild(shell.card(msg("Podatności", "Vulnerabilities"), msg("Wczytywanie danych Nessus…", "Loading Nessus data…"))); sync(shell); return; }
        if (vuln.error) { var failed = shell.card(msg("Podatności", "Vulnerabilities"), msg("Nie można odczytać podatności: ", "Cannot read vulnerabilities: ") + vuln.error); failed.classList.add("mc-shared-error"); details.appendChild(failed); sync(shell); return; }
        var statusText = VULN_STATUS[data.status] || [data.status, data.status];
        var summary = shell.card((host && host.host) || data.nodeName || msg("Podatności", "Vulnerabilities"), host && data.status === "available" ? "" : msg(statusText[0], statusText[1]));
        summary.classList.add("mc-vulnerability-summary", "mc-vulnerability-status-" + String(data.status || "unknown"));
        if (data.status === "error" || data.status === "ambiguous" || data.status === "host_unmatched" || data.status === "not_imported") summary.classList.add("mc-shared-error");
        var facts = [];
        if (host) {
            facts.push([msg("Host oryginalny", "Host original"), host.hostOriginal || "—"]);
            facts.push([msg("System", "OS"), host.hostOs || "—"]);
            facts.push([msg("Data skanu", "Scan generated"), host.generationDate ? host.generationDate + (host.generatedAt ? "" : msg(" (nieprawidłowa data)", " (invalid date)")) : "—"]);
            facts.push([msg("Liczniki", "Counts"), RISK_ORDER.filter(function (risk) { return risk !== "info"; }).map(function (risk) { return riskLabel(risk) + ": " + (counts[risk] || 0); }).join(" · ")]);
        }
        if (data.import) facts.push([msg("Import danych", "Data imported"), formatDate(data.import.importedAt)]);
        if (data.import && data.import.lastError) facts.push([msg("Ostatni błąd importu", "Last import error"), formatDate(data.import.lastError.at) + " — " + data.import.lastError.reason]);
        // Visible: host and scan date. "View" opens status, counts and import facts.
        if (host) summary.appendChild(shell.element("div", "mc-shared-muted", msg("Data skanu", "Scan generated") + ": " + (host.generationDate || "—")));
        var summaryView = shell.element("button", "btn btn-secondary btn-sm mc-results-view-button mc-vulnerability-summary-view", "View");
        summaryView.type = "button";
        summaryView.onclick = function () {
            var title = (host && host.host) || data.nodeName || msg("Podatności", "Vulnerabilities");
            window.SharedResultsView.openViewer({ title: title }, {
                dialogTitle: title,
                resultValue: function () {
                    return JSON.stringify({ meshTable: true, title: title, columns: ["Field", "Value"], rows: [{ Field: msg("Status", "Status"), Value: msg(statusText[0], statusText[1]) }].concat(facts.map(function (fact) { return { Field: fact[0], Value: String(fact[1]) }; })) });
                }
            });
        };
        summary.appendChild(summaryView);
        details.appendChild(summary);
        if (!host || !host.findingsCount) { sync(shell); return; }
        var controls = shell.element("div", "mc-script-manage-actions");
        controls.appendChild(vulnerabilitySelect(shell, "Exploit", vuln.exploit, [["", msg("Wszystkie", "All")], ["yes", msg("Tak", "Yes")], ["no", msg("Nie", "No")]], function (value) { vuln.exploit = value; vuln.page = 1; shell.render(); }));
        var hiddenCount = (host.excludedCount || 0) + (host.repairedCount || 0);
        if (hiddenCount) controls.appendChild(vulnerabilitySelect(shell, msg("Wykluczone / naprawione", "Excluded / repaired"), vuln.showExcluded ? "show" : "", [["", msg("Ukryj", "Hide") + " (" + hiddenCount + ")"], ["show", msg("Pokaż", "Show")]], function (value) { vuln.showExcluded = value === "show"; vuln.page = 1; shell.render(); }));
        controls.appendChild(vulnerabilitySelect(shell, msg("Sortuj", "Sort"), vuln.sort, [["severity", msg("Ważność", "Severity")], ["score", "Score"]], function (value) { vuln.sort = value; vuln.page = 1; shell.render(); }));
        details.appendChild(controls);
        var rows = vulnerabilityRows();
        var pages = Math.max(1, Math.ceil(rows.length / VULN_PAGE_SIZE));
        vuln.page = Math.min(Math.max(1, vuln.page), pages);
        var tableHost = document.createElement("div"); details.appendChild(tableHost);
        window.SharedResultsView.mountTable(tableHost, {
            kind: "vulnerabilities",
            rows: rows.slice((vuln.page - 1) * VULN_PAGE_SIZE, vuln.page * VULN_PAGE_SIZE),
            filterPlaceholder: msg("Filtruj po nazwie lub ID pluginu", "Filter by plugin name or ID"),
            emptyText: msg("Brak podatności dla wybranych filtrów.", "No vulnerabilities match the selected filters."),
            dialogTitle: msg("Szczegóły podatności", "Vulnerability details"),
            resultValue: vulnerabilityDetails,
            columns: [
                { title: "Risk", value: function (row) { return riskLabel(row.risk); }, className: function (row) { return "mc-vulnerability-risk mc-vulnerability-risk-" + row.risk; } },
                { title: "Plugin Name", value: function (row) { return row.fields && row.fields["Plugin Name"] || "—"; } },
                { title: "Plugin ID", value: function (row) { return row.fields && row.fields["Plugin ID"] || "—"; } },
                { title: "Score", value: function (row) { return row.score == null ? "—" : String(row.score); } },
                { title: "Exploit", value: function (row) { return row.exploit ? msg("Tak", "Yes") : msg("Nie", "No"); } },
                { title: msg("Naprawa", "Fix"), value: function (row) { return row.excluded ? msg("wykluczone", "excluded") : row.repaired ? msg("naprawione", "repaired") : row.remediation ? remediationLabel(row.remediation.scriptPath) : row.note ? row.note.reason : "—"; }, render: function (cell, row) { renderRemediation(shell, cell, row); } }
            ]
        });
        if (pages > 1 || (host.truncated === true)) {
            var pager = shell.element("div", "mc-script-manage-actions");
            var prev = shell.element("button", "btn btn-secondary", "‹"); prev.type = "button"; prev.disabled = vuln.page <= 1; prev.onclick = function () { vuln.page--; shell.render(); };
            var next = shell.element("button", "btn btn-secondary", "›"); next.type = "button"; next.disabled = vuln.page >= pages; next.onclick = function () { vuln.page++; shell.render(); };
            pager.appendChild(prev); pager.appendChild(shell.element("span", "mc-shared-muted", vuln.page + " / " + pages + " (" + rows.length + ")" + (host.truncated ? msg(" — lista skrócona", " — list truncated") : ""))); pager.appendChild(next);
            details.appendChild(pager);
        }
        sync(shell);
    }

    function commands(shell) { primary(shell, shell.state.page.secondary); if (!treeState.selectedScript) { empty(shell); return; } var item = window.SharedDirectoryTree.find(tree, treeState.selectedScript); if (item && filterItem(item)) show(shell, item, false); else { treeState.selectedScript = ""; empty(shell); } }
    function refresh(shell) { if (mode === "vulnerabilities") { loadVulnerabilities(shell, true); shell.render(); return; } var toolbar = shell.state.page && shell.state.page.toolbar; if (toolbar) toolbar.setEnabled("refresh", false); shell.post("refresh", {}).then(function (response) { sourceTree = response.tree || sourceTree; catalog = response.catalog || catalog; tree = buildTree(); if (treeState.selectedScript && !window.SharedDirectoryTree.find(tree, treeState.selectedScript)) treeState.selectedScript = ""; shell.render(); }).catch(function (error) { note(shell, msg("Odświeżanie nie powiodło się", "Refresh failed"), error.message || String(error), true); }).then(function () { if (toolbar) toolbar.setEnabled("refresh", true); }); }

    var module = window.SirkPlatformModuleShell.create({
        key: "mycommands", title: "My Commands", menuTitle: "My Commands", showInMenu: false, order: 150, preset: "mycommands",
        deviceTab: { title: "Commands", pageId: "sirk-platform-mycommands-device-page", topTabId: "MainDevSirkPlatform-Commands" },
        buttons: {
            collapse: { side: "left", order: 10 },
            favorites: { side: "left", order: 20, onClick: function (toolbar) { tools.toggleFavorites(toolbar, function () { mode = "commands"; treeState.selectedScript = ""; module.api.render(); }); } },
            link: false,
            manage: { title: "Edit", side: "left", order: 40, onClick: function (toolbar) { tools.toggleEdit(toolbar, module.api.render); } },
            refresh: { side: "left", order: 50, onClick: function () { refresh(module.api); } },
            multi: { title: "Multi-device execution", side: "left", order: 41, onClick: function (toolbar) { tools.toggleMulti(toolbar, module.api.render); } },
            search: { side: "left", order: 70 }, clear: false, settings: false
        },
        tabs: [], defaultTab: "commands",
        render: function (shell) { siteAdmin = isAdmin(shell); return shell.api("scripts").then(function (response) { sourceTree = response.tree; catalog = response.catalog || []; tree = buildTree(); tools.applyDeepLink(tree, treeState); return mode === "results" ? results(shell) : mode === "vulnerabilities" ? vulnerabilities(shell) : commands(shell); }); }
    });

    module.mountDeviceCommands = function (host, nodeId) { mode = "commands"; status = ""; if (typeof module.onDeviceRefreshEnd === "function") module.onDeviceRefreshEnd(String(nodeId || "")); return module.mount(host, "sirk-device-commands"); };
    window.addEventListener("storage", function (event) { if (event.key === "sirkPortal.language" && module && module.api) module.api.render(); });
    window.SirkPlatformModules.mycommands = module;
}());
