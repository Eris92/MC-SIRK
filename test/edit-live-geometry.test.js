"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var source = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "ui", "toolbar-api.js"),
    "utf8"
);

function classList(initial) {
    var values = Object.create(null);
    (initial || []).forEach(function (name) { values[name] = true; });
    return {
        contains: function (name) { return values[name] === true; },
        toggle: function (name, force) {
            if (force === true) values[name] = true;
            else if (force === false) delete values[name];
            else if (values[name]) delete values[name];
            else values[name] = true;
            return values[name] === true;
        }
    };
}

function styleStore() {
    var values = Object.create(null);
    return {
        values: values,
        setProperty: function (name, value) { values[name] = value; },
        removeProperty: function (name) { delete values[name]; }
    };
}

var row = {
    getBoundingClientRect: function () { return { width: 282 }; }
};
var layout = {
    classList: classList([])
};
var primary = {
    getBoundingClientRect: function () { return { width: 218 }; }
};
var actionButtons = [0, 1, 2, 3].map(function () {
    return {
        getBoundingClientRect: function () { return { width: 36 }; }
    };
});
var actionGroup = {
    children: actionButtons
};
var secondary = {
    getBoundingClientRect: function () { return { width: 306 }; },
    querySelector: function (selector) {
        return selector === ".mc-tree-script-row" ? row : null;
    }
};
var pageStyle = styleStore();
var page = {
    classList: classList(["mc-shared-page", "mc-shared-page-mycommands"]),
    style: pageStyle,
    querySelector: function (selector) {
        if (selector === ".mc-shared-layout") return layout;
        if (selector === ".mc-shared-primary") return primary;
        if (selector === ".mc-shared-secondary") return secondary;
        return null;
    },
    querySelectorAll: function (selector) {
        return selector === ".mc-tree-script-actions" ? [actionGroup] : [];
    }
};
var button = {
    classList: classList([]),
    setAttribute: function () {},
    querySelector: function () { return null; }
};
var toolbarRoot = {
    closest: function (selector) {
        return selector === ".mc-shared-page" ? page : null;
    }
};
var appendedStyles = [];
var frameQueue = [];
var context = {
    Math: Math,
    Number: Number,
    String: String,
    parseFloat: parseFloat,
    isFinite: isFinite,
    console: console,
    document: {
        getElementById: function () { return null; },
        createElement: function () { return {}; },
        head: { appendChild: function (node) { appendedStyles.push(node); } },
        documentElement: { appendChild: function (node) { appendedStyles.push(node); } }
    },
    window: {
        requestAnimationFrame: function (callback) {
            frameQueue.push(callback);
            return frameQueue.length;
        },
        getComputedStyle: function () {
            return { columnGap: "4px", gap: "4px" };
        }
    }
};
context.window.window = context.window;

function flushFrames() {
    while (frameQueue.length) frameQueue.shift()();
}

vm.runInNewContext(source, context, { filename: "toolbar-api.js" });

var api = context.window.SharedToolbarApi.create({
    root: toolbarRoot,
    buttons: { manage: button },
    groups: {},
    state: {},
    searchInput: {},
    searchWrap: {}
});

api.setActive("manage", true);
flushFrames();

assert.strictEqual(pageStyle.values["--sirk-mode-primary-width"], "218px",
    "Edit must retain the exact rendered first-column width.");
assert.strictEqual(pageStyle.values["--sirk-mode-secondary-width"], "306px",
    "Edit must retain the exact rendered normal second-column width.");
assert.strictEqual(pageStyle.values["--sirk-mode-row-width"], "282px",
    "Edit must retain the exact rendered script-row width so wrapping does not change.");
assert.strictEqual(pageStyle.values["--sirk-actions-width"], "172px",
    "Four 36 px buttons, three 4 px gaps and the safety gutter must all fit without clipping.");
assert.strictEqual(page.classList.contains("is-edit-mode"), true,
    "Edit class must be added after the normal geometry is captured.");
assert.strictEqual(page.__sirkModeGeometryCaptured, true,
    "The captured normal geometry must not be overwritten by later Edit rerenders.");

primary.getBoundingClientRect = function () { return { width: 300 }; };
secondary.getBoundingClientRect = function () { return { width: 620 }; };
row.getBoundingClientRect = function () { return { width: 430 }; };
api.setActive("manage", true);
flushFrames();
assert.strictEqual(pageStyle.values["--sirk-mode-primary-width"], "218px",
    "Repeated toolbar synchronization must not recapture the already expanded Edit layout.");
assert.strictEqual(pageStyle.values["--sirk-mode-secondary-width"], "306px",
    "Repeated toolbar synchronization must keep the original normal second-column width.");
assert.strictEqual(pageStyle.values["--sirk-mode-row-width"], "282px",
    "Repeated toolbar synchronization must keep the original normal text width.");
assert.strictEqual(pageStyle.values["--sirk-actions-width"], "172px",
    "Repeated action measurement must remain stable and must not grow on every render.");

api.setActive("manage", false);
assert.strictEqual(page.classList.contains("is-edit-mode"), false,
    "Closing Edit must remove the mode class.");
assert.strictEqual(pageStyle.values["--sirk-mode-primary-width"], undefined,
    "Closing the last active mode must release the captured first-column width.");
assert.strictEqual(pageStyle.values["--sirk-mode-secondary-width"], undefined,
    "Closing the last active mode must release the captured second-column width.");
assert.strictEqual(pageStyle.values["--sirk-mode-row-width"], undefined,
    "Closing the last active mode must release the captured text width.");
assert.strictEqual(pageStyle.values["--sirk-actions-width"], undefined,
    "Closing Edit must release the measured action width.");

assert.ok(source.indexOf("box-sizing:border-box!important") >= 0,
    "Edit action buttons must include borders and padding inside their reserved width.");
assert.strictEqual(appendedStyles.length, 1,
    "The shared mode stylesheet must be installed exactly once.");
console.log("Edit live geometry and measured four-button action width: OK");
