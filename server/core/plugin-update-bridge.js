"use strict";

var fs = require("fs");
var path = require("path");
var managerFactory = require("../system-update-manager.js");
var routerFactory = require("../http/update-router.js");

function normalizeBase(value) {
    value = String(value || "/");
    if (value.charAt(0) !== "/") value = "/" + value;
    if (value.charAt(value.length - 1) !== "/") value += "/";
    return value.replace(/\/+/g, "/");
}

function sendFile(res, file, type) {
    fs.readFile(file, function (error, data) {
        if (error) { res.statusCode = 404; res.end("Not found"); return; }
        if (typeof res.set === "function") res.set("Content-Type", type);
        else res.setHeader("Content-Type", type);
        res.end(data);
    });
}

module.exports.install = function (plugin, parent, webserver, meshServer) {
    if (!webserver || !webserver.app || webserver.__sirkUpdateLifecycleRoutes) return;
    webserver.__sirkUpdateLifecycleRoutes = true;

    var meshRoot = parent && parent.parent;
    var dataRoot = path.join(meshRoot && meshRoot.datapath || path.join(__dirname, "..", ".."), "sirk-platform-data");
    var manager = managerFactory.create({
        appRoot: path.resolve(__dirname, "..", ".."),
        dataRoot: dataRoot,
        restart: function () {
            setTimeout(function () { process.exit(0); }, 900);
            return { scheduled: true };
        }
    });
    var handler = routerFactory.createHandler(manager);
    var domains = meshServer && meshServer.config && meshServer.config.domains || { "": { url: "/" } };

    Object.keys(domains).forEach(function (key) {
        var domain = domains[key] || {};
        if (domain.dns != null || domain.share != null) return;
        var base = normalizeBase(domain.url || "/");
        var prefix = base + "sirkportal/api/system/updates";
        var jsonParser = webserver.bodyParser && webserver.bodyParser.json({ limit: "64kb", strict: true });

        webserver.app.get(base + "sirkportal/assets/system-updates.js", function (req, res) {
            sendFile(res, path.resolve(__dirname, "..", "..", "public", "portal", "system-updates.js"), "text/javascript; charset=utf-8");
        });
        webserver.app.get(base + "sirkportal/assets/system-updates.css", function (req, res) {
            sendFile(res, path.resolve(__dirname, "..", "..", "public", "portal", "system-updates.css"), "text/css; charset=utf-8");
        });
        webserver.app.use(prefix, function (req, res) {
            var dispatch = function () {
                var requestUrl = new URL(String(req.originalUrl || req.url || ""), "http://sirk.local");
                requestUrl.pathname = "/api/system/updates" + requestUrl.pathname.slice(prefix.length);
                handler(req, res, requestUrl);
            };
            if (String(req.method || "GET").toUpperCase() !== "POST" || !jsonParser) { dispatch(); return; }
            jsonParser(req, res, function (error) {
                if (error) { res.statusCode = 400; res.end(JSON.stringify({ ok: false, error: "Invalid JSON." })); }
                else dispatch();
            });
        });
    });

    plugin.systemUpdateManager = manager;
};
