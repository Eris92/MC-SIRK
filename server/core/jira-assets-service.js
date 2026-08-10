"use strict";

var shared = require("./shared.js");
var httpClient = require("./http-client.js");

var USER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
var USER_PAGE_SIZE = 100;
var MAX_USERS = 1000;
var PROGRESS_TTL_MS = 24 * 60 * 60 * 1000;
var MAX_PROGRESS = 300;
var PROTOCOL_MARKER = /^SirkWorkflow\s*:\s*JiraAssetProtocol$/i;

function clean(value, limit) {
    return shared.cleanText(value, limit || 1000).trim();
}

function object(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function array(value) {
    return Array.isArray(value) ? value : [];
}

function unique(values) {
    var seen = Object.create(null);
    return array(values).map(function (value) { return clean(value, 1000); }).filter(function (value) {
        var key = value.toLowerCase();
        if (!value || seen[key]) return false;
        seen[key] = true;
        return true;
    });
}

function safeId(value) {
    value = clean(value, 80);
    if (!/^[A-Za-z0-9_-]{6,80}$/.test(value)) throw new Error("Invalid artifact identity.");
    return value;
}

function aqlValue(value) {
    return clean(value, 500).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function html(value) {
    return clean(value, 20000)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function allStrings(value, result, depth) {
    result = result || [];
    depth = Number(depth) || 0;
    if (depth > 8 || value == null) return result;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        var item = clean(value, 2000);
        if (item) result.push(item);
        return result;
    }
    if (Array.isArray(value)) {
        value.forEach(function (item) { allStrings(item, result, depth + 1); });
        return result;
    }
    if (typeof value === "object") {
        Object.keys(value).forEach(function (key) {
            if (/authorization|token|password|secret/i.test(key)) return;
            allStrings(value[key], result, depth + 1);
        });
    }
    return result;
}

function extractEntries(value) {
    value = object(value);
    if (Array.isArray(value.values)) return value.values;
    if (Array.isArray(value.objectEntries)) return value.objectEntries;
    if (value.results && Array.isArray(value.results.values)) return value.results.values;
    if (value.results && Array.isArray(value.results.objectEntries)) return value.results.objectEntries;
    return [];
}

function attributeMap(entry) {
    var result = Object.create(null);
    array(entry && entry.attributes).forEach(function (attribute) {
        var definition = object(attribute.objectTypeAttribute || attribute.attribute || {});
        var name = clean(definition.name || attribute.name, 300);
        if (!name) return;
        var values = [];
        array(attribute.objectAttributeValues || attribute.values).forEach(function (value) {
            var candidate = value && typeof value === "object"
                ? value.displayValue || value.searchValue || value.value ||
                    (value.referencedObject && (value.referencedObject.label || value.referencedObject.name || value.referencedObject.objectKey)) ||
                    (value.user && (value.user.displayName || value.user.emailAddress || value.user.accountId))
                : value;
            candidate = clean(candidate, 2000);
            if (candidate) values.push(candidate);
        });
        result[name.toLowerCase()] = unique(values);
    });
    return result;
}

function firstAttribute(map, names) {
    for (var index = 0; index < names.length; index++) {
        var values = map[String(names[index] || "").toLowerCase()];
        if (values && values.length) return values[0];
    }
    return "";
}

function normalizeAsset(entry, hostnameAttribute) {
    entry = object(entry);
    var attributes = attributeMap(entry);
    var key = clean(entry.objectKey || entry.key, 300);
    var id = clean(entry.id || entry.objectId || key, 300);
    var label = clean(entry.label || entry.name || key || id, 500);
    var hostname = firstAttribute(attributes, [hostnameAttribute, "Hostname", "Host Name", "Computer Name", "DNS Name", "Name"]) || label;
    var model = firstAttribute(attributes, ["Model", "Hardware Model", "Device Model", "Product Model"]);
    var serial = firstAttribute(attributes, ["Serial Number", "Serial", "SerialNumber", "S/N"]);
    var inventory = firstAttribute(attributes, ["Inventory Number", "Inventory", "Asset Tag", "Asset ID", "Inventory ID", "Key"]) || key;
    return {
        id: id,
        key: key,
        label: label || hostname || id,
        hostname: hostname,
        model: model,
        serial: serial,
        inventory: inventory,
        attributes: attributes,
        rawStrings: unique(allStrings(entry))
    };
}

function userIdentity(user) {
    user = object(user);
    return unique([user.accountId, user.emailAddress, user.displayName, user.name, user.key]);
}

function matchesUser(asset, user) {
    var identities = userIdentity(user).map(function (value) { return value.toLowerCase(); });
    if (!identities.length) return false;
    return array(asset && asset.rawStrings).some(function (value) {
        value = String(value || "").toLowerCase();
        return identities.some(function (identity) { return value === identity; });
    });
}

function protocolLines(protocol) {
    var transfer = protocol.mode === "transfer";
    return [
        transfer ? "PROTOKOL PRZEKAZANIA SPRZETU" : "PROTOKOL ZWROTU SPRZETU",
        "",
        "Data: " + protocol.date,
        "Uzytkownik: " + protocol.user,
        "Osoba IT: " + protocol.itPerson,
        "",
        "Sprzet:",
        "Hostname: " + protocol.asset.hostname,
        "Model: " + (protocol.asset.model || "-"),
        "Numer seryjny: " + (protocol.asset.serial || "-"),
        "Numer inwentarzowy: " + (protocol.asset.inventory || protocol.asset.key || "-"),
        "Jira Asset: " + (protocol.asset.key || protocol.asset.id),
        "",
        transfer
            ? "Sprzet zostal przekazany wskazanemu uzytkownikowi."
            : "Sprzet zostal zwrocony przez wskazanego uzytkownika.",
        "",
        "Podpis uzytkownika: ______________________________",
        "Podpis IT:          ______________________________"
    ];
}

var FONT = {
    " ":[0,0,0,0,0,0,0],"?":[14,17,1,2,4,0,4],".":[0,0,0,0,0,12,12],":":[0,12,12,0,12,12,0],"-":[0,0,0,31,0,0,0],"_":[0,0,0,0,0,0,31],"/":[1,2,4,8,16,0,0],
    "0":[14,17,19,21,25,17,14],"1":[4,12,4,4,4,4,14],"2":[14,17,1,2,4,8,31],"3":[30,1,1,14,1,1,30],"4":[2,6,10,18,31,2,2],"5":[31,16,16,30,1,1,30],"6":[14,16,16,30,17,17,14],"7":[31,1,2,4,8,8,8],"8":[14,17,17,14,17,17,14],"9":[14,17,17,15,1,1,14],
    "A":[14,17,17,31,17,17,17],"B":[30,17,17,30,17,17,30],"C":[14,17,16,16,16,17,14],"D":[30,17,17,17,17,17,30],"E":[31,16,16,30,16,16,31],"F":[31,16,16,30,16,16,16],"G":[14,17,16,23,17,17,15],"H":[17,17,17,31,17,17,17],"I":[14,4,4,4,4,4,14],"J":[7,2,2,2,18,18,12],"K":[17,18,20,24,20,18,17],"L":[16,16,16,16,16,16,31],"M":[17,27,21,21,17,17,17],"N":[17,25,21,19,17,17,17],"O":[14,17,17,17,17,17,14],"P":[30,17,17,30,16,16,16],"Q":[14,17,17,17,21,18,13],"R":[30,17,17,30,20,18,17],"S":[15,16,16,14,1,1,30],"T":[31,4,4,4,4,4,4],"U":[17,17,17,17,17,17,14],"V":[17,17,17,17,17,10,4],"W":[17,17,17,21,21,21,10],"X":[17,17,10,4,10,17,17],"Y":[17,17,10,4,4,4,4],"Z":[31,1,2,4,8,16,31]
};

function glyph(character) {
    var upper = String(character || "?").toUpperCase();
    return FONT[upper] || FONT["?"];
}

function rasterPdf(lines) {
    var width = 1240;
    var scale = 3;
    var charWidth = 6 * scale;
    var charHeight = 8 * scale;
    var marginX = 40;
    var marginY = 45;
    var maxChars = Math.floor((width - marginX * 2) / charWidth);
    var wrapped = [];
    array(lines).forEach(function (line) {
        line = String(line || "");
        if (!line) { wrapped.push(""); return; }
        while (line.length > maxChars) {
            var cut = line.lastIndexOf(" ", maxChars);
            if (cut < Math.floor(maxChars / 2)) cut = maxChars;
            wrapped.push(line.slice(0, cut));
            line = line.slice(cut).trim();
        }
        wrapped.push(line);
    });
    var height = Math.max(1754, marginY * 2 + wrapped.length * charHeight);
    var pixels = Buffer.alloc(width * height, 255);
    wrapped.forEach(function (line, lineIndex) {
        var y0 = marginY + lineIndex * charHeight;
        Array.from(line).forEach(function (character, charIndex) {
            var pattern = glyph(character);
            var x0 = marginX + charIndex * charWidth;
            pattern.forEach(function (bits, row) {
                for (var column = 0; column < 5; column++) {
                    if (!(bits & (1 << (4 - column)))) continue;
                    for (var dy = 0; dy < scale; dy++) {
                        for (var dx = 0; dx < scale; dx++) {
                            var x = x0 + column * scale + dx;
                            var y = y0 + row * scale + dy;
                            if (x >= 0 && x < width && y >= 0 && y < height) pixels[y * width + x] = 0;
                        }
                    }
                }
            });
        });
    });
    var zlib = require("zlib");
    var image = zlib.deflateSync(pixels);
    var objects = [];
    function add(body) { objects.push(Buffer.isBuffer(body) ? body : Buffer.from(String(body), "binary")); return objects.length; }
    var catalog = add("<< /Type /Catalog /Pages 2 0 R >>");
    var pages = add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    var page = add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>");
    var contentText = "q\n595 0 0 842 0 0 cm\n/Im0 Do\nQ\n";
    var content = add("<< /Length " + Buffer.byteLength(contentText) + " >>\nstream\n" + contentText + "endstream");
    var imageHead = Buffer.from("<< /Type /XObject /Subtype /Image /Width " + width + " /Height " + height + " /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length " + image.length + " >>\nstream\n", "binary");
    var imageTail = Buffer.from("\nendstream", "binary");
    add(Buffer.concat([imageHead, image, imageTail]));
    var header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary");
    var chunks = [header];
    var offsets = [0];
    var position = header.length;
    objects.forEach(function (body, index) {
        offsets.push(position);
        var prefix = Buffer.from((index + 1) + " 0 obj\n", "binary");
        var suffix = Buffer.from("\nendobj\n", "binary");
        chunks.push(prefix, body, suffix);
        position += prefix.length + body.length + suffix.length;
    });
    var xref = position;
    var table = "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
    for (var index = 1; index <= objects.length; index++) table += String(offsets[index]).padStart(10, "0") + " 00000 n \n";
    table += "trailer\n<< /Size " + (objects.length + 1) + " /Root " + catalog + " 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
    chunks.push(Buffer.from(table, "binary"));
    return Buffer.concat(chunks);
}

module.exports.createJiraAssetsService = function (options) {
    options = options || {};
    var context = options.context;
    var fs = context.fs;
    var path = context.path;
    var client = options.httpClient || httpClient;
    var cachePath = path.join(context.dataRoot, "cache", "jira-users.json");
    var artifactRoot = path.join(context.dataRoot, "artifacts", "jira-protocol");
    var progressStore = Object.create(null);
    var discovery = { cloudId: "", workspaceId: "" };

    function jira() {
        var config = context.integrations.get("jira") || {};
        if (!config.url || !config.email || !config.token) throw new Error("Jira integration is not fully configured.");
        return config;
    }

    function headers(config) {
        return {
            Authorization: "Basic " + Buffer.from(config.email + ":" + config.token, "utf8").toString("base64"),
            Accept: "application/json",
            "Content-Type": "application/json"
        };
    }

    function requestJson(config, url, requestOptions) {
        requestOptions = requestOptions || {};
        return client.requestJson({
            url: url,
            method: requestOptions.method || "GET",
            headers: headers(config),
            json: requestOptions.json,
            verifyTls: config.verifyTls !== false,
            timeoutMs: 45000,
            maxBytes: 8 * 1024 * 1024,
            errorPrefix: requestOptions.errorPrefix || "Jira"
        });
    }

    function readUserCache() {
        try {
            var value = JSON.parse(fs.readFileSync(cachePath, "utf8"));
            if (!value || !Array.isArray(value.users)) return null;
            return value;
        } catch (error) { return null; }
    }

    function writeUserCache(users) {
        fs.mkdirSync(path.dirname(cachePath), { recursive: true });
        shared.writeJsonAtomic(fs, path, cachePath, { updatedAt: Date.now(), users: users });
    }

    function normalizeUser(user) {
        user = object(user);
        var accountId = clean(user.accountId || user.key || user.name, 300);
        if (!accountId) return null;
        return {
            accountId: accountId,
            displayName: clean(user.displayName || user.name || accountId, 500),
            emailAddress: clean(user.emailAddress, 500),
            active: user.active !== false,
            accountType: clean(user.accountType, 80)
        };
    }

    function fetchUsers() {
        var config = jira();
        var result = [];
        var startAt = 0;
        function page() {
            if (startAt >= MAX_USERS) return Promise.resolve(result);
            var maxResults = Math.min(USER_PAGE_SIZE, MAX_USERS - startAt);
            var url = config.url + "/rest/api/3/users/search?startAt=" + startAt + "&maxResults=" + maxResults;
            return requestJson(config, url, { errorPrefix: "Jira users" }).then(function (rows) {
                rows = Array.isArray(rows) ? rows : [];
                rows.forEach(function (row) {
                    var user = normalizeUser(row);
                    if (!user || !user.active || user.accountType === "app") return;
                    if (!result.some(function (existing) { return existing.accountId === user.accountId; })) result.push(user);
                });
                if (rows.length < maxResults) return result;
                startAt += rows.length;
                return page();
            });
        }
        return page().then(function (users) {
            users.sort(function (a, b) { return a.displayName.localeCompare(b.displayName) || a.accountId.localeCompare(b.accountId); });
            writeUserCache(users);
            return users;
        });
    }

    function users(force) {
        var cached = readUserCache();
        if (!force && cached && Date.now() - Number(cached.updatedAt || 0) < USER_CACHE_TTL_MS) return Promise.resolve(cached.users);
        return fetchUsers().catch(function (error) {
            if (cached && cached.users.length) return cached.users;
            throw error;
        });
    }

    function cloudId(config) {
        if (clean(config.cloudId, 300)) return Promise.resolve(clean(config.cloudId, 300));
        if (discovery.cloudId) return Promise.resolve(discovery.cloudId);
        return requestJson(config, config.url + "/_edge/tenant_info", { errorPrefix: "Jira tenant" }).then(function (value) {
            discovery.cloudId = clean(value && value.cloudId, 300);
            if (!discovery.cloudId) throw new Error("Jira cloudId discovery returned no cloudId.");
            return discovery.cloudId;
        });
    }

    function workspaceId(config) {
        if (clean(config.workspaceId, 300)) return Promise.resolve(clean(config.workspaceId, 300));
        if (discovery.workspaceId) return Promise.resolve(discovery.workspaceId);
        return requestJson(config, config.url + "/rest/servicedeskapi/assets/workspace", { errorPrefix: "Jira Assets workspace" }).then(function (value) {
            var values = array(value && value.values);
            var first = values[0] || value || {};
            discovery.workspaceId = clean(first.workspaceId || first.id, 300);
            if (!discovery.workspaceId) throw new Error("Jira Assets workspace discovery returned no workspaceId.");
            return discovery.workspaceId;
        });
    }

    function scopedAql(config, user) {
        var query = clean(config.aql, 4000) || "objectType = Computer";
        var replacements = {
            "{user}": aqlValue(user.accountId),
            "{accountId}": aqlValue(user.accountId),
            "{email}": aqlValue(user.emailAddress),
            "{displayName}": aqlValue(user.displayName)
        };
        var used = false;
        Object.keys(replacements).forEach(function (marker) {
            if (query.indexOf(marker) < 0) return;
            used = true;
            query = query.split(marker).join(replacements[marker]);
        });
        return { query: query, userScoped: used };
    }

    function queryAssets(user) {
        var config = jira();
        var scope = scopedAql(config, user);
        return Promise.all([cloudId(config), workspaceId(config)]).then(function (values) {
            var cloud = encodeURIComponent(values[0]);
            var workspace = encodeURIComponent(values[1]);
            var maxResults = Math.max(10, Math.min(500, Number(config.maxResults) || 100));
            var url = "https://api.atlassian.com/ex/jira/" + cloud + "/jsm/assets/workspace/" + workspace + "/v1/object/aql?startAt=0&maxResults=" + maxResults + "&includeAttributes=true";
            return requestJson(config, url, { method: "POST", json: { qlQuery: scope.query }, errorPrefix: "Jira Assets AQL" });
        }).then(function (value) {
            var byId = Object.create(null);
            extractEntries(value).forEach(function (entry) {
                var asset = normalizeAsset(entry, config.hostnameAttribute || "Hostname");
                if (!asset.id) return;
                if (!scope.userScoped && !matchesUser(asset, user)) return;
                if (!byId[asset.id]) byId[asset.id] = asset;
            });
            return Object.keys(byId).map(function (id) { return byId[id]; }).sort(function (a, b) {
                return a.hostname.localeCompare(b.hostname) || a.id.localeCompare(b.id);
            });
        });
    }

    function findUser(accountId) {
        accountId = clean(accountId, 300);
        return users(false).then(function (rows) {
            var user = rows.find(function (row) { return row.accountId === accountId; });
            if (!user) throw new Error("Selected Jira user is not available.");
            return user;
        });
    }

    function assetsForUser(accountId) {
        return findUser(accountId).then(function (user) {
            return queryAssets(user).then(function (assets) { return { user: user, assets: assets }; });
        });
    }

    function isProtocolScript(script) {
        return array(script && script.extraHeaders).some(function (header) { return PROTOCOL_MARKER.test(String(header || "").trim()); });
    }

    function variableOptions(script, variable, currentValues) {
        if (!isProtocolScript(script)) throw new Error("Dynamic Jira options are not enabled for this script.");
        variable = object(variable);
        currentValues = object(currentValues);
        if (variable.control === "user") {
            return users(false).then(function (rows) {
                return rows.map(function (user) {
                    return { value: user.accountId, label: user.displayName + (user.emailAddress ? " <" + user.emailAddress + ">" : "") };
                });
            });
        }
        if (variable.control === "asset") {
            var accountId = clean(currentValues.JiraUser || currentValues.jiraUser, 300);
            if (!accountId) return Promise.resolve([]);
            return assetsForUser(accountId).then(function (result) {
                return result.assets.map(function (asset) {
                    var suffix = [asset.model, asset.inventory].filter(Boolean).join(" · ");
                    return { value: asset.id, label: asset.hostname + (suffix ? " — " + suffix : "") };
                });
            });
        }
        return Promise.resolve(array(variable.options));
    }

    function pruneProgress() {
        var keys = Object.keys(progressStore).sort(function (a, b) { return progressStore[a].updatedAt - progressStore[b].updatedAt; });
        var now = Date.now();
        keys.forEach(function (key) { if (now - progressStore[key].updatedAt > PROGRESS_TTL_MS) delete progressStore[key]; });
        keys = Object.keys(progressStore).sort(function (a, b) { return progressStore[a].updatedAt - progressStore[b].updatedAt; });
        while (keys.length > MAX_PROGRESS) delete progressStore[keys.shift()];
    }

    function setProgress(id, percent, stage, status) {
        id = safeId(id);
        progressStore[id] = {
            id: id,
            percent: Math.max(0, Math.min(100, Number(percent) || 0)),
            stage: clean(stage, 300),
            status: clean(status || "running", 40),
            updatedAt: Date.now()
        };
        pruneProgress();
        return shared.copy(progressStore[id]);
    }

    function progress(id) {
        pruneProgress();
        id = safeId(id);
        return shared.copy(progressStore[id] || { id: id, percent: 0, stage: "Queued", status: "queued", updatedAt: 0 });
    }

    function resolveItPerson(value, rows) {
        value = clean(value, 500);
        var user = array(rows).find(function (row) { return row.accountId === value; });
        return user ? user.displayName : value;
    }

    function protocolRecord(values, user, asset, itPerson) {
        var transfer = /^(1|true|yes|tak|on)$/i.test(String(values.IsTransferProtocol || values.Transfer || ""));
        return {
            mode: transfer ? "transfer" : "return",
            date: new Date().toISOString().slice(0, 10),
            user: user.displayName,
            userAccountId: user.accountId,
            itPerson: itPerson,
            asset: {
                id: asset.id,
                key: asset.key,
                hostname: asset.hostname,
                model: asset.model,
                serial: asset.serial,
                inventory: asset.inventory
            }
        };
    }

    function writeArtifacts(request, protocol) {
        var id = safeId(request.id);
        var directory = path.join(artifactRoot, id);
        fs.mkdirSync(directory, { recursive: true });
        var lines = protocolLines(protocol);
        var title = protocol.mode === "transfer" ? "Protokol przekazania sprzetu" : "Protokol zwrotu sprzetu";
        var txt = lines.join("\n") + "\n";
        var page = "<!doctype html><html><head><meta charset=\"utf-8\"><title>" + html(title) + "</title></head><body><main><h1>" + html(title) + "</h1><pre>" + html(txt) + "</pre></main></body></html>";
        fs.writeFileSync(path.join(directory, "protocol.json"), JSON.stringify(protocol, null, 2) + "\n", "utf8");
        fs.writeFileSync(path.join(directory, "protocol.txt"), txt, "utf8");
        fs.writeFileSync(path.join(directory, "protocol.html"), page, "utf8");
        fs.writeFileSync(path.join(directory, "protocol.pdf"), rasterPdf(lines));
        shared.writeJsonAtomic(fs, path, path.join(directory, "meta.json"), {
            requestId: id,
            requesterId: clean(request.requester && request.requester.id, 300),
            scriptPath: clean(request.payload && request.payload.scriptPath, 1000),
            createdAt: Date.now(),
            files: ["pdf", "json", "txt", "html"]
        });
        return { id: id, type: "pdf", label: title + ".pdf" };
    }

    function executeProtocol(payload, request, executeScript) {
        payload = object(payload);
        request = object(request);
        var values = object(payload.variableValues);
        var requestId = safeId(request.id);
        var jiraUser;
        var asset;
        var protocol;
        setProgress(requestId, 5, "Preparation", "running");
        return users(false).then(function (rows) {
            setProgress(requestId, 20, "Jira user", "running");
            jiraUser = rows.find(function (row) { return row.accountId === clean(values.JiraUser, 300); });
            if (!jiraUser) throw new Error("Selected Jira user is not available.");
            return queryAssets(jiraUser).then(function (assets) { return { rows: rows, assets: assets }; });
        }).then(function (state) {
            setProgress(requestId, 45, "Jira asset", "running");
            var selectedId = clean(values.PcName || values.Asset || values.AssetId, 300);
            asset = state.assets.find(function (item) { return item.id === selectedId || item.key === selectedId || item.hostname === selectedId; });
            if (!asset) throw new Error("Selected Jira asset does not belong to the selected user or configured AQL scope.");
            var itPerson = resolveItPerson(values.ItPerson, state.rows);
            if (!itPerson) throw new Error("IT person is required.");
            protocol = protocolRecord(values, jiraUser, asset, itPerson);
            setProgress(requestId, 65, "Protocol", "running");
            var environment = {
                MYSCRIPTS_JIRA_PROTOCOL_DATA_B64: Buffer.from(JSON.stringify(protocol), "utf8").toString("base64")
            };
            return Promise.resolve(executeScript(environment));
        }).then(function (result) {
            setProgress(requestId, 85, "PDF", "running");
            var artifact = writeArtifacts(request, protocol);
            setProgress(requestId, 100, "Ready", "completed");
            result = object(result);
            var marker = "SIRK_ARTIFACT:" + JSON.stringify(artifact);
            result.output = [clean(result.output, 100000), marker].filter(Boolean).join("\n");
            result.message = clean(result.message || "Jira Asset Protocol completed.", 8000);
            result.artifact = artifact;
            return result;
        }).catch(function (error) {
            var current = progress(requestId);
            setProgress(requestId, Math.min(95, current.percent), clean(error && error.message || error, 300), "failed");
            throw error;
        });
    }

    function resolveArtifact(id, type) {
        id = safeId(id);
        type = clean(type || "pdf", 20).toLowerCase();
        var names = { pdf: "protocol.pdf", json: "protocol.json", txt: "protocol.txt", html: "protocol.html" };
        if (!names[type]) throw new Error("Unsupported artifact type.");
        var directory = path.join(artifactRoot, id);
        var meta = JSON.parse(fs.readFileSync(path.join(directory, "meta.json"), "utf8"));
        var file = path.join(directory, names[type]);
        var resolvedRoot = path.resolve(artifactRoot) + path.sep;
        var resolved = path.resolve(file);
        if (resolved.indexOf(resolvedRoot) !== 0 || !fs.statSync(resolved).isFile()) throw new Error("Artifact not found.");
        return { path: resolved, meta: meta, type: type, name: names[type] };
    }

    return {
        assetsForUser: assetsForUser,
        executeProtocol: executeProtocol,
        isProtocolScript: isProtocolScript,
        progress: progress,
        resolveArtifact: resolveArtifact,
        users: users,
        variableOptions: variableOptions,
        _test: {
            aqlValue: aqlValue,
            extractEntries: extractEntries,
            matchesUser: matchesUser,
            normalizeAsset: normalizeAsset,
            normalizeUser: normalizeUser,
            rasterPdf: rasterPdf,
            scopedAql: scopedAql
        }
    };
};
