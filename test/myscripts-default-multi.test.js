"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var policy = require("../server/core/myscripts-default-multi-policy.js");

var root = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-myscripts-default-multi-"));

try {
    fs.writeFileSync(path.join(root, "default.ps1"), "#PL Domyslny\n'OK'\n", "utf8");
    fs.writeFileSync(path.join(root, "enabled.ps1"), "# MultiHost: true\n'OK'\n", "utf8");
    fs.writeFileSync(path.join(root, "disabled.ps1"), "# MultiHost: false\n'OK'\n", "utf8");

    var module = {
        apiGet: function (asset, req) {
            if (asset === "scripts") {
                return {
                    ok: true,
                    tree: {
                        type: "directory",
                        path: "",
                        children: [
                            { type: "script", path: "default.ps1", multiHost: false },
                            { type: "script", path: "enabled.ps1", multiHost: false },
                            { type: "script", path: "disabled.ps1", multiHost: false }
                        ]
                    }
                };
            }
            if (asset === "script") {
                return {
                    ok: true,
                    script: {
                        type: "script",
                        path: req.query.path,
                        multiHost: false
                    }
                };
            }
            return { ok: true };
        }
    };

    var runtime = {
        context: {
            fs: fs,
            path: path,
            nativePath: path,
            pluginRoot: path.dirname(root),
            scriptRoots: { myscripts: root }
        },
        modules: { myscripts: module }
    };

    policy.apply({ runtime: runtime });

    var tree = module.apiGet("scripts", {}, {}).tree;
    assert.strictEqual(tree.children[0].multiHost, true,
        "My Scripts without a MultiHost directive must expose the row action by default.");
    assert.strictEqual(tree.children[1].multiHost, true,
        "Explicit MultiHost:true must keep the row action enabled.");
    assert.strictEqual(tree.children[2].multiHost, false,
        "Explicit MultiHost:false must hide the row action.");

    assert.strictEqual(module.apiGet("script", { query: { path: "default.ps1" } }, {}).script.multiHost, true,
        "Single-script details must use the same default-enabled rule as the tree.");
    assert.strictEqual(module.apiGet("script", { query: { path: "disabled.ps1" } }, {}).script.multiHost, false,
        "Single-script details must preserve explicit opt-out.");
    assert.strictEqual(policy.multiHostEnabled(runtime, "../outside.ps1"), false,
        "Paths outside My Scripts must never be enabled.");

    console.log("My Scripts default row multi-device availability: OK");
} finally {
    fs.rmSync(root, { recursive: true, force: true });
}
