"use strict";

var assert = require("assert");
var pluginMain = require("../plugin-main.js");

var originalWindow = global.window;
var originalDocument = global.document;

function classList(values) {
    var state = Object.create(null);
    (values || []).forEach(function (value) { state[value] = true; });
    return {
        add: function (value) { state[value] = true; },
        remove: function (value) { delete state[value]; },
        contains: function (value) { return state[value] === true; },
        toggle: function (value, enabled) {
            if (enabled === false) delete state[value];
            else if (enabled === true || !state[value]) state[value] = true;
            else delete state[value];
        }
    };
}

function element(tagName) {
    var attributes = Object.create(null);
    return {
        tagName: String(tagName || "div").toUpperCase(),
        id: "",
        src: "",
        href: "",
        rel: "",
        async: false,
        classList: classList(),
        childNodes: [],
        setAttribute: function (name, value) { attributes[name] = String(value); },
        getAttribute: function (name) { return attributes[name] == null ? null : attributes[name]; },
        addEventListener: function () {},
        remove: function () {}
    };
}

var observed = [];
function NativeMutationObserver(callback) {
    this.callback = callback;
}
NativeMutationObserver.prototype.observe = function (target, options) {
    observed.push({ observer: this, target: target, options: options });
};
NativeMutationObserver.prototype.disconnect = function () {};
NativeMutationObserver.prototype.takeRecords = function () { return []; };

var documentElement = element("html");
var head = element("head");
var panel = element("aside");
panel.id = "SirkDesktopCommandsPanel";
var commandTab = element("td");
commandTab.id = "MainDevSirkPlatform-Commands";
commandTab.classList.add("style3sel");
var commandHeader = element("span");
commandHeader.id = "p19ph-sirk-platform-mycommands-device-page";
commandHeader.classList.add("on");
var titleText = { nodeType: 3, nodeValue: "Wtyczki" };
var deviceSuffix = element("span");
deviceSuffix.id = "p19deviceName";
deviceSuffix.childNodes = [{ nodeType: 3, nodeValue: " - TEST-PC" }];
var title = element("h1");
title.childNodes = [titleText, deviceSuffix];

var elements = {
    SirkDesktopCommandsPanel: panel,
    "MainDevSirkPlatform-Commands": commandTab,
    "p19ph-sirk-platform-mycommands-device-page": commandHeader
};

var listeners = {};
var documentStub = {
    currentScript: null,
    documentElement: documentElement,
    head: head,
    createElement: element,
    getElementById: function (id) { return elements[id] || null; },
    querySelector: function (selector) {
        if (selector === ".sirk-desktop-commands-panel") return panel;
        if (selector === "#p19title h1") return title;
        if (selector === "#p19headers .on") return commandHeader;
        return null;
    },
    addEventListener: function (name, handler) { listeners[name] = handler; }
};
head.appendChild = function (node) {
    if (node.id) elements[node.id] = node;
    if (node.tagName === "SCRIPT") {
        Promise.resolve().then(function () {
            if (typeof node.onload === "function") node.onload();
        });
    }
    return node;
};

var storage = {
    _curPluginPage: "sirk-platform-mycommands-device-page"
};
var windowStub = {
    location: { href: "https://mesh.example.test/?key=test" },
    MutationObserver: NativeMutationObserver,
    WebKitMutationObserver: NativeMutationObserver,
    localStorage: {
        getItem: function (key) { return storage[key] == null ? null : storage[key]; },
        setItem: function (key, value) { storage[key] = String(value); }
    },
    SirkPlatformRuntime: {
        initialize: function () { return Promise.resolve(); },
        onDeviceRefreshEnd: function () {}
    },
    xxcurrentView: 19,
    setTimeout: function (handler) { handler(); return 1; },
    clearTimeout: function () {},
    console: { error: function () {} }
};

function nextTurn() {
    return new Promise(function (resolve) { setImmediate(resolve); });
}

(async function run() {
    global.window = windowStub;
    global.document = documentStub;

    try {
        var hook = pluginMain.createSerializedStartupHook("1.7.19", "SIRKPortal");
        hook();

        assert.notStrictEqual(windowStub.MutationObserver, NativeMutationObserver,
            "Startup must install the Quick observer scope before loading browser assets.");

        documentStub.currentScript = {
            src: "https://mesh.example.test/pluginadmin.ashx?pin=SIRKPortal&asset=mesh-plugin-core.js&v=1.7.19"
        };
        var quickObserver = new windowStub.MutationObserver(function () {});
        quickObserver.observe(documentElement, { childList: true, subtree: true });

        assert.ok(observed.some(function (entry) { return entry.observer === quickObserver && entry.target === panel; }),
            "Mesh/Quick global observers must be attached to the Quick panel.");
        assert.ok(!observed.some(function (entry) { return entry.observer === quickObserver && entry.target === documentElement; }),
            "Mesh/Quick observers must never observe the whole document after isolation is installed.");

        documentStub.currentScript = { src: "https://mesh.example.test/scripts/unrelated.js" };
        var unrelatedObserver = new windowStub.MutationObserver(function () {});
        unrelatedObserver.observe(documentElement, { childList: true, subtree: true });
        assert.ok(observed.some(function (entry) { return entry.observer === unrelatedObserver && entry.target === documentElement; }),
            "Observers unrelated to Quick must keep their native target.");

        assert.strictEqual(typeof windowStub.__sirkScheduleCommandsTitle, "function");
        windowStub.__sirkScheduleCommandsTitle();
        assert.strictEqual(titleText.nodeValue, "Commands",
            "The selected Commands device tab must render Commands - <PC>, not the translated Plugins title.");
        assert.strictEqual(deviceSuffix.childNodes[0].nodeValue, " - TEST-PC",
            "Commands title synchronization must preserve the native device suffix.");

        var source = hook.toString();
        assert.ok(source.indexOf("target === document.documentElement") >= 0,
            "The serialized hook must intercept only document-wide observers.");
        assert.ok(source.indexOf("mesh-plugin-core|quick-output-state") >= 0,
            "The serialized hook must be limited to the two Quick lifecycle scripts.");
        assert.ok(source.indexOf("[?&#]") >= 0,
            "Quick script source detection must support query-string ampersands used by pluginadmin.ashx.");

        await nextTurn();
        await nextTurn();

        console.log("Quick observer lifecycle isolation and Commands device title: OK");
    } finally {
        global.window = originalWindow;
        global.document = originalDocument;
    }
}()).catch(function (error) {
    console.error(error);
    process.exitCode = 1;
});
