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
    git(["config", "user.name", "Security fixture"]);
    git(["config", "user.email", "fixture@example.invalid"]);
    var base = git(["commit-tree", git(["write-tree"]), "-m", "base"]);
    git(["update-ref", "HEAD", base]);
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
    ["eval(input)", "new Function(input)", "require('node:child_process')", "cp.exec(cmd)", "require('child_process')", "spawn(cmd, args)", "processOwner.exec(input)", "processOwner.spawn(command, args)"].forEach(function (code) {
        write("server/probe.js", code);
        assert(review(root, base).some(function (e) { return e.includes("primitive"); }));
        git(["add", "server/probe.js"]);
        assert(review(root, base).some(function (e) { return e.includes("primitive"); }));
    });
    ["/x/.exec(s)", "re.exec(line)"].forEach(function (code) {
        write("server/probe.js", code);
        assert.deepStrictEqual(review(root, base), [], code);
    });
    write("server/probe.js", "cp.exec(cmd); // security-review-allow: validated command owner");
    var notices = [];
    assert.deepStrictEqual(review(root, base, function (message) { notices.push(message); }), []);
    assert.deepStrictEqual(notices, ["NOTICE server/probe.js:1: security-review-allow: validated command owner"]);
    write("server/probe.js", "cp.exec(cmd); // security-review-allow:   ");
    assert.strictEqual(review(root, base).length, 1, "empty reason fails");
    write("server/probe.js", "const token = '" + "gh" + "p_" + "x".repeat(36) + "'; // security-review-allow: fixture");
    assert.strictEqual(review(root, base).length, 1, "secret cannot be suppressed");
    write("server/probe.js", "const safe = 1;");
    assert.deepStrictEqual(review(root, base), []);
    write("server/legacy.js", "eval(legacyInput)");
    write("server/process-owner.js", "const runner = require('child_process');\n");
    git(["add", "."]);
    var existing = git(["commit-tree", git(["write-tree"]), "-p", base, "-m", "existing"]);
    git(["update-ref", "HEAD", existing]);
    assert.deepStrictEqual(review(root, existing), [], "unchanged server files pass");
    write("server/process-owner.js", "const runner = require('child_process');\nrunner.exec(cmd);\n");
    assert.deepStrictEqual(review(root, existing), ["server/process-owner.js:2: new dynamic execution/process primitive requires security review"], "existing binding identifies added exec call");
    write("server/process-owner.js", "const runner = require('child_process');\n");
    ["exec", "execSync", "execFile", "execFileSync", "spawn", "spawnSync", "fork"].forEach(function (method) {
        write("server/new.js", method + "(cmd)");
        assert.strictEqual(review(root, existing).length, 1, "bare " + method + " must fail");
    });
    write("server/new.js", "cp.exec(cmd); // security-review-allow: validated untracked owner");
    var untrackedNotices = [];
    assert.deepStrictEqual(review(root, existing, function (message) { untrackedNotices.push(message); }), []);
    assert.strictEqual(untrackedNotices[0], "NOTICE server/new.js:1: security-review-allow: validated untracked owner");
    fs.unlinkSync(path.join(root, "server/new.js"));
    write("server/probe.js", "processOwner.exec(request.input);");
    assert(review(root, existing).some(function (e) { return e.includes("primitive"); }), "changes in an existing process owner fail");
    write("server/probe.js", "const safe = 1;");
    write("server/legacy.js", "const removedOnBase = 1;");
    write("server/base-only.js", "const baseOnly = 1;");
    git(["add", "."]);
    var advancedBase = git(["commit-tree", git(["write-tree"]), "-p", existing, "-m", "base advanced"]);
    git(["reset", "--", "server/base-only.js", "server/legacy.js"]);
    write("server/legacy.js", "eval(legacyInput)");
    fs.unlinkSync(path.join(root, "server/base-only.js"));
    assert.deepStrictEqual(review(root, advancedBase), [], "base-only changes must not enter PR diff");
    write("server/probe.js", "spawn(cmd, args)");
    assert(review(root, advancedBase).length > 0, "own PR changes still fail behind base");
    assert.throws(function () { review(root, "missing-base"); });
    var workflow = fs.readFileSync(path.join(__dirname, "../.github/workflows/test.yml"), "utf8");
    var job = workflow.split("\n  security-review:\n")[1];
    assert(job && job.includes("name: security-review"));
    assert(!/^    if:/m.test(job), "fork PRs must not be skipped");
    ["persist-credentials: false", "contents: read", "github.event.pull_request.head.sha", "github.event.pull_request.base.sha", "node scripts/security-review.js", "run: npm test"].forEach(function (contract) { assert(job.includes(contract), contract); });
    assert(workflow.includes("\n  pull_request:\n"));
    console.log("Security review regression tests: OK (secrets, RegExp exec, process bindings, tracked/untracked execution, overrides/NOTICE, redaction, merge base, fail-closed base, PR contract)");
} finally {
    fs.rmSync(root, { recursive: true, force: true });
}
