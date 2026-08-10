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
        if (options.multiline) input.rows = options.rows || 4;
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
        card.appendChild(element("p", "mc-admin-card-description", "Jira credentials stay in the server-side encrypted secret store and are never returned to the browser."));
        content.appendChild(card);

        var snapshot = data().integrations || {};
        var values = snapshot.values || {};
        var jira = values.jira || {};
        var configured = snapshot.configured || {};

        var url = field(card, "Jira URL", jira.url || "", { placeholder: "https://tenant.atlassian.net" });
        var email = field(card, "Jira account email", jira.email || "");
        var token = field(card, "Jira API token", "", {
            type: "password",
            placeholder: configured.jiraToken ? "Configured - leave blank to keep" : "Required"
        });
        token.autocomplete = "new-password";
        var projectKey = field(card, "Project key", jira.projectKey || "");
        var workspaceId = field(card, "Assets workspace ID", jira.workspaceId || "");
        var cloudId = field(card, "Cloud ID", jira.cloudId || "");
        var hostnameAttribute = field(card, "Hostname attribute", jira.hostnameAttribute || "Hostname");
        var assetFieldId = field(card, "Asset field ID", jira.assetFieldId || "");
        var aql = field(card, "Assets AQL scope", jira.aql || "objectType = Computer", { multiline: true, rows: 3 });
        var maxResults = field(card, "Max asset results", jira.maxResults || 100, { type: "number", min: 10, max: 500 });
        var verifyTls = checkbox(card, "Verify Jira TLS certificate", jira.verifyTls !== false);
        var cmdbEnabled = checkbox(card, "Enable Jira Assets/CMDB", jira.cmdbEnabled !== false);

        var actions = element("div", "mc-admin-actions");
        var save = element("button", "mc-admin-primary", "Save Jira integration");
        save.type = "button";
        var status = element("span", "mc-admin-save-status", configured.jira ? "Jira configured" : "Jira not configured");
        actions.appendChild(save);
        actions.appendChild(status);
        card.appendChild(actions);

        save.onclick = function () {
            save.disabled = true;
            status.className = "mc-admin-save-status";
            status.textContent = "Saving Jira integration...";
            var integrations = clone(values);
            integrations.jira = {
                url: url.value,
                email: email.value,
                projectKey: projectKey.value,
                assetFieldId: assetFieldId.value,
                hostnameAttribute: hostnameAttribute.value,
                workspaceId: workspaceId.value,
                cloudId: cloudId.value,
                aql: aql.value,
                maxResults: Number(maxResults.value) || 100,
                verifyTls: verifyTls.checked,
                cmdbEnabled: cmdbEnabled.checked,
                approvalTransitionId: jira.approvalTransitionId || "",
                closeTransitionId: jira.closeTransitionId || "",
                health: jira.health || {}
            };
            var secrets = {};
            if (token.value) secrets.jiraToken = token.value;
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
                token.value = "";
                token.placeholder = result.integrations && result.integrations.configured && result.integrations.configured.jiraToken
                    ? "Configured - leave blank to keep"
                    : "Required";
                status.className = "mc-admin-save-status";
                status.textContent = result.integrations && result.integrations.configured && result.integrations.configured.jira
                    ? "Jira configured"
                    : "Saved - Jira configuration incomplete";
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
