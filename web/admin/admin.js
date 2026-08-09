(function () {
    "use strict";

    var root = document.getElementById("sirk-platform-admin");
    var content = document.getElementById("sirk-platform-admin-content");
    var data = window.SirkPlatformAdminData || {
        modules: [],
        moduleSettings: {},
        integrations: {},
        folderPermissions: {},
        userGroups: [],
        uiSettings: {}
    };
    if (!root || !content) return;

    function colorParts(value) {
        var match = String(value || "").match(/rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)(?:\D+([\d.]+))?/i);
        if (!match || (match[4] != null && Number(match[4]) === 0)) return null;
        return [Number(match[1]), Number(match[2]), Number(match[3])];
    }

    function hostIsDark() {
        var htmlTheme = document.documentElement && document.documentElement.getAttribute("data-bs-theme");
        if (htmlTheme === "dark") return true;
        if (htmlTheme === "light") return false;
        var bodyTheme = document.body && document.body.getAttribute("data-bs-theme");
        if (bodyTheme === "dark") return true;
        if (bodyTheme === "light") return false;
        if (typeof window.nightMode === "boolean") return window.nightMode;
        if (document.body && document.body.classList.contains("night")) return true;
        try {
            var storedMode = window.localStorage && window.localStorage.getItem("nightMode");
            if (storedMode === "1") return true;
            if (storedMode === "2") return false;
            if (storedMode === "0" && window.matchMedia) {
                return window.matchMedia("(prefers-color-scheme: dark)").matches;
            }
        } catch (error) {}

        var bodyStyle = window.getComputedStyle(document.body);
        var background = colorParts(bodyStyle.backgroundColor);
        if (background) return ((background[0] * 299 + background[1] * 587 + background[2] * 114) / 1000) < 145;
        var foreground = colorParts(bodyStyle.color);
        return foreground ? ((foreground[0] * 299 + foreground[1] * 587 + foreground[2] * 114) / 1000) > 160 : false;
    }

    function syncHostTheme() {
        var theme = hostIsDark() ? "dark" : "light";
        root.setAttribute("data-host-theme", theme);
        if (root.parentElement) {
            root.parentElement.classList.add("sirk-admin-host");
            root.parentElement.setAttribute("data-sirk-host-theme", theme);
        }
    }

    function observeHostTheme() {
        syncHostTheme();
        if (typeof MutationObserver === "function") {
            var observer = new MutationObserver(syncHostTheme);
            if (document.documentElement) {
                observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-bs-theme"] });
            }
            if (document.body && document.body !== document.documentElement) {
                observer.observe(document.body, { attributes: true, attributeFilter: ["class", "data-bs-theme"] });
            }
        }
        if (window.matchMedia) {
            var systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
            if (typeof systemTheme.addEventListener === "function") systemTheme.addEventListener("change", syncHostTheme);
            else if (typeof systemTheme.addListener === "function") systemTheme.addListener(syncHostTheme);
        }
    }

    function element(tag, className, text) {
        var value = document.createElement(tag);
        if (className) value.className = className;
        if (text != null) value.textContent = text;
        return value;
    }

    function disclosure(host, className, title, expanded) {
        var details = element("details", (className || "") + " mc-admin-disclosure");
        details.open = expanded === true;
        details.appendChild(element("summary", "mc-admin-disclosure-summary", title));
        host.appendChild(details);
        return details;
    }

    function settings() { return data.moduleSettings || {}; }

    function checked(host, text, value) {
        var label = element("label", "mc-admin-check");
        var input = document.createElement("input");
        input.type = "checkbox";
        input.checked = value !== false;
        label.appendChild(input);
        label.appendChild(document.createTextNode(text));
        host.appendChild(label);
        return input;
    }

    function number(host, text, value, min, max) {
        var label = element("label", "mc-admin-field");
        label.appendChild(element("span", "mc-admin-field-label", text));
        var input = document.createElement("input");
        input.className = "mc-admin-input";
        input.type = "number";
        input.min = min;
        input.max = max;
        input.value = value;
        label.appendChild(input);
        host.appendChild(label);
        return input;
    }

    function select(host, text, choices, selected) {
        var label = element("label", "mc-admin-field");
        label.appendChild(element("span", "mc-admin-field-label", text));
        var input = document.createElement("select");
        input.className = "mc-admin-input";
        choices.forEach(function (choice) {
            var option = element("option", "", choice.label);
            option.value = choice.value;
            input.appendChild(option);
        });
        input.value = selected;
        label.appendChild(input);
        host.appendChild(label);
        return input;
    }

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
        if (!inputs.length) {
            field.appendChild(element("div", "mc-admin-card-description", "No MeshCentral user groups are available. Create a user group in MeshCentral first."));
        }
        host.appendChild(field);
        var getter = function () {
            return inputs.filter(function (input) { return input.checked; }).map(function (input) { return input.value; });
        };
        getter.setDisabled = function (disabled) {
            field.classList.toggle("mc-admin-disabled", disabled === true);
            inputs.forEach(function (input) { input.disabled = disabled === true; });
        };
        return getter;
    }

    function approvalProvider(host, title, source) {
        source = source || {};
        var card = disclosure(host, "mc-admin-provider-card", title, false);
        var enabled = checked(card, "Enable this approval provider", source.enabled !== false);
        var showTab = checked(card, "Show provider tab in Approval Center", source.showTab !== false);
        var showOverview = checked(card, "Show provider in Approval overview", source.showOverview !== false);
        var noApproval = checked(card, "Allow execution without approval", source.allowNoApproval === true);
        card.appendChild(element("p", "mc-admin-card-description", "When enabled, requests without selected approval levels execute immediately."));
        var levels = source.levels || {};
        var level1 = groupLevel(card, "Level 1 approver groups", levels[1] || levels["1"]);
        var level2 = groupLevel(card, "Level 2 approver groups", levels[2] || levels["2"]);
        var level3 = groupLevel(card, "Level 3 approver groups", levels[3] || levels["3"]);
        return function () {
            return {
                enabled: enabled.checked,
                showTab: showTab.checked,
                showOverview: showOverview.checked,
                allowNoApproval: noApproval.checked,
                levels: { 1: level1(), 2: level2(), 3: level3() }
            };
        };
    }

    function folderPermission(host, source) {
        source = source || {};
        var label = source.label || source.key || "Folder";
        var card = disclosure(host, "mc-admin-permission-folder", label, false);
        if (source.key && source.key !== label) card.appendChild(element("div", "mc-admin-permission-key", source.key));
        var enabled = checked(card, "Enable this category or folder", source.enabled !== false);
        var allowAll = checked(card, "Allow every user who has module access", source.configured === false ? true : source.allowAll === true);
        var groups = groupLevel(card, "Allowed MeshCentral user groups", source.groupIds || []);
        function sync() {
            allowAll.disabled = !enabled.checked;
            groups.setDisabled(!enabled.checked || allowAll.checked);
        }
        enabled.onchange = sync;
        allowAll.onchange = sync;
        sync();
        return function () {
            return {
                enabled: enabled.checked,
                allowAll: enabled.checked && allowAll.checked,
                groupIds: enabled.checked && !allowAll.checked ? groups() : []
            };
        };
    }

    function modulePermissions(host, title, source, folders) {
        source = source || {};
        folders = Array.isArray(folders) ? folders : [];
        var configuredRules = source.folderPermissions && typeof source.folderPermissions === "object" && !Array.isArray(source.folderPermissions)
            ? source.folderPermissions
            : {};
        folders = folders.map(function (folder) {
            var item = Object.assign({}, folder || {});
            item.configured = Object.prototype.hasOwnProperty.call(configuredRules, String(item.key || ""));
            return item;
        });

        var card = disclosure(host, "mc-admin-provider-card mc-admin-permission-module", title, false);
        card.appendChild(element("p", "mc-admin-card-description", "Module access is evaluated first. Device permissions configured in MeshCentral are always required as well."));
        var selectedGroups = Array.isArray(source.accessGroupIds) ? source.accessGroupIds : [];
        var restrict = checked(card, "Restrict module access to selected MeshCentral user groups", selectedGroups.length > 0);
        var accessGroups = groupLevel(card, "Groups allowed to open and execute in this module", selectedGroups);
        function syncModule() { accessGroups.setDisabled(!restrict.checked); }
        restrict.onchange = syncModule;
        syncModule();

        var foldersHost = element("div", "mc-admin-permission-folders");
        foldersHost.appendChild(element("h4", "mc-admin-permission-subtitle", "Category and folder access"));
        foldersHost.appendChild(element("p", "mc-admin-card-description", "A disabled category is hidden for non-administrators. When Allow every user is off, select one or more groups."));
        var folderReaders = folders.map(function (folder) {
            return { key: String(folder.key || ""), read: folderPermission(foldersHost, folder) };
        });
        if (!folderReaders.length) {
            foldersHost.appendChild(element("div", "mc-admin-notice", "No folders are currently available. Refresh this page after adding scripts."));
        }
        card.appendChild(foldersHost);

        return function () {
            var selectedAccessGroups = restrict.checked ? accessGroups() : [];
            if (restrict.checked && !selectedAccessGroups.length) {
                throw new Error("Select at least one MeshCentral user group for " + title + " module access.");
            }
            var folderPermissions = {};
            folderReaders.forEach(function (entry) {
                if (entry.key) folderPermissions[entry.key] = entry.read();
            });
            return { accessGroupIds: selectedAccessGroups, folderPermissions: folderPermissions };
        };
    }

    function save(values, status, button) {
        button.disabled = true;
        button.textContent = "Saving…";
        status.className = "mc-admin-save-status";
        status.textContent = "Saving settings…";
        var body = new URLSearchParams();
        body.set("action", "save-settings");
        body.set("modules", JSON.stringify(values.modules || {}));
        body.set("moduleOptions", JSON.stringify(values.moduleOptions || {}));
        var url = new URL("pluginadmin.ashx", window.location.href);
        url.searchParams.set("pin", root.getAttribute("data-plugin") || "SIRKPortal");
        url.searchParams.set("action", "save-settings");
        var controller = typeof AbortController === "function" ? new AbortController() : null;
        var timer = window.setTimeout(function () { if (controller) controller.abort(); }, 15000);

        fetch(url.href, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Accept": "application/json"
            },
            body: body.toString(),
            signal: controller && controller.signal
        })
            .then(function (response) {
                return response.text().then(function (text) {
                    var result;
                    try { result = JSON.parse(text || "{}"); }
                    catch (error) { throw new Error("Server returned an invalid response (HTTP " + response.status + ")."); }
                    if (!response.ok || !result.ok) throw new Error(result.error || "Save failed (HTTP " + response.status + ").");
                    return result;
                });
            })
            .then(function (result) {
                var previousIconMode = window.SirkIconMode && typeof window.SirkIconMode.get === "function"
                    ? window.SirkIconMode.get()
                    : "auto";
                data = result.snapshot;
                window.SirkPlatformAdminData = data;
                var nextIconMode = String(data.uiSettings && data.uiSettings.iconMode || "auto");
                if (previousIconMode !== nextIconMode && window.SirkIconMode && typeof window.SirkIconMode.set === "function") {
                    window.SirkIconMode.set(nextIconMode);
                }
                status.className = "mc-admin-save-status";
                status.textContent = "Saved";
            })
            .catch(function (error) {
                status.textContent = error.message || String(error);
                status.className = "mc-admin-save-status mc-admin-error";
            })
            .then(function () {
                window.clearTimeout(timer);
                button.disabled = false;
                button.textContent = "Save settings";
            });
    }

    function actions(host, values) {
        var row = element("div", "mc-admin-actions");
        var button = element("button", "mc-admin-primary", "Save settings");
        button.type = "button";
        var status = element("span", "mc-admin-save-status", "");
        button.onclick = function () {
            try { save(values(), status, button); }
            catch (error) {
                status.textContent = error.message || String(error);
                status.className = "mc-admin-save-status mc-admin-error";
            }
        };
        row.appendChild(button);
        row.appendChild(status);
        host.appendChild(row);
    }

    function moduleEnabled(key) {
        return (data.modules || []).some(function (item) { return item.key === key && item.enabled === true; });
    }

    function renderGeneral(card) {
        card.appendChild(element("h3", "", "General"));
        card.appendChild(element("p", "mc-admin-card-description", "Select which menu icon family is used independently of the loaded MeshCentral theme."));
        var iconMode = select(card, "Menu icon mode", [
            { value: "auto", label: "Auto" },
            { value: "classic", label: "Classic" },
            { value: "modern", label: "Modern" }
        ], String(data.uiSettings && data.uiSettings.iconMode || "auto"));
        actions(card, function () {
            return { modules: {}, moduleOptions: { general: { iconMode: iconMode.value } } };
        });
    }

    function render(tab) {
        content.innerHTML = "";
        var card = element("section", "mc-admin-card");
        content.appendChild(card);
        var current = settings();

        if (tab === "general") {
            renderGeneral(card);
        } else if (tab === "approvals") {
            card.appendChild(element("h3", "", "Approval Center"));
            card.appendChild(element("p", "mc-admin-card-description", "Approval rules shared by Move Requests, My Commands and My Scripts."));
            var approvals = current.approvals || {};
            var providers = approvals.providers || {};
            var approvalEnabled = checked(card, "Enable Approval Center", moduleEnabled("approvalcenter"));
            var retention = number(card, "Retention days", approvals.retentionDays || 365, 1, 3650);
            var move = approvalProvider(card, "Move Requests", providers.moverequests);
            var commands = approvalProvider(card, "My Commands", providers.mycommands);
            var scripts = approvalProvider(card, "My Scripts", providers.myscripts);
            actions(card, function () {
                return {
                    modules: { approvalcenter: approvalEnabled.checked },
                    moduleOptions: {
                        approvals: {
                            retentionDays: retention.value,
                            providers: { moverequests: move(), mycommands: commands(), myscripts: scripts() }
                        }
                    }
                };
            });
        } else if (tab === "moverequests") {
            card.appendChild(element("h3", "", "Move Request"));
            var enabled = checked(card, "Enable Move Requests", moduleEnabled("moverequests"));
            var hostButton = checked(card, "Show the Move Request button on device pages", !(current.moverequests && current.moverequests.hostButtonEnabled === false));
            actions(card, function () {
                return { modules: { moverequests: enabled.checked }, moduleOptions: { moverequests: { hostButtonEnabled: hostButton.checked } } };
            });
        } else if (tab === "mycommands") {
            card.appendChild(element("h3", "", "My Commands"));
            var commandEnabled = checked(card, "Enable My Commands", moduleEnabled("mycommands"));
            var desktop = checked(card, "Show Commands in Desktop", !(current.mycommands && current.mycommands.showOnDevice === false));
            actions(card, function () {
                return { modules: { mycommands: commandEnabled.checked }, moduleOptions: { mycommands: { showOnDevice: desktop.checked } } };
            });
        } else if (tab === "permissions") {
            card.appendChild(element("h3", "", "Permissions"));
            card.appendChild(element("p", "mc-admin-card-description", "Grant script and command execution through MeshCentral user groups. Add a user to one of the selected groups to give access."));
            var folderData = data.folderPermissions || {};
            var commandPermissions = modulePermissions(card, "My Commands", current.mycommands, folderData.mycommands);
            var scriptPermissions = modulePermissions(card, "My Scripts", current.myscripts, folderData.myscripts);
            actions(card, function () {
                return {
                    modules: {},
                    moduleOptions: {
                        permissions: {
                            mycommands: commandPermissions(),
                            myscripts: scriptPermissions()
                        }
                    }
                };
            });
        } else {
            card.appendChild(element("h3", "", "My Scripts"));
            var scriptEnabled = checked(card, "Enable My Scripts", moduleEnabled("myscripts"));
            actions(card, function () { return { modules: { myscripts: scriptEnabled.checked }, moduleOptions: {} }; });
        }
    }

    function activate(button) {
        root.querySelectorAll("[data-tab]").forEach(function (item) {
            item.classList.toggle("active", item === button);
        });
        render(button.getAttribute("data-tab"));
    }

    root.querySelectorAll("[data-tab]").forEach(function (button) {
        button.onclick = function () { activate(button); };
    });

    observeHostTheme();
    var initial = root.querySelector("[data-tab].active") || root.querySelector("[data-tab]");
    if (initial) activate(initial);
}());
