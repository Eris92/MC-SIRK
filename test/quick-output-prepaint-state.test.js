"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var source = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "ui", "toolbar.js"), "utf8");

function createClassList(initial) {
    var values = {};
    String(initial || "").split(/\s+/).filter(Boolean).forEach(function (name) { values[name] = true; });
    return {
        add: function (name) { values[name] = true; },
        remove: function (name) { delete values[name]; },
        toggle: function (name, enabled) {
            if (arguments.length > 1) values[name] = enabled === true;
            else values[name] = !values[name];
            return values[name] === true;
        },
        contains: function (name) { return values[name] === true; }
    };
}

function createElement(tag) {
    var className = "";
    var element = {
        tagName: String(tag || "").toUpperCase(),
        childNodes: [],
        children: [],
        attributes: {},
        style: {},
        hidden: false,
        isConnected: true,
        parentNode: null,
        classList: createClassList(),
        appendChild: function (child) {
            child.parentNode = this;
            this.childNodes.push(child);
            this.children.push(child);
            if (!this.firstChild) this.firstChild = child;
            return child;
        },
        setAttribute: function (name, value) { this.attributes[name] = String(value); },
        getAttribute: function (name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; },
        removeAttribute: function (name) { delete this.attributes[name]; },
        focus: function () {},
        click: function () { if (typeof this.onclick === "function") return this.onclick({ type: "click" }); },
        querySelector: function (selector) {
            var wanted = selector.charAt(0) === "." ? selector.slice(1) : "";
            var queue = this.childNodes.slice();
            while (queue.length) {
                var current = queue.shift();
                if (wanted && current.classList && current.classList.contains(wanted)) return current;
                if (current.childNodes) queue = queue.concat(current.childNodes);
            }
            return null;
        }
    };
    Object.defineProperty(element, "className", {
        get: function () { return className; },
        set: function (value) {
            className = String(value || "");
            element.classList = createClassList(className);
        }
    });
    Object.defineProperty(element, "innerHTML", {
        get: function () { return element._innerHTML || ""; },
        set: function (value) {
            element._innerHTML = String(value || "");
            var icon = createElement("span");
            icon.className = "mc-shared-toolbar-icon mc-portal-toolbar-icon";
            element.childNodes = [icon];
            element.children = [icon];
            element.firstChild = icon;
            icon.parentNode = element;
        }
    });
    return element;
}

var stored = {
    "mc-sirk-quickcommands-output-hidden-v2": "1",
    "mc-sirk-quickcommands-details-collapsed": "0",
    "mc-sirk-quickcommands-details-preferred-collapsed": "1",
    "mc-sirk-quickcommands-details-attention": "1"
};
var documentObject = {
    createElement: createElement,
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    getElementById: function () { return null; }
};
var windowObject = {
    localStorage: {
        getItem: function (key) { return Object.prototype.hasOwnProperty.call(stored, key) ? stored[key] : null; },
        setItem: function (key, value) { stored[key] = String(value); }
    },
    setTimeout: function (callback) { callback(); return 1; },
    SharedToolbarConfig: {
        definitions: {},
        resolve: function () { return []; }
    },
    SharedToolbarApi: {
        create: function (context) {
            return {
                buttons: context.buttons,
                state: context.state,
                searchInput: context.searchInput,
                setActive: function (key, value) {
                    var item = context.buttons[key];
                    if (!item) return;
                    item.classList.toggle("is-active", value === true);
                    item.setAttribute("aria-pressed", value === true ? "true" : "false");
                },
                setTitle: function (key, value) {
                    var item = context.buttons[key];
                    if (!item) return;
                    item.title = String(value || "");
                    item.setAttribute("aria-label", item.title);
                },
                setIcon: function () {},
                setEnabled: function () {},
                showSearch: function () {}
            };
        }
    }
};
windowObject.window = windowObject;
windowObject.document = documentObject;

vm.runInNewContext(source, {
    window: windowObject,
    document: documentObject,
    JSON: JSON,
    Object: Object,
    Array: Array,
    String: String,
    Number: Number,
    RegExp: RegExp,
    setTimeout: windowObject.setTimeout,
    clearTimeout: function () {}
}, { filename: "toolbar.js" });

function createQuickSurface(internallyHidden) {
    var panel = createElement("aside");
    panel.className = "sirk-desktop-commands-panel";
    var host = createElement("div");
    host.className = "sirk-quick-command-toolbar-host";
    host.closest = function () { return panel; };
    var browser = createElement("div");
    browser.className = "sirk-quick-command-browser" + (internallyHidden ? " is-details-collapsed" : "");
    panel.appendChild(host);
    panel.appendChild(browser);
    return { panel: panel, host: host, browser: browser };
}

var surface = createQuickSurface(false);
var handlerCalls = 0;
var api = windowObject.SharedToolbar.mount({
    container: surface.host,
    preset: "mycommands",
    buttons: {},
    customButtons: [{
        key: "details",
        title: "Ukryj wynik",
        side: "left",
        order: 65,
        icon: "details",
        onClick: function () {
            handlerCalls += 1;
            surface.browser.classList.toggle("is-details-collapsed", true);
        }
    }]
});
var details = api.buttons.details;

assert.strictEqual(surface.panel.attributes["data-sirk-output-hidden"], "1",
    "Canonical hidden geometry must be applied before the toolbar is appended.");
assert.strictEqual(details.title, "Pokaż wynik");
assert.strictEqual(details.classList.contains("is-active"), false,
    "A remounted hidden output button must never paint as active.");
assert.strictEqual(details.attributes["aria-pressed"], "false");
assert.strictEqual(stored["mc-sirk-quickcommands-details-preferred-collapsed"], "0",
    "The superseded post-render controller must be neutralized before it can click the button.");

// The internal browser is already visible while the canonical panel is hidden. Opening output
// must reveal it directly without calling the old toggle and without an intermediate active flash.
details.click();
assert.strictEqual(handlerCalls, 0);
assert.strictEqual(stored["mc-sirk-quickcommands-output-hidden-v2"], "0");
assert.strictEqual(details.classList.contains("is-active"), true);
assert.strictEqual(details.attributes["aria-pressed"], "true");
assert.strictEqual(surface.panel.attributes["data-sirk-output-hidden"], undefined);

// Hiding output from the visible internal state requires one native toggle and reaches the
// final inactive state synchronously in the same click task.
details.click();
assert.strictEqual(handlerCalls, 1);
assert.strictEqual(stored["mc-sirk-quickcommands-output-hidden-v2"], "1");
assert.strictEqual(details.classList.contains("is-active"), false);
assert.strictEqual(details.attributes["aria-pressed"], "false");

var remount = createQuickSurface(false);
var remountedApi = windowObject.SharedToolbar.mount({
    container: remount.host,
    preset: "mycommands",
    buttons: {},
    customButtons: [{ key: "details", title: "Ukryj wynik", side: "left", order: 65, icon: "details", onClick: function () {} }]
});
assert.strictEqual(remountedApi.buttons.details.classList.contains("is-active"), false,
    "Category changes and script selections must remount directly in the canonical inactive state.");
assert.strictEqual(remountedApi.buttons.details.title, "Pokaż wynik");

console.log("Quick output canonical pre-paint state and remount stability: OK");
