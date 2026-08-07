"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var source = fs.readFileSync(path.join(__dirname, "..", "public", "native", "desktop-commands.js"), "utf8");
var css = fs.readFileSync(path.join(__dirname, "..", "public", "native", "desktop-commands.css"), "utf8");

assert.ok(source.indexOf('detailsCollapsed: preferences.quickDetailsCollapsed === true') >= 0,
    "Quick must restore the canonical output visibility state before the first render.");

var renderStart = source.indexOf("function render(panel)");
var renderEnd = source.indexOf("function load(panel)", renderStart);
assert.ok(renderStart >= 0 && renderEnd > renderStart,
    "The canonical Quick render function must exist.");
var render = source.slice(renderStart, renderEnd);

var browserCreate = render.indexOf('var browser = element("div", "sirk-quick-command-browser mc-shared-layout")');
var collapseApply = render.indexOf('browser.classList.toggle("is-details-collapsed", state.detailsCollapsed)');
var browserAppend = render.indexOf("panel.appendChild(browser)");
assert.ok(browserCreate >= 0 && collapseApply > browserCreate && browserAppend > collapseApply,
    "Persisted hidden-output geometry must be applied to the detached browser before it is appended to the live panel.");
assert.ok(render.indexOf('browser.classList.toggle("is-collapsed", state.collapsed)') > browserCreate,
    "Category collapse geometry must use the same detached pre-paint render path.");

var toolbarStart = source.indexOf("function mountToolbar(panel, host)");
var toolbarEnd = source.indexOf("function render(panel)", toolbarStart);
var toolbar = source.slice(toolbarStart, toolbarEnd);
assert.ok(toolbar.indexOf('title: state.detailsCollapsed ? text("showDetails") : text("hideDetails")') >= 0,
    "The first toolbar render must derive its Output label from the same preloaded state.");
assert.ok(toolbar.indexOf('toolbar.setActive("details", !state.detailsCollapsed)') >= 0,
    "The first toolbar render must derive its active state from the same preloaded state.");
assert.ok(toolbar.indexOf('onClick: function () { writeDetailsCollapsed(!state.detailsCollapsed); render(panel); }') >= 0,
    "Output toggling must update renderer state and synchronously rebuild the panel without a post-render controller.");

assert.ok(css.indexOf('.is-details-collapsed .sirk-quick-command-details{display:none!important}') >= 0,
    "The pre-applied details collapse class must hide the output pane through static CSS.");
assert.strictEqual(source.indexOf("data-sirk-output-hidden"), -1,
    "Quick must not maintain a second panel-level hidden-output state.");
assert.strictEqual(source.indexOf("mc-sirk-quickcommands-output-hidden-v2"), -1,
    "Legacy standalone hidden-output preference keys must not return.");
assert.strictEqual(source.indexOf("details-preferred-collapsed"), -1,
    "The superseded post-render preferred-collapse controller must not return.");
assert.strictEqual(source.indexOf("MutationObserver"), -1,
    "Quick pre-paint state must not depend on DOM observers.");

console.log("Quick output canonical pre-paint state and remount stability: OK");
