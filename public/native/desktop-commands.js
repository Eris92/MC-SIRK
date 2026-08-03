(function () {
    "use strict";

    if (window.__sirkDesktopCommandsLoaded) return;
    window.__sirkDesktopCommandsLoaded = true;

    var state = { data: null, category: "", folder: "", search: "" };
    var TEXT = {
        pl: { title: "Szybkie polecenia", scripts: "Skrypty", search: "Szukaj poleceń…", empty: "Brak poleceń.", variables: "Parametry", run: "Uruchom", request: "Wyślij wniosek", loading: "Ładowanie poleceń…", sent: "Polecenie zostało wysłane.", pending: "Polecenie oczekuje na akceptację.", failed: "Nie udało się wysłać polecenia.", confirm: "Uruchomić polecenie", required: "Uzupełnij wymagane pola." },
        en: { title: "Quick commands", scripts: "Scripts", search: "Search commands…", empty: "No commands.", variables: "Variables", run: "Run", request: "Request", loading: "Loading commands…", sent: "Command submitted.", pending: "Command is waiting for approval.", failed: "Command could not be submitted.", confirm: "Run command", required: "Complete the required fields." }
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
    function flattenScripts(node, output) {
        (node && node.children || []).forEach(function (child) {
            if (child.type === "script") {
                output.push({ kind: "script", path: child.path, label: localized(child, "label") || child.name || child.path, description: localized(child, "description"), requiresApproval: child.requiresApproval === true, confirmExecution: child.confirmExecution === true, variables: child.variables || [] });
            } else flattenScripts(child, output);
        });
        return output;
    }
    function categories(data) {
        var result = [];
        var scriptGroups = [];
        var looseScripts = [];
        (data.tree && data.tree.children || []).forEach(function (root) {
            if (root.type === "script") looseScripts.push(root);
            else {
                var items = flattenScripts(root, []);
                if (items.length) scriptGroups.push({ key: root.path || root.name, label: localized(root, "label") || root.name || root.path, items: items });
            }
        });
        if (looseScripts.length) scriptGroups.unshift({ key: "__root__", label: text("scripts"), items: flattenScripts({ children: looseScripts }, []) });
        if (scriptGroups.length) result.push({ key: "scripts", label: text("scripts"), groups: scriptGroups, items: flattenScripts(data.tree, []) });
        (data.catalog || []).forEach(function (category) {
            result.push({
                key: "catalog:" + category.key,
                label: localized(category, "title") || category.title || category.key,
                items: (category.commands || []).map(function (command) {
                    return { kind: "command", commandId: command.id, label: localized(command, "label") || command.label || command.id, description: localized(command, "description") || command.description || "", requiresApproval: command.requiresApproval === true, confirmExecution: command.confirmExecution === true, variables: command.variables || [] };
                })
            });
        });
        return result.filter(function (category) { return category.items.length; });
    }

    function variableForm(host, item) {
        var controls = [];
        if (!(item.variables || []).length) return function () { return { ok: true, values: {} }; };
        host.appendChild(element("h4", "", text("variables")));
        (item.variables || []).forEach(function (variable) {
            var row = element("label", "sirk-quick-command-field");
            var caption = element("span", "", localized(variable, "label") || variable.label || variable.name);
            if (variable.required) caption.textContent += " *";
            row.appendChild(caption);
            var input;
            if (variable.control === "select") {
                input = document.createElement("select");
                (variable.options || []).forEach(function (choice) {
                    var option = document.createElement("option");
                    option.value = String(choice.value == null ? choice : choice.value);
                    option.textContent = localized(choice, "label") || choice.label || option.value;
                    input.appendChild(option);
                });
            } else {
                input = document.createElement("input");
                input.type = variable.control === "switch" ? "checkbox" : "text";
            }
            if (input.type === "checkbox") input.checked = /^(1|true|yes|tak)$/i.test(String(variable.defaultValue || ""));
            else input.value = String(variable.defaultValue == null ? "" : variable.defaultValue);
            row.appendChild(input);
            host.appendChild(row);
            controls.push({ variable: variable, input: input });
        });
        return function () {
            var values = {}, valid = true;
            controls.forEach(function (entry) {
                var value = entry.input.type === "checkbox" ? entry.input.checked : entry.input.value;
                values[entry.variable.name] = value;
                if (entry.variable.required && entry.input.type !== "checkbox" && !String(value).trim()) valid = false;
            });
            return { ok: valid, values: values };
        };
    }

    function submit(item, collect, button, status) {
        var values = collect();
        if (!values.ok) { status.textContent = text("required"); status.classList.add("is-error"); return; }
        if (item.confirmExecution && !window.confirm(text("confirm") + ' "' + item.label + '"?')) return;
        var node = currentNode();
        var payload = { nodeId: nodeId(), nodeName: node.name || "", variableValues: values.values, confirmedExecution: item.confirmExecution === true, note: "" };
        if (!payload.nodeId) { status.textContent = "Device is not ready."; status.classList.add("is-error"); return; }
        if (item.kind === "command") payload.commandId = item.commandId; else payload.scriptPath = item.path;
        button.disabled = true;
        status.textContent = text("loading");
        status.classList.remove("is-error");
        window.SirkPlatformCore.post("mycommands", "execute", payload).then(function (response) {
            status.textContent = response.request && response.request.status === "pending" ? text("pending") : text("sent");
        }).catch(function (error) {
            status.textContent = text("failed") + " " + (error.message || String(error));
            status.classList.add("is-error");
        }).then(function () { button.disabled = false; });
    }

    function selectItem(panel, item) {
        var host = panel.querySelector(".sirk-quick-command-run");
        var status = panel.querySelector(".sirk-quick-command-status");
        function show(value) {
            host.innerHTML = "";
            host.appendChild(element("h3", "", value.label));
            if (value.description) host.appendChild(element("p", "", value.description));
            var collect = variableForm(host, value);
            var run = element("button", "sirk-quick-command-submit", value.requiresApproval ? text("request") : text("run"));
            run.type = "button";
            run.onclick = function () { submit(value, collect, run, status); };
            host.appendChild(run);
        }
        status.textContent = "";
        status.classList.remove("is-error");
        if (item.kind !== "script") { show(item); return; }
        status.textContent = text("loading");
        window.SirkPlatformCore.api("mycommands", "script", null, { path: item.path }).then(function (response) {
            var script = response.script || item;
            show({ kind: "script", path: script.path, label: localized(script, "label") || script.label || script.name, description: localized(script, "description") || script.description || "", variables: script.variables || [], requiresApproval: script.requiresApproval === true, confirmExecution: script.confirmExecution === true });
            status.textContent = "";
        }).catch(function (error) { status.textContent = error.message || String(error); status.classList.add("is-error"); });
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
        all.forEach(function (category) { var button = element("button", category.key === state.category ? "is-active" : "", category.label); button.type = "button"; button.onclick = function () { state.category = category.key; state.folder = ""; render(panel); }; nav.appendChild(button); });
        groups.forEach(function (group) { var button = element("button", group.key === state.folder ? "is-active" : "", group.label); button.type = "button"; button.onclick = function () { state.folder = group.key; render(panel); }; folders.appendChild(button); });
        items.forEach(function (item) { var button = element("button"); button.type = "button"; button.appendChild(element("strong", "", item.label)); if (item.description) button.appendChild(element("small", "", item.description)); button.onclick = function () { selectItem(panel, item); }; list.appendChild(button); });
        if (!items.length) list.appendChild(element("p", "", text("empty")));
        browser.appendChild(nav); if (groups.length) browser.appendChild(folders); browser.appendChild(list); panel.appendChild(browser);
        panel.appendChild(element("div", "sirk-quick-command-run"));
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
