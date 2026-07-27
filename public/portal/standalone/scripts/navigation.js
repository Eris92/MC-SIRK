(function () {
    "use strict";

    var moveSaving = false;

    function asset(name) {
        var base = String(window.__SIRK_PLATFORM_ASSET_BASE__ || "").replace(/\/$/, "");
        var version = encodeURIComponent(String(window.__SIRK_PLATFORM_PORTAL_VERSION__ || ""));
        return base ? base + "/" + name + "?v=" + version : name;
    }

    function workspace() {
        return document.querySelector("[data-portal-settings] .sirk-layout,.sirk-settings-module-workspace");
    }

    function activeGroupLabel(root) {
        var secondary = root && root.querySelector(":scope > .sirk-column-secondary");
        var active = secondary && secondary.querySelector(".sirk-settings-nav-leaf.active,.sirk-settings-nav-leaf.is-active");
        var group = active && active.closest("details.sirk-settings-nav-group");
        var summary = group && group.querySelector(":scope > summary");
        return String(summary && summary.textContent || "").trim();
    }

    function approvalGeneralActive(root) {
        var secondary = root && root.querySelector(":scope > .sirk-column-secondary");
        var active = secondary && secondary.querySelector(".sirk-settings-nav-leaf.active,.sirk-settings-nav-leaf.is-active");
        return !!(active && String(active.textContent || "").trim() === "Ogólne" && activeGroupLabel(root) === "Akceptacje");
    }

    function removeApprovalDuplicates() {
        var root = workspace();
        if (!root || !approvalGeneralActive(root)) return;
        var form = root.querySelector("[data-settings-form]");
        if (!form) return;
        Array.prototype.forEach.call(form.querySelectorAll("[data-settings-section]"), function (section) {
            var summary = section.querySelector(":scope > summary");
            var label = String(summary && summary.textContent || "").trim().toLowerCase();
            if (label === "providers" || label === "moverequests") section.remove();
        });
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

    function saveSnapshot(value, modules, moduleOptions) {
        var base = new URL(window.__SIRK_PLATFORM_API_BASE__ || "/api", window.location.href);
        var clean = base.pathname.replace(/\/+$/, "");
        var integrations = value.integrations && value.integrations.values || {};
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

    function field(label, checked, description) {
        var row = document.createElement("label");
        row.className = "sirk-card";
        row.setAttribute("data-settings-field", "boolean");
        var copy = document.createElement("span");
        copy.setAttribute("data-settings-field-copy", "1");
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
        input.checked = checked;
        row.appendChild(copy);
        row.appendChild(input);
        return { row: row, input: input };
    }

    function groupSelector(title, groups, selected) {
        var card = document.createElement("section");
        card.className = "sirk-card";
        var strong = document.createElement("strong");
        strong.textContent = title;
        card.appendChild(strong);
        var info = document.createElement("small");
        info.textContent = "Brak wyboru oznacza dostęp dla wszystkich. Site administrator ma dostęp zawsze.";
        card.appendChild(info);
        var list = document.createElement("div");
        list.style.cssText = "display:grid;gap:8px;margin-top:12px";
        (groups || []).forEach(function (group) {
            var row = document.createElement("label");
            row.style.cssText = "display:flex;align-items:center;gap:9px";
            var input = document.createElement("input");
            input.type = "checkbox";
            input.value = String(group.id);
            input.checked = selected.indexOf(String(group.id)) >= 0;
            row.appendChild(input);
            var text = document.createElement("span");
            text.textContent = group.name + (group.name === group.id ? "" : " (" + group.id + ")");
            row.appendChild(text);
            list.appendChild(row);
        });
        card.appendChild(list);
        return { card: card, values: function () {
            return Array.prototype.filter.call(list.querySelectorAll('input[type="checkbox"]'), function (input) { return input.checked; })
                .map(function (input) { return input.value; });
        } };
    }

    function setActiveMoveButton(root, button) {
        var secondary = root.querySelector(":scope > .sirk-column-secondary");
        Array.prototype.forEach.call(secondary.querySelectorAll(".sirk-nav-item.active,.sirk-nav-item.is-active"), function (item) {
            item.classList.remove("active", "is-active");
        });
        button.classList.add("active");
        var group = button.closest("details.sirk-settings-nav-group");
        if (group) group.open = true;
    }

    function renderMoveSettings(root, mode, button) {
        setActiveMoveButton(root, button);
        var details = root.querySelector(":scope > .sirk-column-details");
        if (!details) return;
        details.innerHTML = '<div class="sirk-card">Ładowanie…</div>';
        snapshot().then(function (value) {
            if (!details.isConnected) return;
            var moduleOptions = JSON.parse(JSON.stringify(value.moduleSettings || {}));
            var move = moduleOptions.moverequests = moduleOptions.moverequests || {};
            var approval = moduleOptions.approvalcenter = moduleOptions.approvalcenter || {};
            approval.providers = approval.providers || {};
            var provider = approval.providers.moverequests = approval.providers.moverequests || {};
            var modules = {};
            (value.modules || []).forEach(function (item) { modules[item.key] = item.enabled === true; });
            details.innerHTML = "";
            var form = document.createElement("div");
            form.setAttribute("data-settings-form", "1");
            var saveButton = document.createElement("button");
            saveButton.type = "button";
            saveButton.className = "sirk-button";
            saveButton.textContent = "Zapisz";
            var message = document.createElement("span");

            if (mode === "general") {
                var enabled = field("Włącz i pokaż", modules.moverequests === true, "Włącza funkcję przenoszenia urządzeń i pokazuje przycisk w widoku urządzenia.");
                var approvals = field("Włącz akceptacje", provider.enabled !== false, "Wnioski o przeniesienie urządzeń będą obsługiwane przez moduł Akceptacje.");
                form.appendChild(enabled.row);
                form.appendChild(approvals.row);
                saveButton.onclick = function () {
                    if (moveSaving) return;
                    moveSaving = true;
                    saveButton.disabled = true;
                    message.textContent = "Zapisywanie…";
                    modules.moverequests = enabled.input.checked;
                    move.enabled = enabled.input.checked;
                    provider.enabled = approvals.input.checked;
                    saveSnapshot(value, modules, moduleOptions).then(function () {
                        message.textContent = "Zapisano.";
                        moveSaving = false;
                        renderMoveSettings(root, mode, button);
                    }).catch(function (error) {
                        message.textContent = error.message || String(error);
                        saveButton.disabled = false;
                        moveSaving = false;
                    });
                };
            } else {
                var selector = groupSelector("Dostęp grup MeshCentral", value.userGroups || [], Array.isArray(move.accessGroupIds) ? move.accessGroupIds.map(String) : []);
                form.appendChild(selector.card);
                saveButton.onclick = function () {
                    if (moveSaving) return;
                    moveSaving = true;
                    saveButton.disabled = true;
                    message.textContent = "Zapisywanie…";
                    move.accessGroupIds = selector.values();
                    saveSnapshot(value, modules, moduleOptions).then(function () {
                        message.textContent = "Zapisano.";
                        moveSaving = false;
                        renderMoveSettings(root, mode, button);
                    }).catch(function (error) {
                        message.textContent = error.message || String(error);
                        saveButton.disabled = false;
                        moveSaving = false;
                    });
                };
            }

            var actions = document.createElement("div");
            actions.className = "sirk-toolbar-group sirk-toolbar-left";
            actions.appendChild(saveButton);
            actions.appendChild(message);
            details.appendChild(form);
            details.appendChild(actions);
        }).catch(function (error) {
            details.innerHTML = '<div class="sirk-card" data-error="1"></div>';
            details.firstChild.textContent = error.message || String(error);
        });
    }

    function decoupleMoveNavigation() {
        var root = workspace();
        if (!root) return;
        var groups = root.querySelectorAll(".sirk-column-secondary details.sirk-settings-nav-group");
        Array.prototype.forEach.call(groups, function (group) {
            var summary = group.querySelector(":scope > summary");
            if (String(summary && summary.textContent || "").trim() !== "Przenoszenie urządzeń") return;
            Array.prototype.forEach.call(group.querySelectorAll(":scope > .sirk-settings-nav-group-body > .sirk-nav-item"), function (oldButton) {
                if (oldButton.getAttribute("data-independent-move-nav") === "1") return;
                var replacement = oldButton.cloneNode(true);
                replacement.setAttribute("data-independent-move-nav", "1");
                var mode = String(replacement.textContent || "").trim() === "Permissions" ? "permissions" : "general";
                replacement.onclick = function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    renderMoveSettings(root, mode, replacement);
                };
                oldButton.parentNode.replaceChild(replacement, oldButton);
            });
        });
    }

    function startCleanup() {
        var root = document.getElementById("sirkStandaloneContent") || document.documentElement;
        var scheduled = false;
        new MutationObserver(function () {
            if (scheduled) return;
            scheduled = true;
            window.requestAnimationFrame(function () {
                scheduled = false;
                removeApprovalDuplicates();
                decoupleMoveNavigation();
            });
        }).observe(root, { childList: true, subtree: true });
        removeApprovalDuplicates();
        decoupleMoveNavigation();
    }

    var script = document.createElement("script");
    script.src = asset("navigation-base.js");
    script.async = false;
    script.onload = startCleanup;
    (document.head || document.documentElement).appendChild(script);
}());