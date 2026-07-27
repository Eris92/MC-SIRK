"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var serverModule = require("../server/standalone.js");
var root = path.join(__dirname, "..");
var temp = path.join(root, ".tmp-portal-cache");
var brandingPath = path.join(root, "public", "portal-branding.json");
var originalBranding = fs.existsSync(brandingPath) ? fs.readFileSync(brandingPath) : null;
var version = require("../config.json").version;

async function run() {
    var server;
    try {
        server = await serverModule.start({
            host: "127.0.0.1",
            port: 0,
            dataRoot: path.join(temp, "host-data")
        });
        var base = "http://127.0.0.1:" + server.address().port;
        var login = await fetch(base + "/login");
        var html = await login.text();
        assert.strictEqual(
            login.headers.get("cache-control"),
            "no-store, no-cache, must-revalidate, max-age=0"
        );
        assert.strictEqual(login.headers.get("pragma"), "no-cache");
        assert.strictEqual(login.headers.get("expires"), "0");
        assert.ok(
            html.indexOf("window.__SIRK_PLATFORM_PORTAL_VERSION__ = " + JSON.stringify(version)) >= 0,
            "The runtime version must remain the semantic package version."
        );
        assert.ok(
            html.indexOf("?v=" + version + "-") >= 0,
            "Portal assets must use a live version-and-mtime revision."
        );

        var asset = await fetch(base + "/assets/portal-login.js");
        assert.strictEqual(asset.status, 200);
        assert.strictEqual(
            asset.headers.get("cache-control"),
            "no-store, no-cache, must-revalidate, max-age=0"
        );
    } finally {
        if (server) await new Promise(function (resolve) { server.close(resolve); });
        if (originalBranding === null) fs.rmSync(brandingPath, { force: true });
        else fs.writeFileSync(brandingPath, originalBranding);
        fs.rmSync(temp, { recursive: true, force: true });
    }
}

run().then(function () {
    console.log("Portal cache invalidation: OK");
}).catch(function (error) {
    console.error(error);
    process.exitCode = 1;
});
