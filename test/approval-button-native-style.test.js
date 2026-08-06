"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var source = fs.readFileSync(
    path.join(__dirname, "..", "public", "modules", "approvals", "index.js"),
    "utf8"
);

assert.ok(source.indexOf('className: "btn-success sirk-action-approve"') >= 0,
    "Approve must use the same Bootstrap success variant as the MeshCentral connect button.");
assert.ok(source.indexOf('className: "btn-danger sirk-action-reject"') >= 0,
    "Reject must use the same Bootstrap danger variant as the MeshCentral disconnect button.");
assert.ok(source.indexOf('button.className = "btn btn-sm " + definition.className') >= 0,
    "Approval decisions must use the same compact native button geometry as connect and disconnect.");

console.log("Approval decision buttons use native MeshCentral connect/disconnect styles: OK");
