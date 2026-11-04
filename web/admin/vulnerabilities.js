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

    function control(cell, label, value, options) {
        options = options || {};
        var item = document.createElement(options.options ? "select" : "input");
        item.className = "mc-admin-input mc-admin-vuln-input";
        item.setAttribute("aria-label", label);
        if (options.options) {
            options.options.forEach(function (option) {
                var entry = document.createElement("option");
                entry.value = option[0];
                entry.textContent = option[1];
                item.appendChild(entry);
            });
        } else {
            item.type = options.type || "text";
            if (options.placeholder) item.placeholder = options.placeholder;
            if (options.maxLength) item.maxLength = options.maxLength;
        }
        item.value = value == null ? "" : String(value);
        cell.appendChild(item);
        return item;
    }

    function render(state) {
        content.innerHTML = "";
        var card = element("section", "mc-admin-card");
        card.appendChild(element("h3", "", msg("Podatności", "Vulnerabilities")));
        card.appendChild(element("p", "mc-admin-card-description", msg(
            "Reguły dla danych Nessus. Wykluczenie ukrywa pasującą podatność z liczników i alertu w Desktop (nadal jest widoczna jako „wykluczona”). Naprawa przypina polecenie z My Commands, które pojawia się jako „Napraw” w Commands i Quick, oraz opcjonalnie polecenie rollback („Cofnij”), np. ponowne włączenie TLS 1.0. Dopasowanie: Plugin ID i/lub nazwa, opcjonalnie host (wzorzec z *). Opis pokazuje sam tekst z pola „Powód” przy podatności, bez przycisków naprawy (np. „Brak wsparcia aplikacji, zaproponuj przejście na inne oprogramowanie”); podatność nadal się liczy. Wykluczenie ma pierwszeństwo przed naprawą.",
            "Rules for Nessus data. An exclusion removes a matching vulnerability from counts and the Desktop alert (it stays visible as \"excluded\"). A remediation pins a My Commands script shown as \"Fix\" in Commands and Quick, plus an optional rollback command (\"Undo\"), e.g. re-enabling TLS 1.0. Match by Plugin ID and/or name, optionally a host pattern with *. A description shows only the Reason text with the vulnerability, without Fix buttons (e.g. \"Application no longer supported, propose moving to other software\"); the vulnerability still counts. Exclusions win over remediation."
        )));
        if (state.path) card.appendChild(element("p", "mc-admin-card-description", msg("Plik reguł (można go też edytować ręcznie): ", "Rules file (may also be edited by hand): ") + state.path));
        if (state.error) card.appendChild(element("p", "mc-admin-error", msg("Plik reguł jest niepoprawny i nie jest stosowany: ", "The rules file is invalid and is not applied: ") + state.error.reason));
        content.appendChild(card);

        var commandOptions = [["", msg("— wybierz polecenie —", "— choose a command —")]].concat((state.commands || []).map(function (command) {
            return [command.path, command.label + " (" + command.path + ")"];
        }));
        var rollbackOptions = [["", msg("— brak —", "— none —")]].concat(commandOptions.slice(1));
        function commandSelect(cell, label, value, options) {
            var select = control(cell, label, value, { options: options });
            if (value && !(state.commands || []).some(function (command) { return command.path === value; })) {
                var missing = document.createElement("option");
                missing.value = value;
                missing.textContent = value + msg(" (brak)", " (missing)");
                select.appendChild(missing);
                select.value = value;
            }
            return select;
        }
        var wrap = element("div", "mc-admin-table-wrap");
        var table = element("table", "mc-admin-table mc-admin-vuln-table");
        var headRow = table.createTHead().insertRow();
        [msg("Typ", "Type"), "Plugin ID", msg("Nazwa pluginu", "Plugin name"), msg("Dopasowanie", "Match"), msg("Host (wzorzec)", "Host (pattern)"), msg("Polecenie naprawy", "Remediation command"), msg("Polecenie rollback", "Rollback command"), "Reboot request", msg("Powód", "Reason"), msg("Wygasa", "Expires"), msg("Wł.", "On"), ""].forEach(function (title) {
            headRow.appendChild(element("th", "", title));
        });
        var list = table.createTBody();
        wrap.appendChild(table);
        card.appendChild(wrap);
        var empty = element("p", "mc-admin-card-description mc-admin-vuln-empty", msg("Brak reguł. Dodaj wykluczenie albo naprawę.", "No rules yet. Add an exclusion or a remediation."));
        card.appendChild(empty);
        var rows = [];
        function syncEmpty() { empty.hidden = rows.length > 0; }

        function addRule(rule) {
            rule = rule || {};
            var row = list.insertRow();
            row.className = "mc-admin-vuln-rule";
            function cell() { return row.insertCell(); }
            var action = control(cell(), msg("Typ", "Type"), rule.action || "exclude", { options: [["exclude", msg("Wykluczenie", "Exclusion")], ["remediate", msg("Naprawa", "Remediation")], ["note", msg("Opis", "Description")]] });
            var pluginId = control(cell(), "Plugin ID", rule.pluginId, { placeholder: "156860", maxLength: 12 });
            var name = control(cell(), msg("Nazwa pluginu", "Plugin name"), rule.name, { placeholder: "Google Chrome <", maxLength: 200 });
            var nameMode = control(cell(), msg("Dopasowanie nazwy", "Name match"), rule.nameMode || "contains", { options: [["contains", msg("zawiera", "contains")], ["exact", msg("dokładnie", "exact")]] });
            var host = control(cell(), msg("Host (wzorzec)", "Host (pattern)"), rule.host, { placeholder: msg("wszystkie", "all"), maxLength: 253 });
            var scriptCell = cell();
            var script = commandSelect(scriptCell, msg("Polecenie naprawy", "Remediation command"), rule.scriptPath, commandOptions);
            var rollbackCell = cell();
            var rollback = commandSelect(rollbackCell, msg("Polecenie rollback (opcjonalne)", "Rollback command (optional)"), rule.rollbackScriptPath, rollbackOptions);
            // Reboot request: Quick shows a red "Wymagany restart" next to the fix.
            var rebootCell = cell();
            rebootCell.className = "mc-admin-vuln-center";
            var reboot = document.createElement("input");
            reboot.type = "checkbox";
            reboot.checked = rule.rebootRequired === true;
            reboot.setAttribute("aria-label", msg("Wymagany restart po naprawie", "Restart required after the fix"));
            reboot.title = reboot.getAttribute("aria-label");
            rebootCell.appendChild(reboot);
            var reason = control(cell(), msg("Powód", "Reason"), rule.reason, { maxLength: 500 });
            var expires = control(cell(), msg("Wygasa", "Expires"), rule.expires, { type: "date" });
            var enabledCell = cell();
            enabledCell.className = "mc-admin-vuln-center";
            var enabled = document.createElement("input");
            enabled.type = "checkbox";
            enabled.checked = rule.enabled !== false;
            enabled.setAttribute("aria-label", msg("Włączona", "Enabled"));
            enabledCell.appendChild(enabled);
            var removeCell = cell();
            removeCell.className = "mc-admin-vuln-center";
            var remove = element("button", "mc-admin-secondary mc-admin-vuln-remove", "×");
            remove.type = "button";
            remove.title = msg("Usuń regułę", "Remove rule");
            remove.setAttribute("aria-label", remove.title);
            removeCell.appendChild(remove);
            function syncAction() {
                var remediate = action.value === "remediate";
                script.disabled = rollback.disabled = reboot.disabled = !remediate;
                script.hidden = rollback.hidden = reboot.hidden = !remediate;
                row.classList.toggle("is-remediation", remediate);
                row.classList.toggle("is-note", action.value === "note");
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
                        rollbackScriptPath: action.value === "remediate" ? rollback.value : "",
                        rebootRequired: action.value === "remediate" && reboot.checked,
                        reason: reason.value.trim(),
                        expires: expires.value,
                        enabled: enabled.checked,
                        updatedBy: rule.updatedBy || "",
                        updatedAt: rule.updatedAt || ""
                    };
                }
            };
            remove.onclick = function () { row.remove(); rows = rows.filter(function (item) { return item !== entry; }); syncEmpty(); };
            rows.push(entry);
            syncEmpty();
        }

        (state.rules || []).forEach(addRule);
        syncEmpty();

        var actions = element("div", "mc-admin-actions");
        var addExclusion = element("button", "mc-admin-secondary", msg("Dodaj wykluczenie", "Add exclusion"));
        addExclusion.type = "button";
        addExclusion.onclick = function () { addRule({ action: "exclude" }); };
        var addFix = element("button", "mc-admin-secondary", msg("Dodaj naprawę", "Add remediation"));
        addFix.type = "button";
        addFix.onclick = function () { addRule({ action: "remediate" }); };
        var addNote = element("button", "mc-admin-secondary", msg("Dodaj opis", "Add description"));
        addNote.type = "button";
        addNote.onclick = function () { addRule({ action: "note" }); };
        var saveButton = element("button", "mc-admin-primary", msg("Zapisz reguły", "Save rules"));
        saveButton.type = "button";
        var status = element("span", "mc-admin-save-status", "");
        actions.appendChild(addExclusion);
        actions.appendChild(addFix);
        actions.appendChild(addNote);
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
