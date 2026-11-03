(function () {
    "use strict";

    // Site Admin settings for Nessus vulnerability rules: exclusions and pinned
    // remediation commands. Rules are stored server-side in nessus/rules.json.
    var root = document.getElementById("sirk-platform-admin");
    var content = document.getElementById("sirk-platform-admin-content");
    var button = root && root.querySelector('[data-tab="vulnerabilities"]');
    if (!root || !content || !button) return;

    var pl = /^pl\b/i.test(String(document.documentElement.lang || navigator.language || ""));
    function msg(polish, english) { return pl ? polish : english; }
    function element(tag, className, text) {
        var value = document.createElement(tag);
        if (className) value.className = className;
        if (text != null) value.textContent = String(text);
        return value;
    }
    function apiUrl() {
        var url = new URL("pluginadmin.ashx", window.location.href);
        url.searchParams.set("pin", root.getAttribute("data-plugin") || "SIRKPortal");
        url.searchParams.set("module", "mycommands");
        url.searchParams.set("asset", "vulnerability-rules");
        return url.href;
    }
    function readJson(response) {
        return response.text().then(function (text) {
            var result;
            try { result = JSON.parse(text || "{}"); }
            catch (error) { throw new Error("Server returned an invalid response (HTTP " + response.status + ")."); }
            if (!response.ok || result.ok === false) throw new Error(result.error || "Request failed (HTTP " + response.status + ").");
            return result;
        });
    }
    function load() {
        return fetch(apiUrl(), { credentials: "same-origin", headers: { "Accept": "application/json" } }).then(readJson);
    }
    function save(rules) {
        var body = new URLSearchParams();
        body.set("payload", JSON.stringify({ rules: rules }));
        return fetch(apiUrl(), {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "Accept": "application/json" },
            body: body.toString()
        }).then(readJson);
    }

    function input(host, label, value, options) {
        options = options || {};
        var wrap = element("label", "mc-admin-field mc-admin-vuln-field");
        wrap.appendChild(element("span", "mc-admin-field-label", label));
        var control = document.createElement(options.options ? "select" : "input");
        control.className = "mc-admin-input";
        if (options.options) {
            options.options.forEach(function (option) {
                var item = document.createElement("option");
                item.value = option[0];
                item.textContent = option[1];
                control.appendChild(item);
            });
        } else {
            control.type = options.type || "text";
            if (options.placeholder) control.placeholder = options.placeholder;
            if (options.maxLength) control.maxLength = options.maxLength;
        }
        control.value = value == null ? "" : String(value);
        wrap.appendChild(control);
        host.appendChild(wrap);
        return control;
    }

    function render(state) {
        content.innerHTML = "";
        var card = element("section", "mc-admin-card");
        card.appendChild(element("h3", "", msg("Podatności", "Vulnerabilities")));
        card.appendChild(element("p", "mc-admin-card-description", msg(
            "Reguły dla danych Nessus. Wykluczenie ukrywa pasującą podatność z liczników i alertu w Desktop (nadal jest widoczna jako „wykluczona”). Naprawa przypina polecenie z My Commands, które pojawia się jako „Napraw” w Commands i Quick. Dopasowanie: Plugin ID i/lub nazwa, opcjonalnie host (wzorzec z *). Wykluczenie ma pierwszeństwo przed naprawą.",
            "Rules for Nessus data. An exclusion removes a matching vulnerability from counts and the Desktop alert (it stays visible as \"excluded\"). A remediation pins a My Commands script shown as \"Fix\" in Commands and Quick. Match by Plugin ID and/or name, optionally a host pattern with *. Exclusions win over remediation."
        )));
        if (state.path) card.appendChild(element("p", "mc-admin-card-description", msg("Plik reguł (można go też edytować ręcznie): ", "Rules file (may also be edited by hand): ") + state.path));
        if (state.error) card.appendChild(element("p", "mc-admin-error", msg("Plik reguł jest niepoprawny i nie jest stosowany: ", "The rules file is invalid and is not applied: ") + state.error.reason));
        content.appendChild(card);

        var commandOptions = [["", msg("— wybierz polecenie —", "— choose a command —")]].concat((state.commands || []).map(function (command) {
            return [command.path, command.label + " (" + command.path + ")"];
        }));
        var list = element("div", "mc-admin-vuln-rules");
        card.appendChild(list);
        var rows = [];

        function addRule(rule) {
            rule = rule || {};
            var row = element("div", "mc-admin-vuln-rule");
            var action = input(row, msg("Typ", "Type"), rule.action || "exclude", { options: [["exclude", msg("Wykluczenie", "Exclusion")], ["remediate", msg("Naprawa", "Remediation")]] });
            var pluginId = input(row, "Plugin ID", rule.pluginId, { placeholder: "156860", maxLength: 12 });
            var name = input(row, msg("Nazwa pluginu", "Plugin name"), rule.name, { placeholder: "Google Chrome <", maxLength: 200 });
            var nameMode = input(row, msg("Dopasowanie nazwy", "Name match"), rule.nameMode || "contains", { options: [["contains", msg("zawiera", "contains")], ["exact", msg("dokładnie", "exact")]] });
            var host = input(row, msg("Host (wzorzec)", "Host (pattern)"), rule.host, { placeholder: msg("puste = wszystkie, np. pc-*", "empty = all, e.g. pc-*"), maxLength: 253 });
            var script = input(row, msg("Polecenie naprawy", "Remediation command"), rule.scriptPath, { options: commandOptions });
            if (rule.scriptPath && !(state.commands || []).some(function (command) { return command.path === rule.scriptPath; })) {
                var missing = document.createElement("option");
                missing.value = rule.scriptPath;
                missing.textContent = rule.scriptPath + msg(" (brak)", " (missing)");
                script.appendChild(missing);
                script.value = rule.scriptPath;
            }
            var reason = input(row, msg("Powód", "Reason"), rule.reason, { maxLength: 500 });
            var expires = input(row, msg("Wygasa", "Expires"), rule.expires, { type: "date" });
            var enabledLabel = element("label", "mc-admin-check mc-admin-vuln-enabled");
            var enabled = document.createElement("input");
            enabled.type = "checkbox";
            enabled.checked = rule.enabled !== false;
            enabledLabel.appendChild(enabled);
            enabledLabel.appendChild(document.createTextNode(msg("Włączona", "Enabled")));
            row.appendChild(enabledLabel);
            var remove = element("button", "mc-admin-secondary", msg("Usuń", "Remove"));
            remove.type = "button";
            row.appendChild(remove);
            function syncAction() {
                var remediate = action.value === "remediate";
                script.disabled = !remediate;
                script.parentNode.hidden = !remediate;
                row.classList.toggle("is-remediation", remediate);
            }
            action.onchange = syncAction;
            syncAction();
            var entry = {
                row: row,
                value: function () {
                    return {
                        id: rule.id || "",
                        action: action.value,
                        pluginId: pluginId.value.trim(),
                        name: name.value.trim(),
                        nameMode: nameMode.value,
                        host: host.value.trim(),
                        scriptPath: action.value === "remediate" ? script.value : "",
                        reason: reason.value.trim(),
                        expires: expires.value,
                        enabled: enabled.checked,
                        updatedBy: rule.updatedBy || "",
                        updatedAt: rule.updatedAt || ""
                    };
                }
            };
            remove.onclick = function () { row.remove(); rows = rows.filter(function (item) { return item !== entry; }); };
            rows.push(entry);
            list.appendChild(row);
        }

        (state.rules || []).forEach(addRule);

        var actions = element("div", "mc-admin-actions");
        var addExclusion = element("button", "mc-admin-secondary", msg("Dodaj wykluczenie", "Add exclusion"));
        addExclusion.type = "button";
        addExclusion.onclick = function () { addRule({ action: "exclude" }); };
        var addFix = element("button", "mc-admin-secondary", msg("Dodaj naprawę", "Add remediation"));
        addFix.type = "button";
        addFix.onclick = function () { addRule({ action: "remediate" }); };
        var saveButton = element("button", "mc-admin-primary", msg("Zapisz reguły", "Save rules"));
        saveButton.type = "button";
        var status = element("span", "mc-admin-save-status", "");
        actions.appendChild(addExclusion);
        actions.appendChild(addFix);
        actions.appendChild(saveButton);
        actions.appendChild(status);
        card.appendChild(actions);

        saveButton.onclick = function () {
            saveButton.disabled = true;
            status.className = "mc-admin-save-status";
            status.textContent = msg("Zapisywanie…", "Saving...");
            save(rows.map(function (entry) { return entry.value(); })).then(function (result) {
                render(result);
                var done = content.querySelector(".mc-admin-save-status");
                if (done) done.textContent = msg("Zapisano", "Saved");
            }).catch(function (error) {
                status.className = "mc-admin-save-status mc-admin-error";
                status.textContent = error && error.message || String(error);
                saveButton.disabled = false;
            });
        };
    }

    function activate() {
        root.querySelectorAll("[data-tab]").forEach(function (item) { item.classList.toggle("active", item === button); });
        content.innerHTML = "";
        content.appendChild(element("section", "mc-admin-card", msg("Wczytywanie reguł…", "Loading rules...")));
        load().then(render).catch(function (error) {
            content.innerHTML = "";
            var failed = element("section", "mc-admin-card");
            failed.appendChild(element("h3", "", msg("Podatności", "Vulnerabilities")));
            failed.appendChild(element("p", "mc-admin-error", error && error.message || String(error)));
            content.appendChild(failed);
        });
    }

    button.onclick = activate;
}());
