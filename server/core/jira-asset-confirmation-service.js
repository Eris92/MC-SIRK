"use strict";

var httpClient = require("./http-client.js");
var shared = require("./shared.js");

var MAX_CHANGES = 20;
var REF_PAGE_SIZE = 500;
var MAX_REF_PAGES = 10;

function text(value, limit) { return shared.cleanText(value == null ? "" : value, limit || 4000).trim(); }
function lower(value) { return text(value, 2000).toLowerCase(); }
function object(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function array(value) { return Array.isArray(value) ? value : []; }
function responseItems(value) {
    if (Array.isArray(value)) return value;
    value = object(value);
    if (Array.isArray(value.values)) return value.values;
    if (Array.isArray(value.objectEntries)) return value.objectEntries;
    if (value.results && Array.isArray(value.results.objectEntries)) return value.results.objectEntries;
    return [];
}
function assignmentName(value) {
    return /(owner|user|assigned|employee|responsible|pracownik|uzytk|użytk|przypis|odpowiedzialn|wlasciciel|właściciel)/i.test(lower(value));
}
function userIdentities(user) {
    var result = [], seen = Object.create(null);
    [user && user.value, user && user.accountId, user && user.emailAddress, user && user.displayName, user && user.label].forEach(function (value) {
        value = lower(value);
        if (value && !seen[value]) { seen[value] = true; result.push(value); }
    });
    return result;
}
function collect(value, result, depth) {
    result = result || []; depth = depth || 0;
    if (depth > 4 || value == null) return result;
    if (typeof value === "string" || typeof value === "number") { var item = lower(value); if (item) result.push(item); return result; }
    if (Array.isArray(value)) { value.slice(0, 100).forEach(function (item) { collect(item, result, depth + 1); }); return result; }
    if (typeof value === "object") Object.keys(value).slice(0, 60).forEach(function (key) { if (!/^(avatar|icon|url|self)$/i.test(key)) collect(value[key], result, depth + 1); });
    return result;
}
function valueMatches(value, identities) {
    var values = collect({ user: value && value.user, referencedObject: value && value.referencedObject, value: value && value.value, searchValue: value && value.searchValue, displayValue: value && value.displayValue }, [], 0);
    return identities.some(function (identity) { return values.indexOf(identity) >= 0; });
}
function attributeId(value) { return text(value && (value.objectTypeAttributeId || value.id || value.objectTypeAttribute && value.objectTypeAttribute.id), 100); }
function referenceTypeId(value) {
    value = object(value);
    return text(value.referenceObjectTypeId || value.referenceTypeId || value.referenceObjectType && value.referenceObjectType.id || value.referenceType && value.referenceType.id, 100);
}
function valueKind(definition, values) {
    if (values.some(function (value) { return !!(value && value.user); })) return "jira-user";
    if (values.some(function (value) { return !!(value && value.referencedObject); })) return "reference";
    var typeName = lower(definition && (definition.typeName || definition.defaultType && (definition.defaultType.name || definition.defaultType.label) || definition.type && (definition.type.name || definition.type.label)));
    if (/user|atlassian account|jira account/.test(typeName)) return "jira-user";
    if (referenceTypeId(definition)) return "reference";
    return "";
}
function stableValues(kind, attribute) {
    var result = [];
    array(attribute && attribute.objectAttributeValues).forEach(function (value) {
        value = object(value);
        var stable = kind === "jira-user"
            ? text(value.user && (value.user.accountId || value.user.key || value.user.name) || value.value || value.searchValue, 500)
            : text(value.referencedObject && (value.referencedObject.id || value.referencedObject.objectKey) || value.value, 500);
        if (stable && result.indexOf(stable) < 0) result.push(stable);
    });
    return result.sort();
}
function sameValues(left, right) {
    left = array(left).map(String).sort(); right = array(right).map(String).sort();
    return left.length === right.length && left.every(function (value, index) { return value === right[index]; });
}
function pageHasMore(response, startAt, count) {
    response = object(response);
    if (response.hasMoreResults === true) return true;
    if (response.isLast === true) return false;
    var total = Number(response.totalFilterCount != null ? response.totalFilterCount : response.total);
    return isFinite(total) && total >= 0 ? startAt + count < total : count >= REF_PAGE_SIZE;
}

module.exports.createJiraAssetConfirmationService = function (options) {
    options = options || {};
    var integrations = options.integrations;
    var jiraAssets = options.jiraAssets;
    var requestJson = options.requestJson || httpClient.requestJson;

    function config() {
        var value = integrations.get("jira") || {}, endpoint;
        try { endpoint = new URL(String(value.url || "")); } catch (error) { throw new Error("Jira URL is not configured."); }
        if (endpoint.protocol !== "https:" || !value.email || !value.token) throw new Error("Jira credentials are not configured.");
        value.url = endpoint.href.replace(/\/$/, ""); value.verifyTls = value.verifyTls !== false; return value;
    }
    function auth(value) { return "Basic " + Buffer.from(String(value.email) + ":" + String(value.token), "utf8").toString("base64"); }
    function workspace() {
        var value = config();
        var cloud = text(value.cloudId, 200), workspaceId = text(value.workspaceId, 200);
        var cloudPromise = cloud ? Promise.resolve(cloud) : requestJson({ url: value.url + "/_edge/tenant_info", method: "GET", headers: { Accept: "application/json" }, verifyTls: value.verifyTls, timeoutMs: 15000, maxBytes: 1024 * 1024, errorPrefix: "Jira cloud discovery" }).then(function (response) { var id = text(response && (response.cloudId || response.cloudID), 200); if (!id) throw new Error("Jira cloudId discovery returned no cloudId."); return id; });
        var workspacePromise = workspaceId ? Promise.resolve(workspaceId) : requestJson({ url: value.url + "/rest/servicedeskapi/assets/workspace?start=0&limit=50", method: "GET", headers: { Authorization: auth(value), Accept: "application/json" }, verifyTls: value.verifyTls, timeoutMs: 30000, maxBytes: 8 * 1024 * 1024, errorPrefix: "Jira Assets workspace discovery" }).then(function (response) { var items = responseItems(response), id = items.length ? text(items[0] && items[0].workspaceId, 200) : ""; if (!id) throw new Error("Jira Assets workspace discovery returned no workspaceId."); return id; });
        return Promise.all([cloudPromise, workspacePromise]).then(function (ids) { return { config: value, base: "https://api.atlassian.com/ex/jira/" + encodeURIComponent(ids[0]) + "/jsm/assets/workspace/" + encodeURIComponent(ids[1]) + "/v1" }; });
    }
    function getObject(ctx, id) {
        return requestJson({ url: ctx.base + "/object/" + encodeURIComponent(text(id, 200)), method: "GET", headers: { Authorization: auth(ctx.config), Accept: "application/json" }, verifyTls: ctx.config.verifyTls, timeoutMs: 30000, maxBytes: 8 * 1024 * 1024, errorPrefix: "Jira Assets object" });
    }
    function definitions(ctx, typeId) {
        return requestJson({ url: ctx.base + "/objecttype/" + encodeURIComponent(text(typeId, 100)) + "/attributes", method: "GET", headers: { Authorization: auth(ctx.config), Accept: "application/json" }, verifyTls: ctx.config.verifyTls, timeoutMs: 30000, maxBytes: 4 * 1024 * 1024, errorPrefix: "Jira Assets attributes" }).then(function (value) { return array(value); });
    }
    function referenceTarget(ctx, refType, user) {
        if (!/^\d+$/.test(text(refType, 100))) return Promise.reject(new Error("Jira ownership reference type is unavailable."));
        var identities = userIdentities(user), matches = [], seen = Object.create(null), startAt = 0;
        function next(page) {
            if (page >= MAX_REF_PAGES) return Promise.resolve();
            return requestJson({ url: ctx.base + "/object/aql?startAt=" + startAt + "&maxResults=" + REF_PAGE_SIZE + "&includeAttributes=true", method: "POST", headers: { Authorization: auth(ctx.config), Accept: "application/json", "Content-Type": "application/json" }, json: { qlQuery: "objectTypeId = " + refType }, verifyTls: ctx.config.verifyTls, timeoutMs: 30000, maxBytes: 16 * 1024 * 1024, errorPrefix: "Jira ownership identity" }).then(function (response) {
                var items = responseItems(response);
                items.forEach(function (entry) {
                    var typeName = lower(entry && entry.objectType && entry.objectType.name || entry && entry.objectTypeName);
                    if (!/(user|person|employee|pracowni|uzytk|użytk|osob)/i.test(typeName)) return;
                    if (!identities.some(function (identity) { return collect(entry, [], 0).indexOf(identity) >= 0; })) return;
                    var id = text(entry && entry.id, 200); if (id && !seen[id]) { seen[id] = true; matches.push(id); }
                });
                var more = pageHasMore(response, startAt, items.length); startAt += items.length; return more && items.length ? next(page + 1) : null;
            });
        }
        return next(0).then(function () { if (matches.length !== 1) throw new Error(matches.length ? "Jira ownership identity is ambiguous." : "Jira ownership identity was not found."); return matches[0]; });
    }
    function inspect(ctx, entry, user, expected) {
        entry = object(entry); expected = object(expected);
        var typeId = text(entry.objectType && entry.objectType.id || entry.objectTypeId, 100), identities = userIdentities(user);
        if (!typeId) return Promise.reject(new Error("Jira asset object type is unavailable."));
        return definitions(ctx, typeId).then(function (defs) {
            var defMap = Object.create(null); defs.forEach(function (def) { var id = attributeId(def); if (id) defMap[id] = def; });
            var attrs = Object.create(null); array(entry.attributes).forEach(function (attr) { var id = attributeId(attr); if (id) attrs[id] = attr; });
            var ids = Object.keys(defMap); Object.keys(attrs).forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
            var candidates = ids.map(function (id) {
                var attr = attrs[id] || { objectAttributeValues: [] }, def = Object.assign({}, object(defMap[id]), object(attr.objectTypeAttribute)); if (!def.id) def.id = id;
                var vals = array(attr.objectAttributeValues), kind = valueKind(def, vals), semantic = assignmentName(def.name || attr.name || attr.objectTypeAttribute && attr.objectTypeAttribute.name), matches = identities.length && vals.some(function (value) { return valueMatches(value, identities); });
                if (!kind || (!semantic && !matches) || def.editable === false) return null;
                return { id: id, attr: attr, def: def, kind: kind, matches: matches === true, refType: referenceTypeId(def), maxCardinality: Math.max(1, Number(def.maximumCardinality || def.maxCardinality) || 1) };
            }).filter(Boolean);
            if (expected.attributeId) candidates = candidates.filter(function (candidate) { return candidate.id === text(expected.attributeId, 100) && (!expected.kind || candidate.kind === expected.kind); });
            else { var matched = candidates.filter(function (candidate) { return candidate.matches; }); if (matched.length === 1) candidates = matched; }
            if (candidates.length !== 1) throw new Error(candidates.length ? "Jira ownership attribute is ambiguous." : "Jira ownership attribute could not be resolved safely.");
            var candidate = candidates[0], target = text(expected.targetValue, 500), targetPromise;
            if (target) targetPromise = Promise.resolve(target);
            else if (candidate.kind === "jira-user") targetPromise = Promise.resolve(text(user && (user.accountId || user.value), 500));
            else {
                var existing = ""; array(candidate.attr.objectAttributeValues).some(function (value) { if (!valueMatches(value, identities)) return false; existing = text(value && value.referencedObject && (value.referencedObject.id || value.referencedObject.objectKey) || value && value.value, 500); return !!existing; });
                targetPromise = existing ? Promise.resolve(existing) : referenceTarget(ctx, candidate.refType, user);
            }
            return targetPromise.then(function (targetValue) { if (!targetValue) throw new Error("Jira ownership target identity is unavailable."); var values = stableValues(candidate.kind, candidate.attr); return { objectTypeId: typeId, attributeId: candidate.id, kind: candidate.kind, targetValue: targetValue, values: values, assigned: values.indexOf(targetValue) >= 0, maxCardinality: candidate.maxCardinality, referenceTypeId: candidate.refType }; });
        });
    }
    function mapBounded(items, worker) {
        var out = new Array(items.length), cursor = 0;
        function next() { if (cursor >= items.length) return Promise.resolve(); var index = cursor++; return Promise.resolve(worker(items[index], index)).then(function (value) { out[index] = value; return next(); }); }
        var workers = []; for (var i = 0; i < Math.min(3, items.length); i++) workers.push(next());
        return Promise.all(workers).then(function () { return out; });
    }
    function protocolInventory(userValue, variable, force) {
        var allVariable = shared.copy(variable || {}), userVariable = shared.copy(variable || {});
        allVariable.jiraAsset = Object.assign({}, object(allVariable.jiraAsset), { userVariable: "", maxResults: 5000 });
        userVariable.jiraAsset = Object.assign({}, object(userVariable.jiraAsset), { maxResults: 5000 });
        return Promise.all([jiraAssets.listAssets("", allVariable, force === true), jiraAssets.listAssets(userValue, userVariable, force === true)]).then(function (parts) {
            var owned = Object.create(null); parts[1].items.forEach(function (item) { var id = text(item && (item.objectId || item.objectKey || item.value), 200); if (id) owned[id] = true; });
            return { items: parts[0].items.map(function (item) { var result = shared.copy(item), id = text(item && (item.objectId || item.objectKey || item.value), 200); result.value = id; result.assetId = id; result.assignedToUser = owned[id] === true; result.disabledActions = result.assignedToUser ? ["receive"] : ["return"]; return result; }).filter(function (item) { return !!item.assetId && !/(user|person|employee|pracowni|uzytk|użytk|osob)/i.test(lower(item.objectType)); }), currentItems: parts[1].items.map(function (item) { var result = shared.copy(item); result.assetId = text(item && (item.objectId || item.objectKey || item.value), 200); return result; }).filter(function (item) { return !!item.assetId; }), stale: parts[0].stale === true || parts[1].stale === true, truncated: parts[0].truncated === true || parts[1].truncated === true, warning: parts[0].warning || parts[1].warning || "" };
        });
    }
    function snapshot(user, changes) {
        changes = array(changes).slice(0, MAX_CHANGES).map(function (change) { return { assetId: text(change && change.assetId, 200), action: lower(change && change.action) }; });
        if (!changes.length) return Promise.resolve({ version: 1, user: shared.copy(user || {}), changes: [] });
        if (changes.some(function (change) { return !change.assetId || ["receive", "return"].indexOf(change.action) < 0; })) return Promise.reject(new Error("Invalid Jira protocol change request."));
        return workspace().then(function (ctx) { return mapBounded(changes, function (change) { return getObject(ctx, change.assetId).then(function (entry) { return inspect(ctx, entry, user, {}).then(function (state) { if (change.action === "receive" && state.assigned) throw new Error("Jira asset is already assigned to the selected user: " + change.assetId + "."); if (change.action === "return" && !state.assigned) throw new Error("Jira asset is no longer assigned to the selected user: " + change.assetId + "."); return { assetId: change.assetId, action: change.action, objectTypeId: state.objectTypeId, attributeId: state.attributeId, kind: state.kind, targetValue: state.targetValue, beforeValues: state.values, maxCardinality: state.maxCardinality, referenceTypeId: state.referenceTypeId }; }); }); }).then(function (rows) { return { version: 1, user: shared.copy(user || {}), changes: rows }; }); });
    }
    function put(ctx, row, values) { return requestJson({ url: ctx.base + "/object/" + encodeURIComponent(row.assetId), method: "PUT", headers: { Authorization: auth(ctx.config), Accept: "application/json", "Content-Type": "application/json" }, json: { objectTypeId: row.objectTypeId, attributes: [{ objectTypeAttributeId: row.attributeId, objectAttributeValues: values.map(function (value) { return { value: value }; }) }] }, verifyTls: ctx.config.verifyTls, timeoutMs: 30000, maxBytes: 8 * 1024 * 1024, errorPrefix: "Jira Assets update" }); }
    function apply(snapshot) {
        snapshot = object(snapshot); var changes = array(snapshot.changes), updated = [];
        if (Number(snapshot.version) !== 1 || changes.length > MAX_CHANGES) return Promise.reject(new Error("Invalid Jira protocol confirmation context."));
        if (!changes.length) return Promise.resolve({ updated: 0, assetIds: [] });
        return workspace().then(function (ctx) {
            function next(index) {
                if (index >= changes.length) return Promise.resolve();
                var row = object(changes[index]);
                return getObject(ctx, row.assetId).then(function (entry) { return inspect(ctx, entry, snapshot.user, row); }).then(function (live) {
                    if (live.objectTypeId !== text(row.objectTypeId, 100) || live.attributeId !== text(row.attributeId, 100) || live.kind !== row.kind || !sameValues(live.values, row.beforeValues)) throw new Error("Jira asset ownership changed after protocol generation: " + row.assetId + ".");
                    var desired = live.values.slice();
                    if (row.action === "receive") { if (desired.indexOf(live.targetValue) >= 0) throw new Error("Jira asset ownership is stale: " + row.assetId + "."); desired = live.maxCardinality > 1 ? desired.concat([live.targetValue]) : [live.targetValue]; }
                    else { if (desired.indexOf(live.targetValue) < 0) throw new Error("Jira asset ownership is stale: " + row.assetId + "."); desired = desired.filter(function (value) { return value !== live.targetValue; }); }
                    desired = Array.from(new Set(desired)).sort();
                    return put(ctx, row, desired).then(function () { return getObject(ctx, row.assetId).then(function (entry) { return inspect(ctx, entry, snapshot.user, row); }).then(function (verified) { if (!sameValues(verified.values, desired)) throw new Error("Jira Assets update verification failed: " + row.assetId + "."); updated.push(row.assetId); return next(index + 1); }); });
                });
            }
            return next(0);
        }).then(function () { return { updated: updated.length, assetIds: updated.slice() }; }).catch(function (error) { if (updated.length) throw new Error("Jira Assets partial update: " + updated.length + "/" + changes.length + " changes applied; " + text(error && error.message || error, 1000)); throw error; });
    }

    return { protocolInventory: protocolInventory, snapshot: snapshot, apply: apply };
};
