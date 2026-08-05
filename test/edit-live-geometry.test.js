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
var context = {
    Math: Math,
    Number: Number,
    String: String,
    isFinite: isFinite,
    console: console,
    document: {
        getElementById: function () { return null; },
        createElement: function () { return {}; },
        head: { appendChild: function (node) { appendedStyles.push(node); } },
        documentElement: { appendChild: function (node) { appendedStyles.push(node); } }
    },
    window: {}
};
context.window.window = context.window;

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

assert.strictEqual(pageStyle.values["--sirk-mode-primary-width"], "218px",
    "Edit must retain the exact rendered first-column width.");
assert.strictEqual(pageStyle.values["--sirk-mode-secondary-width"], "306px",
    "Edit must retain the exact rendered normal second-column width.");
assert.strictEqual(pageStyle.values["--sirk-mode-row-width"], "282px",
    "Edit must retain the exact rendered script-row width so wrapping does not change.");
assert.strictEqual(page.classList.contains("is-edit-mode"), true,
    "Edit class must be added after the normal geometry is captured.");
assert.strictEqual(page.__sirkModeGeometryCaptured, true,
    "The captured normal geometry must not be overwritten by later Edit rerenders.");

primary.getBoundingClientRect = function () { return { width: 300 }; };
secondary.getBoundingClientRect = function () { return { width: 620 }; };
row.getBoundingClientRect = function () { return { width: 430 }; };
api.setActive("manage", true);
assert.strictEqual(pageStyle.values["--sirk-mode-primary-width"], "218px",
    "Repeated toolbar synchronization must not recapture the already expanded Edit layout.");
assert.strictEqual(pageStyle.values["--sirk-mode-secondary-width"], "306px",
    "Repeated toolbar synchronization must keep the original normal second-column width.");
assert.strictEqual(pageStyle.values["--sirk-mode-row-width"], "282px",
    "Repeated toolbar synchronization must keep the original normal text width.");

api.setActive("manage", false);
assert.strictEqual(page.classList.contains("is-edit-mode"), false,
    "Closing Edit must remove the mode class.");
assert.strictEqual(pageStyle.values["--sirk-mode-primary-width"], undefined,
    "Closing the last active mode must release the captured first-column width.");
assert.strictEqual(pageStyle.values["--sirk-mode-secondary-width"], undefined,
    "Closing the last active mode must release the captured second-column width.");
assert.strictEqual(pageStyle.values["--sirk-mode-row-width"], undefined,
    "Closing the last active mode must release the captured text width.");

assert.strictEqual(appendedStyles.length, 1,
    "The shared mode stylesheet must be installed exactly once.");
console.log("Edit live rendered geometry capture and release: OK");
