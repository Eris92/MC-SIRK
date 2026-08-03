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
    function save(values, status, button) {
        button.disabled = true;
        var body = new URLSearchParams();
        body.set("modules", JSON.stringify(values.modules)); body.set("moduleOptions", JSON.stringify(values.moduleOptions));
        body.set("integrations", JSON.stringify(data.integrations && data.integrations.values || {})); body.set("secrets", "{}");
        var url = new URL("pluginadmin.ashx", window.location.href); url.searchParams.set("pin", root.getAttribute("data-plugin") || "SIRKPortal"); url.searchParams.set("action", "save-settings");
        fetch(url.href, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" }, body: body.toString() })
            .then(function (response) { return response.json(); }).then(function (result) { if (!result.ok) throw new Error(result.error || "Save failed."); data = result.snapshot; window.SirkPlatformAdminData = data; status.textContent = "Saved"; })
            .catch(function (error) { status.textContent = error.message || String(error); status.className = "mc-admin-save-status mc-admin-error"; })
            .then(function () { button.disabled = false; });
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
            var retention = number(card, "Retention days", approvals.retentionDays || 365, 1, 3650);
            var move = checked(card, "Enable approvals for Move Requests", !providers.moverequests || providers.moverequests.enabled !== false);
            var commands = checked(card, "Enable approvals for My Commands", !providers.mycommands || providers.mycommands.enabled !== false);
            var scripts = checked(card, "Enable approvals for My Scripts", !providers.myscripts || providers.myscripts.enabled !== false);
            actions(card, function () { return { modules: {}, moduleOptions: { approvals: { retentionDays: retention.value, providers: { moverequests: { enabled: move.checked }, mycommands: { enabled: commands.checked }, myscripts: { enabled: scripts.checked } } } } }; });
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
