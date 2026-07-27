(function () {
    "use strict";

    if (window.__sirkPlatformPortalCleanupLoaded) return;
    window.__sirkPlatformPortalCleanupLoaded = true;

    var root = document.getElementById("sirkPortalRoot");
    if (!root) return;

    var permissionState = { snapshot: null, pending: Object.create(null), saving: false };
    var PERMISSION_TARGETS = {
        "Urządzenia": { view: "devices" },
        "Commands": { module: "mycommands" },
        "Akceptacje": { module: "approvalcenter", view: "approvals" },
        "Przenoszenie urządzeń": { module: "moverequests" },
        "Automatyzacja": { module: "myscripts", view: "automation" },
        "Monitoring": { view: "monitoring" },
        "Zasoby": { module: "myjira", view: "assets" },
        "Zarządzanie": { view: "management" },
        "Raporty": { view: "reports" },
        "Bezpieczeństwo": { module: "defendertools", view: "security" }
    };

    function addPortalClasses(scope) {
        if (!scope || !scope.querySelectorAll) return;
        Array.prototype.forEach.call(scope.querySelectorAll(
            ".sirk-standalone-view-scroll,.sirk-standalone-view-scroll,.mc-admin-management-shell"
        ), function (shell) {
            shell.classList.add("sirk-standalone-view-scroll");
        });
        Array.prototype.forEach.call(scope.querySelectorAll(
            ".sirk-layout,.mc-admin-management-layout"
        ), function (layout) {
            layout.classList.add("sirk-layout-host", "sirk-layout");
            if (layout.children[0]) layout.children[0].classList.add("sirk-column-primary");
            if (layout.children[1]) layout.children[1].classList.add("sirk-column-secondary");
            if (layout.children[2]) layout.children[2].classList.add("sirk-column-details");
        });
    }

    function apiUrl(action) {
        var url = new URL(window.__SIRK_PLATFORM_API_BASE__ || "/api", window.location.href);
        if (url.pathname.replace(/\/+$/, "") === "/api" && action === "portal-admin-snapshot") {
            url.pathname = "/api/admin/settings";
            return url.href;
        }
        url.searchParams.set("pin", "SIRKPortal");
        if (action) url.searchParams.set("action", action);
        return url.href;
    }

    function parse(response) {
        return response.text().then(function (text) {
            var value = JSON.parse(text || "{}");
            if (!response.ok || value.ok === false) throw new Error(value.error || ("HTTP " + response.status));
            return value.value ? value.value : (value.snapshot || value);
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

    function activePermissionTarget(workspace) {
        var secondary = workspace && workspace.querySelector(":scope > .sirk-column-secondary");
        if (!secondary) return null;
        var active = secondary.querySelector(".sirk-settings-nav-leaf.active,.sirk-settings-nav-leaf.is-active");
        if (!active || String(active.textContent || "").trim() !== "Permissions") return null;
        var group = active.closest("details.sirk-settings-nav-group");
        var summary = group && group.querySelector(":scope > summary");
        var label = String(summary && summary.textContent || "").replace(/^\s*[▸▼]?\s*/, "").trim();
        var target = PERMISSION_TARGETS[label];
        if (!target) return null;
        return { id: target.module ? "module:" + target.module : "view:" + target.view, label: label, module: target.module, view: target.view };
    }

    function currentGroupIds(snapshot, target) {
        var settings = snapshot && snapshot.moduleSettings || {};
        if (target.module) return Array.isArray(settings[target.module] && settings[target.module].accessGroupIds)
            ? settings[target.module].accessGroupIds.map(String) : [];
        var views = settings.portal && settings.portal.views || {};
        return Array.isArray(views[target.view] && views[target.view].accessGroupIds)
            ? views[target.view].accessGroupIds.map(String) : [];
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
            card.setAttribute("data-search-item", "1");
            var title = document.createElement("strong");
            title.textContent = "Dostęp grup MeshCentral";
            card.appendChild(title);
            var info = document.createElement("small");
            info.textContent = "Wybrane grupy widzą tę zakładkę. Brak wyboru oznacza dostęp dla wszystkich. Site administrator ma dostęp zawsze.";
            card.appendChild(info);
            var list = document.createElement("div");
            list.style.cssText = "display:grid;gap:8px;margin-top:12px";
            var groups = snapshot.userGroups || [];
            if (!groups.length) {
                var empty = document.createElement("div");
                empty.textContent = "Nie znaleziono grup użytkowników w MeshCentral.";
                list.appendChild(empty);
            }
            groups.forEach(function (group) {
                var row = document.createElement("label");
                row.style.cssText = "display:flex;align-items:center;gap:9px";
                var input = document.createElement("input");
                input.type = "checkbox";
                input.value = String(group.id);
                input.checked = selected.indexOf(String(group.id)) >= 0;
                input.onchange = function () {
                    permissionState.pending[target.id] = Array.prototype.filter.call(list.querySelectorAll('input[type="checkbox"]'), function (item) {
                        return item.checked;
                    }).map(function (item) { return item.value; });
                };
                row.appendChild(input);
                var text = document.createElement("span");
                text.textContent = group.name + (group.name === group.id ? "" : " (" + group.id + ")");
                row.appendChild(text);
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
            if (base.pathname.replace(/\/+$/, "") === "/api") {
                var body = new URLSearchParams();
                body.set("payload", JSON.stringify({
                    modules: modules,
                    moduleOptions: moduleOptions,
                    portal: moduleOptions.portal || {},
                    integrations: snapshot.integrations && snapshot.integrations.values || {},
                    secrets: {}
                }));
                return fetch(new URL("/api/admin/settings", window.location.href).href, {
                    method: "POST", credentials: "same-origin",
                    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" }, body: body.toString()
                }).then(parse);
            }
            var form = new URLSearchParams();
            form.set("modules", JSON.stringify(modules));
            form.set("moduleOptions", JSON.stringify(moduleOptions));
            form.set("integrations", JSON.stringify(snapshot.integrations && snapshot.integrations.values || {}));
            form.set("secrets", "{}");
            return fetch(apiUrl("save-settings"), {
                method: "POST", credentials: "same-origin",
                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" }, body: form.toString()
            }).then(parse);
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
                postPermissionPatch(target, selected).then(function () {
                    delete permissionState.pending[target.id];
                }).catch(function (error) {
                    if (window.console && console.error) console.error("Group permissions save failed", error);
                }).then(function () { permissionState.saving = false; });
            }, 1200);
        }, true);
    }

    function injectSettingsContract(frame) {
        if (!frame) return;
        try {
            var doc = frame.contentDocument;
            if (!doc || !doc.head || !doc.body) return;
            var admin = doc.getElementById("sirk-platform-admin");
            if (!admin) return;

            doc.documentElement.classList.add("mc-portal-settings-document");
            doc.documentElement.style.width = "100%";
            doc.documentElement.style.height = "100%";
            doc.documentElement.style.minWidth = "0";
            doc.documentElement.style.overflow = "hidden";
            doc.body.id = doc.body.id || "sirkPortalRoot";
            doc.body.classList.add("mc-portal-settings-body");
            admin.classList.add("mc-admin-portal-embedded");

            if (!doc.getElementById("sirk-platform-portal-settings-cleanup-style")) {
                var style = doc.createElement("style");
                style.id = "sirk-platform-portal-settings-cleanup-style";
                style.textContent = [
                    "html,body{width:100%!important;height:100%!important;min-width:0!important;margin:0!important;overflow:hidden!important;background:var(--sirk-panel,#fff)!important;}",
                    "body{display:block!important;}",
                    "#sirk-platform-admin{width:100%!important;max-width:none!important;height:100%!important;min-width:0!important;margin:0!important;padding:0!important;overflow:hidden!important;}",
                    ".mc-admin-shell{display:grid!important;grid-template-columns:184px minmax(0,1fr)!important;width:100%!important;max-width:none!important;height:100%!important;min-width:0!important;min-height:0!important;gap:0!important;overflow:hidden!important;}",
                    ".mc-admin-shell.has-middle{grid-template-columns:184px 236px minmax(0,1fr)!important;}",
                    ".mc-admin-tabs,.mc-admin-middle,#sirk-platform-admin-content{min-width:0!important;min-height:0!important;height:100%!important;overflow:auto!important;box-sizing:border-box!important;}",
                    ".mc-admin-tabs,.mc-admin-middle{padding:12px!important;border:0!important;border-right:1px solid var(--sirk-border,#dce3ec)!important;border-radius:0!important;background:var(--sirk-panel,#fff)!important;}",
                    "#sirk-platform-admin-content{padding:18px!important;background:var(--sirk-panel,#fff)!important;}",
                    ".mc-admin-grid{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))!important;gap:12px!important;}",
                    ".mc-admin-card{margin:0 0 12px!important;padding:14px!important;border:1px solid var(--sirk-border,#dce3ec)!important;border-radius:8px!important;background:var(--sirk-panel,#fff)!important;}",
                    ".mc-admin-settings-layout{grid-template-columns:220px minmax(0,1fr)!important;width:100%!important;min-width:0!important;gap:14px!important;}",
                    ".mc-admin-portal-view{grid-template-columns:minmax(140px,.7fr) minmax(180px,1fr) minmax(180px,1fr) minmax(220px,1.2fr)!important;}",
                    "@media(max-width:900px){.mc-admin-shell,.mc-admin-shell.has-middle{grid-template-columns:1fr!important;overflow:auto!important}.mc-admin-tabs,.mc-admin-middle{height:auto!important;border-right:0!important;border-bottom:1px solid var(--sirk-border,#dce3ec)!important}.mc-admin-settings-layout{grid-template-columns:1fr!important}}"
                ].join("");
                doc.head.appendChild(style);
            }

            var dark = root.classList.contains("sirk-theme-dark");
            doc.documentElement.classList.toggle("sirk-theme-dark", dark);
            doc.documentElement.classList.toggle("sirk-theme-light", !dark);
            doc.body.classList.toggle("sirk-theme-dark", dark);
            doc.body.classList.toggle("sirk-theme-light", !dark);

            var computed = window.getComputedStyle(root);
            ["--sirk-panel", "--sirk-input", "--sirk-text", "--sirk-muted", "--sirk-border", "--sirk-active-accent"].forEach(function (name) {
                var value = computed.getPropertyValue(name);
                if (value) doc.body.style.setProperty(name, value.trim());
            });

            addPortalClasses(doc.body);
        } catch (error) {
            if (window.console && console.warn) console.warn("Settings cleanup failed", error);
        }
    }

    function refresh() {
        addPortalClasses(root);
        var workspace = root.querySelector("[data-portal-settings] .sirk-layout");
        if (workspace) {
            renderPermissionGroups(workspace);
            bindPermissionSave(workspace);
        }
        Array.prototype.forEach.call(root.querySelectorAll(".sirk-standalone-settings-frame"), function (frame) {
            if (frame.getAttribute("data-cleanup-bound") !== "1") {
                frame.setAttribute("data-cleanup-bound", "1");
                frame.addEventListener("load", function () {
                    window.setTimeout(function () { injectSettingsContract(frame); }, 0);
                    window.setTimeout(function () { injectSettingsContract(frame); }, 250);
                });
            }
            injectSettingsContract(frame);
        });
    }

    var scheduled = false;
    var observer = new MutationObserver(function () {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(function () {
            scheduled = false;
            refresh();
        });
    });
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener("sirkportal:languagechange", refresh);
    window.addEventListener("sirkportal:themechange", refresh);
    refresh();
}());
