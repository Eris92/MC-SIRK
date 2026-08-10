"use strict";

var implementation = require("./admin.js");
var integrationAdmin = require("./server/core/integration-admin-policy.js");

module.exports.admin = function (plugin) {
    return integrationAdmin.wrap(implementation.admin(plugin), plugin);
};
