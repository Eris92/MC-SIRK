(function () {
    "use strict";

    var desktopVersion = String(window.__SIRK_PLATFORM_VERSION__ || "0");
    if (window.__sirkDesktopCommandsLoaded === desktopVersion) return;
    window.__sirkDesktopCommandsLoaded = desktopVersion;
    if (window.__sirkDesktopCommandsTimer) window.clearInterval(window.__sirkDesktopCommandsTimer);
    var previousDesktopCommands = document.getElementById("SirkDesktopCommands");
    if (previousDesktopCommands) previousDesktopCommands.remove();

    var state = { data: null, category: "", search: "", expanded: {}, detail: null };
    var TEXT = {
        pl: { title: "Szybkie polecenia", scripts: "Skrypty", search: "Szukaj poleceń…", empty: "Brak poleceń.", variables: "Zmienne", run: "Uruchom", loading: "Ładowanie poleceń…", sent: "Polecenie wysłano do agenta…", completed: "Polecenie zostało wykonane.", pending: "Polecenie oczekuje na akceptację.", failed: "Nie udało się wykonać polecenia.", disconnected: "Quick commands wymagają aktywnego połączenia z pulpitem.", timeout: "Agent nie potwierdził wykonania polecenia.", confirm: "Uruchomić polecenie", required: "Uzupełnij wymagane pola." },
        en: { title: "Quick commands", scripts: "Scripts", search: "Search commands…", empty: "No commands.", variables: "Variables", run: "Run", loading: "Loading commands…", sent: "Command sent to the agent…", completed: "Command executed.", pending: "Command is waiting for approval.", failed: "Command execution failed.", disconnected: "Quick commands require an active Desktop connection.", timeout: "The agent did not confirm command execution.", confirm: "Run command", required: "Complete the required fields." }
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
    function scriptGroup(node) {
        var children = (node.children || []).filter(function (child) { return child.type !== "script"; }).map(scriptGroup).filter(Boolean);
        var items = (node.children || []).filter(function (child) { return child.type === "script"; }).map(function (child) {
            return { kind: "script", path: child.path, label: localized(child, "label") || child.name || child.path, description: localized(child, "description"), iconData: child.iconData || "", requiresApproval: false, confirmExecution: child.confirmExecution === true, variables: child.variables || [] };
        });
        if (!items.length && !children.length) return null;
        return { key: node.path || node.name, label: localized(node, "label") || node.name || node.path, iconData: node.iconData || "", items: items, children: children };
    }
    function categories(data) {
        var result = [];
        if (data.directExecutionAllowed !== true) return result;
        var scriptGroups = [];
        var looseScripts = [];
        (data.tree && data.tree.children || []).forEach(function (root) {
            if (root.type === "script") looseScripts.push(root);
            else { var group = scriptGroup(root); if (group) scriptGroups.push(group); }
        });
        if (looseScripts.length) scriptGroups.unshift({ key: "__root__", label: text("scripts"), items: flattenScripts({ children: looseScripts }, []) });
        if (scriptGroups.length) result.push({ key: "scripts", label: text("scripts"), groups: scriptGroups, items: flattenScripts(data.tree, []) });
        (data.catalog || []).forEach(function (category) {
            var items = (category.commands || []).filter(function (command) { return command.showOnDesktop === true; }).map(function (command) { return { kind: "command", iconKind: command.id, commandId: command.id, label: localized(command, "label") || command.label || command.id, description: localized(command, "description") || command.description || "", requiresApproval: false, confirmExecution: command.confirmExecution === true, variables: command.variables || [] }; });
            if (items.length) result.push({ key: "catalog:" + category.key, label: localized(category, "title") || category.title || category.key, iconKind: category.key, items: items });
        });
        return result.filter(function (category) { return category.items.length; });
    }

    function variableForm(host, item) {
        var controls = [];
        host.appendChild(element("h3", "", item.label));
        if (item.description) host.appendChild(element("p", "sirk-quick-command-description", item.description));
        host.appendChild(element("h4", "", text("variables")));
        (item.variables || []).forEach(function (variable) {
            var row = element("label", "sirk-quick-command-field");
            var caption = element("span", "", localized(variable, "label") || variable.label || variable.name);
            if (variable.required) caption.textContent += " *";
            row.appendChild(caption);
            var input;
            if (variable.control === "select") {
                input = document.createElement("select");
                (variable.options || []).forEach(function (choice) { var option = document.createElement("option"); option.value = String(choice.value == null ? choice : choice.value); option.textContent = localized(choice, "label") || choice.label || option.value; input.appendChild(option); });
            } else { input = document.createElement("input"); input.type = variable.control === "switch" ? "checkbox" : "text"; }
            if (input.type === "checkbox") input.checked = /^(1|true|yes|tak)$/i.test(String(variable.defaultValue || ""));
            else input.value = String(variable.defaultValue == null ? "" : variable.defaultValue);
            row.appendChild(input); host.appendChild(row); controls.push({ variable: variable, input: input });
        });
        return function () {
            var values = {}, valid = true;
            controls.forEach(function (entry) { var value = entry.input.type === "checkbox" ? entry.input.checked : entry.input.value; values[entry.variable.name] = value; if (entry.variable.required && entry.input.type !== "checkbox" && !String(value).trim()) valid = false; });
            return { ok: valid, values: values };
        };
    }

    function submit(item, collect, button, status) {
        if (!desktopConnected()) { status.textContent = text("disconnected"); status.classList.add("is-error"); return; }
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
        function use(value) {
            if ((value.variables || []).length) { state.detail = value; render(panel); return; }
            state.detail = null;
            submit(value, function () { return { ok: true, values: {} }; }, button, status);
        }
        status.textContent = "";
        status.classList.remove("is-error");
        if (item.kind !== "script") { use(item); return; }
        button.disabled = true;
        status.textContent = text("loading");
        window.SirkPlatformCore.api("mycommands", "script", null, { path: item.path }).then(function (response) {
            var script = response.script || item;
            status.textContent = "";
            button.disabled = false;
            use({ kind: "script", path: script.path, label: localized(script, "label") || script.label || script.name, description: localized(script, "description") || script.description || "", variables: script.variables || [], requiresApproval: false, confirmExecution: script.confirmExecution === true });
        }).catch(function (error) { button.disabled = false; status.textContent = error.message || String(error); status.classList.add("is-error"); });
    }

    function render(panel) {
        var all = categories(state.data || {});
        if (!all.some(function (category) { return category.key === state.category; })) state.category = all[0] && all[0].key || "";
        var selected = all.find(function (category) { return category.key === state.category; });
        var groups = selected && selected.groups || [];
        var query = state.search.toLowerCase();
        panel.innerHTML = "";
        var header = element("header");
        header.appendChild(element("strong", "", text("title")));
        var close = element("button", "", "×"); close.type = "button"; close.title = "Close"; header.appendChild(close); panel.appendChild(header);
        var search = document.createElement("input"); search.type = "search"; search.className = "sirk-quick-command-search"; search.placeholder = text("search"); search.value = state.search; panel.appendChild(search);
        var browser = element("div", "sirk-quick-command-browser"), nav = element("nav", "sirk-quick-command-categories"), tree = element("nav", "sirk-quick-command-tree"), details = element("section", "sirk-quick-command-details");
        all.forEach(function (category) { var button = element("button", category.key === state.category ? "is-active" : ""); button.type = "button"; addIcon(button, category.iconData, category.iconKind || "folder"); button.appendChild(element("span", "", category.label)); button.onclick = function () { state.category = category.key; state.detail = null; render(panel); }; nav.appendChild(button); });
        function matches(item) { return !query || (item.label + " " + item.description).toLowerCase().indexOf(query) >= 0; }
        function groupMatches(group) { return !query || (group.items || []).some(matches) || (group.children || []).some(groupMatches); }
        function appendItem(item, depth) { if (!matches(item)) return; var button = element("button", state.detail && (state.detail.path || state.detail.commandId) === (item.path || item.commandId) ? "is-active" : ""); button.type = "button"; button.style.setProperty("--sdc-depth", String(depth)); addIcon(button, item.iconData, item.iconKind || "script"); var copy = element("span", "sirk-quick-command-copy"); copy.appendChild(element("strong", "", item.label)); button.appendChild(copy); button.onclick = function () { selectItem(panel, item, button); }; tree.appendChild(button); }
        function appendGroups(entries, depth) {
            entries.forEach(function (group) {
                if (!groupMatches(group)) return;
                var hasContents = (group.children && group.children.length) || (group.items && group.items.length);
                var expanded = query || state.expanded[group.key];
                var button = element("button", "sirk-quick-command-folder");
                button.type = "button";
                button.style.setProperty("--sdc-depth", String(depth));
                var arrow = element("span", "sirk-quick-command-arrow", hasContents ? (expanded ? "▼" : "▶") : "");
                button.appendChild(arrow);
                addIcon(button, group.iconData, "folder");
                button.appendChild(element("span", "", group.label));
                button.onclick = function () { if (hasContents) state.expanded[group.key] = !state.expanded[group.key]; render(panel); };
                tree.appendChild(button);
                if (expanded) { (group.items || []).forEach(function (item) { appendItem(item, depth + 1); }); appendGroups(group.children, depth + 1); }
            });
        }
        if (groups.length) appendGroups(groups, 0); else (selected && selected.items || []).forEach(function (item) { appendItem(item, 0); });
        if (!tree.children.length) tree.appendChild(element("p", "", text("empty")));
        if (state.detail && (state.detail.variables || []).length) { var collect = variableForm(details, state.detail); var run = element("button", "sirk-quick-command-submit", "▶ " + text("run")); run.type = "button"; run.onclick = function () { submit(state.detail, collect, run, panel.querySelector(".sirk-quick-command-status")); }; details.appendChild(run); }
        browser.appendChild(nav); browser.appendChild(tree); browser.appendChild(details); panel.appendChild(browser);
        panel.appendChild(element("div", "sirk-quick-command-status"));
        close.onclick = function () { panel.hidden = true; var toggle = document.getElementById("SirkDesktopCommandsButton"); if (toggle) toggle.setAttribute("aria-expanded", "false"); };
        search.oninput = function () { state.search = search.value || ""; render(panel); var next = panel.querySelector(".sirk-quick-command-search"); if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); } };
    }

    function load(panel) {
        if (state.data) { render(panel); return; }
        panel.innerHTML = ""; panel.appendChild(element("div", "sirk-quick-command-loading", text("loading")));
        window.SirkPlatformCore.api("mycommands", "scripts", null, { surface: "desktop" }).then(function (response) { state.data = response; render(panel); })
            .catch(function (error) { panel.innerHTML = ""; panel.appendChild(element("div", "sirk-quick-command-status is-error", error.message || String(error))); });
    }

    function install() {
        var stage = document.getElementById("deskarea3x") || document.getElementById("DeskParent");
        var existing = document.getElementById("SirkDesktopCommands");
        if (existing) { syncAvailability(existing); return true; }
        if (!stage) return false;
        stage.classList.add("sirk-desktop-commands-host");
        var wrapper = element("div", "sirk-desktop-commands"); wrapper.id = "SirkDesktopCommands";
        var button = element("button", "sirk-desktop-commands-toggle", "›_"); button.id = "SirkDesktopCommandsButton"; button.type = "button"; button.title = text("title"); button.setAttribute("aria-expanded", "false");
        var panel = element("aside", "sirk-desktop-commands-panel"); panel.id = "SirkDesktopCommandsPanel"; panel.hidden = true;
        wrapper.appendChild(button); wrapper.appendChild(panel); stage.appendChild(wrapper);
        button.onclick = function () { if (!desktopConnected()) { syncAvailability(wrapper); return; } panel.hidden = !panel.hidden; button.setAttribute("aria-expanded", panel.hidden ? "false" : "true"); if (!panel.hidden) load(panel); };
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

    new MutationObserver(install).observe(document.documentElement, { childList: true, subtree: true });
    window.__sirkDesktopCommandsTimer = window.setInterval(install, 500);
    install();
}());
