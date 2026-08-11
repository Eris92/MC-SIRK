(function () {
    "use strict";

    var root = document.getElementById("sirk-platform-admin");
    var content = document.getElementById("sirk-platform-admin-content");
    var button = root && root.querySelector('[data-tab="integrations"]');
    if (!root || !content || !button) return;

    function data() { return window.SirkPlatformAdminData || {}; }
    function element(tag, className, text) {
        var value = document.createElement(tag);
        if (className) value.className = className;
        if (text != null) value.textContent = String(text);
        return value;
    }
    function disclosure(host, title) {
        var details = element("details", "mc-admin-disclosure");
        details.open = false;
        details.appendChild(element("summary", "mc-admin-disclosure-summary", title));
        host.appendChild(details);
        return details;
    }
    function field(host, labelText, value, options) {
        options = options || {};
        var label = element("label", "mc-admin-field");
        label.appendChild(element("span", "mc-admin-field-label", labelText));
        var input = document.createElement(options.multiline ? "textarea" : "input");
        input.className = "mc-admin-input";
        if (!options.multiline) input.type = options.type || "text";
        input.value = value == null ? "" : String(value);
        if (options.placeholder) input.placeholder = options.placeholder;
        if (options.min != null) input.min = String(options.min);
        if (options.max != null) input.max = String(options.max);
        if (options.multiline) input.rows = options.rows || 3;
        label.appendChild(input);
        host.appendChild(label);
        return input;
    }
    function checkbox(host, labelText, checked) {
        var label = element("label", "mc-admin-check");
        var input = document.createElement("input");
        input.type = "checkbox";
        input.checked = checked === true;
        label.appendChild(input);
        label.appendChild(document.createTextNode(labelText));
        host.appendChild(label);
        return input;
    }
    function clone(value) {
        try { return JSON.parse(JSON.stringify(value || {})); }
        catch (error) { return {}; }
    }
    function pluginUrl(action) {
        var url = new URL("pluginadmin.ashx", window.location.href);
        url.searchParams.set("pin", root.getAttribute("data-plugin") || "SIRKPortal");
        url.searchParams.set("action", action);
        return url.href;
    }
    function activate() {
        root.querySelectorAll("[data-tab]").forEach(function (item) {
            item.classList.toggle("active", item === button);
        });
        render();
    }
    function render() {
        content.innerHTML = "";
        var card = element("section", "mc-admin-card");
        card.appendChild(element("h3", "", "Integrations"));
        card.appendChild(element(
            "p",
            "mc-admin-card-description",
            "Global system credentials used by Script credentials assignments. Secrets are write-only and remain encrypted server-side."
        ));
        content.appendChild(card);

        var snapshot = data().integrations || {};
        var values = snapshot.values || {};
        var configured = snapshot.configured || {};
        var jira = values.jira || {};
        var ad = values.ad || {};
        var entra = values.entra || {};

        var jiraBox = disclosure(card, "Jira");
        jiraBox.appendChild(element(
            "p",
            "mc-admin-card-description",
            "Configure the shared Jira connection here. Project, object type, AQL and result scope belong to each consuming script."
        ));
        var jiraUrl = field(jiraBox, "Jira URL", jira.url || "", { placeholder: "https://tenant.atlassian.net" });
        var jiraEmail = field(jiraBox, "Jira account email", jira.email || "");
        var jiraToken = field(jiraBox, "Jira API token", "", {
            type: "password",
            placeholder: configured.jiraToken ? "Configured - leave blank to keep" : "Required"
        });
        jiraToken.autocomplete = "new-password";
        var workspaceId = field(jiraBox, "Assets workspace ID (optional)", jira.workspaceId || "");
        var cloudId = field(jiraBox, "Cloud ID (optional)", jira.cloudId || "");
        var verifyTls = checkbox(jiraBox, "Verify Jira TLS certificate", jira.verifyTls !== false);

        var adBox = disclosure(card, "Active Directory");
        var adDomain = field(adBox, "AD domain", ad.domain || "");
        var adLogin = field(adBox, "AD login", ad.login || "");
        var adPassword = field(adBox, "AD password", "", {
            type: "password",
            placeholder: configured.adPassword ? "Configured - leave blank to keep" : "Required"
        });
        adPassword.autocomplete = "new-password";

        var entraBox = disclosure(card, "AAD / Entra ID");
        var tenantId = field(entraBox, "Tenant ID", entra.tenantId || "");
        var clientId = field(entraBox, "Client ID", entra.clientId || "");
        var clientSecret = field(entraBox, "Client secret", "", {
            type: "password",
            placeholder: configured.entraClientSecret ? "Configured - leave blank to keep" : "Required"
        });
        clientSecret.autocomplete = "new-password";

        var actions = element("div", "mc-admin-actions");
        var save = element("button", "mc-admin-primary", "Save integrations");
        save.type = "button";
        var status = element("span", "mc-admin-save-status", "");
        actions.appendChild(save);
        actions.appendChild(status);
        card.appendChild(actions);

        save.onclick = function () {
            save.disabled = true;
            status.className = "mc-admin-save-status";
            status.textContent = "Saving...";

            var integrations = clone(values);
            integrations.jira = {
                url: jiraUrl.value,
                email: jiraEmail.value,
                workspaceId: workspaceId.value,
                cloudId: cloudId.value,
                verifyTls: verifyTls.checked,
                health: clone(jira.health)
            };
            integrations.ad = Object.assign({}, ad, {
                domain: adDomain.value,
                login: adLogin.value
            });
            integrations.entra = Object.assign({}, entra, {
                tenantId: tenantId.value,
                clientId: clientId.value
            });

            var secrets = {};
            if (jiraToken.value) secrets.jiraToken = jiraToken.value;
            if (adPassword.value) secrets.adPassword = adPassword.value;
            if (clientSecret.value) secrets.entraClientSecret = clientSecret.value;

            var body = new URLSearchParams();
            body.set("action", "save-integrations");
            body.set("integrations", JSON.stringify(integrations));
            body.set("secrets", JSON.stringify(secrets));

            fetch(pluginUrl("save-integrations"), {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Accept": "application/json"
                },
                body: body.toString()
            }).then(function (response) {
                return response.text().then(function (text) {
                    var result;
                    try { result = JSON.parse(text || "{}"); }
                    catch (error) { throw new Error("Server returned an invalid response (HTTP " + response.status + ")."); }
                    if (!response.ok || !result.ok) throw new Error(result.error || "Save failed (HTTP " + response.status + ").");
                    return result;
                });
            }).then(function (result) {
                window.SirkPlatformAdminData.integrations = result.integrations;
                jiraToken.value = "";
                adPassword.value = "";
                clientSecret.value = "";
                status.className = "mc-admin-save-status";
                status.textContent = "Saved";
            }).catch(function (error) {
                status.className = "mc-admin-save-status mc-admin-error";
                status.textContent = error && error.message || String(error);
            }).then(function () {
                save.disabled = false;
            });
        };
    }

    button.onclick = activate;
}());
