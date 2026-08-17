"use strict";

var shared = require("../../core/shared.js");

module.exports.createModule = function (context) {
    function allowed(user) { return !!user; }
    function admin(user) { if (!shared.isSiteAdmin(user)) throw new Error("Permission denied."); }

    return {
        key: "approvalcenter",
        clientConfig: function () {
            return {
                key: "approvalcenter",
                name: "Approval Center",
                menuTitle: "Approval Center",
                script: "approvals.js",
                style: "approvals.css",
                toolbar: { refresh: true, clear: false, favorites: false, search: true, manage: false, settings: false }
            };
        },
        getAccess: function (user) { return { allowed: allowed(user), siteAdmin: shared.isSiteAdmin(user) }; },
        initialize: function () { return Promise.resolve(); },
        apiGet: function (asset, req, user) {
            if (!allowed(user)) throw new Error("Permission denied.");
            var q = req && req.query || {};
            if (asset === "providers") return { ok: true, providers: context.approval.listProviders() };
            if (asset === "overview") return context.approval.overview(user).then(function (rows) { return { ok: true, rows: rows }; });
            if (asset === "requests") {
                return context.approval.list(user, {
                    type: q.type || "",
                    status: q.status || "",
                    q: q.q || "",
                    page: Number(q.page) || 1,
                    perPage: Number(q.perPage) || 50
                }).then(function (result) { result.ok = true; return result; });
            }
            if (asset === "request") return { ok: true, request: context.approval.getRequest(user, q.id) };
            if (asset === "settings") return { ok: true, settings: context.approval.getSettings(user) };
            throw new Error("Unknown Approval Center action.");
        },
        apiPost: function (asset, req, user) {
            if (!allowed(user)) throw new Error("Permission denied.");
            var value = req && req.body || {};
            if (asset === "decide") {
                return context.approval.decide(user, value.id, value.approved === true, value.note || "").then(function (request) {
                    return { ok: true, request: request };
                });
            }
            if (asset === "confirm") {
                return context.approval.confirm(user, value.id, value.note || "").then(function (request) {
                    return { ok: true, request: request };
                });
            }
            if (asset === "provider-settings") {
                admin(user);
                return context.approval.saveProviderSettings(user, value.type, value.values).then(function () { return { ok: true }; });
            }
            if (asset === "token-create") {
                admin(user);
                return { ok: true, result: context.approval.createApiToken(user, value) };
            }
            if (asset === "token-revoke") {
                admin(user);
                context.approval.revokeApiToken(user, value.id);
                return { ok: true };
            }
            throw new Error("Unknown Approval Center action.");
        }
    };
};
