"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var source = fs.readFileSync(path.join(__dirname, "..", "public", "native", "desktop-commands.js"), "utf8");

assert.ok(source.indexOf('hideDetails: "Ukryj wynik", showDetails: "Pokaż wynik"') >= 0 &&
    source.indexOf('hideDetails: "Hide output", showDetails: "Show output"') >= 0,
    "Quick must keep localized Show/Hide output labels in the canonical renderer.");
assert.ok(source.indexOf('title: state.detailsCollapsed ? text("showDetails") : text("hideDetails")') >= 0,
    "The first-render Output action label must be derived directly from the persisted collapsed state.");
assert.ok(source.indexOf('toolbar.setTitle("details", state.detailsCollapsed ? text("showDetails") : text("hideDetails"))') >= 0,
    "Every render must synchronize the accessible Output title with the current collapsed state.");
assert.ok(source.indexOf('toolbar.setActive("details", !state.detailsCollapsed)') >= 0,
    "A hidden output pane must expose an inactive details action and an open pane must expose an active one.");
assert.ok(source.indexOf('writeDetailsCollapsed(!state.detailsCollapsed)') >= 0,
    "Clicking Output must toggle the one canonical detailsCollapsed state.");
assert.ok(source.indexOf('if (!state.detailsCollapsed) state.outputAttention = false') >= 0,
    "Opening the output pane must clear hidden-output attention immediately.");
assert.ok(source.indexOf('if (!next) {\n            state.outputPending = false;\n            state.outputAttention = false;') >= 0,
    "Clearing output during category or script changes must clear both pending and attention state.");
assert.ok(source.indexOf('button.classList.toggle("has-output-attention", state.outputAttention === true)') >= 0,
    "Completed hidden output may mark only the canonical details action for attention.");
assert.strictEqual(source.indexOf("quick-output-state"), -1,
    "The removed Quick output compatibility controller must not return.");
assert.strictEqual(source.indexOf("MutationObserver"), -1,
    "Output labels and attention must not depend on DOM observers.");
assert.strictEqual(source.indexOf("mc-sirk-quickcommands-output-hidden-v2"), -1,
    "Legacy standalone Quick output preference keys must not return.");
assert.strictEqual(source.indexOf("data-sirk-output-hidden"), -1,
    "Collapsed output state must be represented by renderer state/classes rather than a second data attribute contract.");

console.log("Quick output label, active state and empty-output attention reset: OK");
