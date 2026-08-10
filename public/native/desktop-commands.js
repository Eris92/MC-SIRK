(function () {
    "use strict";

    var desktopVersion = String(window.__SIRK_PLATFORM_VERSION__ || "0");
    if (window.__sirkDesktopCommandsLoaded === desktopVersion) return;
    window.__sirkDesktopCommandsLoaded = desktopVersion;
    var previousDesktopCommands = document.getElementById("SirkDesktopCommands");
    if (previousDesktopCommands) previousDesktopCommands.remove();

    var PREFERENCES_KEY = "sirkPlatform.mycommands.preferences";

    function readPreferences() {
        try {
            var value = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) || "{}");
            return value && typeof value === "object" && !Array.isArray(value) ? value : {};
        } catch (error) { return {}; }
    }
    function writePreferences(values) {
        try {
            var current = readPreferences();
            Object.keys(values || {}).forEach(function (key) { current[key] = values[key]; });
            window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(current));
        } catch (error) {}
    }

    var preferences = readPreferences();
    var state = {
        data: null,
        category: "",
        search: "",
        searchVisible: false,
        favoritesOnly: preferences.quickFavoritesOnly === true,
        collapsed: preferences.quickCollapsed === true,
        detailsCollapsed: preferences.quickDetailsCollapsed === true,
        outputAttention: false,
        outputPending: false,
        expanded: {},
        detail: null,
        output: "",
        outputError: false,
        refreshing: false
    };

    var TEXT = {
        pl: {
            title: "Szybkie polecenia", scripts: "Skrypty", search: "Szukaj poleceń…",
            empty: "Brak poleceń.", emptyFavorites: "Brak ulubionych poleceń.", variables: "Zmienne",
            run: "Uruchom", loading: "Ładowanie poleceń…", refreshed: "Lista poleceń została odświeżona.",
            sent: "Polecenie wysłano do agenta…", completed: "Polecenie zostało wykonane.",
            pending: "Polecenie oczekuje na akceptację.", failed: "Nie udało się wykonać polecenia.",
            disconnected: "Quick commands wymagają aktywnego połączenia z pulpitem.",
            timeout: "Agent nie potwierdził wykonania polecenia.", confirm: "Uruchomić polecenie",
            required: "Uzupełnij wymagane pola.", collapse: "Zwiń kategorie", expand: "Rozwiń kategorie",
            hideDetails: "Ukryj wynik", showDetails: "Pokaż wynik",
            favorites: "Pokaż ulubione", showAll: "Pokaż wszystkie", refresh: "Odśwież", close: "Zamknij"
        },
        en: {
            title: "Quick commands", scripts: "Scripts", search: "Search commands…",
            empty: "No commands.", emptyFavorites: "No favorite commands.", variables: "Variables",
            run: "Run", loading: "Loading commands…", refreshed: "Command list refreshed.",
            sent: "Command sent to the agent…", completed: "Command executed.",
            pending: "Command is waiting for approval.", failed: "Command execution failed.",
            disconnected: "Quick commands require an active Desktop connection.",
            timeout: "The agent did not confirm command execution.", confirm: "Run command",
            required: "Complete the required fields.", collapse: "Collapse categories", expand: "Expand categories",
            hideDetails: "Hide output", showDetails: "Show output",
            favorites: "Show favorites", showAll: "Show all", refresh: "Refresh", close: "Close"
        }
    };

    function language() {
        try { return localStorage.getItem("sirkPortal.language") === "en" ? "en" : "pl"; }
        catch (error) { return document.documentElement.lang === "en" ? "en" : "pl"; }
    }
    function text(key) { return TEXT[language()][key] || key; }
    function localized(item, field) {
        var locale = item && item.locales && item.locales[language()];
        return locale && locale[field] || item && item[field] || "";
    }
    function currentNode() { return window.currentNode || window.xxcurrentNode || {}; }
    function desktopConnected() { return !!(window.desktop && Number(window.desktop.State) === 3); }
    function nodeId() {
        var node = currentNode();
        return String(node._id || node.id || node.nodeid || window.selectedNode || "");
    }
    function element(tag, className, value) {
        var result = document.createElement(tag);
        if (className) result.className = className;
        if (value != null) result.textContent = value;
        return result;
    }
    function protectInput(control) {
        ["keydown", "keypress", "keyup"].forEach(function (eventName) {
            control.addEventListener(eventName, function (event) { event.stopPropagation(); });
        });
        return control;
    }
    function favoritePaths() {
        var value = readPreferences();
        return Array.isArray(value.favorites) ? value.favorites.map(String) : [];
    }
    function isFavorite(item) {
        return !!(item && item.path && favoritePaths().indexOf(String(item.path)) >= 0);
    }
    function writeDetailsCollapsed(value) {
        state.detailsCollapsed = value === true;
        if (!state.detailsCollapsed) state.outputAttention = false;
        writePreferences({ quickDetailsCollapsed: state.detailsCollapsed });
    }
    function toolbarSvg(path) {
        return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
    }
    function statusNode(panel) { return panel && panel.querySelector(".sirk-quick-command-status"); }
    function transientOutput(value) {
        return /^(Ładowanie poleceń|Loading commands|Polecenie wysłano do agenta|Command sent to the agent)/i.test(String(value || "").trim());
    }
    function syncOutputAttention(panel) {
        var button = panel && panel.querySelector('.sirk-quick-command-details-toggle,[data-sirk-toolbar-key="details"]');
        if (button) button.classList.toggle("has-output-attention", state.outputAttention === true);
    }
    function setOutput(panel, value, isError, executionOutput) {
        var next = String(value == null ? "" : value);
        var changed = next !== state.output;
        var tracked = executionOutput === true;
        state.output = next;
        state.outputError = isError === true;
        if (!next) {
            state.outputPending = false;
            state.outputAttention = false;
        } else if (tracked && transientOutput(next)) {
            state.outputPending = true;
        } else if (tracked) {
            if (state.detailsCollapsed && (state.outputPending || changed)) state.outputAttention = true;
            state.outputPending = false;
        }
        if (!state.detailsCollapsed) state.outputAttention = false;
        var status = statusNode(panel);
        if (status) {
            status.textContent = state.output;
            status.classList.toggle("is-error", state.outputError);
        }
        syncOutputAttention(panel);
    }
    function applyQuickNav(button, active) {
        if (!button) return;
        active = active === true;
        button.classList.toggle("active", active);
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
        if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.nav === "function") {
            window.MeshThemeAdapter.nav(button);
        }
    }

    function addIcon(host, iconData, kind, tone) {
        if (iconData) {
            var image = document.createElement("img");
            image.className = "sirk-quick-command-icon";
            image.alt = "";
            image.src = iconData;
            host.appendChild(image);
            return;
        }
        var icon = element("span", "sirk-quick-command-icon" + (tone ? " sirk-command-icon-" + tone : ""));
        var artwork = {
            folder: '<path d="M3 6h7l2 2h9v11H3V6Z"/>',
            scripts: '<path d="M6 3h9l3 3v15H6V3Z"/><path d="m9 11 2 2-2 2M13 15h3"/>',
            network: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
            system: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
            other: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>',
            script: '<path d="M6 3h9l3 3v15H6V3Z"/><path d="M9 11h6M9 15h6"/>'
        };
        artwork.powershell = '<path d="M4 5h16v14H4z"/><path d="m8 9 3 3-3 3M13 15h4"/>';
        artwork.cmd = '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m7 10 3 2-3 2M12 15h5"/>';
        artwork.regedit = artwork.other;
        artwork.secpol = '<path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/><path d="m9 12 2 2 4-5"/>';
        artwork.firewall = '<path d="M3 5h18v14H3zM3 10h18M8 5v5M16 10v4M8 14v5"/>';
        artwork.mmc = '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h5M7 16h8"/>';
        artwork.events = '<path d="M5 3h14v18H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>';
        artwork.services = '<circle cx="12" cy="12" r="3"/><path d="M19 12h2M3 12h2M12 3v2M12 19v2M17 7l1.5-1.5M5.5 18.5 7 17M17 17l1.5 1.5M5.5 5.5 7 7"/>';
        artwork.devices = '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>';
        artwork.taskmgr = '<path d="M3 12h4l2-5 4 10 2-5h6"/>';
        artwork.printers = '<path d="M6 9V3h12v6M6 18H4V9h16v9h-2M7 14h10v7H7z"/>';
        artwork.certlm = '<circle cx="12" cy="9" r="5"/><path d="m9 14-1 7 4-2 4 2-1-7"/>';
        artwork.certcu = '<circle cx="12" cy="8" r="4"/><path d="M5 21c1-5 3-7 7-7s6 2 7 7"/>';
        artwork.indexing = '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M10 7v6M7 10h6"/>';
        artwork.cleanup = '<path d="M5 7h14M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>';
        artwork.flushdns = '<path d="M4 6h16v12H4z"/><path d="M8 10h8M8 14h5M18 3v5M15.5 5.5 18 8l2.5-2.5"/>';
        artwork["network-settings"] = '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4M7 9h10M7 13h6"/><circle cx="18" cy="15" r="3"/><path d="M18 10v2M18 18v2M13 15h2M21 15h2"/>';
        artwork["network-adapter-properties"] = artwork["network-settings"];
        artwork.dns = artwork.network;
        artwork.port = '<path d="M4 8h16v8H4zM8 12h.01M12 12h.01M16 12h.01"/>';
        artwork.netstat = '<path d="M4 17V7M9 17v-5M14 17V4M19 17v-8"/>';
        artwork["netstat-port"] = '<path d="M4 5h16v14H4zM8 9h8M8 13h5"/><circle cx="17" cy="16" r="2"/>';
        icon.innerHTML = '<svg viewBox="0 0 24 24">' + (artwork[kind] || artwork.script) + '</svg>';
        host.appendChild(icon);
    }

    function flattenScripts(node, output) {
        (node && node.children || []).forEach(function (child) {
            if (child.type === "script") {
                output.push({
                    kind: "script", path: child.path,
                    label: localized(child, "label") || child.name || child.path,
                    description: localized(child, "description"), iconData: child.iconData || "",
                    requiresApproval: false, confirmExecution: child.confirmExecution === true,
                    variables: child.variables || []
                });
            } else flattenScripts(child, output);
        });
        return output;
    }
    function scriptGroup(node) {
        var children = (node.children || []).filter(function (child) { return child.type !== "script"; }).map(scriptGroup).filter(Boolean);
        var items = (node.children || []).filter(function (child) { return child.type === "script"; }).map(function (child) {
            return {
                kind: "script", path: child.path,
                label: localized(child, "label") || child.name || child.path,
                description: localized(child, "description"), iconData: child.iconData || "",
                requiresApproval: false, confirmExecution: child.confirmExecution === true,
                variables: child.variables || []
            };
        });
        if (!items.length && !children.length) return null;
        return {
            key: node.path || node.name,
            label: localized(node, "label") || node.name || node.path,
            iconData: node.iconData || "", items: items, children: children
        };
    }
    function filterGroup(group) {
        var items = (group.items || []).filter(isFavorite);
        var children = (group.children || []).map(filterGroup).filter(Boolean);
        if (!items.length && !children.length) return null;
        return { key: group.key, label: group.label, iconData: group.iconData || "", items: items, children: children };
    }
    function categories(data) {
        var result = [];
        if (data.directExecutionAllowed !== true) return result;
        var scriptGroups = [];
        var looseScripts = [];
        (data.tree && data.tree.children || []).forEach(function (root) {
            if (root.type === "script") looseScripts.push(root);
            else {
                var group = scriptGroup(root);
                if (group) scriptGroups.push(group);
            }
        });
        if (looseScripts.length) {
            scriptGroups.unshift({ key: "__root__", label: text("scripts"), items: flattenScripts({ children: looseScripts }, []), children: [] });
        }
        if (scriptGroups.length) {
            result.push({ key: "scripts", label: text("scripts"), iconKind: "scripts", groups: scriptGroups, items: flattenScripts(data.tree, []), tone: "scripts" });
        }
        (data.catalog || []).forEach(function (category) {
            var items = (category.commands || []).filter(function (command) {
                return command.showOnDesktop === true;
            }).map(function (command) {
                return {
                    kind: "command", iconKind: command.id, commandId: command.id,
                    path: "@command/" + category.key + "/" + command.id,
                    label: localized(command, "label") || command.label || command.id,
                    description: localized(command, "description") || command.description || "",
                    requiresApproval: false, confirmExecution: command.confirmExecution === true,
                    variables: command.variables || []
                };
            });
            if (items.length) {
                result.push({
                    key: "catalog:" + category.key,
                    label: localized(category, "title") || category.title || category.key,
                    iconKind: category.key, tone: ["network", "system"].indexOf(category.key) >= 0 ? category.key : "other", items: items
                });
            }
        });
        if (state.favoritesOnly) {
            result = result.map(function (category) {
                return {
                    key: category.key, label: category.label,
                    iconKind: category.iconKind, iconData: category.iconData,
                    groups: (category.groups || []).map(filterGroup).filter(Boolean),
                    items: (category.items || []).filter(isFavorite)
                };
            });
        }
        return result.filter(function (category) {
            return (category.items && category.items.length) || (category.groups && category.groups.length);
        });
    }

    function submit(item, values, button, panel, confirmedExecution) {
        if (!desktopConnected()) {
            setOutput(panel, text("disconnected"), true, false);
            return;
        }
        if (item.confirmExecution && confirmedExecution !== true) {
            setOutput(panel, "Native execution confirmation is required.", true, false);
            return;
        }
        var node = currentNode();
        var payload = {
            nodeId: nodeId(), nodeName: node.name || "", variableValues: values || {},
            confirmedExecution: confirmedExecution === true, desktopDirect: true, note: ""
        };
        if (!payload.nodeId) {
            setOutput(panel, "Device is not ready.", true, false);
            return;
        }
        if (item.kind === "command") payload.commandId = item.commandId;
        else payload.scriptPath = item.path;
        if (button) button.disabled = true;
        setOutput(panel, text("loading"), false, true);
        window.SirkPlatformCore.post("mycommands", "execute", payload).then(function (response) {
            var request = response.request || {};
            var result = request.result || {};
            if (request.status === "pending") {
                setOutput(panel, text("pending"), false, true);
                return;
            }
            setOutput(panel, text("sent"), false, true);
            if (result.id) waitForExecution(result.id, panel, 0);
        }).catch(function (error) {
            setOutput(panel, text("failed") + " " + (error.message || String(error)), true, true);
        }).then(function () {
            if (button) button.disabled = false;
        });
    }

    function confirmAndSubmit(item, values, trigger, panel) {
        if (!item.confirmExecution) {
            writeDetailsCollapsed(false);
            submit(item, values, null, panel, false);
            return Promise.resolve(true);
        }
        if (!window.SharedScriptTools || typeof window.SharedScriptTools.openConfirmationDialog !== "function") {
            setOutput(panel, "Native MeshCentral confirmation dialog is unavailable.", true, false);
            return Promise.resolve(false);
        }
        return window.SharedScriptTools.openConfirmationDialog({
            title: text("confirm"),
            message: text("confirm") + ' "' + item.label + '"?',
            trigger: trigger,
            primaryLabel: item.requiresApproval ? "Request" : text("run")
        }).then(function (confirmed) {
            if (confirmed !== true) return false;
            writeDetailsCollapsed(false);
            submit(item, values, null, panel, true);
            return true;
        }).catch(function (error) {
            setOutput(panel, error.message || String(error), true, false);
            return false;
        });
    }

    function waitForExecution(id, panel, attempt) {
        window.setTimeout(function () {
            window.SirkPlatformCore.api("mycommands", "output", null, { id: id }).then(function (response) {
                if (response.ready) {
                    var failed = ["failed", "error"].indexOf(String(response.status || "").toLowerCase()) >= 0;
                    setOutput(panel, response.output || text(failed ? "failed" : "completed"), failed, true);
                    return;
                }
                if (attempt < 20) waitForExecution(id, panel, attempt + 1);
                else setOutput(panel, text("timeout"), true, true);
            }).catch(function (error) {
                setOutput(panel, text("failed") + " " + (error.message || String(error)), true, true);
            });
        }, attempt ? 750 : 250);
    }

    function selectItem(panel, item, button) {
        function use(value) {
            state.detail = value;
            state.output = "";
            state.outputError = false;
            state.outputPending = false;
            state.outputAttention = false;
            render(panel);
            if (!(value.variables || []).length) {
                confirmAndSubmit(value, {}, button, panel);
                return;
            }
            if (!window.SharedScriptTools || typeof window.SharedScriptTools.openParameterDialog !== "function") {
                setOutput(panel, "Native MeshCentral parameter dialog is unavailable.", true, false);
                return;
            }
            window.SharedScriptTools.openParameterDialog({
                item: value, trigger: button,
                primaryLabel: value.requiresApproval ? "Request" : text("run")
            }).then(function (values) {
                if (values == null) return;
                return confirmAndSubmit(value, values, button, panel);
            }).catch(function (error) {
                setOutput(panel, error.message || String(error), true, false);
            });
        }
        setOutput(panel, "", false, false);
        if (item.kind !== "script") {
            use(item);
            return;
        }
        button.disabled = true;
        setOutput(panel, text("loading"), false, false);
        window.SirkPlatformCore.api("mycommands", "script", null, { path: item.path }).then(function (response) {
            var script = response.script || item;
            button.disabled = false;
            use({
                kind: "script", path: script.path,
                label: localized(script, "label") || script.label || script.name,
                description: localized(script, "description") || script.description || "",
                variables: script.variables || [], requiresApproval: false,
                confirmExecution: script.confirmExecution === true
            });
        }).catch(function (error) {
            button.disabled = false;
            setOutput(panel, error.message || String(error), true, false);
        });
    }

    function closePanel(panel) {
        panel.hidden = true;
        var toggle = document.getElementById("SirkDesktopCommandsButton");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
    }

    function refresh(panel) {
        if (state.refreshing) return;
        state.refreshing = true;
        setOutput(panel, text("loading"), false, false);
        render(panel);
        window.SirkPlatformCore.api("mycommands", "scripts", null, { surface: "desktop" }).then(function (response) {
            state.data = response;
            state.refreshing = false;
            state.detail = null;
            state.output = text("refreshed");
            state.outputError = false;
            state.outputPending = false;
            state.outputAttention = false;
            render(panel);
        }).catch(function (error) {
            state.refreshing = false;
            state.output = error.message || String(error);
            state.outputError = true;
            state.outputPending = false;
            state.outputAttention = false;
            render(panel);
        });
    }

    function mountToolbar(panel, host) {
        if (!window.SharedToolbar || !window.SharedToolbarConfig) {
            var close = element("button", "sirk-quick-command-fallback-close", "×");
            close.type = "button";
            close.title = text("close");
            close.onclick = function () { closePanel(panel); };
            host.appendChild(close);
            return null;
        }

        var toolbar = window.SharedToolbar.mount({
            container: host,
            preset: "mycommands",
            buttons: {
                collapse: {
                    title: state.collapsed ? text("expand") : text("collapse"),
                    side: "left", order: 10,
                    onClick: function () { state.collapsed = !state.collapsed; writePreferences({ quickCollapsed: state.collapsed }); render(panel); }
                },
                favorites: {
                    title: state.favoritesOnly ? text("showAll") : text("favorites"),
                    side: "left", order: 20,
                    onClick: function () {
                        state.favoritesOnly = !state.favoritesOnly;
                        writePreferences({ quickFavoritesOnly: state.favoritesOnly });
                        state.category = "";
                        state.detail = null;
                        state.output = "";
                        state.outputError = false;
                        state.outputPending = false;
                        state.outputAttention = false;
                        render(panel);
                    }
                },
                link: false,
                manage: false,
                refresh: {
                    title: text("refresh"), side: "left", order: 50,
                    onClick: function () { refresh(panel); }
                },
                multi: false,
                search: { title: text("search"), side: "left", order: 70 },
                clear: false,
                settings: false
            },
            customButtons: [{
                key: "details", title: state.detailsCollapsed ? text("showDetails") : text("hideDetails"), side: "left", order: 65,
                icon: toolbarSvg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16M18 9h.01M18 13h.01"/>'),
                onClick: function () { writeDetailsCollapsed(!state.detailsCollapsed); render(panel); }
            }, {
                key: "close", title: text("close"), side: "right", order: 200,
                icon: toolbarSvg('<path d="m6 6 12 12M18 6 6 18"/>'),
                onClick: function () { closePanel(panel); }
            }],
            handlers: {
                onSearch: function (value) {
                    state.search = String(value || "");
                    state.searchVisible = true;
                    render(panel);
                }
            }
        });

        toolbar.setTitle("collapse", state.collapsed ? text("expand") : text("collapse"));
        toolbar.setActive("collapse", state.collapsed);
        var collapseDefinition = window.SharedToolbarConfig.definitions && window.SharedToolbarConfig.definitions.collapse;
        if (collapseDefinition) toolbar.setIcon("collapse", state.collapsed ? collapseDefinition.icon : collapseDefinition.expandIcon);
        toolbar.setTitle("favorites", state.favoritesOnly ? text("showAll") : text("favorites"));
        toolbar.setActive("favorites", state.favoritesOnly);
        toolbar.setTitle("refresh", text("refresh"));
        toolbar.setEnabled("refresh", !state.refreshing);
        toolbar.setTitle("details", state.detailsCollapsed ? text("showDetails") : text("hideDetails"));
        toolbar.setActive("details", !state.detailsCollapsed);
        if (toolbar.buttons.details) {
            toolbar.buttons.details.classList.add("sirk-quick-command-details-toggle");
            toolbar.buttons.details.classList.toggle("has-output-attention", state.outputAttention === true);
        }
        toolbar.setTitle("search", text("search"));
        toolbar.setActive("search", state.searchVisible);
        toolbar.setTitle("close", text("close"));

        if (toolbar.buttons.search) {
            toolbar.buttons.search.onclick = function () {
                state.searchVisible = !state.searchVisible;
                if (!state.searchVisible) state.search = "";
                render(panel);
            };
        }
        toolbar.state.search = state.search;
        toolbar.searchInput.value = state.search;
        protectInput(toolbar.searchInput);
        toolbar.showSearch(state.searchVisible, false);
        if (state.searchVisible) {
            window.setTimeout(function () {
                if (!toolbar.searchInput.isConnected) return;
                toolbar.searchInput.focus();
                toolbar.searchInput.setSelectionRange(toolbar.searchInput.value.length, toolbar.searchInput.value.length);
            }, 0);
        }
        return toolbar;
    }

    function render(panel) {
        var all = categories(state.data || {});
        if (!all.some(function (category) { return category.key === state.category; })) {
            state.category = all[0] && all[0].key || "";
        }
        var selected = all.find(function (category) { return category.key === state.category; });
        var groups = selected && selected.groups || [];
        var query = state.search.toLowerCase();

        panel.innerHTML = "";
        var header = element("header", "sirk-quick-command-header");
        header.appendChild(element("strong", "", text("title")));
        panel.appendChild(header);

        var toolbarHost = element("div", "sirk-quick-command-toolbar-host");
        panel.appendChild(toolbarHost);
        mountToolbar(panel, toolbarHost);

        var browser = element("div", "sirk-quick-command-browser mc-shared-layout");
        browser.classList.toggle("is-collapsed", state.collapsed);
        browser.classList.toggle("is-details-collapsed", state.detailsCollapsed);
        var nav = element("nav", "sirk-quick-command-categories mc-shared-primary");
        var tree = element("nav", "sirk-quick-command-tree mc-shared-secondary");
        var details = element("section", "sirk-quick-command-details mc-shared-details");

        all.forEach(function (category) {
            var activeCategory = category.key === state.category;
            var button = element("button", "");
            button.type = "button";
            button.title = category.label;
            addIcon(button, category.iconData, category.iconKind || "folder", category.tone);
            button.appendChild(element("span", "sirk-quick-command-label", category.label));
            button.onclick = function () {
                state.category = category.key;
                state.detail = null;
                state.output = "";
                state.outputError = false;
                state.outputPending = false;
                state.outputAttention = false;
                render(panel);
            };
            applyQuickNav(button, activeCategory);
            nav.appendChild(button);
        });

        function matches(item) {
            return !query || (item.label + " " + item.description).toLowerCase().indexOf(query) >= 0;
        }
        function groupMatches(group) {
            return !query || (group.items || []).some(matches) || (group.children || []).some(groupMatches);
        }
        function appendItem(item, depth) {
            if (!matches(item)) return;
            var selectedItem = state.detail && (state.detail.path || state.detail.commandId) === (item.path || item.commandId);
            var button = element("button", "");
            button.type = "button";
            button.title = item.label;
            button.style.setProperty("--sdc-depth", String(depth));
            addIcon(button, item.iconData, item.iconKind || "script", selected && selected.tone);
            var copy = element("span", "sirk-quick-command-copy");
            copy.appendChild(element("strong", "sirk-quick-command-label", item.label));
            button.appendChild(copy);
            button.onclick = function () { selectItem(panel, item, button); };
            applyQuickNav(button, selectedItem);
            tree.appendChild(button);
        }
        function appendGroups(entries, depth) {
            entries.forEach(function (group) {
                if (!groupMatches(group)) return;
                var hasContents = (group.children && group.children.length) || (group.items && group.items.length);
                var expanded = query || state.expanded[group.key];
                var button = element("button", "sirk-quick-command-folder");
                button.type = "button";
                button.title = group.label;
                button.style.setProperty("--sdc-depth", String(depth));
                var arrow = element("span", "sirk-quick-command-arrow", hasContents ? (expanded ? "▼" : "▶") : "");
                button.appendChild(arrow);
                addIcon(button, group.iconData, "folder", selected && selected.tone);
                button.appendChild(element("span", "sirk-quick-command-label", group.label));
                button.onclick = function () {
                    if (hasContents) state.expanded[group.key] = !state.expanded[group.key];
                    render(panel);
                };
                applyQuickNav(button, false);
                tree.appendChild(button);
                if (expanded) {
                    (group.items || []).forEach(function (item) { appendItem(item, depth + 1); });
                    appendGroups(group.children, depth + 1);
                }
            });
        }

        if (groups.length) appendGroups(groups, 0);
        else (selected && selected.items || []).forEach(function (item) { appendItem(item, 0); });
        if (!tree.children.length) tree.appendChild(element("p", "sirk-quick-command-empty", text(state.favoritesOnly ? "emptyFavorites" : "empty")));

        var status = element("div", "sirk-quick-command-status", state.output);
        status.classList.toggle("is-error", state.outputError);
        details.appendChild(status);

        browser.appendChild(nav);
        browser.appendChild(tree);
        browser.appendChild(details);
        panel.appendChild(browser);
    }

    function load(panel) {
        if (state.data) {
            render(panel);
            return;
        }
        state.refreshing = true;
        state.output = text("loading");
        state.outputError = false;
        state.outputPending = false;
        state.outputAttention = false;
        render(panel);
        window.SirkPlatformCore.api("mycommands", "scripts", null, { surface: "desktop" }).then(function (response) {
            state.data = response;
            state.refreshing = false;
            state.output = "";
            state.outputError = false;
            state.outputPending = false;
            state.outputAttention = false;
            render(panel);
        }).catch(function (error) {
            state.refreshing = false;
            state.output = error.message || String(error);
            state.outputError = true;
            state.outputPending = false;
            state.outputAttention = false;
            render(panel);
        });
    }

    function install() {
        var stage = document.getElementById("deskarea3x") || document.getElementById("DeskParent");
        var existing = document.getElementById("SirkDesktopCommands");
        if (existing) {
            syncAvailability(existing);
            return true;
        }
        if (!stage) return false;
        stage.classList.add("sirk-desktop-commands-host");
        var wrapper = element("div", "sirk-desktop-commands");
        wrapper.id = "SirkDesktopCommands";
        var button = element("button", "sirk-desktop-commands-toggle", "›_");
        button.id = "SirkDesktopCommandsButton";
        button.type = "button";
        button.title = text("title");
        button.setAttribute("aria-expanded", "false");
        var panel = element("aside", "sirk-desktop-commands-panel");
        panel.id = "SirkDesktopCommandsPanel";
        panel.hidden = true;
        wrapper.appendChild(button);
        wrapper.appendChild(panel);
        stage.appendChild(wrapper);
        button.onclick = function () {
            if (!desktopConnected()) {
                syncAvailability(wrapper);
                return;
            }
            panel.hidden = !panel.hidden;
            button.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
            if (!panel.hidden) load(panel);
        };
        syncAvailability(wrapper);
        return true;
    }

    function syncAvailability(wrapper) {
        var connected = desktopConnected();
        wrapper.hidden = !connected;
        var panel = wrapper.querySelector(".sirk-desktop-commands-panel");
        var button = wrapper.querySelector(".sirk-desktop-commands-toggle");
        if (!connected && panel) panel.hidden = true;
        if (!connected && button) button.setAttribute("aria-expanded", "false");
    }

    function refreshLifecycle() {
        var existing = document.getElementById("SirkDesktopCommands");
        if (!existing) return install();
        syncAvailability(existing);
        return true;
    }

    window.SirkDesktopCommands = { refresh: refreshLifecycle };
    install();
}());