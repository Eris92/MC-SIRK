"use strict";

var http = require("http");
var fs = require("fs");
var path = require("path");
var adapter = require("./adapters/standalone/index.js");
var runtimeFactory = require("./standalone-runtime.js");
var apiFactory = require("./http/api-router.js");
var updateManagerFactory = require("./system-update-manager.js");
var updateRouterFactory = require("./http/update-router.js");
var VERSION = require("../config.json").version;
var ROOT = path.resolve(__dirname, "..");

var ASSETS = {
    "icons/sirk-ui.svg": "assets/icons/sirk-ui.svg",
    "standalone-core.js": "public/portal/standalone/scripts/core.js",
    "standalone-core-rest.js": "public/portal/standalone/scripts/core-standalone.js",
    "portal-standalone.js": "public/portal/standalone/scripts/app.js",
    "portal-standalone-nav.js": "public/portal/standalone/scripts/navigation.js",
    "portal-device-workspace.js": "public/portal/standalone/scripts/device-workspace.js",
    "portal-device-tabs.js": "public/native/device-tabs.js",
    "portal-view-mode.js": "public/portal/standalone/scripts/view-mode.js",
    "portal-cleanup.js": "public/portal/standalone/scripts/cleanup.js",
    "portal-terminal-connect.js": "public/portal/standalone/scripts/terminal-connect.js",
    "portal-branding.js": "public/portal/standalone/scripts/branding.js",
    "portal-branding.json": "public/portal/standalone/branding.json",
    "portal-login.js": "public/portal/standalone/scripts/login.js",
    "portal-branding.js": "public/portal/standalone/scripts/branding.js",
    "portal-login.css": "public/portal/standalone/styles/login.css",
    "sirk-native-login.css": "public/portal/standalone/styles/native-login.css",
    "sirk-native-login.js": "public/portal/standalone/scripts/native-login.js",
    "portal-standalone.css": "public/portal/standalone/styles/base.css",
    "portal.css": "public/portal/portal.css",
    "settings.css": "public/portal/settings.css",
    "portal-standalone-devices.css": "public/portal/standalone/styles/devices.css",
    "portal-device-workspace.css": "public/portal/standalone/styles/device-workspace.css",
    "portal-device-tabs.css": "public/native/device-tabs.css",
    "portal-module-shell.css": "public/portal/standalone/styles/module-shell.css",
    "portal-management-frame.css": "public/portal/standalone/styles/management-frame.css",
    "portal-cleanup.css": "public/portal/standalone/styles/cleanup.css",
    "system-updates.js": "public/portal/system-updates.js",
    "system-updates.css": "public/portal/system-updates.css",
    "main.css": "public/shared/styles/main.css",
    "shared/icon-registry.js": "public/shared/icon-registry.js",
    "myscripts.css": "public/modules/automation/style.css",
    "shared-ui/shared-ui.css": "public/shared/ui/shared-ui.css",
    "shared-ui/toolbar.css": "public/shared/ui/toolbar.css",
    "module-shell.js": "public/shared/module-shell.js",
    "portal-icon-data.js": "public/portal/icons.js",
    "approvalcenter.js": "public/modules/approvals/index.js",
    "moverequests.js": "public/modules/move-requests/index.js",
    "mycommands.js": "public/modules/commands/index.js",
    "myjira.js": "public/modules/jira/index.js",
    "defendertools.js": "public/modules/security/index.js",
    "portal-management.js": "public/portal/management.js",
    "portal-subfolder-icons.js": "public/portal/subfolder-icons.js",
    "portal-folder-collapse.js": "public/portal/folder-collapse.js",
    "vendor/sirk-portal/sirk-portal.css": "public/portal/vendor/sirk-portal.css",
    "vendor/sirk-portal/portal-ui-contract.css": "public/portal/vendor/portal-ui-contract.css",
    "vendor/sirk-portal/portal-ui-contract.js": "public/portal/vendor/portal-ui-contract.js"
};
[
    "toolbar-config.js", "toolbar-api.js", "toolbar.js", "tabs.js", "layout.js", "settings.js",
    "status-nav.js", "page.js", "tree.js", "catalog.js", "results.js", "result-layout.js",
    "script-tools.js", "script-definition-form.js", "confirm-execution-form.js",
    "script-edit-actions.js", "system-credentials-form.js"
].forEach(function (name) { ASSETS["shared-ui/" + name] = "public/shared/ui/" + name; });

