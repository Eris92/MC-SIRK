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
            "Global system credentials used by Script credentials assignments. Query scope and result limits are owned by each script. Secrets are write-only and remain encrypted server-side."
        ));
        content.appendChild(card);

        var snapshot = data().integrations || {};
        var values = snapshot.values || {};
        var configured = snapshot.configured || {};
        var jira = values.jira || {};
        var sms = values.sms || {};
        var smtp = values.smtp || {};
        var ad = values.ad || {};
        var entra = values.entra || {};

        var jiraBox = disclosure(card, "Jira");
        var jiraUrl = field(jiraBox, "Jira URL", jira.url || "", { placeholder: "https://tenant.atlassian.net" });
        var jiraEmail = field(jiraBox, "Jira account email", jira.email || "");
        var jiraToken = field(jiraBox, "Jira API token", "", {
            type: "password",
            placeholder: configured.jiraToken ? "Configured - leave blank to keep" : "Required"
        });
        jiraToken.autocomplete = "new-password";
        var workspaceId = field(jiraBox, "Assets workspace ID", jira.workspaceId || "", { placeholder: "Optional - auto-discovered when empty" });
        var cloudId = field(jiraBox, "Cloud ID", jira.cloudId || "", { placeholder: "Optional - auto-discovered when empty" });
        var verifyTls = checkbox(jiraBox, "Verify Jira TLS certificate", jira.verifyTls !== false);

        var adBox = disclosure(card, "Active Directory");
        var adDomain = field(adBox, "AD domain", ad.domain || "");
        var adLogin = field(adBox, "AD login", ad.login || "");
        var adUpnSuffix = field(adBox, "UPN suffix", ad.upnSuffix || ad.domain || "", { placeholder: "investa.pl" });
        var adPassword = field(adBox, "AD password", "", {
            type: "password",
            placeholder: configured.adPassword ? "Configured - leave blank to keep" : "Required"
        });
        adPassword.autocomplete = "new-password";
        var locationsTitle = element("div", "mc-admin-field-label", "Users locations");
        adBox.appendChild(locationsTitle);
        var locationsHost = element("div", "mc-admin-locations");
        adBox.appendChild(locationsHost);
        var locationRows = [];
        function addLocation(item) {
            item = item || {};
            var row = element("div", "mc-admin-location-row");
            var name = document.createElement("input"); name.className = "mc-admin-input"; name.placeholder = "New"; name.value = item.name || "";
            var dn = document.createElement("input"); dn.className = "mc-admin-input"; dn.placeholder = "OU=_NewUsers,OU=Business,DC=investa,DC=pl"; dn.value = item.dn || "";
            var remove = element("button", "mc-admin-secondary", "Remove"); remove.type = "button";
            remove.onclick = function () { row.remove(); locationRows = locationRows.filter(function (entry) { return entry.row !== row; }); };
            row.appendChild(name); row.appendChild(dn); row.appendChild(remove); locationsHost.appendChild(row);
            locationRows.push({ row: row, name: name, dn: dn });
        }
        (ad.userLocations || []).forEach(addLocation);
        var addLocationButton = element("button", "mc-admin-secondary", "Add location"); addLocationButton.type = "button"; addLocationButton.onclick = function () { addLocation({}); };
        adBox.appendChild(addLocationButton);

        var smsBox = disclosure(card, "SMS / Voice SMS (SMSAPI.pl)");
        var smsUrl = field(smsBox, "SMSAPI URL", sms.url || "https://api.smsapi.pl");
        var smsSender = field(smsBox, "SMS sender", sms.sender || "", { placeholder: "Optional approved sender" });
        var smsLector = field(smsBox, "Voice SMS lector", sms.vmsLector || "ewa", { placeholder: "ewa, maja, jan, jacek, agnieszka" });
        var smsToken = field(smsBox, "SMSAPI OAuth token", "", { type: "password", placeholder: configured.smsApiToken ? "Configured - leave blank to keep" : "Required" });
        smsToken.autocomplete = "new-password";
        var smsExternalToken = field(smsBox, "External send API token", "", { type: "password", placeholder: configured.smsExternalToken ? "Configured - leave blank to keep" : "Optional, minimum 32 characters" });
        smsExternalToken.minLength = 32;
        smsExternalToken.autocomplete = "new-password";
        var smsVerifyTls = checkbox(smsBox, "Verify SMSAPI TLS certificate", sms.verifyTls !== false);

        var smtpBox = disclosure(card, "SMTP Relay");
        var smtpHost = field(smtpBox, "SMTP server", smtp.host || "", { placeholder: "mailrelay.example.local" });
        var smtpPort = field(smtpBox, "SMTP port", smtp.port || 25, { type: "number", min: 1, max: 65535 });
        var smtpFrom = field(smtpBox, "Default sender", smtp.defaultFrom || "", { placeholder: "automation@example.com" });
        var smtpAttachmentRoot = field(smtpBox, "Allowed attachment root", smtp.attachmentRoot || "", { placeholder: "C:\\SIRK\\Attachments" });
        var smtpMaxAttachmentMb = field(smtpBox, "Maximum total attachment size (MB)", smtp.maxAttachmentMb || 25, { type: "number", min: 1, max: 100 });
        var smtpEnableSsl = checkbox(smtpBox, "Enable SMTP TLS/SSL", smtp.enableSsl === true);

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
            integrations.jira = Object.assign({}, jira, {
                url: jiraUrl.value,
                email: jiraEmail.value,
                workspaceId: workspaceId.value,
                cloudId: cloudId.value,
                verifyTls: verifyTls.checked
            });
            integrations.ad = Object.assign({}, ad, {
                domain: adDomain.value,
                login: adLogin.value,
                upnSuffix: adUpnSuffix.value,
                userLocations: locationRows.filter(function (row) { return row.row.isConnected; }).map(function (row) { return { name: row.name.value, dn: row.dn.value }; })
            });
            integrations.sms = Object.assign({}, sms, { url: smsUrl.value, sender: smsSender.value, vmsLector: smsLector.value, verifyTls: smsVerifyTls.checked });
            integrations.smtp = Object.assign({}, smtp, { host: smtpHost.value, port: Number(smtpPort.value), defaultFrom: smtpFrom.value, attachmentRoot: smtpAttachmentRoot.value, maxAttachmentMb: Number(smtpMaxAttachmentMb.value), enableSsl: smtpEnableSsl.checked });
            integrations.entra = Object.assign({}, entra, {
                tenantId: tenantId.value,
                clientId: clientId.value
            });

            var secrets = {};
            if (jiraToken.value) secrets.jiraToken = jiraToken.value;
            if (smsToken.value) secrets.smsApiToken = smsToken.value;
            if (smsExternalToken.value) secrets.smsExternalToken = smsExternalToken.value;
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
                smsToken.value = "";
                smsExternalToken.value = "";
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
