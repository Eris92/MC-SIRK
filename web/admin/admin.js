(function () {
    "use strict";

    var root = document.getElementById("sirk-platform-admin");
    var content = document.getElementById("sirk-platform-admin-content");
    var data = window.SirkPlatformAdminData || {};
    if (!root || !content) return;

    function node(tag, className, text) {
        var value = document.createElement(tag);
        if (className) value.className = className;
        if (text != null) value.textContent = text;
        return value;
    }

    function pin() { return root.getAttribute("data-plugin") || "SIRKPortal"; }
    function api(action, value) {
        var body = new URLSearchParams();
        body.set("modules", JSON.stringify(value.modules || {}));
        body.set("moduleOptions", JSON.stringify(value.moduleOptions || {}));
        body.set("integrations", JSON.stringify(value.integrations || {}));
        body.set("secrets", "{}");
        var url = new URL("pluginadmin.ashx", window.location.href);
        url.searchParams.set("pin", pin());
        url.searchParams.set("action", action);
        return fetch(url.href, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" }, body: body.toString() })
            .then(function (response) { return response.json(); })
            .then(function (result) { if (!result.ok) throw new Error(result.error || "Save failed."); return result.snapshot; });
    }

    function moduleByKey(key) {
        return (data.modules || []).find(function (item) { return item.key === key; }) || { key: key, name: key, enabled: false, ready: false };
    }

    function clear() { content.innerHTML = ""; }
    function overview() {
        clear();
        var grid = node("div", "mc-admin-grid");
        ["moverequests", "mycommands", "myscripts"].forEach(function (key) {
            var module = moduleByKey(key);
            var card = node("section", "mc-admin-card");
            card.appendChild(node("h3", "", module.name));
            card.appendChild(node("div", module.ready ? "mc-admin-state ready" : "mc-admin-state error", module.ready ? "Ready" : "Error"));
            card.appendChild(node("div", "mc-admin-summary-row", module.enabled ? "Enabled" : "Disabled"));
            grid.appendChild(card);
        });
        content.appendChild(grid);
    }

    function settings() {
        clear();
        var form = node("section", "mc-admin-card");
        form.appendChild(node("h3", "", "Modules"));
        var values = {};
        ["moverequests", "mycommands", "myscripts"].forEach(function (key) {
            var module = moduleByKey(key);
            var label = node("label", "mc-admin-check");
            var input = document.createElement("input");
            input.type = "checkbox";
            input.checked = module.enabled === true;
            values[key] = input;
            label.appendChild(input);
            label.appendChild(document.createTextNode(" Enable " + module.name));
            form.appendChild(label);
        });
        var actions = node("div", "mc-admin-actions");
        var save = node("button", "mc-admin-primary", "Save settings");
        save.type = "button";
        var status = node("span", "mc-admin-save-status", "");
        save.onclick = function () {
            save.disabled = true;
            api("save-settings", {
                modules: { moverequests: values.moverequests.checked, mycommands: values.mycommands.checked, myscripts: values.myscripts.checked },
                moduleOptions: {}, integrations: data.integrations && data.integrations.values || {}
            }).then(function (snapshot) {
                data = snapshot;
                window.SirkPlatformAdminData = data;
                status.textContent = "Saved";
            }).catch(function (error) {
                status.className = "mc-admin-save-status mc-admin-error";
                status.textContent = error.message;
            }).then(function () { save.disabled = false; });
        };
        actions.appendChild(save);
        actions.appendChild(status);
        form.appendChild(actions);
        content.appendChild(form);
    }

    function debug() {
        clear();
        var card = node("section", "mc-admin-card");
        card.appendChild(node("h3", "", "Diagnostics"));
        card.appendChild(node("pre", "mc-admin-log", (data.diagnostics && data.diagnostics.errors) || "No errors."));
        content.appendChild(card);
    }

    root.querySelectorAll("[data-tab]").forEach(function (button) {
        button.onclick = function () {
            root.querySelectorAll("[data-tab]").forEach(function (item) { item.classList.toggle("active", item === button); });
            if (button.getAttribute("data-tab") === "settings") settings();
            else if (button.getAttribute("data-tab") === "debug") debug();
            else overview();
        };
    });
    overview();
}());
