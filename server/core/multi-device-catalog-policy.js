"use strict";

var shared = require("./shared.js");

function cleanTags(values) {
    var seen = Object.create(null);
    return (Array.isArray(values) ? values : []).map(function (value) {
        return shared.cleanText(value, 200).trim();
    }).filter(function (value) {
        if (!value || seen[value]) return false;
        seen[value] = true;
        return true;
    });
}

function database(parent) {
    var web = shared.getWebServer(parent);
    var candidates = [
        web,
        web && web.parent,
        parent && parent.parent,
        parent && parent.parent && parent.parent.parent,
        parent && parent.parent && parent.parent.parent && parent.parent.parent.parent
    ].filter(Boolean);
    for (var index = 0; index < candidates.length; index += 1) {
        var db = candidates[index] && candidates[index].db;
        if (db && typeof db.GetAllTypeNoTypeFieldMeshFiltered === "function") return db;
    }
    return null;
}

function catalog(runtime, user) {
    var context = runtime && runtime.context;
    var device = context && context.device;
    var parent = context && context.parent;
    if (!device || !parent) return Promise.reject(new Error("MeshCentral device catalog is unavailable."));

    var domain = shared.getDomain(parent, user);
    var visibleMeshes = device.visibleMeshes(user) || {};
    var meshIds = Object.keys(visibleMeshes);
    var domainId = String(domain && domain.id != null ? domain.id : user && user.domain || "");
    var result = { ok: true, nodes: [], meshes: {} };
    meshIds.forEach(function (meshId) {
        var mesh = visibleMeshes[meshId] || {};
        result.meshes[meshId] = { _id: meshId, name: shared.cleanText(mesh.name || mesh.mname || mesh.desc || meshId, 300) };
    });
    if (!domain || !meshIds.length) return Promise.resolve(result);

    var db = database(parent);
    if (!db) {
        return device.visibleNodes(user).then(function (value) {
            result.nodes = (value.nodes || []).map(function (node) {
                return {
                    _id: String(node.id || ""),
                    name: shared.cleanText(node.name || node.id || "", 300),
                    rname: shared.cleanText(node.name || "", 300),
                    meshid: String(node.meshId || ""),
                    tags: []
                };
            });
            return result;
        });
    }

    return new Promise(function (resolve, reject) {
        try {
            db.GetAllTypeNoTypeFieldMeshFiltered(meshIds, null, domainId, "node", null, 0, 0, function (error, rows) {
                if (error) { reject(error instanceof Error ? error : new Error(String(error))); return; }
                result.nodes = (Array.isArray(rows) ? rows : []).map(function (node) {
                    var id = String(node && (node._id || node.nodeid || node.id) || "");
                    return {
                        _id: id,
                        name: shared.cleanText(node && (node.name || node.hostname || node.host || id) || id, 300),
                        rname: shared.cleanText(node && (node.rname || node.hostname || node.host || "") || "", 300),
                        meshid: String(node && (node.meshid || node.meshId || node.groupid) || ""),
                        tags: cleanTags(node && node.tags)
                    };
                }).filter(function (node) { return !!node._id; });
                resolve(result);
            });
        } catch (error) { reject(error); }
    });
}

function apply(plugin) {
    var runtime = plugin && plugin.runtime;
    var module = runtime && runtime.modules && runtime.modules.mycommands;
    if (!runtime || !module || typeof module.apiGet !== "function" || module.__sirkMultiDeviceCatalogPolicy) return;
    var original = module.apiGet;
    module.apiGet = function (asset, req, user) {
        if (asset === "multi-devices") return catalog(runtime, user);
        return original.call(module, asset, req, user);
    };
    module.__sirkMultiDeviceCatalogPolicy = true;
}

module.exports.apply = apply;
module.exports.catalog = catalog;
module.exports.cleanTags = cleanTags;
