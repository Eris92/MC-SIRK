"use strict";

var shared = require("./shared.js");

function clean(value, limit) {
    return shared.cleanText(value == null ? "" : value, limit || 1000);
}

function idDomain(value) {
    var parts = clean(value, 500).split("/");
    return parts.length > 2 ? parts[1] : "";
}

function safeAction(value) {
    value = clean(value || "action", 120).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    return value || "action";
}

function sanitizedDetails(value) {
    value = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    var result = {};
    ["requestId", "nodeId", "nodeName", "scriptPath", "commandId", "type", "approved", "status", "action", "executionId", "message", "iconMode"].forEach(function (key) {
        if (value[key] == null || value[key] === "") return;
        result[key] = typeof value[key] === "boolean" || typeof value[key] === "number"
            ? value[key]
            : clean(value[key], key === "message" ? 1000 : 500);
    });
    return result;
}

module.exports.createMeshEventLog = function (options) {
    options = options || {};
    var parent = options.parent;
    var meshServer = parent && parent.parent;

    function writeSync(entry) {
        entry = entry && typeof entry === "object" ? entry : {};
        if (!meshServer || typeof meshServer.DispatchEvent !== "function") return null;

        var actorId = clean(entry.actorId, 500);
        var actorName = clean(entry.actorName || "system", 300);
        var moduleName = safeAction(entry.module || "runtime");
        var operation = safeAction(entry.action || "action");
        var outcome = safeAction(entry.outcome || "success");
        var target = clean(entry.target, 500);
        var details = sanitizedDetails(entry.details);
        var nodeId = clean(details.nodeId, 500);
        var domain = clean(entry.domain || idDomain(actorId) || idDomain(nodeId), 200);
        var durationMs = Math.max(0, Number(entry.durationMs) || 0);
        var message = "SIRK " + moduleName + ": " + operation + " - " + outcome;
        if (target) message += " [" + target + "]";

        var event = {
            etype: nodeId ? "node" : actorId ? "user" : "server",
            action: "sirk-" + moduleName + "-" + operation,
            domain: domain,
            msg: message,
            sirk: {
                module: moduleName,
                action: operation,
                outcome: outcome,
                target: target,
                durationMs: durationMs,
                details: details
            }
        };
        if (actorId) event.userid = actorId;
        if (actorName) event.username = actorName;
        if (nodeId) event.nodeid = nodeId;

        var targets = ["*"];
        [actorId, nodeId].forEach(function (id) {
            if (id && targets.indexOf(id) < 0) targets.push(id);
        });
        try {
            meshServer.DispatchEvent(targets, parent, event);
            return shared.copy(event);
        } catch (error) {
            return null;
        }
    }

    return { writeSync: writeSync };
};
