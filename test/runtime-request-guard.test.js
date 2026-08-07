"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var source = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "core.js"), "utf8");
var pending = [];
var timers = [];
var seenRequests = [];

function abortError() {
    var error = new Error("aborted");
    error.name = "AbortError";
    return error;
}

var windowObject = {
    __SIRK_PLATFORM_VERSION__: "test",
    location: { href: "https://mesh.example.test/" },
    SirkPlatformCore: { requestTimeoutMs: 1000 },
    setTimeout: function (callback) {
        timers.push(callback);
        return timers.length;
    },
    clearTimeout: function () {},
    fetch: function (url, options) {
        seenRequests.push({ url: String(url), options: options || {} });
        return new Promise(function (resolve, reject) {
            var signal = options && options.signal;
            if (signal) {
                if (signal.aborted) {
                    reject(abortError());
                    return;
                }
                signal.addEventListener("abort", function () { reject(abortError()); }, { once: true });
            }
            pending.push({ resolve: resolve, reject: reject });
        });
    }
};
var documentObject = {
    head: { appendChild: function () {} },
    documentElement: { appendChild: function () {}, classList: { add: function () {}, remove: function () {}, toggle: function () {} } },
    body: null,
    createElement: function () {
        return {
            appendChild: function () {},
            classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } },
            setAttribute: function () {},
            getAttribute: function () { return null; },
            style: {},
            parentNode: null
        };
    },
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
};
windowObject.document = documentObject;
windowObject.window = windowObject;

var context = {
    AbortController: AbortController,
    Error: Error,
    JSON: JSON,
    Math: Math,
    Number: Number,
    Object: Object,
    Promise: Promise,
    String: String,
    URL: URL,
    URLSearchParams: URLSearchParams,
    document: documentObject,
    window: windowObject
};

vm.runInNewContext(source, context, { filename: "core.js" });
var core = windowObject.SirkPlatformCore;

assert.strictEqual(core.requestTimeoutMs, 1000,
    "GET timeout must retain the 1000 ms safety floor.");

var external = new AbortController();
var cancelled = core.api("approvalcenter", "providers", { signal: external.signal });
assert.ok(seenRequests[0].options.signal,
    "A GET with an external signal must use a composed internal signal.");
external.abort();

cancelled.then(function () {
    throw new Error("Externally aborted GET should reject.");
}, function (error) {
    assert.strictEqual(error.name, "AbortError",
        "External navigation/view cancellation must surface as AbortError.");
    assert.ok(error.message.indexOf("view changed") >= 0,
        "AbortError must explain that the request was cancelled because the view changed.");

    var write = core.api("approvalcenter", "decision", { method: "POST" });
    var writeRequest = seenRequests[1];
    assert.strictEqual(writeRequest.options.signal, undefined,
        "Write requests must not receive the read-only timeout controller.");
    pending[1].resolve({
        ok: true,
        status: 200,
        text: function () { return Promise.resolve('{"ok":true}'); }
    });
    return write;
}).then(function (result) {
    assert.strictEqual(result.ok, true,
        "A successful write must complete normally without a read timeout.");

    var read = core.api("myscripts", "tree");
    var readRequest = seenRequests[2];
    assert.ok(readRequest.options.signal,
        "Bounded GET requests must receive an internal AbortController signal.");
    var timeout = timers[timers.length - 1];
    assert.strictEqual(typeof timeout, "function", "Bounded GET must install a timeout callback.");
    timeout();
    return read.then(function () {
        throw new Error("Timed-out GET should reject.");
    }, function (error) {
        assert.strictEqual(error.name, "SirkApiTimeoutError");
        assert.ok(error.message.indexOf("myscripts/tree") >= 0,
            "The timeout must identify the blocked module and asset.");
        assert.ok(error.message.indexOf("1000 ms") >= 0,
            "The timeout error must report the enforced timeout interval.");
    });
}).then(function () {
    assert.ok(source.indexOf('var boundedRead = String(request.method || "GET").toUpperCase() === "GET"') >= 0,
        "Only GET requests may receive the automatic timeout controller.");
    assert.ok(source.indexOf('throw requestError("SirkApiTimeoutError"') >= 0,
        "The canonical API layer must own timeout errors.");
    assert.ok(source.indexOf('throw requestError("AbortError", "SIRK API request cancelled because the view changed.")') >= 0,
        "The canonical API layer must own view-cancellation errors.");
    console.log("Runtime GET timeout, external cancellation and unbounded writes: OK");
}).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});
