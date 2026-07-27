"use strict";

var assert = require("assert");
var contract = require("../server/contracts/portal-providers.js");
var calls = [];
var ports = contract.createPorts({
    identity: { currentUser: function () {}, login: function () {}, logout: function () {} },
    devices: { list: function () {}, resolve: function () {} },
    agent: { desktop: function () {}, terminal: function () {}, files: function () {}, software: function () {}, registry: function () {}, amt: function () {} },
    permissions: { can: function () { calls.push("can"); } }
});
assert.ok(ports.identity && ports.devices && ports.agent && ports.permissions);
assert.throws(function () { contract.assertPort("devices", { list: function () {} }); }, /missing resolve/);
assert.strictEqual(calls.length, 0);
console.log("Independent Portal provider contracts: OK");
