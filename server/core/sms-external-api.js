"use strict";

var crypto = require("crypto");
var shared = require("./shared.js");

module.exports.register = function (options) {
    options = options || {};
    var context = options.context;
    var sms = options.sms;
    var web = shared.getWebServer(context.parent);
    if (!web || !web.app || typeof web.app.post !== "function") return false;
    if (web.__sirkSmsExternalApiOwner) {
        web.__sirkSmsExternalApiOwner.context = context;
        web.__sirkSmsExternalApiOwner.sms = sms;
        return true;
    }
    var owner = web.__sirkSmsExternalApiOwner = { context: context, sms: sms, attempts: Object.create(null) };
    function authorized(header, expected) {
        var supplied = String(header || "").replace(/^Bearer\s+/i, "");
        var left = Buffer.from(supplied), right = Buffer.from(String(expected || ""));
        return left.length > 0 && left.length === right.length && crypto.timingSafeEqual(left, right);
    }
    function clientKey(req) { return String(req && (req.ip || req.socket && req.socket.remoteAddress) || "unknown"); }
    function allow(req) {
        var key = clientKey(req), now = Date.now(), row = owner.attempts[key];
        if (!row || row.expiresAt <= now) row = owner.attempts[key] = { count: 0, expiresAt: now + 60000 };
        row.count++; return row.count <= 30;
    }
    var parser = web.bodyParser && typeof web.bodyParser.json === "function" ? web.bodyParser.json({ limit: "32kb" }) : function (req, res, next) { next(); };
    web.app.post("/sirk-sms/v1/send", parser, function (req, res) {
        var currentContext = owner.context;
        var integration = currentContext.integrations.get("sms");
        if (!allow(req)) { res.status(429).json({ ok: false, error: "Rate limit exceeded." }); return; }
        if (!integration.externalToken || !authorized(req.headers && req.headers.authorization, integration.externalToken)) {
            res.status(401).json({ ok: false, error: "Unauthorized." }); return;
        }
        var body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
        Promise.resolve(owner.sms.send(body.type || "sms", body.to, body.message, { lector: body.lector })).then(function (result) {
            shared.dispatch(currentContext.parent, currentContext.source, ["*", "server-users"], {
                action: "sirkplatform", module: "sms", operation: "external-send", outcome: "success",
                details: { kind: result.kind, count: result.count }, nolog: 0
            });
            res.status(202).json({ ok: true, result: { kind: result.kind, count: result.count, messages: result.messages } });
        }).catch(function (error) {
            res.status(400).json({ ok: false, error: String(error && error.message || error) });
        });
    });
    return true;
};
