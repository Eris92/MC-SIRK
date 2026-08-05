"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var factory = require("../server/core/script-confirmation-library.js");

var root = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-script-cache-"));
var scriptPath = path.join(root, "Example.ps1");
fs.writeFileSync(scriptPath, [
    "# Example script | Cache test",
    "# ConfirmExecution: true",
    "# runAsUser: 2",
    "Write-Output 'ok'"
].join("\n"), "utf8");

var sourceReads = 0;
var countingFs = Object.create(fs);
countingFs.readFileSync = function (filePath) {
    if (path.resolve(String(filePath)) === path.resolve(scriptPath)) sourceReads += 1;
    return fs.readFileSync.apply(fs, arguments);
};

try {
    var library = factory.createScriptLibrary({
        fs: countingFs,
        path: path,
        root: root,
        readOnly: true,
        allowWrite: true
    });

    var first = library.getTree();
    var readsAfterFirst = sourceReads;
    assert.ok(readsAfterFirst >= 2, "The cold tree build must inspect and decorate the script source.");
    assert.strictEqual(first.children[0].confirmExecution, true);
    assert.strictEqual(first.children[0].runAsUser, 2);

    var second = library.getTree();
    assert.strictEqual(sourceReads, readsAfterFirst,
        "A hot decorated tree read must not re-read every script source.");
    assert.deepStrictEqual(second, first);

    library.invalidate();
    library.getTree();
    assert.ok(sourceReads > readsAfterFirst,
        "Explicit invalidation must rebuild the base and decorated caches.");

    library.saveSource("Example.ps1", [
        "# Example script | Updated",
        "# ConfirmExecution: false",
        "# runAsUser: 0",
        "Write-Output 'updated'"
    ].join("\n"));
    var updated = library.getTree();
    assert.strictEqual(updated.children[0].confirmExecution, false,
        "Saving source must invalidate the decorated tree cache.");
    assert.strictEqual(updated.children[0].runAsUser, 0);

    console.log("Decorated script tree hot cache and invalidation: OK");
} finally {
    fs.rmSync(root, { recursive: true, force: true });
}
