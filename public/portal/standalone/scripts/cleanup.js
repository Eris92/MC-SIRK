(function () {
    "use strict";

    if (window.__sirkPlatformPortalCleanupLoaded) return;
    window.__sirkPlatformPortalCleanupLoaded = true;

    var root = document.getElementById("sirkPortalRoot");
    var core = window.SirkPlatformCore;
    if (!root || !core) return;

    var permissionState = { snapshot: null, pending: Object.create(null), saving: false };
    var approvalState = { settings: null, loading: false, saving: false };
    var PERMISSION_TARGETS = {
        "Urządzenia": { view: "devices" },
        "Commands": { module: "mycommands" },
        "Przenoszenie urządzeń": { module: "moverequests" },
        "Automatyzacja": { module: "myscripts", view: "automation" },
        "Monitoring": { view: "monitoring" },
        "Zasoby": { module: "myjira", view: "assets" },
        "Zarządzanie": { view: "management" },
        "Raporty": { view: "reports" },
        "Bezpieczeństwo": { module: "defendertools", view: "security" }
    };
    var APPROVAL_PROVIDERS = {
        "Commands": { type: "mycommands", title: "Commands" },
        "Przenoszenie urządzeń": { type: "moverequests", title: "Przenoszenie urządzeń" },
        "Automatyzacja": { type: "myscripts", title: "Automatyzacja" }
    };

    function text(pl, en) {
        try { return localStorage.getItem("sirkPortal.language") === "en" ? en : pl; }
        catch (error) { return pl; }
    }

    function addPortalClasses(scope) {
        if (!scope || !scope.querySelectorAll) return;
        Array.prototype.forEach.call(scope.querySelectorAll(".sirk-standalone-view-scroll,.mc-admin-management-shell"), function (shell) {
            shell.classList.add("sirk-standalone-view-scroll");
        });
        Array.prototype.forEach.call(scope.querySelectorAll(".sirk-layout,.mc-admin-management-layout"), function (layout) {
            layout.classList.add("sirk-layout-host", "sirk-layout");
            if (layout.children[0]) layout.children[0].classList.add("sirk-column-primary");
            if (layout.children[1]) layout.children[1].classList.add("sirk-column-secondary");
            if (layout.children[2]) layout.children[2].classList.add("sirk-column-details");
        });
    }

    function apiUrl(action) {
        var url = new URL(window.__SIRK_PLATFORM_API_BASE__ || "/api", window.location.href);
        if (/\/api$/.test(url.pathname.replace(/\/+$/, "")) && action === "portal-admin-snapshot") {
            url.pathname = url.pathname.replace(/\/+$/, "") + "/admin/settings";
            url.search = "";
            return url.href;
        }
        url.searchParams.set("pin", "SIRKPortal");
        if (action) url.searchParams.set("action", action);
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

    function loadPermissionSnapshot() {
        return fetch(apiUrl("portal-admin-snapshot"), {
            credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" }
        }).then(parse).then(function (snapshot) {
            permissionState.snapshot = snapshot;
            return snapshot;
        });
    }

    function settingsContext(workspace) {
        var secondary = workspace && workspace.querySelector(":scope > .sirk-column-secondary");
        var active = secondary && secondary.querySelector(".sirk-settings-nav-leaf.active,.sirk-settings-nav-leaf.is-active");
        var group = active && active.closest("details.sirk-settings-nav-group");
        var summary = group && group.querySelector(":scope > summary");
        return {
            section: String(active && active.textContent || "").trim(),
            module: String(summary && summary.textContent || "").replace(/^\s*[▸▼]?\s*/, "").trim()
        };
    }

    function activePermissionTarget(workspace) {
        var context = settingsContext(workspace);
        if (context.section !== "Permissions" || context.module === "Akceptacje") return null;
        var target = PERMISSION_TARGETS[context.module];
        return target ? { id: target.module ? "module:" + target.module : "view:" + target.view, module: target.module, view: target.view } : null;
    }

    function currentGroupIds(snapshot, target) {
        var settings = snapshot && snapshot.moduleSettings || {};
        if (target.module) return Array.isArray(settings[target.module] && settings[target.module].accessGroupIds) ? settings[target.module].accessGroupIds.map(String) : [];
        var views = settings.portal && settings.portal.views || {};
        return Array.isArray(views[target.view] && views[target.view].accessGroupIds) ? views[target.view].accessGroupIds.map(String) : [];
    }

    function removeGeneralAccessFields(workspace) {
        Array.prototype.forEach.call(workspace.querySelectorAll("[data-settings-field]"), function (field) {
            var label = field.querySelector("[data-settings-field-copy] strong");
            if (String(label && label.textContent || "").trim() === "Access Group Ids") field.remove();
        });
    }

    function renderPermissionGroups(workspace) {
        removeGeneralAccessFields(workspace);
        var target = activePermissionTarget(workspace);
        var form = workspace.querySelector("[data-settings-form]");
        if (!target || !form || form.querySelector("[data-mesh-group-permissions]")) return;
        var draw = function (snapshot) {
            if (!form.isConnected || form.querySelector("[data-mesh-group-permissions]")) return;
            var selected = permissionState.pending[target.id] || currentGroupIds(snapshot, target);
            var card = document.createElement("section");
            card.className = "sirk-card";
            card.setAttribute("data-mesh-group-permissions", target.id);
            card.innerHTML = "<strong>Dostęp grup MeshCentral</strong><small>Wybrane grupy widzą tę zakładkę. Brak wyboru oznacza dostęp dla wszystkich. Site administrator ma dostęp zawsze.</small>";
            var list = document.createElement("div");
            list.style.cssText = "display:grid;gap:8px;margin-top:12px";
            (snapshot.userGroups || []).forEach(function (group) {
                var row = document.createElement("label");
                row.style.cssText = "display:flex;align-items:center;gap:9px";
                var input = document.createElement("input");
                input.type = "checkbox";
                input.value = String(group.id);
                input.checked = selected.indexOf(String(group.id)) >= 0;
                input.onchange = function () {
                    permissionState.pending[target.id] = Array.prototype.filter.call(list.querySelectorAll('input[type="checkbox"]'), function (item) { return item.checked; }).map(function (item) { return item.value; });
                };
                row.appendChild(input);
                row.appendChild(document.createTextNode(group.name + (group.name === group.id ? "" : " (" + group.id + ")")));
                list.appendChild(row);
            });
            card.appendChild(list);
            form.insertBefore(card, form.firstChild);
        };
        if (permissionState.snapshot) draw(permissionState.snapshot);
        else loadPermissionSnapshot().then(draw).catch(function () {});
    }

    function postPermissionPatch(target, groupIds) {
        return loadPermissionSnapshot().then(function (snapshot) {
            var moduleOptions = JSON.parse(JSON.stringify(snapshot.moduleSettings || {}));
            var modules = {};
            (snapshot.modules || []).forEach(function (module) { modules[module.key] = module.enabled === true; });
            if (target.module) {
                moduleOptions[target.module] = moduleOptions[target.module] || {};
                moduleOptions[target.module].accessGroupIds = groupIds;
            } else {
                moduleOptions.portal = moduleOptions.portal || {};
                moduleOptions.portal.views = moduleOptions.portal.views || {};
                moduleOptions.portal.views[target.view] = moduleOptions.portal.views[target.view] || {};
                moduleOptions.portal.views[target.view].accessGroupIds = groupIds;
            }
            var base = new URL(window.__SIRK_PLATFORM_API_BASE__ || "/api", window.location.href);
            if (/\/api$/.test(base.pathname.replace(/\/+$/, ""))) {
                var standalone = new URLSearchParams();
                standalone.set("payload", JSON.stringify({ modules: modules, moduleOptions: moduleOptions, portal: moduleOptions.portal || {}, integrations: snapshot.integrations && snapshot.integrations.values || {}, secrets: {} }));
                return fetch(base.pathname.replace(/\/+$/, "") + "/admin/settings", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "application/json" }, body: standalone.toString() }).then(parse);
            }
            var body = new URLSearchParams();
            body.set("modules", JSON.stringify(modules));
            body.set("moduleOptions", JSON.stringify(moduleOptions));
            body.set("integrations", JSON.stringify(snapshot.integrations && snapshot.integrations.values || {}));
            body.set("secrets", "{}");
            return fetch(apiUrl("save-settings"), { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "application/json" }, body: body.toString() }).then(parse);
        });
    }

    function bindPermissionSave(workspace) {
        if (workspace.getAttribute("data-mesh-permission-save-bound") === "1") return;
        workspace.setAttribute("data-mesh-permission-save-bound", "1");
        workspace.addEventListener("click", function (event) {
            var button = event.target && event.target.closest("button");
            var target = activePermissionTarget(workspace);
            if (!button || !target || String(button.textContent || "").trim() !== "Zapisz") return;
            var selected = permissionState.pending[target.id];
            if (!selected || permissionState.saving) return;
            permissionState.saving = true;
            window.setTimeout(function () {
                postPermissionPatch(target, selected).then(function () { delete permissionState.pending[target.id]; }).catch(function (error) { console.error("Group permissions save failed", error); }).then(function () { permissionState.saving = false; });
            }, 900);
        }, true);
    }

    function loadApprovalSettings(force) {
        if (approvalState.settings && force !== true) return Promise.resolve(approvalState.settings);
        if (approvalState.loading) return new Promise(function (resolve) { window.setTimeout(function () { loadApprovalSettings(force).then(resolve); }, 100); });
        approvalState.loading = true;
        return core.api("approvalcenter", "settings").then(function (result) {
            approvalState.settings = result.settings || result;
            return approvalState.settings;
        }).then(function (value) { approvalState.loading = false; return value; }, function (error) { approvalState.loading = false; throw error; });
    }

    function providerByType(settings, type) {
        return (settings.providers || []).find(function (provider) { return provider.type === type; }) || { type: type, enabled: true, showTab: true, showOverview: true, allowNoApproval: false, levels: { 1: [], 2: [], 3: [] } };
    }

    function saveProvider(provider) {
        return core.post("approvalcenter", "provider-settings", {
            type: provider.type,
            enabled: provider.enabled !== false,
            showTab: provider.showTab !== false,
            showOverview: provider.showOverview !== false,
            allowNoApproval: provider.allowNoApproval === true,
            levels: provider.levels || { 1: [], 2: [], 3: [] }
        }).then(function () { return loadApprovalSettings(true); });
    }

    function booleanField(label, checked, description) {
        var row = document.createElement("label");
        row.className = "sirk-card";
        row.setAttribute("data-settings-field", "boolean");
        var copy = document.createElement("span");
        copy.setAttribute("data-settings-field-copy", "1");
        var strong = document.createElement("strong");
        strong.textContent = label;
        copy.appendChild(strong);
        if (description) { var small = document.createElement("small"); small.textContent = description; copy.appendChild(small); }
        var input = document.createElement("input");
        input.type = "checkbox";
        input.checked = checked === true;
        row.appendChild(copy);
        row.appendChild(input);
        row.input = input;
        return row;
    }

    function injectApprovalToggle(workspace) {
        var context = settingsContext(workspace);
        var mapping = APPROVAL_PROVIDERS[context.module];
        var form = workspace.querySelector("[data-settings-form]");
        if (context.section !== "Ogólne" || !mapping || !form || form.querySelector("[data-approval-provider-toggle]")) return;
        loadApprovalSettings().then(function (settings) {
            if (!form.isConnected || form.querySelector("[data-approval-provider-toggle]")) return;
            var provider = providerByType(settings, mapping.type);
            var row = booleanField("Włącz akceptacje", provider.enabled !== false, "Wnioski tego modułu będą obsługiwane przez moduł Akceptacje.");
            row.setAttribute("data-approval-provider-toggle", mapping.type);
            row.input.onchange = function () {
                row.input.disabled = true;
                provider.enabled = row.input.checked;
                saveProvider(provider).catch(function (error) {
                    row.input.checked = !provider.enabled;
                    provider.enabled = row.input.checked;
                    window.alert(error.message || String(error));
                }).then(function () { row.input.disabled = false; });
            };
            var first = form.querySelector("[data-settings-field]");
            if (first && first.nextSibling) form.insertBefore(row, first.nextSibling); else form.appendChild(row);
        }).catch(function () {});
    }

    function multiSelect(groups, selected) {
        var select = document.createElement("select");
        select.multiple = true;
        select.size = Math.min(8, Math.max(3, groups.length));
        select.style.cssText = "width:100%;min-height:96px";
        groups.forEach(function (group) {
            var option = document.createElement("option");
            option.value = String(group.id);
            option.textContent = group.name;
            option.selected = (selected || []).map(String).indexOf(String(group.id)) >= 0;
            select.appendChild(option);
        });
        return select;
    }

    function renderApprovalPermissions(workspace) {
        var context = settingsContext(workspace);
        if (context.module !== "Akceptacje" || context.section !== "Permissions") return false;
        var details = workspace.querySelector(":scope > .sirk-column-details");
        if (!details || details.getAttribute("data-approval-policy-editor") === "1") return true;
        details.setAttribute("data-approval-policy-editor", "1");
        details.innerHTML = '<div class="sirk-card">Ładowanie polityk akceptacji…</div>';
        loadApprovalSettings(true).then(function (settings) {
            if (!details.isConnected) return;
            details.innerHTML = "";
            var form = document.createElement("div");
            form.setAttribute("data-settings-form", "1");
            var editors = [];
            (settings.providers || []).filter(function (provider) { return provider.enabled !== false; }).forEach(function (provider) {
                var section = document.createElement("section");
                section.className = "sirk-card";
                section.style.cssText = "display:grid;gap:12px";
                var title = document.createElement("h3");
                title.textContent = provider.title || provider.type;
                section.appendChild(title);
                var noApproval = booleanField("Pozwól wykonać bez akceptacji", provider.allowNoApproval === true, "Gdy operacja nie wymaga żadnego poziomu, może zostać wykonana od razu.");
                var showTab = booleanField("Pokaż w Akceptacjach", provider.showTab !== false, "Pokazuje wnioski tego modułu w widoku Akceptacje.");
                var showOverview = booleanField("Pokaż na Overview", provider.showOverview !== false, "Uwzględnia ten typ wniosków na stronie głównej.");
                section.appendChild(noApproval); section.appendChild(showTab); section.appendChild(showOverview);
                var selects = {};
                [1, 2, 3].forEach(function (level) {
                    var label = document.createElement("label");
                    label.style.cssText = "display:grid;gap:6px";
                    var strong = document.createElement("strong");
                    strong.textContent = "Poziom " + level + " — grupy zatwierdzające";
                    label.appendChild(strong);
                    selects[level] = multiSelect(settings.groups || [], provider.levels && (provider.levels[level] || provider.levels[String(level)]) || []);
                    label.appendChild(selects[level]);
                    section.appendChild(label);
                });
                editors.push({ provider: provider, noApproval: noApproval.input, showTab: showTab.input, showOverview: showOverview.input, selects: selects });
                form.appendChild(section);
            });
            if (!editors.length) {
                var empty = document.createElement("div");
                empty.className = "sirk-card";
                empty.textContent = "Żaden moduł nie ma włączonej obsługi akceptacji.";
                form.appendChild(empty);
            }
            var actions = document.createElement("div");
            actions.className = "sirk-toolbar-group sirk-toolbar-left";
            var save = document.createElement("button");
            save.type = "button"; save.className = "sirk-button"; save.textContent = "Zapisz";
            var message = document.createElement("span");
            save.onclick = function () {
                if (approvalState.saving) return;
                approvalState.saving = true; save.disabled = true; message.textContent = "Zapisywanie…";
                Promise.all(editors.map(function (editor) {
                    editor.provider.allowNoApproval = editor.noApproval.checked;
                    editor.provider.showTab = editor.showTab.checked;
                    editor.provider.showOverview = editor.showOverview.checked;
                    editor.provider.levels = editor.provider.levels || {};
                    [1, 2, 3].forEach(function (level) {
                        editor.provider.levels[level] = Array.prototype.filter.call(editor.selects[level].options, function (option) { return option.selected; }).map(function (option) { return option.value; });
                    });
                    return saveProvider(editor.provider);
                })).then(function () { message.textContent = "Zapisano."; }).catch(function (error) { message.textContent = error.message || String(error); message.setAttribute("data-error", "1"); }).then(function () { approvalState.saving = false; save.disabled = false; });
            };
            actions.appendChild(save); actions.appendChild(message);
            details.appendChild(form); details.appendChild(actions);
        }).catch(function (error) { details.innerHTML = '<div class="sirk-card" data-error="1"></div>'; details.firstChild.textContent = error.message || String(error); });
        return true;
    }

    function removeEmptyNotices(workspace) {
        Array.prototype.forEach.call(workspace.querySelectorAll(".sirk-card"), function (node) {
            var value = String(node.textContent || "").trim();
            if (value === "Ten moduł nie ma osobnej konfiguracji Permissions." || value === "Brak ustawień w tej sekcji.") node.remove();
        });
    }

    function injectSettingsContract(frame) {
        if (!frame) return;
        try {
            var doc = frame.contentDocument;
            if (!doc || !doc.head || !doc.body) return;
            var admin = doc.getElementById("sirk-platform-admin");
            if (!admin) return;
            doc.documentElement.classList.add("mc-portal-settings-document");
            doc.documentElement.style.cssText = "width:100%;height:100%;min-width:0;overflow:hidden";
            doc.body.id = doc.body.id || "sirkPortalRoot";
            doc.body.classList.add("mc-portal-settings-body");
            admin.classList.add("mc-admin-portal-embedded");
            addPortalClasses(doc.body);
        } catch (error) {}
    }

    function refresh() {
        addPortalClasses(root);
        var workspace = root.querySelector("[data-portal-settings] .sirk-layout");
        if (workspace) {
            removeEmptyNotices(workspace);
            if (!renderApprovalPermissions(workspace)) {
                renderPermissionGroups(workspace);
                bindPermissionSave(workspace);
                injectApprovalToggle(workspace);
            }
        }
        Array.prototype.forEach.call(root.querySelectorAll(".sirk-standalone-settings-frame"), function (frame) {
            if (frame.getAttribute("data-cleanup-bound") !== "1") {
                frame.setAttribute("data-cleanup-bound", "1");
                frame.addEventListener("load", function () { window.setTimeout(function () { injectSettingsContract(frame); }, 0); });
            }
            injectSettingsContract(frame);
        });
    }

    var scheduled = false;
    new MutationObserver(function () {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(function () { scheduled = false; refresh(); });
    }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    window.addEventListener("sirkportal:languagechange", refresh);
    window.addEventListener("sirkportal:themechange", refresh);
    refresh();
}());