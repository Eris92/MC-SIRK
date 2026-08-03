(function () {
    "use strict";

    var desktopVersion = String(window.__SIRK_PLATFORM_VERSION__ || "0");
    if (window.__sirkDesktopCommandsLoaded === desktopVersion) return;
    window.__sirkDesktopCommandsLoaded = desktopVersion;
    var previousDesktopCommands = document.getElementById("SirkDesktopCommands");
    if (previousDesktopCommands) previousDesktopCommands.remove();

    var state = { data: null, category: "", folder: "", search: "" };
    var TEXT = {
        pl: { title: "Szybkie polecenia", scripts: "Skrypty", search: "Szukaj poleceń…", empty: "Brak poleceń.", loading: "Ładowanie poleceń…", sent: "Polecenie wysłano do agenta…", completed: "Polecenie zostało wykonane.", pending: "Polecenie oczekuje na akceptację.", failed: "Nie udało się wykonać polecenia.", timeout: "Agent nie potwierdził wykonania polecenia.", confirm: "Uruchomić polecenie", required: "Uzupełnij wymagane pola." },
        en: { title: "Quick commands", scripts: "Scripts", search: "Search commands…", empty: "No commands.", loading: "Loading commands…", sent: "Command sent to the agent…", completed: "Command executed.", pending: "Command is waiting for approval.", failed: "Command execution failed.", timeout: "The agent did not confirm command execution.", confirm: "Run command", required: "Complete the required fields." }
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
    function addIcon(host, iconData, kind) {
        if (iconData) {
            var image = document.createElement("img"); image.className = "sirk-quick-command-icon"; image.alt = ""; image.src = iconData; host.appendChild(image); return;
        }
        var icon = element("span", "sirk-quick-command-icon");
        var artwork = { folder: '<path d="M3 6h7l2 2h9v11H3V6Z"/>', network: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>', system: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>', other: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>', script: '<path d="M6 3h9l3 3v15H6V3Z"/><path d="M9 11h6M9 15h6"/>' };
        artwork.powershell = '<path d="M4 5h16v14H4z"/><path d="m8 9 3 3-3 3M13 15h4"/>';
        artwork.cmd = '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m7 10 3 2-3 2M12 15h5"/>';
        artwork.regedit = '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>';
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
                output.push({ kind: "script", path: child.path, label: localized(child, "label") || child.name || child.path, description: localized(child, "description"), iconData: child.iconData || "", requiresApproval: false, confirmExecution: child.confirmExecution === true, variables: child.variables || [] });
            } else flattenScripts(child, output);
        });
        return output;
    }
    function categories(data) {
        var result = [];
        if (data.directExecutionAllowed !== true) return result;
        var scriptGroups = [];
        var looseScripts = [];
        (data.tree && data.tree.children || []).forEach(function (root) {
            if (root.type === "script") looseScripts.push(root);
            else {
                var items = flattenScripts(root, []);
                if (items.length) scriptGroups.push({ key: root.path || root.name, label: localized(root, "label") || root.name || root.path, iconData: root.iconData || "", items: items });
            }
        });
        if (looseScripts.length) scriptGroups.unshift({ key: "__root__", label: text("scripts"), items: flattenScripts({ children: looseScripts }, []) });
        if (scriptGroups.length) result.push({ key: "scripts", label: text("scripts"), groups: scriptGroups, items: flattenScripts(data.tree, []) });
        (data.catalog || []).forEach(function (category) {
            var items = (category.commands || []).map(function (command) { return { kind: "command", iconKind: command.id, commandId: command.id, label: localized(command, "label") || command.label || command.id, description: localized(command, "description") || command.description || "", requiresApproval: false, confirmExecution: command.confirmExecution === true, variables: command.variables || [] }; });
            if (items.length) result.push({ key: "catalog:" + category.key, label: localized(category, "title") || category.title || category.key, iconKind: category.key, items: items });
        });
        return result.filter(function (category) { return category.items.length; });
    }

    function promptValues(item) {
        var values = {};
        var variables = item.variables || [];
        for (var index = 0; index < variables.length; index += 1) {
            var variable = variables[index];
            var label = localized(variable, "label") || variable.label || variable.name;
            var defaultValue = String(variable.defaultValue == null ? "" : variable.defaultValue);
            var value;
            if (variable.control === "switch") {
                value = window.confirm(label);
            } else {
                var choices = (variable.options || []).map(function (choice) { return localized(choice, "label") || choice.label || String(choice.value == null ? choice : choice.value); });
                value = window.prompt(label + (choices.length ? " (" + choices.join(", ") + ")" : ""), defaultValue);
                if (value == null) return { ok: false, cancelled: true, values: {} };
                if (variable.required && !String(value).trim()) return { ok: false, values: values };
            }
            values[variable.name] = value;
        }
        return { ok: true, values: values };
    }

    function submit(item, collect, button, status) {
        var values = collect();
        if (values.cancelled) return;
        if (!values.ok) { status.textContent = text("required"); status.classList.add("is-error"); return; }
        if (item.confirmExecution && !window.confirm(text("confirm") + ' "' + item.label + '"?')) return;
        var node = currentNode();
        var payload = { nodeId: nodeId(), nodeName: node.name || "", variableValues: values.values, confirmedExecution: item.confirmExecution === true, desktopDirect: true, note: "" };
        if (!payload.nodeId) { status.textContent = "Device is not ready."; status.classList.add("is-error"); return; }
        if (item.kind === "command") payload.commandId = item.commandId; else payload.scriptPath = item.path;
        button.disabled = true;
        status.textContent = text("loading");
        status.classList.remove("is-error");
        window.SirkPlatformCore.post("mycommands", "execute", payload).then(function (response) {
            var request = response.request || {};
            var result = request.result || {};
            if (request.status === "pending") { status.textContent = text("pending"); return; }
            status.textContent = text("sent");
            if (result.id) waitForExecution(result.id, status, 0);
        }).catch(function (error) {
            status.textContent = text("failed") + " " + (error.message || String(error));
            status.classList.add("is-error");
        }).then(function () { button.disabled = false; });
    }

    function waitForExecution(id, status, attempt) {
        window.setTimeout(function () {
            window.SirkPlatformCore.api("mycommands", "output", null, { id: id }).then(function (response) {
                if (response.ready) {
                    var failed = ["failed", "error"].indexOf(String(response.status || "").toLowerCase()) >= 0;
                    status.textContent = response.output || text(failed ? "failed" : "completed");
                    status.classList.toggle("is-error", failed);
                    return;
                }
                if (attempt < 20) waitForExecution(id, status, attempt + 1);
                else { status.textContent = text("timeout"); status.classList.add("is-error"); }
            }).catch(function (error) {
                status.textContent = text("failed") + " " + (error.message || String(error));
                status.classList.add("is-error");
            });
        }, attempt ? 750 : 250);
    }

    function selectItem(panel, item, button) {
        var status = panel.querySelector(".sirk-quick-command-status");
        function run(value) {
            submit(value, function () { return promptValues(value); }, button, status);
        }
        status.textContent = "";
        status.classList.remove("is-error");
        if (item.kind !== "script") { run(item); return; }
        button.disabled = true;
        status.textContent = text("loading");
        window.SirkPlatformCore.api("mycommands", "script", null, { path: item.path }).then(function (response) {
            var script = response.script || item;
            status.textContent = "";
            button.disabled = false;
            run({ kind: "script", path: script.path, label: localized(script, "label") || script.label || script.name, description: localized(script, "description") || script.description || "", variables: script.variables || [], requiresApproval: false, confirmExecution: script.confirmExecution === true });
        }).catch(function (error) { button.disabled = false; status.textContent = error.message || String(error); status.classList.add("is-error"); });
    }

    function render(panel) {
        var all = categories(state.data || {});
        if (!all.some(function (category) { return category.key === state.category; })) state.category = all[0] && all[0].key || "";
        var selected = all.find(function (category) { return category.key === state.category; });
        var groups = selected && selected.groups || [];
        if (!groups.some(function (group) { return group.key === state.folder; })) state.folder = groups[0] && groups[0].key || "";
        var selectedGroup = groups.find(function (group) { return group.key === state.folder; });
        var query = state.search.toLowerCase();
        var items = (selectedGroup && selectedGroup.items || selected && selected.items || []).filter(function (item) { return !query || (item.label + " " + item.description).toLowerCase().indexOf(query) >= 0; });
        panel.innerHTML = "";
        var header = element("header");
        header.appendChild(element("strong", "", text("title")));
        var close = element("button", "", "×"); close.type = "button"; close.title = "Close"; header.appendChild(close); panel.appendChild(header);
        var search = document.createElement("input"); search.type = "search"; search.className = "sirk-quick-command-search"; search.placeholder = text("search"); search.value = state.search; panel.appendChild(search);
        var browser = element("div", "sirk-quick-command-browser" + (groups.length ? " has-folders" : "")), nav = element("nav", "sirk-quick-command-categories"), folders = element("nav", "sirk-quick-command-folders"), list = element("section", "sirk-quick-command-items");
        all.forEach(function (category) { var button = element("button", category.key === state.category ? "is-active" : ""); button.type = "button"; addIcon(button, category.iconData, category.iconKind || "folder"); button.appendChild(element("span", "", category.label)); button.onclick = function () { state.category = category.key; state.folder = ""; render(panel); }; nav.appendChild(button); });
        groups.forEach(function (group) { var button = element("button", group.key === state.folder ? "is-active" : ""); button.type = "button"; addIcon(button, group.iconData, "folder"); button.appendChild(element("span", "", group.label)); button.onclick = function () { state.folder = group.key; render(panel); }; folders.appendChild(button); });
        items.forEach(function (item) { var button = element("button"); button.type = "button"; addIcon(button, item.iconData, item.iconKind || "script"); var copy = element("span", "sirk-quick-command-copy"); copy.appendChild(element("strong", "", item.label)); if (item.description) copy.appendChild(element("small", "", item.description)); button.appendChild(copy); button.onclick = function () { selectItem(panel, item, button); }; list.appendChild(button); });
        if (!items.length) list.appendChild(element("p", "", text("empty")));
        browser.appendChild(nav); if (groups.length) browser.appendChild(folders); browser.appendChild(list); panel.appendChild(browser);
        panel.appendChild(element("div", "sirk-quick-command-status"));
        close.onclick = function () { panel.hidden = true; var toggle = document.getElementById("SirkDesktopCommandsButton"); if (toggle) toggle.setAttribute("aria-expanded", "false"); };
        search.oninput = function () { state.search = search.value || ""; render(panel); var next = panel.querySelector(".sirk-quick-command-search"); if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); } };
    }

    function load(panel) {
        if (state.data) { render(panel); return; }
        panel.innerHTML = ""; panel.appendChild(element("div", "sirk-quick-command-loading", text("loading")));
        window.SirkPlatformCore.api("mycommands", "scripts").then(function (response) { state.data = response; render(panel); })
            .catch(function (error) { panel.innerHTML = ""; panel.appendChild(element("div", "sirk-quick-command-status is-error", error.message || String(error))); });
    }

    function install() {
        var stage = document.getElementById("deskarea3x") || document.getElementById("DeskParent");
        if (!stage || document.getElementById("SirkDesktopCommands")) return false;
        stage.classList.add("sirk-desktop-commands-host");
        var wrapper = element("div", "sirk-desktop-commands"); wrapper.id = "SirkDesktopCommands";
        var button = element("button", "sirk-desktop-commands-toggle", "›_"); button.id = "SirkDesktopCommandsButton"; button.type = "button"; button.title = text("title"); button.setAttribute("aria-expanded", "false");
        var panel = element("aside", "sirk-desktop-commands-panel"); panel.id = "SirkDesktopCommandsPanel"; panel.hidden = true;
        wrapper.appendChild(button); wrapper.appendChild(panel); stage.appendChild(wrapper);
        button.onclick = function () { panel.hidden = !panel.hidden; button.setAttribute("aria-expanded", panel.hidden ? "false" : "true"); if (!panel.hidden) load(panel); };
        return true;
    }

    new MutationObserver(install).observe(document.documentElement, { childList: true, subtree: true });
    install();
}());
