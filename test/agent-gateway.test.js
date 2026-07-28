"use strict";

var assert = require("assert");
var events = require("events");
var fs = require("fs");
var os = require("os");
var path = require("path");
var gatewayFactory = require("../server/core/agent-gateway.js");

function request(token, body, url) {
    var req = new events.EventEmitter();
    req.method = "POST";
    req.url = url || "/api/agent/v1/checkin";
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

async function invoke(gateway, token, body, url) {
    var value = request(token, body, url);
    assert.strictEqual(gateway.handle(value.req, value.res), true);
    return value.result.promise;
}

(async function () {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-agent-gateway-"));
    try {
        var gateway = gatewayFactory.create({
            dataRoot: root,
            token: "test-agent-token",
            enrollmentToken: "test-enrollment-token"
        });
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

        var enrolled = await invoke(gateway, "test-enrollment-token", {
            tenantId: "investa",
            deviceId: "device-2",
            machineName: "LAPTOP-2"
        }, "/api/agent/v1/enroll");
        assert.strictEqual(enrolled.statusCode, 201);
        assert.strictEqual(typeof enrolled.body.deviceToken, "string");
        assert.ok(enrolled.body.deviceToken.length >= 40);
        var registryText = fs.readFileSync(path.join(root, "agent-registry.json"), "utf8");
        assert.ok(!registryText.includes(enrolled.body.deviceToken), "Raw device token must not be persisted.");
        var duplicateEnrollment = await invoke(gateway, "test-enrollment-token", {
            tenantId: "investa",
            deviceId: "device-2",
            machineName: "LAPTOP-2"
        }, "/api/agent/v1/enroll");
        assert.strictEqual(duplicateEnrollment.statusCode, 409);

        var deviceAccepted = await invoke(gateway, enrolled.body.deviceToken, {
            tenantId: "investa",
            deviceId: "device-2",
            machineName: "LAPTOP-2",
            agentVersion: "1.0.0"
        });
        assert.strictEqual(deviceAccepted.statusCode, 200);
        var crossDeviceDenied = await invoke(gateway, enrolled.body.deviceToken, {
            tenantId: "investa",
            deviceId: "device-1"
        });
        assert.strictEqual(crossDeviceDenied.statusCode, 401);
        console.log("Authenticated SIRK Agent gateway contract: OK");
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
})().catch(function (error) {
    console.error(error);
    process.exitCode = 1;
});
