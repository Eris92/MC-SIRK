"use strict";

// Dependency-free, conservative tripwire; not a substitute for owner security review.
var fs = require("fs");
var path = require("path");
var cp = require("child_process");

function git(root, args) {
    return cp.execFileSync("git", args, { cwd: root, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}
function review(root, base, notice) {
    notice = notice || function (message) { console.log(message); };
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
    // Resolve the common ancestor: changes made only on the base branch are not PR changes.
    var ancestor = git(root, ["merge-base", base, "HEAD"]).trim();
    var receivers = new Set(["cp", "childProcess", "child_process", "processOwner"]);
    var serverFiles = files.filter(function (file) { return file.startsWith("server/") && fs.existsSync(path.join(root, file)); });
    serverFiles.forEach(function (file) {
        var source = fs.readFileSync(path.join(root, file), "utf8");
        var binding = /\b(?:const|let|var)\s+(\w+)\s*=\s*require\s*\(\s*["'](?:node:)?child_process["']\s*\)|\bimport\s+\*\s+as\s+(\w+)\s+from\s*["'](?:node:)?child_process["']|\bimport\s+(\w+)\s+from\s*["'](?:node:)?child_process["']/g;
        var match;
        while ((match = binding.exec(source))) receivers.add(match[1] || match[2] || match[3]);
    });
    function inspect(line, file, number) {
        var primitive = /\beval\s*\(|\bnew\s+Function\s*\(|\b(?:node:)?child_process\b/.test(line);
        var calls = /(?:(\b[A-Za-z_$][\w$]*)\s*\.\s*|(?<![\w$.]))(exec|execSync|execFile|execFileSync|spawn|spawnSync|fork)\s*\(/g;
        var call;
        while ((call = calls.exec(line))) {
            // Only .exec is ambiguous with RegExp; other process method names stay conservative.
            if (call[2] !== "exec" || !call[1] || receivers.has(call[1])) primitive = true;
        }
        if (!primitive) return;
        var location = file + ":" + number;
        var allowance = /\/\/ security-review-allow:\s*(\S.*)$/.exec(line);
        if (allowance) notice("NOTICE " + location + ": security-review-allow: " + allowance[1]);
        else errors.push(location + ": new dynamic execution/process primitive requires security review");
    }
    var diff = git(root, ["diff", "--no-ext-diff", "--no-textconv", "--unified=0", ancestor, "--", "server/"]);
    var current = "server/", number = 0;
    diff.split("\n").forEach(function (line) {
        if (line.startsWith("+++ b/")) current = line.slice(6);
        else if (line.startsWith("@@")) number = Number(/\+(\d+)/.exec(line)[1]);
        else if (line.startsWith("+")) inspect(line.slice(1), current, number++);
        else if (line.startsWith(" ")) number++;
    });
    git(root, ["ls-files", "--others", "--exclude-standard", "-z", "--", "server/"]).split("\0").filter(Boolean).forEach(function (file) {
        fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/).forEach(function (line, index) { inspect(line, file, index + 1); });
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
