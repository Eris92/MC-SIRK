"use strict";

var assert = require("assert");
var EventEmitter = require("events");
var router = require("../server/http/api-router.js");

function request(method, url, payload) {
    var req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.headers = { "content-type": "application/x-www-form-urlencoded" };
    process.nextTick(function () {
        var body = payload == null ? "" : "payload=" + encodeURIComponent(JSON.stringify(payload));
        req.emit("data", Buffer.from(body));
        req.emit("end");
    });
    return req;
}

function response() {
    return {
        statusCode: 200,
        headers: {},
        body: "",
        setHeader: function (name, value) { this.headers[name] = value; },
        end: function (value) { this.body = String(value || ""); }
    };
}

var received;
var runtime = { bootstrap: function () { return { ok: true }; }, request: function (method, moduleName, asset, req, res) {
    received = { method: method, moduleName: moduleName, asset: asset, body: req.body };
    res.status(200).end(JSON.stringify({ ok: true }));
} };
var host = { currentUser: function () { return Promise.resolve({ raw: { id: "test" } }); }, devices: { list: function () { return Promise.resolve({}); } } };
var res = response();
router.createHandler(runtime, host)(request("POST", "/api/modules/mycommands/execute", { nodeId: "node-1", scriptPath: "ping.json" }), res);

setTimeout(function () {
    assert.deepStrictEqual(received, { method: "POST", moduleName: "mycommands", asset: "execute", body: { nodeId: "node-1", scriptPath: "ping.json" } });
    assert.ok(res.body.indexOf('"ok":true') >= 0);
    console.log("Standalone Portal POST payload routing: OK");
}, 20);
