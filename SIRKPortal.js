"use strict";

var fs = require("fs");
var path = require("path");
var implementation = require("./plugin-main-standalone.js");
var routeCompat = require("./server/core/express-route-compat.js");
var shared = require("./server/core/shared.js");

function replaceInFile(file, broken, fixed) {
    try {
        var source = fs.readFileSync(file, "utf8");
        if (source.indexOf(broken) >= 0) fs.writeFileSync(file, source.split(broken).join(fixed), "utf8");
    } catch (error) {}
}

function repairGeneratedPortalAssets() {
    replaceInFile(path.join(__dirname, "public", "portal", "management.js"), "(script.requiresApproval ? ' sirk-script-approval-icon' : '')\">'", "(script.requiresApproval ? ' sirk-script-approval-icon' : '') + '\">'");
    replaceInFile(path.join(__dirname, "public", "portal", "standalone", "scripts", "app.js"), "itemStatus '\">'", "itemStatus + '\">'");
    replaceInFile(path.join(__dirname, "public", "shared", "icon-registry.js"), "safeClass\" viewBox", "safeClass + '\" viewBox");

    var appFile = path.join(__dirname, "public", "portal", "standalone", "scripts", "app.js");
    var oldSettings = '    function settings() {\n' +
        '        var portal = moduleState("portal") || {};\n' +
        '        var access = portal.access || bootstrap && bootstrap.access || {};\n' +
        '        if (access.siteAdmin !== true) { showError(t("settingsAdminOnly")); return; }\n' +
        '        var host = prepareModuleHost("settings");\n' +
        '        var shell = document.createElement("section");\n' +
        '        shell.className = "sirk-standalone-view-scroll sirk-settings-module-shell";\n' +
        '        var toolbar = document.createElement("header");\n' +
        '        toolbar.className = "sirk-toolbar-host sirk-settings-module-toolbar";\n' +
        '        toolbar.innerHTML = \'<strong>\' + escapeHtml(viewName("settings")) + \'</strong>\';\n' +
        '        var workspace = document.createElement("div");\n' +
        '        workspace.className = "sirk-layout-host sirk-settings-module-workspace";\n' +
        '        var frame = document.createElement("iframe");\n' +
        '        frame.className = "sirk-standalone-settings-frame";\n' +
        '        frame.title = "SirkPlatform settings";\n' +
        '        var url = new URL(window.__SIRK_PLATFORM_API_BASE__, window.location.href);\n' +
        '        url.searchParams.set("pin", "SIRKPortal");\n' +
        '        frame.src = url.href;\n' +
        '        workspace.appendChild(frame);\n' +
        '        shell.appendChild(toolbar);\n' +
        '        shell.appendChild(workspace);\n' +
        '        host.appendChild(shell);\n' +
        '    }';
    var newSettings = '    function settings() {\n' +
        '        var portal = moduleState("portal") || {};\n' +
        '        var access = portal.access || bootstrap && bootstrap.access || {};\n' +
        '        if (access.siteAdmin !== true) { showError(t("settingsAdminOnly")); return; }\n' +
        '        var host = prepareModuleHost("settings");\n' +
        '        if (!window.SirkPortalSettings || typeof window.SirkPortalSettings.mount !== "function") {\n' +
        '            showError(viewName("settings") + ": " + t("loadFailed"), "Native settings module is unavailable.");\n' +
        '            return;\n' +
        '        }\n' +
        '        window.SirkPortalSettings.mount(host);\n' +
        '    }';
    replaceInFile(appFile, oldSettings, newSettings);

    var settingsFile = path.join(__dirname, "public", "portal", "settings.js");
    var oldField = `    function field(host, label, value, onChange, options) {
        options = options || {};
        var wrapper = el("label", "sirk-card");
        wrapper.setAttribute("data-search-item", "1");
        wrapper.appendChild(el("strong", "", label));
        if (options.description) wrapper.appendChild(el("small", "", options.description));
        var input;
        if (options.type === "boolean") {
            input = el("input");
            input.type = "checkbox";
            input.checked = value === true;
            input.onchange = function () { onChange(input.checked); };
        } else if (options.choices) {
            input = el("select");
            options.choices.forEach(function (choice) {
                var option = el("option", "", choice[1]);
                option.value = choice[0];
                option.selected = String(value == null ? "" : value) === String(choice[0]);
                input.appendChild(option);
            });
            input.onchange = function () { onChange(input.value); };
        } else {
            input = el(options.multiline ? "textarea" : "input");
            if (!options.multiline) input.type = options.type || (typeof value === "number" ? "number" : "text");
            input.value = value == null ? "" : value;
            input.oninput = function () {
                onChange(input.type === "number" ? Number(input.value) : input.value);
            };
        }
        input.setAttribute("data-settings-input", "1");
        wrapper.appendChild(input);
        host.appendChild(wrapper);
        return input;
    }`;
    var newField = `    function field(host, label, value, onChange, options) {
        options = options || {};
        var wrapper = el("label");
        wrapper.setAttribute("data-settings-field", options.type === "boolean" ? "boolean" : "value");
        wrapper.setAttribute("data-search-item", "1");
        var copy = el("span");
        copy.setAttribute("data-settings-field-copy", "1");
        copy.appendChild(el("strong", "", label));
        if (options.description) copy.appendChild(el("small", "", options.description));
        wrapper.appendChild(copy);
        var input;
        if (options.type === "boolean") {
            input = el("input");
            input.type = "checkbox";
            input.checked = value === true;
            input.onchange = function () { onChange(input.checked); };
        } else if (options.choices) {
            input = el("select");
            options.choices.forEach(function (choice) {
                var option = el("option", "", choice[1]);
                option.value = choice[0];
                option.selected = String(value == null ? "" : value) === String(choice[0]);
                input.appendChild(option);
            });
            input.onchange = function () { onChange(input.value); };
        } else {
            input = el(options.multiline ? "textarea" : "input");
            if (!options.multiline) input.type = options.type || (typeof value === "number" ? "number" : "text");
            input.value = value == null ? "" : value;
            input.oninput = function () { onChange(input.type === "number" ? Number(input.value) : input.value); };
        }
        input.setAttribute("data-settings-input", "1");
        wrapper.appendChild(input);
        host.appendChild(wrapper);
        return input;
    }`;
    replaceInFile(settingsFile, oldField, newField);

    var oldObjectForm = `    function objectForm(host, object, depth) {
        object = object && typeof object === "object" && !Array.isArray(object) ? object : {};
        Object.keys(object).sort().forEach(function (key) {
            var value = object[key];
            var title = key.replace(/([A-Z])/g, " $1").replace(/^./, function (c) { return c.toUpperCase(); });
            if (value && typeof value === "object" && !Array.isArray(value)) {
                var section = el("section", "sirk-card");
                section.setAttribute("data-search-item", "1");
                section.appendChild(el("h3", "", title));
                objectForm(section, value, depth + 1);
                host.appendChild(section);
            } else if (Array.isArray(value)) {
                field(host, title, value.join(", "), function (next) {
                    object[key] = String(next || "").split(",").map(function (item) { return item.trim(); }).filter(Boolean);
                }, { description: "Wartości rozdzielone przecinkami." });
            } else {
                field(host, title, value, function (next) { object[key] = next; }, { type: typeof value === "boolean" ? "boolean" : undefined });
            }
        });
        if (!Object.keys(object).length && depth === 0) host.appendChild(el("div", "sirk-card", "Brak ustawień w tej sekcji."));
    }`;
    var newObjectForm = `    function objectForm(host, object, depth) {
        object = object && typeof object === "object" && !Array.isArray(object) ? object : {};
        Object.keys(object).sort().forEach(function (key) {
            var value = object[key];
            var title = key.replace(/([A-Z])/g, " $1").replace(/^./, function (c) { return c.toUpperCase(); });
            if (value && typeof value === "object" && !Array.isArray(value)) {
                var section = el("details", "sirk-card");
                section.open = depth === 0;
                section.setAttribute("data-settings-section", String(depth));
                section.setAttribute("data-search-item", "1");
                section.appendChild(el("summary", "sirk-nav-item", title));
                var body = el("div");
                body.setAttribute("data-settings-section-body", "1");
                objectForm(body, value, depth + 1);
                section.appendChild(body);
                host.appendChild(section);
            } else if (Array.isArray(value)) {
                field(host, title, value.join(", "), function (next) {
                    object[key] = String(next || "").split(",").map(function (item) { return item.trim(); }).filter(Boolean);
                }, { description: "Wartości rozdzielone przecinkami." });
            } else {
                field(host, title, value, function (next) { object[key] = next; }, { type: typeof value === "boolean" ? "boolean" : undefined });
            }
        });
        if (!Object.keys(object).length && depth === 0) host.appendChild(el("div", "sirk-card", "Brak ustawień w tej sekcji."));
    }`;
    replaceInFile(settingsFile, oldObjectForm, newObjectForm);

    var updatesFile = path.join(__dirname, "public", "portal", "system-updates.js");
    replaceInFile(updatesFile, '    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installSettingsIntegration);\n    else installSettingsIntegration();', '    // Native settings are mounted by public/portal/settings.js.');
    replaceInFile(updatesFile, "(busy(snapshot) || current.pending ? ' disabled' : '') + '>Zapisz</button>", "(busy(snapshot) ? ' disabled' : '') + '>Zapisz</button>");
    replaceInFile(updatesFile, "(busy(snapshot) || current.pending ? ' disabled' : '') + '>Aktualizuj</button>", "(busy(snapshot) || !remote.updateAvailable ? ' disabled' : '') + '>Aktualizuj</button>");

    var updateManagerFile = path.join(__dirname, "server", "system-update-manager.js");
    replaceInFile(updateManagerFile, '        if (state.pending) throw new Error("The update channel cannot be changed while an operation is pending.");\n', "");
    replaceInFile(updateManagerFile,
        '        https.get(url, { headers: { "User-Agent": "SIRK-Portal-Updater", Accept: "application/json" } }, function (res) {',
        '        https.get(url, { headers: { "User-Agent": "SIRK-Portal-Updater", Accept: "application/json", "Cache-Control": "no-cache, no-store, max-age=0", Pragma: "no-cache" } }, function (res) {'
    );
    replaceInFile(updateManagerFile,
        '        var base = "https://raw.githubusercontent.com/Eris92/SIRK-Portal/" + selectedBranch + "/";\n        return Promise.all([request(base + "package.json"), request(base + "config.json")]).then(function (values) {',
        '        var base = "https://raw.githubusercontent.com/Eris92/SIRK-Portal/" + selectedBranch + "/";\n        var cacheToken = "sirk_refresh=" + Date.now() + "_" + crypto.randomBytes(6).toString("hex");\n        return Promise.all([request(base + "package.json?" + cacheToken), request(base + "config.json?" + cacheToken)]).then(function (values) {'
    );
    replaceInFile(updateManagerFile,
        '            if (config.shortName !== "SIRKPortal") throw new Error("Remote package identity mismatch.");\n            var installed = current();',
        '            if (config.shortName !== "SIRKPortal") throw new Error("Remote package identity mismatch.");\n            if (String(config.version || "") !== String(packageJson.version || "")) throw new Error("Remote release is incomplete: config.json and package.json versions do not match.");\n            var installed = current();'
    );
    replaceInFile(updateManagerFile,
        '        if (busy || state.pending) throw new Error("Another update, backup or restore operation is already running.");',
        '        if (busy) throw new Error("Another update, backup or restore operation is already running.");'
    );
    replaceInFile(updateManagerFile,
        '    function install(channel) {\n        return startJob("update", async function (progress) {',
        '    function install(channel) {\n        var state = loadState();\n        if (state.pending) {\n            state.history = state.history || [];\n            state.history.push({ type: "replaced-pending", at: new Date().toISOString(), version: state.pending.targetVersion || "", token: state.pending.token || "" });\n            state.pending = null;\n            saveState(state);\n        }\n        return startJob("update", async function (progress) {'
    );
    replaceInFile(settingsFile,
        '<div class="sirk-toolbar"><button type="button" class="sirk-button" data-settings-collapse aria-label="Zwiń menu">☰</button><button type="button" class="sirk-button" data-settings-refresh>Odśwież</button><input type="search" class="sirk-settings-search" data-settings-search placeholder="Szukaj…" aria-label="Szukaj"></div>',
        '<div class="sirk-toolbar"><div class="sirk-toolbar-group sirk-toolbar-left"><button type="button" class="sirk-button" data-settings-collapse aria-label="Zwiń menu">☰</button><button type="button" class="sirk-button" data-settings-refresh>Odśwież</button><input type="search" class="sirk-settings-search" data-settings-search placeholder="Szukaj…" aria-label="Szukaj"></div></div>'
    );
}