function contentType(name) {
    if (/\.css$/i.test(name)) return "text/css; charset=utf-8";
    if (/\.js$/i.test(name)) return "text/javascript; charset=utf-8";
    if (/\.json$/i.test(name)) return "application/json; charset=utf-8";
    if (/\.svg$/i.test(name)) return "image/svg+xml";
    if (/\.png$/i.test(name)) return "image/png";
    return "application/octet-stream";
}

function portalHtml() {
    var html = fs.readFileSync(path.join(ROOT, "public/portal/standalone/index.html"), "utf8")
        .replace(/__API_BASE_JSON__/g, JSON.stringify("/api"))
        .replace(/__ASSET_BASE_JSON__/g, JSON.stringify("/assets"))
        .replace(/__NATIVE_URL_JSON__/g, JSON.stringify(""))
        .replace(/__LOGOUT_URL_JSON__/g, JSON.stringify("/auth/logout"))
        .replace(/__USER_IMAGE_URL_JSON__/g, JSON.stringify("/api/user/image"))
        .replace(/__DEFAULT_USER_IMAGE_URL_JSON__/g, JSON.stringify("/assets/icons/sirk-ui.svg"))
        .replace(/__VERSION_JSON__/g, JSON.stringify(VERSION))
        .replace(/__ASSET_BASE__/g, "/assets")
        .replace(/__NATIVE_URL__/g, "")
        .replace(/__VERSION__/g, VERSION);
    html = html.replace("</head>", '<link rel="stylesheet" href="/assets/portal-management-frame.css?v=' + VERSION + '"><link rel="stylesheet" href="/assets/system-updates.css?v=' + VERSION + '"></head>');
    return html.replace("</body>", '<script src="/assets/standalone-core-rest.js?v=' + VERSION + '"></script><script src="/assets/system-updates.js?v=' + VERSION + '"></script></body>');
}

function loginHtml() {
    return fs.readFileSync(path.join(ROOT, "public/portal/standalone/login.html"), "utf8")
        .replace(/__ASSET_BASE_JSON__/g, JSON.stringify("/assets"))
        .replace(/__PORTAL_URL_JSON__/g, JSON.stringify("/"))
        .replace(/__NATIVE_URL_JSON__/g, JSON.stringify(process.env.SIRK_NATIVE_LOGIN_URL || "/meshcentral/login"))
        .replace(/__FORCE_PORTAL_JSON__/g, JSON.stringify(true))
        .replace(/__ASSET_BASE__/g, "/assets")
        .replace(/__VERSION_JSON__/g, JSON.stringify(VERSION))
        .replace(/__VERSION__/g, VERSION);
}

function start(options) {
    options = options || {};
    var host = adapter.createHost(options);
    var runtime = runtimeFactory.createRuntime(host, ROOT);
    var api = apiFactory.createHandler(runtime, host);
    var updateManager = updateManagerFactory.create({ appRoot: ROOT, dataRoot: host.dataRoot });
    var updateApi = updateRouterFactory.createHandler(updateManager);
    return Promise.resolve(runtime.initialize()).then(function () {
        var server = http.createServer(function (req, res) {
            var url = new URL(req.url, "http://sirk.local");
            if (url.pathname.indexOf("/api/system/updates/") === 0) { updateApi(req, res, url); return; }
            if (url.pathname.indexOf("/api/") === 0) { api(req, res); return; }
            if (url.pathname === "/login") {
                res.setHeader("Content-Type", "text/html; charset=utf-8");
                res.end(loginHtml());
                return;
            }
            if (url.pathname === "/" || url.pathname === "/sirkportal/") {
                res.setHeader("Content-Type", "text/html; charset=utf-8");
                res.end(portalHtml());
                return;
            }
            if (url.pathname.indexOf("/assets/") === 0) {
                var key = decodeURIComponent(url.pathname.slice(8));
                var relative = ASSETS[key];
                var target = relative && path.resolve(ROOT, relative);
                if (!target || target.indexOf(ROOT + path.sep) !== 0 || !fs.existsSync(target)) {
                    res.statusCode = 404; res.end("Not found"); return;
                }
                res.setHeader("Content-Type", contentType(target));
                fs.createReadStream(target).pipe(res);
                return;
            }
            res.statusCode = 404; res.end("Not found");
        });
        return new Promise(function (resolve) {
            server.listen(Number(options.port || process.env.PORT || 8080), options.host || process.env.HOST || "127.0.0.1", function () { resolve(server); });
        });
    });
}

if (require.main === module) {
    start().then(function (server) { console.log("SIRK Portal standalone listening on", server.address()); })
        .catch(function (error) { console.error(error); process.exitCode = 1; });
}
module.exports = { start: start, assets: ASSETS };
