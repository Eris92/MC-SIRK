"use strict";

var assert = require("assert");
var childProcess = require("child_process");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var createExecutor = require(path.join(root, "server/core/server-script-executor.js")).createServerScriptExecutor;
var originalExecFile = childProcess.execFile;
var callbacks = [];
var execCalls = [];

function tick() {
    return new Promise(function (resolve) { setImmediate(resolve); });
}

childProcess.execFile = function (file, args, options, callback) {
    execCalls.push({ file: file, args: args, options: options });
    callbacks.push(callback);
};

var context = {
    fs: fs,
    nativePath: path,
    pluginRoot: root,
    settings: {
        read: function () { return { modules: { myscripts: { runTimeoutSeconds: 60 } } }; }
    },
    secrets: {
        get: function () { return {}; }
    },
    integrations: {
        configured: function () { return {}; },
        get: function () { return {}; }
    }
};

var library = {
    getScript: function (relativePath) {
        if (String(relativePath) !== "Reports/license.ps1") return null;
        return {
            path: "Reports/license.ps1",
            label: "License report",
            shell: "powershell",
            hash: "hash-1",
            variables: [
                { name: "Scope", label: "Scope", control: "text", required: false, defaultValue: "all" }
            ],
            secretVariables: []
        };
    }
};

var admin = {
    secretValues: function () { return {}; }
};

var executor = createExecutor({
    context: context,
    library: library,
    admin: admin,
    assignmentNamespace: "script-secrets.myscripts.system-credentials"
});

function payload(scope) {
    return { scriptPath: "Reports/license.ps1", scriptHash: "hash-1", variableValues: { Scope: scope } };
}
function request(id, userId) {
    return { id: id, requester: { id: userId, name: userId } };
}

var first = executor.execute(payload("all"), request("r1", "user/a"));
var duplicate = executor.execute(payload("all"), request("r2", "user/a"));
assert.strictEqual(first, duplicate,
    "Identical active executions for the same requester/script/effective values must reuse one Promise.");

tick().then(function () {
    assert.strictEqual(execCalls.length, 1,
        "Identical active executions must spawn the underlying script exactly once.");
    callbacks.shift()(null, "report-1", "");
    return Promise.all([first, duplicate]);
}).then(function (results) {
    assert.strictEqual(results[0].output, "report-1");
    assert.strictEqual(results[1].output, "report-1");

    var afterSuccess = executor.execute(payload("all"), request("r3", "user/a"));
    return tick().then(function () {
        assert.strictEqual(execCalls.length, 2,
            "Single-flight state must be released after success so a later manual run can execute.");
        callbacks.shift()(null, "report-2", "");
        return afterSuccess;
    });
}).then(function () {
    var differentValue = executor.execute(payload("limited"), request("r4", "user/a"));
    var differentUser = executor.execute(payload("limited"), request("r5", "user/b"));
    assert.notStrictEqual(differentValue, differentUser,
        "Different requesters must never share an active execution.");
    return tick().then(function () {
        assert.strictEqual(execCalls.length, 3,
            "A distinct effective variable payload must enqueue an independent execution.");
        callbacks.shift()(null, "report-3", "");
        return differentValue;
    }).then(function () {
        return tick();
    }).then(function () {
        assert.strictEqual(execCalls.length, 4,
            "A distinct requester must execute independently after the existing global queue advances.");
        callbacks.shift()(null, "report-4", "");
        return differentUser;
    });
}).then(function () {
    var failed = executor.execute(payload("failure"), request("r6", "user/a"));
    return tick().then(function () {
        assert.strictEqual(execCalls.length, 5);
        var error = new Error("boom"); error.code = 1;
        callbacks.shift()(error, "", "boom");
        return failed.then(function () {
            throw new Error("Failure case must reject.");
        }, function () {});
    });
}).then(function () {
    var afterFailure = executor.execute(payload("failure"), request("r7", "user/a"));
    return tick().then(function () {
        assert.strictEqual(execCalls.length, 6,
            "Single-flight state must be released after failure.");
        callbacks.shift()(null, "report-after-failure", "");
        return afterFailure;
    });
}).then(function () {
    console.log("Server-side My Scripts execution is single-flight per requester/script/effective payload: OK");
}).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
}).then(function () {
    childProcess.execFile = originalExecFile;
});
