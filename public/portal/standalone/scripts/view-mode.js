(function () {
    "use strict";

    function asset(name) {
        var base = String(window.__SIRK_PLATFORM_ASSET_BASE__ || "").replace(/\/$/, "");
        var version = encodeURIComponent(String(window.__SIRK_PLATFORM_PORTAL_VERSION__ || ""));
        return base ? base + "/" + name + "?v=" + version : name;
    }

    var original = document.createElement("script");
    original.src = asset("portal-view-mode-base.js");
    original.async = false;
    (document.head || document.documentElement).appendChild(original);

    var saving = false;

    function workspace() {
        return document.querySelector("[data-portal-settings] .sirk-layout,.sirk-settings-module-workspace");
    }

    function groupByLabel(host, label) {
        var result = null;
        if (!host) return result;
        Array.prototype.some.call(host.querySelectorAll(":scope > details.sirk-settings-nav-group"), function (group) {
            var summary = group.querySelector(":scope > summary");
            if (String(summary && summary.textContent || "").trim() !== label) return false;
            result = group;
            return true;
        });
        return result;
    }

    function apiUrl(action) {
        var url = new URL(window.__SIRK_PLATFORM_API_BASE__ || "/api", window.location.href);
        var clean = url.pathname.replace(/\/+$/, "");
        if (/\/api$/.test(clean)) {
            url.pathname = clean + "/admin/settings";
            url.search = "";
            return url.href;
        }
        url.searchParams.set("pin", "SIRKPortal");
        url.searchParams.set("action", action);
        return url.href;
    }

    function parse(response) {
        return response.text().then(function (body) {
            var value;
            try { value = JSON.parse(body || "{}"); }
            catch (error) { throw new Error("Endpoint ustawień zwrócił odpowiedź inną niż JSON."); }
            if (!response.ok || value.ok === false) throw new Error(value.error && value.error.message || value.error || ("HTTP " + response.status));
            return value.value || value.snapshot || value;
        });
    }

    function snapshot() {
        return fetch(apiUrl("portal-admin-snapshot"), {
            credentials: "same-origin",
            cache: "no-store",
            headers: { Accept: "application/json" }
        }).then(parse);
    }

    function saveSnapshot(value, modules, moduleOptions, integrations) {
        var base = new URL(window.__SIRK_PLATFORM_API_BASE__ || "/api", window.location.href);
        var clean = base.pathname.replace(/\/+$/, "");
        if (/\/api$/.test(clean)) {
            var standalone = new URLSearchParams();
            standalone.set("payload", JSON.stringify({
                modules: modules,
                moduleOptions: moduleOptions,
                portal: moduleOptions.portal || {},
                integrations: integrations,
                secrets: {}
            }));
            return fetch(clean + "/admin/settings", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "application/json" },
                body: standalone.toString()
            }).then(parse);
        }
        var body = new URLSearchParams();
        body.set("modules", JSON.stringify(modules));
        body.set("moduleOptions", JSON.stringify(moduleOptions));
        body.set("integrations", JSON.stringify(integrations));
        body.set("secrets", "{}");
        return fetch(apiUrl("save-settings"), {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "application/json" },
            body: body.toString()
        }).then(parse);
    }

    function setActive(root, button) {
        var secondary = root.querySelector(":scope > .sirk-column-secondary");
        Array.prototype.forEach.call(secondary.querySelectorAll(".sirk-nav-item.active,.sirk-nav-item.is-active"), function (item) {
            item.classList.remove("active", "is-active");
        });
        button.classList.add("active");
        var group = button.closest("details.sirk-settings-nav-group");
        if (group) {
            group.open = true;
            group.setAttribute("data-sirk-independent-open", "1");
        }
    }

    function booleanField(label, checked, description) {
        var row = document.createElement("label");
        row.className = "sirk-card";
        var copy = document.createElement("span");
        var strong = document.createElement("strong");
        strong.textContent = label;
        copy.appendChild(strong);
        if (description) {
            var small = document.createElement("small");
            small.textContent = description;
            copy.appendChild(small);
        }
        var input = document.createElement("input");
        input.type = "checkbox";
        input.checked = checked === true;
        row.appendChild(copy);
        row.appendChild(input);
        return { row: row, input: input };
    }

    function valueField(host, object, key, value) {
        var row = document.createElement("label");
        row.className = "sirk-card";
        var strong = document.createElement("strong");
        strong.textContent = key.replace(/([A-Z])/g, " $1").replace(/^./, function (c) { return c.toUpperCase(); });
        var input = document.createElement(typeof value === "string" && value.length > 120 ? "textarea" : "input");
        if (input.tagName === "INPUT") input.type = typeof value === "number" ? "number" : "text";
        input.value = value == null ? "" : String(value);
        input.oninput = function () { object[key] = typeof value === "number" ? Number(input.value) : input.value; };
        row.appendChild(strong);
        row.appendChild(input);
        host.appendChild(row);
    }

    function objectForm(host, object) {
        object = object && typeof object === "object" && !Array.isArray(object) ? object : {};
        Object.keys(object).sort().forEach(function (key) {
            var value = object[key];
            if (value && typeof value === "object" && !Array.isArray(value)) {
                var section = document.createElement("details");
                section.className = "sirk-settings-section-plain";
                section.open = true;
                var summary = document.createElement("summary");
                summary.textContent = key.replace(/([A-Z])/g, " $1").replace(/^./, function (c) { return c.toUpperCase(); });
                var body = document.createElement("div");
                objectForm(body, value);
                section.appendChild(summary);
                section.appendChild(body);
                host.appendChild(section);
            } else if (typeof value === "boolean") {
                var field = booleanField(key.replace(/([A-Z])/g, " $1").replace(/^./, function (c) { return c.toUpperCase(); }), value);
                field.input.onchange = function () { object[key] = field.input.checked; };
                host.appendChild(field.row);
            } else if (Array.isArray(value)) {
                valueField(host, object, key, value.join(", "));
            } else {
                valueField(host, object, key, value);
            }
        });
    }

    function groupSelector(groups, selected) {
        var card = document.createElement("section");
        card.className = "sirk-card";
        var title = document.createElement("strong");
        title.textContent = "Dostęp grup MeshCentral";
        card.appendChild(title);
        var info = document.createElement("small");
        info.textContent = "Brak wyboru oznacza dostęp dla wszystkich. Site administrator ma dostęp zawsze.";
        card.appendChild(info);
        var list = document.createElement("div");
        list.style.cssText = "display:grid;gap:8px;margin-top:12px";
        (groups || []).forEach(function (group) {
            var row = document.createElement("label");
            var input = document.createElement("input");
            input.type = "checkbox";
            input.value = String(group.id);
            input.checked = selected.indexOf(String(group.id)) >= 0;
            row.appendChild(input);
            row.appendChild(document.createTextNode(" " + group.name));
            list.appendChild(row);
        });
        card.appendChild(list);
        return {
            card: card,
            values: function () {
                return Array.prototype.filter.call(list.querySelectorAll("input"), function (input) { return input.checked; })
                    .map(function (input) { return input.value; });
            }
        };
    }

    function renderMove(root, mode, button) {
        setActive(root, button);
        var details = root.querySelector(":scope > .sirk-column-details");
        details.innerHTML = '<div class="sirk-card">Ładowanie…</div>';
        snapshot().then(function (value) {
            var modules = {};
            (value.modules || []).forEach(function (item) { modules[item.key] = item.enabled === true; });
            var moduleOptions = JSON.parse(JSON.stringify(value.moduleSettings || {}));
            var move = moduleOptions.moverequests = moduleOptions.moverequests || {};
            var approval = moduleOptions.approvalcenter = moduleOptions.approvalcenter || {};
            approval.providers = approval.providers || {};
            var provider = approval.providers.moverequests = approval.providers.moverequests || {};
            var integrations = value.integrations && value.integrations.values || {};
            details.innerHTML = "";
            var form = document.createElement("div");
            var save = document.createElement("button");
            save.type = "button";
            save.className = "sirk-button";
            save.textContent = "Zapisz";
            var message = document.createElement("span");
            if (mode === "general") {
                var enabled = booleanField("Włącz i pokaż", modules.moverequests === true, "Włącza przenoszenie urządzeń i pokazuje przycisk w widoku urządzenia.");
                var approvals = booleanField("Włącz akceptacje", provider.enabled !== false, "Wnioski o przeniesienie będą obsługiwane przez Akceptacje.");
                form.appendChild(enabled.row);
                form.appendChild(approvals.row);
                save.onclick = function () {
                    if (saving) return;
                    saving = true;
                    save.disabled = true;
                    message.textContent = "Zapisywanie…";
                    modules.moverequests = enabled.input.checked;
                    move.enabled = enabled.input.checked;
                    provider.enabled = approvals.input.checked;
                    saveSnapshot(value, modules, moduleOptions, integrations).then(function () {
                        saving = false;
                        renderMove(root, mode, button);
                    }).catch(function (error) {
                        saving = false;
                        save.disabled = false;
                        message.textContent = error.message || String(error);
                    });
                };
            } else {
                var selector = groupSelector(value.userGroups || [], Array.isArray(move.accessGroupIds) ? move.accessGroupIds.map(String) : []);
                form.appendChild(selector.card);
                save.onclick = function () {
                    if (saving) return;
                    saving = true;
                    save.disabled = true;
                    message.textContent = "Zapisywanie…";
                    move.accessGroupIds = selector.values();
                    saveSnapshot(value, modules, moduleOptions, integrations).then(function () {
                        saving = false;
                        renderMove(root, mode, button);
                    }).catch(function (error) {
                        saving = false;
                        save.disabled = false;
                        message.textContent = error.message || String(error);
                    });
                };
            }
            details.appendChild(form);
            details.appendChild(save);
            details.appendChild(message);
        }).catch(function (error) {
            details.innerHTML = '<div class="sirk-card" data-error="1"></div>';
            details.firstChild.textContent = error.message || String(error);
        });
    }

    function renderIntegration(root, key, button) {
        setActive(root, button);
        var details = root.querySelector(":scope > .sirk-column-details");
        details.innerHTML = '<div class="sirk-card">Ładowanie…</div>';
        snapshot().then(function (value) {
            var modules = {};
            (value.modules || []).forEach(function (item) { modules[item.key] = item.enabled === true; });
            var moduleOptions = JSON.parse(JSON.stringify(value.moduleSettings || {}));
            var integrations = JSON.parse(JSON.stringify(value.integrations && value.integrations.values || {}));
            integrations[key] = integrations[key] && typeof integrations[key] === "object" ? integrations[key] : {};
            details.innerHTML = "";
            var form = document.createElement("div");
            form.setAttribute("data-settings-form", "1");
            objectForm(form, integrations[key]);
            var save = document.createElement("button");
            save.type = "button";
            save.className = "sirk-button";
            save.textContent = "Zapisz";
            var message = document.createElement("span");
            save.onclick = function () {
                if (saving) return;
                saving = true;
                save.disabled = true;
                message.textContent = "Zapisywanie…";
                saveSnapshot(value, modules, moduleOptions, integrations).then(function () {
                    saving = false;
                    renderIntegration(root, key, button);
                }).catch(function (error) {
                    saving = false;
                    save.disabled = false;
                    message.textContent = error.message || String(error);
                });
            };
            details.appendChild(form);
            details.appendChild(save);
            details.appendChild(message);
        }).catch(function (error) {
            details.innerHTML = '<div class="sirk-card" data-error="1"></div>';
            details.firstChild.textContent = error.message || String(error);
        });
    }

    function removeApprovalProviders(root) {
        var secondary = root.querySelector(":scope > .sirk-column-secondary");
        var details = root.querySelector(":scope > .sirk-column-details");
        if (!secondary || !details) return;
        var active = secondary.querySelector(".sirk-settings-nav-leaf.active,.sirk-settings-nav-leaf.is-active,.sirk-nav-item.active,.sirk-nav-item.is-active");
        if (!active || String(active.textContent || "").trim() !== "Ogólne") return;
        var group = active.closest("details.sirk-settings-nav-group");
        var summary = group && group.querySelector(":scope > summary");
        if (String(summary && summary.textContent || "").trim() !== "Akceptacje") return;
        var form = details.querySelector("[data-settings-form]") || details;
        Array.prototype.forEach.call(form.querySelectorAll("details,section"), function (section) {
            var sectionSummary = section.querySelector(":scope > summary");
            if (String(sectionSummary && sectionSummary.textContent || "").trim().toLowerCase() === "providers") section.remove();
        });
    }

    function decouple() {
        var root = workspace();
        if (!root) return;
        var secondary = root.querySelector(":scope > .sirk-column-secondary");
        if (!secondary) return;
        var modules = groupByLabel(secondary, "Moduły");
        var modulesBody = modules && modules.querySelector(":scope > .sirk-settings-nav-group-body");
        var move = groupByLabel(modulesBody, "Przenoszenie urządzeń");
        if (move) {
            Array.prototype.forEach.call(move.querySelectorAll(":scope > .sirk-settings-nav-group-body > .sirk-nav-item"), function (oldButton) {
                if (oldButton.getAttribute("data-independent-move") === "1") return;
                var button = oldButton.cloneNode(true);
                button.setAttribute("data-independent-move", "1");
                var mode = String(button.textContent || "").trim() === "Permissions" ? "permissions" : "general";
                button.onclick = function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    renderMove(root, mode, button);
                };
                oldButton.parentNode.replaceChild(button, oldButton);
            });
        }
        var integrationsGroup = groupByLabel(secondary, "Integracje");
        if (integrationsGroup) {
            if (integrationsGroup.getAttribute("data-sirk-independent-open") === "1") integrationsGroup.open = true;
            Array.prototype.forEach.call(integrationsGroup.querySelectorAll(":scope > .sirk-settings-nav-group-body > .sirk-nav-item"), function (oldButton) {
                if (oldButton.getAttribute("data-independent-integration") === "1") return;
                var button = oldButton.cloneNode(true);
                var key = String(oldButton.getAttribute("data-integration-nav") || oldButton.textContent || "").trim().toLowerCase();
                button.setAttribute("data-independent-integration", "1");
                button.onclick = function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    integrationsGroup.open = true;
                    integrationsGroup.setAttribute("data-sirk-independent-open", "1");
                    renderIntegration(root, key, button);
                };
                oldButton.parentNode.replaceChild(button, oldButton);
            });
        }
        removeApprovalProviders(root);
    }

    var root = document.getElementById("sirkStandaloneContent") || document.documentElement;
    var scheduled = false;
    new MutationObserver(function () {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(function () {
            scheduled = false;
            decouple();
        });
    }).observe(root, { childList: true, subtree: true });
    window.setInterval(decouple, 500);
    decouple();
}());
