"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var source = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "ui", "layout.js"),
    "utf8"
);

var timers = [];
var context = {
    Array: Array,
    Object: Object,
    Promise: Promise,
    String: String,
    console: console,
    document: {
        getElementById: function () { return null; },
        createElement: function () { return {}; },
        head: { appendChild: function () {} },
        documentElement: { appendChild: function () {} }
    },
    window: {
        localStorage: {
            getItem: function () { return null; },
            setItem: function () {}
        },
        setTimeout: function (callback) {
            timers.push(callback);
            return timers.length;
        }
    }
};
context.window.window = context.window;

vm.runInNewContext(source, context, { filename: "layout.js" });

var clearCount = 0;
var visibleContent = { connected: true };

context.window.SirkPlatformModuleShell = {
    create: function (definition) {
        var page = {
            root: {},
            primary: { marker: visibleContent },
            secondary: { marker: visibleContent },
            details: { marker: visibleContent },
            layout: {
                clear: function () {
                    clearCount += 1;
                    page.primary.marker = null;
                    page.secondary.marker = null;
                    page.details.marker = null;
                }
            }
        };
        var api = {
            state: { page: page },
            render: function () {
                page.layout.clear();
                Promise.resolve(definition.render(api)).catch(function () {});
            }
        };
        return { api: api, render: api.render };
    }
};

while (timers.length) timers.shift()();

assert.strictEqual(
    context.window.__sirkStableModuleRenderingInstalled,
    true,
    "The shared layout runtime must install the stable module-rendering contract."
);

var firstResolve;
var renderCalls = 0;
var definition = {
    render: function () {
        renderCalls += 1;
        if (renderCalls === 1) {
            return new Promise(function (resolve) { firstResolve = resolve; });
        }
        return Promise.resolve();
    }
};
var moduleInstance = context.window.SirkPlatformModuleShell.create(definition);

(async function () {
    var first = moduleInstance.api.render();
    var sameFrame = moduleInstance.api.render();

    assert.strictEqual(first, sameFrame,
        "Multiple render requests in one microtask must share one scheduled render.");

    await Promise.resolve();
    await Promise.resolve();

    assert.strictEqual(renderCalls, 1,
        "Two same-frame clicks must start only one renderer.");
    assert.strictEqual(clearCount, 0,
        "A rerender must not clear the three-column layout before data is ready.");
    assert.strictEqual(moduleInstance.api.state.page.primary.marker, visibleContent,
        "Existing primary-column DOM must remain visible while rendering.");
    assert.strictEqual(moduleInstance.api.state.page.secondary.marker, visibleContent,
        "Existing secondary-column DOM must remain visible while rendering.");
    assert.strictEqual(moduleInstance.api.state.page.details.marker, visibleContent,
        "Existing details DOM must remain visible while rendering.");

    moduleInstance.api.render();
    await Promise.resolve();
    await Promise.resolve();

    assert.strictEqual(renderCalls, 1,
        "A click during an active render must be queued instead of running concurrently.");
    assert.strictEqual(clearCount, 0,
        "Queued rendering must also preserve the current DOM.");

    firstResolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    assert.strictEqual(renderCalls, 2,
        "After the active render completes, exactly one final queued render must run.");
    assert.strictEqual(clearCount, 0,
        "The final queued render must not expose a blank intermediate layout.");
    assert.strictEqual(moduleInstance.render, moduleInstance.api.render,
        "External module lifecycle calls must use the same stable render function.");

    console.log("Stable shared module rendering without click flicker: OK");
}()).catch(function (error) {
    console.error(error);
    process.exitCode = 1;
});
