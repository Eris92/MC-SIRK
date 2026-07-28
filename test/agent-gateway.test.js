"use strict";

var assert = require("assert");
var events = require("events");
var fs = require("fs");
var os = require("os");
var path = require("path");
var gatewayFactory = require("../server/core/agent-gateway.js");

function request(token, body) {
    var req = new events.EventEmitter();
    req.method = "POST";
    req.url = "/api/agent/v1/checkin";
    req.headers = token ? { authorization: "Bearer " + token } : {};
    req.destroy = function () {};
    var result = { headers: {} };
    var res = {
        statusCode: 200,
        setHeader: function (name, value) { result.headers[name] = value; },
        end: function (value) {
            result.body = JSON.parse(value);
            result.statusCode = this.statusCode;
            result.resolve(result);
        }
    };
    result.promise = new Promise(function (resolve) { result.resolve = resolve; });
    process.nextTick(function () {
        req.emit("data", Buffer.from(JSON.stringify(body || {}), "utf8"));
        req.emit("end");
    });
    return { req: req, res: res, result: result };
}

async function invoke(gateway, token, body) {
    var value = request(token, body);
    assert.strictEqual(gateway.handle(value.req, value.res), true);
    return value.result.promise;
}

(async function () {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-agent-gateway-"));
    try {
        var gateway = gatewayFactory.create({ dataRoot: root, token: "test-agent-token" });
        var denied = await invoke(gateway, "wrong-token", { tenantId: "investa", deviceId: "device-1" });
        assert.strictEqual(denied.statusCode, 401);

        var invalid = await invoke(gateway, "test-agent-token", { tenantId: "../invalid", deviceId: "device-1" });
        assert.strictEqual(invalid.statusCode, 400);

        var accepted = await invoke(gateway, "test-agent-token", {
            tenantId: "investa",
            deviceId: "device-1",
            machineName: "DELL_K",
            agentVersion: "0.4.0-test",
            heartbeat: { stateStatus: "OK" },
            management: { status: "Healthy" },
            runtimeHealth: { heartbeatFresh: true },
            events: [{ eventId: "event-1", category: "Agent" }]
        });
        assert.strictEqual(accepted.statusCode, 200);
        assert.strictEqual(accepted.body.acceptedEvents, 1);
        var registry = gateway.readRegistry();
        assert.strictEqual(registry.devices["investa/device-1"].machineName, "DELL_K");
        assert.strictEqual(fs.readFileSync(path.join(root, "agent-telemetry.jsonl"), "utf8").trim().split(/\r?\n/).length, 1);
        console.log("Authenticated SIRK Agent gateway contract: OK");
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
})().catch(function (error) {
    console.error(error);
    process.exitCode = 1;
});
