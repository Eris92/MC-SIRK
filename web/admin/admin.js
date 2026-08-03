(function () {
    "use strict";
    var root = document.getElementById("sirk-platform-admin");
    var content = document.getElementById("sirk-platform-admin-content");
    var data = window.SirkPlatformAdminData || { modules: [], moduleSettings: {}, integrations: {} };
    if (!root || !content) return;

    function element(tag, className, text) { var value = document.createElement(tag); if (className) value.className = className; if (text != null) value.textContent = text; return value; }
    function settings() { return data.moduleSettings || {}; }
    function checked(host, text, value) { var label = element("label", "mc-admin-check"); var input = document.createElement("input"); input.type = "checkbox"; input.checked = value !== false; label.appendChild(input); label.appendChild(document.createTextNode(text)); host.appendChild(label); return input; }
    function number(host, text, value, min, max) { var label = element("label", "mc-admin-field"); label.appendChild(element("span", "mc-admin-field-label", text)); var input = document.createElement("input", "mc-admin-input"); input.type = "number"; input.min = min; input.max = max; input.value = value; label.appendChild(input); host.appendChild(label); return input; }
    function groupLevel(host, text, selected) {
        var field = element("fieldset", "mc-admin-groups-field");
        field.appendChild(element("legend", "mc-admin-field-label", text));
        selected = Array.isArray(selected) ? selected.map(String) : [];
        var inputs = [];
        (data.userGroups || []).forEach(function (group) {
            var label = element("label", "mc-admin-check");
            var input = document.createElement("input");
            input.type = "checkbox";
            input.value = String(group.id || group._id || "");
            input.checked = selected.indexOf(input.value) >= 0;
            label.appendChild(input);
            label.appendChild(document.createTextNode(group.name || group.title || input.value));
            field.appendChild(label);
            inputs.push(input);
        });
        if (!inputs.length) field.appendChild(element("div", "mc-admin-card-description", "No MeshCentral user groups are available."));
        host.appendChild(field);
        return function () { return inputs.filter(function (input) { return input.checked; }).map(function (input) { return input.value; }); };
    }
    function approvalProvider(host, title, source) {
        source = source || {};
        var card = element("section", "mc-admin-provider-card");
        card.appendChild(element("h4", "", title));
        var enabled = checked(card, "Enable this approval provider", source.enabled !== false);
        var showTab = checked(card, "Show provider tab in Approval Center", source.showTab !== false);
        var showOverview = checked(card, "Show provider in Approval overview", source.showOverview !== false);
        var noApproval = checked(card, "Allow execution without approval", source.allowNoApproval === true);
        card.appendChild(element("p", "mc-admin-card-description", "When enabled, requests without selected approval levels execute immediately."));
        var levels = source.levels || {};
        var level1 = groupLevel(card, "Level 1 approver groups", levels[1] || levels["1"]);
        var level2 = groupLevel(card, "Level 2 approver groups", levels[2] || levels["2"]);
        var level3 = groupLevel(card, "Level 3 approver groups", levels[3] || levels["3"]);
        host.appendChild(card);
        return function () {
            return { enabled: enabled.checked, showTab: showTab.checked, showOverview: showOverview.checked, allowNoApproval: noApproval.checked, levels: { 1: level1(), 2: level2(), 3: level3() } };
        };
    }
    function save(values, status, button) {
        button.disabled = true;
        button.textContent = "Saving…";
        status.className = "mc-admin-save-status";
        status.textContent = "Saving settings…";
        var body = new URLSearchParams();
        body.set("action", "save-settings"); body.set("modules", JSON.stringify(values.modules)); body.set("moduleOptions", JSON.stringify(values.moduleOptions));
        var url = new URL("pluginadmin.ashx", window.location.href); url.searchParams.set("pin", root.getAttribute("data-plugin") || "SIRKPortal"); url.searchParams.set("action", "save-settings");
        var controller = typeof AbortController === "function" ? new AbortController() : null;
        var timer = window.setTimeout(function () { if (controller) controller.abort(); }, 15000);
        fetch(url.href, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "Accept": "application/json" }, body: body.toString(), signal: controller && controller.signal })
            .then(function (response) { return response.text().then(function (text) { var result; try { result = JSON.parse(text || "{}"); } catch (error) { throw new Error("Server returned an invalid response (HTTP " + response.status + ")."); } if (!response.ok || !result.ok) throw new Error(result.error || "Save failed (HTTP " + response.status + ")."); return result; }); })
            .then(function (result) { data = result.snapshot; window.SirkPlatformAdminData = data; status.className = "mc-admin-save-status"; status.textContent = "Saved"; })
            .catch(function (error) { status.textContent = error.message || String(error); status.className = "mc-admin-save-status mc-admin-error"; })
            .then(function () { window.clearTimeout(timer); button.disabled = false; button.textContent = "Save settings"; });
    }
    function actions(host, values) { var row = element("div", "mc-admin-actions"); var button = element("button", "mc-admin-primary", "Save settings"); button.type = "button"; var status = element("span", "mc-admin-save-status", ""); button.onclick = function () { save(values(), status, button); }; row.appendChild(button); row.appendChild(status); host.appendChild(row); }
    function moduleEnabled(key) { return (data.modules || []).some(function (item) { return item.key === key && item.enabled === true; }); }
    function render(tab) {
        content.innerHTML = "";
        var card = element("section", "mc-admin-card"); content.appendChild(card);
        var current = settings();
        if (tab === "approvals") {
            card.appendChild(element("h3", "", "Approval Center"));
            card.appendChild(element("p", "mc-admin-card-description", "Approval rules shared by Move Requests, My Commands and My Scripts."));
            var approvals = current.approvals || {}; var providers = approvals.providers || {};
            var approvalEnabled = checked(card, "Enable Approval Center", moduleEnabled("approvalcenter"));
            var retention = number(card, "Retention days", approvals.retentionDays || 365, 1, 3650);
            var move = approvalProvider(card, "Move Requests", providers.moverequests);
            var commands = approvalProvider(card, "My Commands", providers.mycommands);
            var scripts = approvalProvider(card, "My Scripts", providers.myscripts);
            actions(card, function () { return { modules: { approvalcenter: approvalEnabled.checked }, moduleOptions: { approvals: { retentionDays: retention.value, providers: { moverequests: move(), mycommands: commands(), myscripts: scripts() } } } }; });
        } else if (tab === "moverequests") {
            card.appendChild(element("h3", "", "Move Request"));
            var enabled = checked(card, "Enable Move Requests", moduleEnabled("moverequests"));
            var hostButton = checked(card, "Show the Move Request button on device pages", !(current.moverequests && current.moverequests.hostButtonEnabled === false));
            actions(card, function () { return { modules: { moverequests: enabled.checked }, moduleOptions: { moverequests: { hostButtonEnabled: hostButton.checked } } }; });
        } else if (tab === "mycommands") {
            card.appendChild(element("h3", "", "My Commands"));
            var commandEnabled = checked(card, "Enable My Commands", moduleEnabled("mycommands"));
            var desktop = checked(card, "Show Commands in Desktop", !(current.mycommands && current.mycommands.showOnDevice === false));
            actions(card, function () { return { modules: { mycommands: commandEnabled.checked }, moduleOptions: { mycommands: { showOnDevice: desktop.checked } } }; });
        } else {
            card.appendChild(element("h3", "", "My Scripts"));
            var scriptEnabled = checked(card, "Enable My Scripts", moduleEnabled("myscripts"));
            actions(card, function () { return { modules: { myscripts: scriptEnabled.checked }, moduleOptions: {} }; });
        }
    }
    root.querySelectorAll("[data-tab]").forEach(function (button) { button.onclick = function () { root.querySelectorAll("[data-tab]").forEach(function (item) { item.classList.toggle("active", item === button); }); render(button.getAttribute("data-tab")); }; });
    render("approvals");
}());
