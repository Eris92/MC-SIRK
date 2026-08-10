"use strict";

var fs = require("fs");
var path = require("path");
var shared = require("./server/core/shared.js");

module.exports.admin = function (plugin) {
    var root = __dirname;

    var assets = {
        "admin.css": ["web/admin/admin.css", "text/css; charset=utf-8"],
        "admin.js": ["web/admin/admin.js", "text/javascript; charset=utf-8"],
        "core.js": ["public/shared/core.js", "text/javascript; charset=utf-8"],
        "runtime.js": ["public/shared/runtime.js", "text/javascript; charset=utf-8"],
        "module-shell.js": ["public/shared/module-shell.js", "text/javascript; charset=utf-8"],
        "main.css": ["public/shared/styles/main.css", "text/css; charset=utf-8"],
        "desktop-commands.js": ["public/native/desktop-commands.js", "text/javascript; charset=utf-8"],
        "desktop-commands.css": ["public/native/desktop-commands.css", "text/css; charset=utf-8"],
        "approvalcenter.js": ["public/modules/approvals/index.js", "text/javascript; charset=utf-8"],
        "native-approval.css": ["public/native/approval.css", "text/css; charset=utf-8"],
        "myscripts.js": ["public/modules/automation/index.js", "text/javascript; charset=utf-8"],
        "myscripts.css": ["public/modules/automation/style.css", "text/css; charset=utf-8"],
        "mycommands.js": ["public/modules/commands/index.js", "text/javascript; charset=utf-8"],
        "moverequests.js": ["public/modules/move-requests/index.js", "text/javascript; charset=utf-8"],
        "shared-ui/toolbar-config.js": ["public/shared/ui/toolbar-config.js", "text/javascript; charset=utf-8"],
        "shared-ui/toolbar-api.js": ["public/shared/ui/toolbar-api.js", "text/javascript; charset=utf-8"],
        "shared-ui/toolbar.js": ["public/shared/ui/toolbar.js", "text/javascript; charset=utf-8"],
        "shared-ui/tabs.js": ["public/shared/ui/tabs.js", "text/javascript; charset=utf-8"],
        "shared-ui/layout.js": ["public/shared/ui/layout.js", "text/javascript; charset=utf-8"],
        "shared-ui/settings.js": ["public/shared/ui/settings.js", "text/javascript; charset=utf-8"],
        "shared-ui/status-nav.js": ["public/shared/ui/status-nav.js", "text/javascript; charset=utf-8"],
        "shared-ui/tree.js": ["public/shared/ui/tree.js", "text/javascript; charset=utf-8"],
        "shared-ui/catalog.js": ["public/shared/ui/catalog.js", "text/javascript; charset=utf-8"],
        "shared-ui/results.js": ["public/shared/ui/results.js", "text/javascript; charset=utf-8"],
        "shared-ui/script-tools.js": ["public/shared/ui/script-tools.js", "text/javascript; charset=utf-8"],
        "shared-ui/parameter-dialog.js": ["public/shared/ui/parameter-dialog.js", "text/javascript; charset=utf-8"],
        "shared-ui/page.js": ["public/shared/ui/page.js", "text/javascript; charset=utf-8"],
        "shared-ui/shared-ui.css": ["public/shared/ui/shared-ui.css", "text/css; charset=utf-8"],
        "shared-ui/toolbar.css": ["public/shared/ui/toolbar.css", "text/css; charset=utf-8"]
    };

    function errorText(error) {
        return String(error && error.message || error || "Unknown error.");
    }

    function setHeader(res, name, value) {
        if (typeof res.set === "function") res.set(name, value);
        else if (typeof res.setHeader === "function") res.setHeader(name, value);
    }

    function isInside(basePath, targetPath) {
        var resolvedBase = path.resolve(basePath);
        var resolvedTarget = path.resolve(targetPath);
        var prefix = resolvedBase.endsWith(path.sep) ? resolvedBase : resolvedBase + path.sep;
        return resolvedTarget.toLowerCase().indexOf(prefix.toLowerCase()) === 0;
    }

    function serveDownload(req, res, user) {
        if (!user) {
            shared.send(res, 403, "text/plain; charset=utf-8", "Forbidden");
            return;
        }
        var requested = String(req && req.query && req.query.path || "").trim();
        if (!requested || requested.indexOf("\0") >= 0) {
            shared.send(res, 400, "text/plain; charset=utf-8", "Invalid file path");
            return;
        }

        var target = path.resolve(requested);
        var allowedRoots = [path.join(root, "seed", "MyScripts"), path.join(root, "seed", "MyCommands")];
        var allowed = allowedRoots.some(function (allowedRoot) { return isInside(allowedRoot, target); });
        if (!allowed || path.extname(target).toLowerCase() !== ".csv") {
            shared.send(res, 403, "text/plain; charset=utf-8", "File download is not allowed");
            return;
        }

        fs.stat(target, function (error, stat) {
            if (error || !stat.isFile()) {
                shared.send(res, 404, "text/plain; charset=utf-8", "File not found");
                return;
            }
            var fileName = path.basename(target).replace(/[\r\n"]/g, "_");
            res.statusCode = 200;
            setHeader(res, "Content-Type", "text/csv; charset=utf-8");
            setHeader(res, "Content-Disposition", "attachment; filename=\"" + fileName + "\"");
            setHeader(res, "Content-Length", String(stat.size));
            setHeader(res, "Cache-Control", "no-store");
            setHeader(res, "X-Content-Type-Options", "nosniff");

            var stream = fs.createReadStream(target);
            stream.on("error", function () {
                if (!res.headersSent) shared.send(res, 500, "text/plain; charset=utf-8", "Unable to read file");
                else if (typeof res.destroy === "function") res.destroy();
            });
            stream.pipe(res);
        });
    }

    function sendAsset(res, name) {
        var definition = assets[name];
        if (!definition) {
            shared.send(res, 404, "text/plain; charset=utf-8", "Not found");
            return;
        }
        fs.readFile(path.join(root, definition[0]), function (error, data) {
            if (error) shared.send(res, 404, "text/plain; charset=utf-8", "Not found");
            else shared.send(res, 200, definition[1], data);
        });
    }

    function moduleObject(moduleName) {
        return plugin.runtime && plugin.runtime.modules && plugin.runtime.modules[String(moduleName || "").toLowerCase()];
    }

    function safeAdminJson(value) {
        var slash = String.fromCharCode(92);
        return JSON.stringify(value)
            .replace(/</g, slash + "u003c")
            .replace(/>/g, slash + "u003e")
            .replace(/&/g, slash + "u0026");
    }

    function get(req, res, user) {
        var asset = String(req && req.query && req.query.asset || "");
        var moduleName = String(req && req.query && req.query.module || "");

        if (asset === "download") { serveDownload(req, res, user); return; }
        if (assets[asset]) { sendAsset(res, asset); return; }
        if (asset === "bootstrap") {
            plugin.runtime.request("GET", "_runtime", "bootstrap", req, res, user);
            return;
        }
        if (moduleName === "myscripts" && asset === "folder-icon") {
            var automation = plugin.runtime.modules && plugin.runtime.modules.myscripts;
            if (automation && typeof automation.serveIcon === "function") automation.serveIcon(req, res, user);
            else shared.send(res, 404, "text/plain; charset=utf-8", "Folder icon unavailable");
            return;
        }
        if (moduleName) {
            plugin.runtime.request("GET", moduleName, asset, req, res, user);
            return;
        }
        if (!shared.isSiteAdmin(user)) {
            shared.send(res, 403, "text/plain; charset=utf-8", "Forbidden");
            return;
        }
        try {
            res.render("SIRK-Portal", {
                title: "SIRK Management Platform",
                pluginShortName: String(req && req.query && req.query.pin || plugin.shortName || "SIRKPortal"),
                version: String(plugin.runtime && plugin.runtime.version || require("./config.json").version),
                adminDataJson: safeAdminJson(plugin.runtime.adminSnapshot(user))
            });
        } catch (error) {
            console.error("SIRK Platform admin render failed", error);
            shared.send(res, 500, "text/plain; charset=utf-8", "Internal error");
        }
    }

    function post(req, res, user) {
        var moduleName = String(req && req.query && req.query.module || "");
        var asset = String(req && req.query && req.query.asset || "");
        var action = String(req && req.query && req.query.action || req && req.body && req.body.action || "");

        if (moduleName) {
            if (req && req.body && typeof req.body.payload === "string") req.body = shared.parseJsonObject(req.body.payload, {});
            var module = moduleObject(moduleName);
            if (asset === "settings" && shared.isSiteAdmin(user) && module && !module.__loadError && typeof module.apiPost === "function") {
                try {
                    Promise.resolve(module.apiPost(asset, req, user))
                        .then(function (value) { shared.sendJson(res, 200, value || { ok: true }); })
                        .catch(function (error) { shared.sendJson(res, 400, { ok: false, error: errorText(error) }); });
                } catch (error) {
                    shared.sendJson(res, 400, { ok: false, error: errorText(error) });
                }
                return;
            }
            plugin.runtime.request("POST", moduleName, asset, req, res, user);
            return;
        }

        if (action === "save-settings" || action === "save-modules") {
            var payload = {
                modules: shared.parseJsonObject(req && req.body && req.body.modules, {}),
                moduleOptions: shared.parseJsonObject(req && req.body && req.body.moduleOptions, {})
            };
            plugin.runtime.saveAdminSettings(user, payload)
                .then(function (snapshot) { shared.sendJson(res, 200, { ok: true, snapshot: snapshot }); })
                .catch(function (error) { shared.sendJson(res, 403, { ok: false, error: errorText(error) }); });
            return;
        }
        shared.sendJson(res, 400, { ok: false, error: "Unknown SIRK Platform action." });
    }

    return { req: get, post: post };
};
