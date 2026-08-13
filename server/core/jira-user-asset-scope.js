"use strict";

var baseFactory = require("./jira-asset-service.js");

function object(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function text(value, limit) {
    value = value == null ? "" : String(value);
    if (limit && value.length > limit) value = value.slice(0, limit);
    return value.trim();
}

function lower(value) {
    return text(value, 2000).toLowerCase();
}

function aqlLiteral(value) {
    return '"' + text(value, 500).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

function selectedUserValues(userValue, users) {
    var wanted = lower(userValue);
    var found = (Array.isArray(users) ? users : []).filter(function (item) {
        return [item && item.value, item && item.accountId, item && item.emailAddress, item && item.displayName]
            .some(function (candidate) { return lower(candidate) === wanted; });
    })[0] || null;
    var values = [userValue];
    if (found) values.push(found.value, found.accountId, found.emailAddress, found.displayName);
    var seen = Object.create(null);
    return values.map(function (value) { return text(value, 500); }).filter(function (value) {
        var key = lower(value);
        if (!key || seen[key]) return false;
        seen[key] = true;
        return true;
    }).slice(0, 4);
}

function selectedUserAql(values) {
    var direct = [];
    values.forEach(function (value) {
        var literal = aqlLiteral(value);
        direct.push("anyAttribute = " + literal);
        direct.push("Label = " + literal);
    });
    var identity = direct.join(" OR ");
    if (!identity) return "";
    return "(" + identity + ") OR object HAVING outboundReferences(" + identity + ") OR object HAVING inboundReferences(" + identity + ")";
}

function mergeResults(anchor, targeted) {
    anchor = object(anchor);
    targeted = object(targeted);
    var seen = Object.create(null);
    var items = [];
    [anchor.items, targeted.items].forEach(function (source) {
        (Array.isArray(source) ? source : []).forEach(function (item) {
            var key = lower(item && (item.objectKey || item.objectId || item.value));
            if (!key || seen[key]) return;
            seen[key] = true;
            items.push(item);
        });
    });
    items.sort(function (a, b) { return String(a && a.label || "").localeCompare(String(b && b.label || "")); });
    var warnings = [anchor.warning, targeted.warning].map(function (value) { return text(value, 1000); }).filter(Boolean);
    return {
        items: items,
        stale: anchor.stale === true || targeted.stale === true,
        truncated: anchor.truncated === true || targeted.truncated === true,
        warning: warnings.join(" ")
    };
}

module.exports.createJiraAssetService = function (options) {
    options = options || {};
    var factory = options.baseFactory || baseFactory;
    var service = factory.createJiraAssetService(options);
    var baseListAssets = service.listAssets.bind(service);
    var baseOptionsFor = service.optionsFor.bind(service);

    function listAssets(userValue, variable, force) {
        userValue = text(userValue, 500);
        if (!userValue) return baseListAssets(userValue, variable, force);

        var anchorPromise = baseListAssets(userValue, variable, force);
        var targetedPromise = service.listUsers(false, true).then(function (usersResult) {
            var values = selectedUserValues(userValue, usersResult && usersResult.items);
            var aql = selectedUserAql(values);
            if (!aql) return { items: [] };
            var scoped = Object.assign({}, object(variable));
            scoped.jiraAsset = Object.assign({}, object(scoped.jiraAsset), { aql: aql });
            return baseListAssets(userValue, scoped, force);
        }).catch(function (error) {
            return { items: [], warning: "Selected-user Jira Assets expansion failed: " + text(error && error.message || error, 700) };
        });

        return Promise.all([anchorPromise, targetedPromise]).then(function (parts) {
            return mergeResults(parts[0], parts[1]);
        });
    }

    service.listAssets = listAssets;
    service.optionsFor = function (variable, values, force) {
        variable = object(variable);
        values = object(values);
        if (lower(variable.control) !== "asset") return baseOptionsFor(variable, values, force);
        var policy = object(variable.jiraAsset);
        var userVariable = text(policy.userVariable, 200).replace(/^[\s$%]+/, "");
        if (!userVariable) return baseOptionsFor(variable, values, force);
        var userValue = values[userVariable];
        if (!text(userValue, 500)) return Promise.resolve({ items: [] });
        return listAssets(userValue, variable, force === true);
    };

    return service;
};

module.exports._test = {
    selectedUserValues: selectedUserValues,
    selectedUserAql: selectedUserAql,
    mergeResults: mergeResults
};
