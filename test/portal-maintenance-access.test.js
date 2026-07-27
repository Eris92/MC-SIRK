"use strict";

var assert = require("assert");
var maintenance = require("../server/core/portal-maintenance.js");

function req(headers, ip) {
    return {
        headers: headers || {},
        ip: ip || "",
        socket: { remoteAddress: "10.0.0.10" }
    };
}

var config = {
    enabled: true,
    allowedIps: ["203.0.113.15", "192.168.50.0/24"],
    showNoticeToAllowed: true
};

assert.strictEqual(maintenance.requestAllowed(req({ "x-forwarded-for": "203.0.113.15, 10.0.0.10" }), config.allowedIps), true);
assert.strictEqual(maintenance.requestAllowed(req({ "x-real-ip": "192.168.50.25" }), config.allowedIps), true);
assert.strictEqual(maintenance.requestAllowed(req({ "cf-connecting-ip": "198.51.100.20" }), config.allowedIps), false);
assert.strictEqual(maintenance.requestAllowed(req({}, "192.168.1.20"), ["127.0.0.1"], ["127.0.0.1", "192.168.1.20"]), true);
assert.strictEqual(maintenance.requestAllowed(req({}, "192.168.1.21"), ["localhost"], ["127.0.0.1", "192.168.1.20"]), false);

var allowedStatus = maintenance.status(config, req({ "x-forwarded-for": "203.0.113.15, 10.0.0.10" }));
assert.strictEqual(allowedStatus.active, true);
assert.strictEqual(allowedStatus.allowed, true);
assert.strictEqual(allowedStatus.loginAvailable, true);
assert.strictEqual(allowedStatus.showNoticeToAllowed, true);

var blockedStatus = maintenance.status(config, req({ "x-forwarded-for": "198.51.100.20, 10.0.0.10" }));
assert.strictEqual(blockedStatus.allowed, false);
assert.strictEqual(blockedStatus.loginAvailable, false);

console.log("Portal maintenance access exceptions: OK");