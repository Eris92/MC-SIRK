"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");

function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }

var updates = read("public/portal/system-updates.js");
var settings = read("public/portal/settings.js");
var app = read("public/portal/standalone/scripts/app.js");
var css = read("public/portal/system-updates.css");

[
    'sessionStorage.getItem(RESTART_KEY)',
    'Ponowne uruchamianie usługi',
    'window.location.reload()',
    'sirk-update-success',
    'api("status").then'
].forEach(function (value) {
    assert.ok(updates.indexOf(value) >= 0, "System update restart flow is missing " + value);
});
[
    'SERVICE_RESTART_KEY',
    'waitForService(host, marker)',
    'Strona jest aktualna.'
].forEach(function (value) {
    assert.ok(settings.indexOf(value) >= 0, "Server restart flow is missing " + value);
});
assert.ok(app.indexOf('window.SirkSystemUpdates.mount(systemUpdatesHost') >= 0, "Standalone System settings must mount the restart-aware updates view.");
assert.ok(app.indexOf('sirkPortal.restartState') >= 0 && app.indexOf('primary.children[5].click()') >= 0, "Standalone settings must restore the System section after restart.");
assert.ok(css.indexOf(".sirk-restart-screen") >= 0, "Restart screen styles must exist.");
console.log("Portal restart flow: OK");