module.exports.SIRKPortal = function (parent) {
    repairGeneratedPortalAssets();
    var updateBridge = require("./server/core/plugin-update-bridge.js");
    var plugin = implementation.createPlugin(parent, "SIRKPortal");
    var setupHttpHandlers = plugin.hook_setupHttpHandlers;
    var originalAdminGet = plugin.handleAdminReq;

    plugin.handleAdminReq = function (req, res, user) {
        var action = String(req && req.query && req.query.action || "");
        if (action === "portal-admin-snapshot") {
            if (!shared.isSiteAdmin(user)) { shared.sendJson(res, 403, { ok: false, error: "Forbidden" }); return; }
            try { shared.sendJson(res, 200, { ok: true, snapshot: plugin.runtime.adminSnapshot(user) }); }
            catch (error) { shared.sendJson(res, 500, { ok: false, error: String(error.message || error) }); }
            return;
        }
        return originalAdminGet.call(plugin, req, res, user);
    };

    plugin.hook_setupHttpHandlers = function (webserver, meshServer) {
        updateBridge.install(plugin, parent, webserver, meshServer);
        return routeCompat.withExactPortalRedirect(webserver && webserver.app, function () { return setupHttpHandlers.call(plugin, webserver, meshServer); });
    };

    return plugin;
};