"use strict";

var crypto = require("crypto");
var fs = require("fs");
var path = require("path");

function sendJson(res, status, value) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(value));
}

function safeId(value) {
    value = String(value || "");
    return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(value) ? value : "";
}

function authorized(req, token) {
    var header = String(req.headers.authorization || "");
    var supplied = header.indexOf("Bearer ") === 0 ? header.slice(7) : "";
    if (!token || !supplied) return false;
    var expectedHash = crypto.createHash("sha256").update(token).digest();
    var suppliedHash = crypto.createHash("sha256").update(supplied).digest();
    return crypto.timingSafeEqual(expectedHash, suppliedHash);
}

function writeJsonAtomic(file, value) {
    var temporary = file + ".tmp";
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + "\n", "utf8");
    fs.renameSync(temporary, file);
}

module.exports.create = function (options) {
    options = options || {};
    var dataRoot = path.resolve(options.dataRoot);
    var token = String(options.token || process.env.SIRK_AGENT_TOKEN || "");
    var registryPath = path.join(dataRoot, "agent-registry.json");
    var telemetryPath = path.join(dataRoot, "agent-telemetry.jsonl");
    fs.mkdirSync(dataRoot, { recursive: true });

    function readRegistry() {
        try {
            var parsed = JSON.parse(fs.readFileSync(registryPath, "utf8"));
            return parsed && parsed.devices && typeof parsed.devices === "object" ? parsed : { schemaVersion: 1, devices: {} };
        } catch (error) {
            return { schemaVersion: 1, devices: {} };
        }
    }

    function handler(req, res) {
        var url = new URL(req.url, "http://sirk.local");
        if (url.pathname !== "/api/agent/v1/checkin") return false;
        if (req.method !== "POST") {
            sendJson(res, 405, { ok: false, error: "Method not allowed." });
            return true;
        }
        if (!authorized(req, token)) {
            sendJson(res, 401, { ok: false, error: "Agent authentication failed." });
            return true;
        }

        var chunks = [], size = 0, ended = false;
        req.on("data", function (chunk) {
            if (ended) return;
            size += chunk.length;
            if (size > 1024 * 1024) {
                ended = true;
                sendJson(res, 413, { ok: false, error: "Agent check-in body is too large." });
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on("end", function () {
            if (ended) return;
            try {
                var body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
                var tenantId = safeId(body.tenantId);
                var deviceId = safeId(body.deviceId);
                if (!tenantId || !deviceId) {
                    sendJson(res, 400, { ok: false, error: "Valid tenantId and deviceId are required." });
                    return;
                }
                var now = new Date().toISOString();
                var registry = readRegistry();
                registry.devices[tenantId + "/" + deviceId] = {
                    tenantId: tenantId,
                    deviceId: deviceId,
                    machineName: String(body.machineName || deviceId).slice(0, 255),
                    agentVersion: String(body.agentVersion || "").slice(0, 64),
                    lastSeenUtc: now,
                    heartbeat: body.heartbeat && typeof body.heartbeat === "object" ? body.heartbeat : null,
                    management: body.management && typeof body.management === "object" ? body.management : null,
                    runtimeHealth: body.runtimeHealth && typeof body.runtimeHealth === "object" ? body.runtimeHealth : null
                };
                registry.updatedAtUtc = now;
                writeJsonAtomic(registryPath, registry);
                (Array.isArray(body.events) ? body.events : []).slice(0, 100).forEach(function (event) {
                    fs.appendFileSync(telemetryPath, JSON.stringify({
                        receivedAtUtc: now,
                        tenantId: tenantId,
                        deviceId: deviceId,
                        event: event
                    }) + "\n", "utf8");
                });
                sendJson(res, 200, { ok: true, serverTimeUtc: now, acceptedEvents: Math.min(100, Array.isArray(body.events) ? body.events.length : 0) });
            } catch (error) {
                sendJson(res, 400, { ok: false, error: "Invalid agent check-in payload." });
            }
        });
        return true;
    }

    return { handle: handler, readRegistry: readRegistry };
};
