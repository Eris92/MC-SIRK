"use strict";
var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var cp = require("child_process");
var review = require("../scripts/security-review.js");
var root = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-security-"));
function git(args) {
    return cp.execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}
function write(file, value) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), value);
}
try {
    git(["init", "-q"]);
    write("empty-tree", "");
    var base = git(["hash-object", "-w", "-t", "tree", "empty-tree"]);
    fs.unlinkSync(path.join(root, "empty-tree"));
    write("config.txt", "safe configuration");
    assert.deepStrictEqual(review(root, base), []);
    ["gh" + "p_" + "x".repeat(36), "-----BEGIN " + "PRIVATE KEY-----", "api_key = \"" + "s".repeat(24) + "\""].forEach(function (secret) {
        write("config.txt", secret);
        var errors = review(root, base);
        assert.strictEqual(errors.length, 1);
        assert(!errors.join().includes(secret), "diagnostics must redact secret");
        git(["add", "config.txt"]);
        assert.strictEqual(review(root, base).length, 1, "tracked secret must fail too");
    });
    write("config.txt", "safe");
    write("test/fixture.txt", "gh" + "p_" + "x".repeat(36));
    assert.deepStrictEqual(review(root, base), []);
    ["eval(input)", "new Function(input)", "require('node:child_process')", "processOwner.exec(input)", "processOwner.spawn(command, args)"].forEach(function (code) {
        write("server/probe.js", code);
        assert(review(root, base).some(function (e) { return e.includes("primitive"); }));
        git(["add", "server/probe.js"]);
        assert(review(root, base).some(function (e) { return e.includes("primitive"); }));
    });
    write("server/probe.js", "const safe = 1;");
    assert.deepStrictEqual(review(root, base), []);
    git(["add", "."]);
    var existing = git(["write-tree"]);
    assert.deepStrictEqual(review(root, existing), [], "unchanged server files pass");
    write("server/probe.js", "processOwner.exec(request.input);");
    assert(review(root, existing).some(function (e) { return e.includes("primitive"); }), "changes in an existing process owner fail");
    assert.throws(function () { review(root, "missing-base"); });
    var workflow = fs.readFileSync(path.join(__dirname, "../.github/workflows/test.yml"), "utf8");
    var job = workflow.split("\n  security-review:\n")[1];
    assert(job && job.includes("name: security-review"));
    assert(!/^    if:/m.test(job), "fork PRs must not be skipped");
    ["persist-credentials: false", "contents: read", "github.event.pull_request.head.sha", "github.event.pull_request.base.sha", "node scripts/security-review.js", "run: npm test"].forEach(function (contract) { assert(job.includes(contract), contract); });
    assert(workflow.includes("\n  pull_request:\n"));
    console.log("Security review regression tests: OK (secrets, tracked/untracked execution, redaction, fail-closed base, PR contract)");
} finally {
    fs.rmSync(root, { recursive: true, force: true });
}
