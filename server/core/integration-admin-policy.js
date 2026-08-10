"use strict";

var fs = require("fs");
var path = require("path");
var shared = require("./shared.js");

function errorText(error) {
    return String(error && error.message || error || "Unknown error.");
}

function wrap(handler, plugin) {
    if (!handler || typeof handler.req !== "function" || typeof handler.post !== "function") return handler;

    function req(request, response, user) {
        var asset = String(request && request.query && request.query.asset || "");
        if (asset !== "integrations-admin.js") return handler.req(request, response, user);
        if (!shared.isSiteAdmin(user)) {
            shared.send(response, 403, "text/plain; charset=utf-8", "Forbidden");
            return;
        }
        fs.readFile(path.join(__dirname, "..", "..", "web", "admin", "integrations.js"), function (error, data) {
            if (error) shared.send(response, 404, "text/plain; charset=utf-8", "Not found");
            else shared.send(response, 200, "text/javascript; charset=utf-8", data);
        });
    }

    function post(request, response, user) {
        var action = String(request && request.query && request.query.action || request && request.body && request.body.action || "");
        if (action !== "save-integrations") return handler.post(request, response, user);
        if (!shared.isSiteAdmin(user)) {
            shared.sendJson(response, 403, { ok: false, error: "Permission denied." });
            return;
        }
        var runtime = plugin && plugin.runtime;
        var integrations = runtime && runtime.integrations;
        if (!integrations || typeof integrations.save !== "function") {
            shared.sendJson(response, 503, { ok: false, error: "Integration settings are unavailable." });
            return;
        }
        var payload = {
            integrations: shared.parseJsonObject(request && request.body && request.body.integrations, {}),
            secrets: shared.parseJsonObject(request && request.body && request.body.secrets, {})
        };
        Promise.resolve(integrations.save(user, payload)).then(function (value) {
            shared.sendJson(response, 200, { ok: true, integrations: value });
        }).catch(function (error) {
            shared.sendJson(response, 400, { ok: false, error: errorText(error) });
        });
    }

    return { req: req, post: post };
}

module.exports.wrap = wrap;
