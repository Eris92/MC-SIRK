"use strict";

var originalFactory = require("./index.js");

module.exports.createModule = function (context) {
    var module = originalFactory.createModule(context);
    var originalApiGet = module.apiGet;

    module.apiGet = function (asset, req, user) {
        if (asset !== "devices") return originalApiGet.call(module, asset, req, user);
        if (!user) return Promise.reject(new Error("Permission denied."));
        if (typeof module.canAccessView === "function" && !module.canAccessView(user, "devices")) {
            return Promise.reject(new Error("Portal view access denied."));
        }
        return Promise.resolve(context.device.visibleNodes(user)).then(function (value) {
            return { ok: true, nodes: value && value.nodes || [], meshes: value && value.meshes || [] };
        });
    };

    return module;
};
