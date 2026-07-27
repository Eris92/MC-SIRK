"use strict";

var implementation = require("./plugin-main-standalone.js");
var routeCompat = require("./server/core/express-route-compat.js");
var shared = require("./server/core/shared.js");
var updateBridge = require("./server/core/plugin-update-bridge.js");
var maintenance = require("./server/core/portal-maintenance.js");
var experience = require("./server/core/portal-experience-runtime.js");

module.exports.SIRKPortal = function (parent) {
    var plugin = implementation.createPlugin(parent, "SIRKPortal");
    experience.extend(plugin.runtime, __dirname);
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
        maintenance.installPlugin(plugin, webserver, meshServer);
        return routeCompat.withExactPortalRedirect(webserver && webserver.app, function () {
            return setupHttpHandlers.call(plugin, webserver, meshServer);
        });
    };

    return plugin;
};
