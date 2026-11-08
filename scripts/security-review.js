"use strict";

// Dependency-free, conservative tripwire; not a substitute for owner security review.
var fs = require("fs");
var path = require("path");
var cp = require("child_process");

function git(root, args) {
    return cp.execFileSync("git", args, { cwd: root, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}
function review(root, base) {
    var errors = [];
    var files = git(root, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]).split("\0");
    var secrets = /gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----|AKIA[A-Z0-9]{16}|(?:password|passwd|api[_-]?key|client[_-]?secret)\s*[:=]\s*["'][^"'\s]{12,}["']/i;
    new Set(files).forEach(function (file) {
        if (!file || file.startsWith("test/")) return;
        var full = path.join(root, file);
        if (!fs.existsSync(full) || !fs.lstatSync(full).isFile()) return;
        fs.readFileSync(full, "utf8").split(/\r?\n/).forEach(function (line, index) {
            if (secrets.test(line)) errors.push(file + ":" + (index + 1) + ": possible credential (value redacted)");
        });
    });
    // Reject new dynamic execution/process primitives, including changes in existing
    // process owners. No automatic claim that arbitrary input validation is safe.
    var diff = git(root, ["diff", "--no-ext-diff", "--no-textconv", "--unified=0", base, "--", "server/"]);
    var current = "server/";
    diff.split("\n").forEach(function (line) {
        if (line.startsWith("+++ ")) current = line.slice(4);
        else if (line.startsWith("+") && /\beval\s*\(|\b(?:new\s+)?Function\s*\(|\b(?:node:)?child_process\b|\b(?:exec|execSync|execFile|execFileSync|spawn|spawnSync|fork)\s*\(/.test(line)) {
            errors.push(current + ": new dynamic execution/process primitive requires security review");
        }
    });
    // git diff does not include untracked files.
    git(root, ["ls-files", "--others", "--exclude-standard", "-z", "--", "server/"]).split("\0").filter(Boolean).forEach(function (file) {
        if (/\beval\s*\(|\b(?:new\s+)?Function\s*\(|\b(?:node:)?child_process\b|\b(?:exec|execSync|execFile|execFileSync|spawn|spawnSync|fork)\s*\(/.test(fs.readFileSync(path.join(root, file), "utf8"))) {
            errors.push(file + ": new dynamic execution/process primitive requires security review");
        }
    });
    return errors;
}
if (require.main === module) {
    try {
        var errors = review(path.resolve(__dirname, ".."), process.env.SECURITY_REVIEW_BASE || "HEAD");
        errors.forEach(function (error) { console.error(error); });
        if (errors.length) process.exitCode = 1;
        else console.log("Security static review: OK");
    } catch (error) {
        console.error("Security review failed: " + error.message);
        process.exitCode = 1;
    }
}
module.exports = review;
