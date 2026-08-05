"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var core = fs.readFileSync(path.join(root, "public", "shared", "core.js"), "utf8");
var approval = fs.readFileSync(path.join(root, "public", "native", "approval.css"), "utf8");
var automation = fs.readFileSync(path.join(root, "public", "modules", "automation", "style.css"), "utf8");
var main = fs.readFileSync(path.join(root, "public", "shared", "styles", "main.css"), "utf8");
var toolbar = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar.css"), "utf8");
var sharedUi = fs.readFileSync(path.join(root, "public", "shared", "ui", "shared-ui.css"), "utf8");

assert.ok(
    core.indexOf('document.createElement("h1")') >= 0,
    "Workspace pages must use the native MeshCentral h1 title structure."
);
assert.ok(
    core.indexOf("titleChildren.push(titleHost.removeChild(titleHost.firstChild))") >= 0 &&
    core.indexOf("state.titleHost.appendChild(child)") >= 0,
    "The native My Devices title DOM must be detached and restored without cloning or destroying handlers."
);
assert.strictEqual(
    core.indexOf("state.heading.textContent = state.headingText"),
    -1,
    "Workspace restore must not use the legacy text-only title replacement."
);

assert.strictEqual(
    automation.indexOf("#p1title"),
    -1,
    "My Scripts must not own or imitate the native MeshCentral page title style."
);
assert.strictEqual(
    automation.indexOf("#SirkPlatformWorkspace"),
    -1,
    "My Scripts must not own the shared workspace geometry."
);
assert.strictEqual(
    approval.indexOf(".mc-shared-toolbar"),
    -1,
    "Approval Center must inherit SharedToolbar instead of overriding it."
);
assert.strictEqual(
    approval.indexOf(".mc-shared-layout"),
    -1,
    "Approval Center must inherit SharedLayout instead of defining separate columns."
);
assert.strictEqual(
    main.indexOf(".mc-module-approvalcenter .mc-shared-layout"),
    -1,
    "Global styles must not contain an Approval-only layout exception."
);

assert.ok(
    toolbar.indexOf(".mc-shared-toolbar{") >= 0 &&
    toolbar.indexOf(".mc-shared-layout{") >= 0,
    "Both modules must continue to receive toolbar and layout geometry from shared UI assets."
);
assert.ok(
    sharedUi.indexOf(".mc-approval-card-grid") >= 0 &&
    sharedUi.indexOf(".mc-approval-request-actions") >= 0,
    "Approval-specific content semantics must remain in the shared UI stylesheet."
);

console.log("Native MeshCentral heading and shared module inheritance: OK");
