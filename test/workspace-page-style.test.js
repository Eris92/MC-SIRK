"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var css = fs.readFileSync(path.join(root, "public", "modules", "automation", "style.css"), "utf8");

assert.ok(
    css.indexOf("html.sirk-platform-workspace-active #p1title{") >= 0 &&
    css.indexOf("font-size:24px!important") >= 0 &&
    css.indexOf("font-weight:700!important") >= 0,
    "SIRK workspace titles must use the native large page-heading treatment."
);

assert.ok(
    css.indexOf("html.sirk-platform-workspace-active #SirkPlatformWorkspace{") >= 0 &&
    css.indexOf("padding:0 12px 20px!important") >= 0,
    "All SIRK workspace modules must use the same horizontal page padding."
);

assert.ok(
    css.indexOf(":is(.mc-shared-page-myscripts,.mc-shared-page-approvalcenter) .mc-shared-toolbar{") >= 0 &&
    css.indexOf("min-height:38px!important") >= 0 &&
    css.indexOf("margin:0 0 10px!important") >= 0 &&
    css.indexOf("padding:0!important") >= 0,
    "My Scripts and Approval Center must share one toolbar geometry."
);

assert.ok(
    css.indexOf(":is(.mc-shared-page-myscripts,.mc-shared-page-approvalcenter) .mc-shared-layout{") >= 0 &&
    css.indexOf("border-top:1px solid rgba(127,127,127,.35)!important") >= 0,
    "My Scripts and Approval Center must begin their content layout with the same separator."
);

console.log("Native workspace title and shared module toolbar style: OK");
