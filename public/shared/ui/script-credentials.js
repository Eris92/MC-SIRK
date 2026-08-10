(function () {
    "use strict";

    var shared = window.SharedScriptTools;
    if (!shared || shared.__sirkScriptCredentialsOwner) return;

    function text(value) { return String(value == null ? "" : value); }
    function element(tag, className, value) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (value != null) node.textContent = text(value);
        return node;
    }
    function formRow(labelText, control) {
        var row = element("label", "mc-script-form-row");
        row.appendChild(element("span", "mc-script-form-label", labelText));
        row.appendChild(control);
        return row;
    }
    function systemSection(state) {
        state = state || { profiles: [] };
        var section = element("section", "mc-definition-section mc-definition-system-credentials");
        section.appendChild(element("h4", "", "System credentials"));
        section.appendChild(element(
            "div",
            "mc-shared-muted mc-system-credentials-description",
            "Assign configured global profiles to this script. Secrets stay encrypted server-side and are not copied into the script."
        ));
        var boxes = [];
        (Array.isArray(state.profiles) ? state.profiles : []).forEach(function (profile) {
            var row = element("label", "mc-system-credential-item");
            var box = document.createElement("input");
            box.type = "checkbox";
            box.value = text(profile.name);
            box.checked = profile.selected === true;
            box.disabled = profile.configured !== true;
            row.appendChild(box);
            row.appendChild(element("span", "mc-system-credential-name", profile.label || profile.name));
            row.appendChild(element(
                "span",
                profile.configured === true ? "mc-system-credential-configured" : "mc-system-credential-unavailable",
                profile.configured === true ? "Configured" : "Not configured globally"
            ));
            section.appendChild(row);
            boxes.push(box);
        });
        if (!boxes.length) section.appendChild(element("div", "mc-shared-muted", "No global integration profiles are available."));
        return {
            element: section,
            selected: function () {
                return boxes.filter(function (box) { return box.checked && !box.disabled; }).map(function (box) { return box.value; });
            }
        };
    }
    function openCredentialsEditor(shell, script, onSaved) {
        return Promise.all([
            shell.api("script-secrets", { path: script.path }),
            shell.api("system-credentials", { path: script.path })
        ]).then(function (responses) {
            var secretState = responses[0].secrets || { variables: [] };
            var systemState = responses[1].systemCredentials || { profiles: [] };
            var host = shell.state.page.details;
            host.innerHTML = "";

            var card = shell.card("Script credentials", script.label || script.name);
            card.classList.add("mc-script-credentials-card");

            var systemCredentials = systemSection(systemState);
            card.appendChild(systemCredentials.element);

            var local = element("section", "mc-definition-section mc-script-local-credentials");
            local.appendChild(element("h4", "", "Script-local credentials"));
            var controls = [];
            (secretState.variables || []).forEach(function (variable) {
                var group = element("div", "mc-script-secret-row");
                var input = document.createElement("input");
                input.type = "password";
                input.autocomplete = "new-password";
                input.placeholder = variable.configured ? "Configured - leave empty to keep" : "Enter secret";
                var clear = document.createElement("input");
                clear.type = "checkbox";
                var clearLabel = element("label", "");
                clearLabel.appendChild(clear);
                clearLabel.appendChild(document.createTextNode(" Clear saved value"));
                var status = element(
                    "span",
                    variable.configured ? "mc-secret-configured" : "mc-secret-missing",
                    variable.configured ? "Configured" : (variable.required ? "Required" : "Not configured")
                );
                group.appendChild(formRow((variable.label || variable.name) + (variable.required ? " *" : ""), input));
                group.appendChild(status);
                group.appendChild(clearLabel);
                local.appendChild(group);
                controls.push({ variable: variable, input: input, clear: clear });
            });
            if (!controls.length) local.appendChild(element("div", "mc-shared-muted", "This script has no script-local SaveSecret credentials."));
            card.appendChild(local);

            var save = shell.element("button", "btn btn-primary btn-sm", "Save credentials");
            save.type = "button";
            save.onclick = function () {
                var values = {};
                var clearNames = [];
                controls.forEach(function (item) {
                    if (item.input.value) values[item.variable.name] = item.input.value;
                    if (item.clear.checked) clearNames.push(item.variable.name);
                });
                save.disabled = true;
                Promise.all([
                    shell.post("script-secrets", { path: script.path, values: values, clearNames: clearNames }),
                    shell.post("system-credentials", { path: script.path, selected: systemCredentials.selected() })
                ]).then(function (results) {
                    if (typeof onSaved === "function") onSaved({ secrets: results[0], systemCredentials: results[1] });
                }).catch(function (error) {
                    save.disabled = false;
                    shell.error(host, error);
                });
            };
            card.appendChild(save);
            host.appendChild(card);
        }).catch(function (error) {
            shell.error(shell.state.page.details, error);
        });
    }

    function enhance(instance) {
        if (!instance || typeof instance !== "object" || instance.__sirkScriptCredentialsEnhanced) return instance;
        instance.__sirkScriptCredentialsEnhanced = true;
        instance.openCredentialsEditor = openCredentialsEditor;

        var originalActions = instance.scriptActions;
        if (typeof originalActions === "function") {
            instance.scriptActions = function (script, config) {
                config = config || {};
                var actions = originalActions(script, config) || [];
                if (config.canEdit !== true) return actions;
                var credential = null;
                actions.forEach(function (action) { if (action && action.key === "credentials") credential = action; });
                if (!credential) {
                    credential = { key: "credentials", icon: "🔑", className: "mc-tree-credential-action" };
                    actions.unshift(credential);
                }
                credential.disabled = false;
                credential.title = "Configure script credentials";
                credential.onClick = function () { if (config.onCredentials) config.onCredentials(script); };
                return actions;
            };
        }
        return instance;
    }

    var originalCreate = shared.create;
    if (typeof originalCreate === "function") {
        shared.create = function (options) { return enhance(originalCreate(options)); };
    }
    shared.openCredentialsEditor = openCredentialsEditor;
    shared.__sirkScriptCredentialsOwner = true;
}());
