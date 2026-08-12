"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");

var root = path.resolve(__dirname, "..");
var temporary = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-protocol-logo-"));
var admin = { _id: "user/domain/admin", name: "admin", siteadmin: 0xFFFFFFFF };
var normalUser = { _id: "user/domain/user", name: "user", siteadmin: 0 };
var png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from("test-logo")]);
var plugin = {
    shortName: "SIRKPortal",
    runtime: { context: { dataRoot: temporary } }
};
var handler = require(path.join(root, "admin.js")).admin(plugin);

function response(done) {
    return {
        headers: {},
        setHeader: function (name, value) { this.headers[name] = value; },
        end: function (body) { done(this.statusCode, this.headers, body); }
    };
}

handler.post({ query: {}, body: { action: "upload-protocol-logo", logoData: png.toString("base64") } }, response(function (status, headers, body) {
    var result = JSON.parse(body);
    assert.strictEqual(status, 200);
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(fs.readFileSync(path.join(temporary, "branding", "protocol-logo.png")), png,
        "Uploaded logo must be stored in persistent plugin data.");

    handler.req({ query: { asset: "protocol-logo" } }, response(function (getStatus, getHeaders, getBody) {
        assert.strictEqual(getStatus, 200);
        assert.strictEqual(getHeaders["Content-Type"], "image/png");
        assert.deepStrictEqual(getBody, png);

        handler.req({ query: { asset: "protocol-logo" } }, response(function (deniedStatus) {
            assert.strictEqual(deniedStatus, 403, "Protocol logo preview must remain SiteAdmin-only.");
            fs.rmSync(temporary, { recursive: true, force: true });
            console.log("Protocol logo upload, persistence, preview and authorization: OK");
        }), normalUser);
    }), admin);
}), admin);
