"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var source = fs.readFileSync(path.join(__dirname, "..", "public", "native", "quick-output-state.js"), "utf8");
var abortedRequests = 0;

function abortError() {
    var error = new Error("aborted");
    error.name = "AbortError";
    return error;
}

var localValues = Object.create(null);
var windowObject = {
    AbortController: AbortController,
    Promise: Promise,
    clearTimeout: clearTimeout,
    setTimeout: setTimeout,
    localStorage: {
        getItem: function (key) { return Object.prototype.hasOwnProperty.call(localValues, key) ? localValues[key] : null; },
        setItem: function (key, value) { localValues[key] = String(value); }
    },
    SirkPlatformCore: {
        requestTimeoutMs: 1000,
        api: function (moduleName, assetName, options) {
            return new Promise(function (resolve, reject) {
                var signal = options && options.signal;
                if (!signal) return;
                if (signal.aborted) {
                    abortedRequests += 1;
                    reject(abortError());
                    return;
                }
                signal.addEventListener("abort", function () {
                    abortedRequests += 1;
                    reject(abortError());
                }, { once: true });
            });
        }
    },
    SirkPlatformModuleShell: {
        create: function (definition) {
            var api = {
                api: function () {},
                render: function () { return definition.render(api); }
            };
            return {
                api: api,
                close: function () { return true; },
                onNativePageStart: function () { return true; }
            };
        }
    }
};

var classList = { add: function () {}, toggle: function () {}, contains: function () { return false; } };
var documentObject = {
    documentElement: { appendChild: function () {} },
    head: { appendChild: function () {} },
    createElement: function () {
        return {
            classList: classList,
            appendChild: function () {},
            querySelector: function () { return null; },
            querySelectorAll: function () { return []; },
            removeAttribute: function () {},
            setAttribute: function () {},
            style: {}
        };
    },
    getElementById: function () { return null; },
    querySelectorAll: function () { return []; }
};

var context = {
    AbortController: AbortController,
    Promise: Promise,
    clearTimeout: clearTimeout,
    document: documentObject,
    setTimeout: setTimeout,
    window: windowObject
};
windowObject.window = windowObject;
windowObject.document = documentObject;
vm.runInNewContext(source, context, { filename: "quick-output-state.js" });

var definition = {
    key: "approvalcenter",
    render: function (api) { return api.api("providers"); }
};
var module = windowObject.SirkPlatformModuleShell.create(definition);
var cancelled = module.api.render();
setTimeout(function () { module.close(); }, 10);

cancelled.then(function (value) {
    assert.strictEqual(value, null, "Changing the view must swallow the expected AbortError.");
    assert.ok(abortedRequests >= 1, "Closing a module must abort its pending render request.");

    return windowObject.SirkPlatformCore.api("myscripts", "tree", null, null).then(function () {
        throw new Error("The unresolved API call should have timed out.");
    }, function (error) {
        assert.strictEqual(error.name, "SirkApiTimeoutError");
        assert.ok(error.message.indexOf("myscripts/tree") >= 0,
            "The timeout must identify the blocked module and asset.");
    });
}).then(function () {
    console.log("Runtime API timeout and stale render cancellation: OK");
}).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});
