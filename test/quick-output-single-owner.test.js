"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var toolbarApi = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar-api.js"), "utf8");
var desktop = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.js"), "utf8");
var startup = fs.readFileSync(path.join(root, "plugin-main.js"), "utf8");

var detailsStart = desktop.indexOf('key: "details"');
var detailsEnd = desktop.indexOf('key: "close"', detailsStart);
assert.ok(detailsStart >= 0 && detailsEnd > detailsStart,
    "Quick must define one canonical custom details action.");
var detailsAction = desktop.slice(detailsStart, detailsEnd);

assert.ok(detailsAction.indexOf('onClick: function () { writeDetailsCollapsed(!state.detailsCollapsed); render(panel); }') >= 0,
    "The canonical details action must own the only user click that changes output visibility.");
assert.strictEqual((detailsAction.match(/onClick:/g) || []).length, 1,
    "The Quick details action must expose exactly one click handler.");
assert.ok(desktop.indexOf('custom.onclick = function () { if (typeof definition.onClick === "function") definition.onClick(); }') >= 0,
    "The custom toolbar button must dispatch directly to its definition without wrapping an existing handler.");
assert.ok(desktop.indexOf('toolbar.setActive("details", !state.detailsCollapsed)') >= 0 &&
    desktop.indexOf('toolbar.setTitle("details", state.detailsCollapsed ? text("showDetails") : text("hideDetails"))') >= 0,
    "State/title synchronization must be separate from the click owner.");

var setActiveStart = toolbarApi.indexOf("setActive: function (key, value)");
var setTitleStart = toolbarApi.indexOf("setTitle: function (key, value)", setActiveStart);
assert.ok(setActiveStart >= 0 && setTitleStart > setActiveStart,
    "The canonical toolbar active-state API must exist.");
var setActive = toolbarApi.slice(setActiveStart, setTitleStart);
assert.strictEqual(setActive.indexOf("onclick"), -1,
    "Changing active/theme state must never replace or invoke a toolbar click handler.");
assert.ok(setActive.indexOf('item.classList.toggle("is-active", active)') >= 0 &&
    setActive.indexOf('item.setAttribute("aria-pressed", active ? "true" : "false")') >= 0,
    "The toolbar API must own only visual/accessibility state for the details action.");

assert.strictEqual(desktop.indexOf("__sirkStableOutputState"), -1,
    "Quick must not need a compatibility ownership marker.");
assert.strictEqual(desktop.indexOf("quick-output-state"), -1,
    "Quick must not load or call the removed output-state controller.");
assert.strictEqual(startup.indexOf("quick-output-state"), -1,
    "Startup must not load a second Quick output click owner.");
assert.strictEqual(desktop.indexOf("MutationObserver"), -1,
    "No observer may discover and wrap the details button after render.");
assert.strictEqual(desktop.indexOf("mc-sirk-quickcommands-output-hidden-v2"), -1,
    "The removed standalone output-state preference must not return.");

console.log("Quick output has one canonical click owner: OK");
