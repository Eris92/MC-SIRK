"use strict";

var fs = require("fs");
var path = require("path");
var shared = require("./server/core/shared.js");
var baseAdmin = require("./admin.js");

function setHeader(res, name, value) {
    if (typeof res.set === "function") res.set(name, value);
    else if (typeof res.setHeader === "function") res.setHeader(name, value);
}

function isInside(root, target) {
    var resolvedRoot = path.resolve(root);
    var resolvedTarget = path.resolve(target);
    var prefix = resolvedRoot.endsWith(path.sep) ? resolvedRoot : resolvedRoot + path.sep;
    return resolvedTarget.toLowerCase().indexOf(prefix.toLowerCase()) === 0;
}

function serveScript(res) {
    var filePath = path.join(__dirname, "public", "shared", "ui", "download-results.js");
    fs.readFile(filePath, function (error, data) {
        if (error) {
            shared.send(res, 404, "text/plain; charset=utf-8", "Not found");
            return;
        }
        shared.send(res, 200, "text/javascript; charset=utf-8", data);
    });
}

function serveDownload(req, res, user) {
    if (!user) {
        shared.send(res, 403, "text/plain; charset=utf-8", "Forbidden");
        return;
    }

    var requested = String(req && req.query && req.query.path || "");
    if (!requested || requested.indexOf("\0") >= 0) {
        shared.send(res, 400, "text/plain; charset=utf-8", "Invalid file path");
        return;
    }

    var target = path.resolve(requested);
    var allowedRoots = [
        path.join(__dirname, "seed", "MyScripts"),
        path.join(__dirname, "seed", "MyCommands")
    ];
    var allowed = allowedRoots.some(function (root) { return isInside(root, target); });

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

module.exports.admin = function (plugin) {
    var base = baseAdmin.admin(plugin);
    return {
        req: function (req, res, user) {
            var asset = String(req && req.query && req.query.asset || "");
            if (asset === "download-results.js") {
                serveScript(res);
                return;
            }
            if (asset === "download") {
                serveDownload(req, res, user);
                return;
            }
            return base.req(req, res, user);
        },
        post: base.post
    };
};
