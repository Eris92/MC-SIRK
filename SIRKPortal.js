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
    replaceInFile(
        path.join(__dirname, "public", "portal", "management.js"),
        "(script.requiresApproval ? ' sirk-script-approval-icon' : '')\">'",
        "(script.requiresApproval ? ' sirk-script-approval-icon' : '') + '\">'"
    );
    replaceInFile(
        path.join(__dirname, "public", "portal", "standalone", "scripts", "app.js"),
        "itemStatus '\">'",
        "itemStatus + '\">'"
    );
    replaceInFile(
        path.join(__dirname, "public", "shared", "icon-registry.js"),
        "safeClass\" viewBox",
        "safeClass + '\" viewBox"
    );

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

    var updatesFile = path.join(__dirname, "public", "portal", "system-updates.js");
    replaceInFile(updatesFile,
        '    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installSettingsIntegration);\n    else installSettingsIntegration();',
        '    // Native settings are mounted by public/portal/settings.js.'
    );
    replaceInFile(updatesFile,
        "(busy(snapshot) || current.pending ? ' disabled' : '') + '>Zapisz</button>",
        "(busy(snapshot) ? ' disabled' : '') + '>Zapisz</button>"
    );

    replaceInFile(
        path.join(__dirname, "server", "system-update-manager.js"),
        '        if (state.pending) throw new Error("The update channel cannot be changed while an operation is pending.");\n',
        ""
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
            if (!shared.isSiteAdmin(user)) {
                shared.sendJson(res, 403, { ok: false, error: "Forbidden" });
                return;
            }
            try {
                shared.sendJson(res, 200, { ok: true, snapshot: plugin.runtime.adminSnapshot(user) });
            } catch (error) {
                shared.sendJson(res, 500, { ok: false, error: String(error.message || error) });
            }
            return;
        }
        return originalAdminGet.call(plugin, req, res, user);
    };

    plugin.hook_setupHttpHandlers = function (webserver, meshServer) {
        updateBridge.install(plugin, parent, webserver, meshServer);
        return routeCompat.withExactPortalRedirect(webserver && webserver.app, function () {
            return setupHttpHandlers.call(plugin, webserver, meshServer);
        });
    };

    return plugin;
};
