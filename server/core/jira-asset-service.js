"use strict";

var httpClient = require("./http-client.js");
var shared = require("./shared.js");

var USER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
var USER_PAGE_SIZE = 100;
var MAX_USERS = 1000;

function text(value, limit) {
    return shared.cleanText(value == null ? "" : value, limit || 4000).trim();
}

function object(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function array(value) {
    return Array.isArray(value) ? value : [];
}

function lower(value) {
    return text(value, 2000).toLowerCase();
}

module.exports.createJiraAssetService = function (options) {
    options = options || {};
    var fs = options.fs;
    var path = options.path;
    var dataRoot = options.dataRoot;
    var integrations = options.integrations;
    var requestJson = options.requestJson || httpClient.requestJson;
    var cachePath = path.join(dataRoot, "jira-users-cache.json");

    return {
        cachePath: cachePath,
        optionsFor: function () {
            return Promise.resolve({ items: [] });
        }
    };
};
