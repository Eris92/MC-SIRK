"use strict";

var shared = require("./shared.js");

function keyFor(value) {
    return String(value || "")
        .replace(/\\/g, "/")
        .toLowerCase();
}

function workflowKey(value) {
    var headers = value && Array.isArray(value.extraHeaders) ? value.extraHeaders : [];
    var match = null;
    headers.some(function (header) {
        match = /^SirkWorkflow\s*:\s*([^\s]+)\s*$/i.exec(String(header || "").trim());
        return !!match;
    });
    return match ? "@workflow:" + keyFor(match[1]) : "";
}

function fileNameKey(value) {
    var parts = keyFor(value).split("/");
    return parts[parts.length - 1] || "";
}

module.exports.createScriptAdminService = function (options) {
    options = options || {};
    var context = options.context;
    var library = options.library;
    var namespace = String(options.namespace || "scripts");
    var assignmentNamespace = namespace + ".system-credentials";
    var profileLabels = {
        ad: "Active Directory",
        entra: "Entra ID",
        jira: "Jira",
        defender: "Defender XDR",
        zabbix: "Zabbix"
    };

    function requireAdmin(user) {
        if (!shared.isSiteAdmin(user)) {
            throw new Error("Permission denied.");
        }
    }

    function script(relativePath) {
        var value = library.getScript(relativePath, false);
        if (!value) throw new Error("Script not found.");
        return value;
    }

    function readStore() {
        var value = context.secrets.get(namespace);
        return value && typeof value === "object" ? value : {};
    }

    function readAssignments() {
        var value = context.secrets.get(assignmentNamespace);
        return value && typeof value === "object" ? value : {};
    }

    function selectedProfiles(relativePath) {
        var value = script(relativePath);
        var assignments = readAssignments();
        var pathKey = keyFor(value.path);
        var stableKey = workflowKey(value);
        var selected = assignments[stableKey] || assignments[pathKey];
        if (!Array.isArray(selected) && stableKey) {
            var fileName = fileNameKey(value.path);
            var legacyKeys = Object.keys(assignments).filter(function (key) {
                return key.indexOf("@workflow:") !== 0 && fileNameKey(key) === fileName && Array.isArray(assignments[key]);
            });
            if (legacyKeys.length === 1) {
                selected = assignments[legacyKeys[0]];
                assignments[stableKey] = selected.slice();
                context.secrets.set(assignmentNamespace, assignments);
            }
        }
        return Array.isArray(selected) ? selected.map(String) : [];
    }

    function hasSystemCredential(relativePath, profileName) {
        return selectedProfiles(relativePath).indexOf(String(profileName || "")) >= 0;
    }

    function configuredProfiles() {
        var configured = context.integrations.configured();
        var values = context.integrations.readSettings();
        return Object.keys(profileLabels).map(function (name) {
            var available = false;
            if (name === "ad") {
                available = !!(values.ad && values.ad.domain && values.ad.login && configured.adPassword);
            } else if (name === "entra") {
                available = !!(values.entra && values.entra.tenantId && values.entra.clientId && configured.entraClientSecret);
            } else if (name === "jira") {
                available = configured.jira === true;
            } else if (name === "defender") {
                available = configured.defender === true;
            } else if (name === "zabbix") {
                available = !!(values.zabbix && values.zabbix.url && (configured.zabbixPassword || configured.zabbixToken));
            }
            return { name: name, label: profileLabels[name], configured: available };
        });
    }

    function getSystemCredentialState(user, relativePath) {
        requireAdmin(user);
        var value = script(relativePath);
        var selected = selectedProfiles(value.path);
        return {
            path: value.path,
            profiles: configuredProfiles().map(function (profile) {
                profile.selected = selected.indexOf(profile.name) >= 0;
                return profile;
            })
        };
    }

    function saveSystemCredentials(user, relativePath, selected) {
        requireAdmin(user);
        var value = script(relativePath);
        var allowed = Object.keys(profileLabels);
        selected = (Array.isArray(selected) ? selected : []).map(String).filter(function (name, index, list) {
            return allowed.indexOf(name) >= 0 && list.indexOf(name) === index;
        });
        var assignments = readAssignments();
        var key = workflowKey(value) || keyFor(value.path);
        if (selected.length) assignments[key] = selected;
        else delete assignments[key];
        context.secrets.set(assignmentNamespace, assignments);
        return getSystemCredentialState(user, value.path);
    }

    function getSecretState(user, relativePath) {
        requireAdmin(user);
        var value = script(relativePath);
        var store = readStore();
        var configured = store[keyFor(value.path)] || {};
        return {
            path: value.path,
            variables: (value.secretVariables || []).map(function (variable) {
                return {
                    name: variable.name,
                    label: variable.label,
                    required: variable.required === true,
                    configured: !!String(configured[variable.name] || "")
                };
            })
        };
    }

    function saveSecrets(user, relativePath, values, clearNames) {
        requireAdmin(user);
        var value = script(relativePath);
        var allowed = Object.create(null);
        (value.secretVariables || []).forEach(function (variable) {
            allowed[variable.name] = true;
        });

        values = values && typeof values === "object" ? values : {};
        clearNames = Array.isArray(clearNames) ? clearNames.map(String) : [];
        var store = readStore();
        var key = keyFor(value.path);
        var current = store[key] && typeof store[key] === "object"
            ? shared.copy(store[key])
            : {};

        Object.keys(values).forEach(function (name) {
            if (!allowed[name]) return;
            var secret = shared.cleanText(values[name], 8000);
            if (secret) current[name] = secret;
        });
        clearNames.forEach(function (name) {
            if (allowed[name]) delete current[name];
        });

        if (Object.keys(current).length) store[key] = current;
        else delete store[key];
        context.secrets.set(namespace, store);
        return getSecretState(user, value.path);
    }

    function secretValues(relativePath) {
        var value = script(relativePath);
        var store = readStore();
        var current = store[keyFor(value.path)] || {};
        var result = {};
        (value.secretVariables || []).forEach(function (variable) {
            var secret = String(current[variable.name] || "");
            if (variable.required && !secret) {
                throw new Error(
                    "Configure credential " + variable.label +
                    " for this script first."
                );
            }
            result[variable.name] = secret;
        });
        return result;
    }

    function getDefinition(user, relativePath) {
        requireAdmin(user);
        var definition = library.getDefinition(relativePath);
        var value = library.getScript(relativePath, true);
        if (!definition || !value) throw new Error("Script not found.");
        definition.body = String(value.body || "");
        definition.shell = value.shell || "";
        return definition;
    }

    function saveDefinition(user, relativePath, definition) {
        requireAdmin(user);
        definition = definition && typeof definition === "object" ? definition : {};
        var requestedBody = Object.prototype.hasOwnProperty.call(definition, "body")
            ? String(definition.body == null ? "" : definition.body).replace(/^\uFEFF/, "")
            : null;
        var result = library.saveDefinition(relativePath, definition);

        if (requestedBody !== null) {
            var source = library.getSource(relativePath);
            var generatedBody = String(result.script && result.script.body || "");
            var sourceText = String(source && source.text || "");
            var prefix = generatedBody && sourceText.slice(-generatedBody.length) === generatedBody
                ? sourceText.slice(0, sourceText.length - generatedBody.length)
                : sourceText;
            prefix = prefix.replace(/[\t ]+$/gm, "").replace(/(?:\r?\n)+$/, "\n\n");
            library.saveSource(relativePath, prefix + requestedBody.replace(/^\s*\r?\n/, ""));
            result = {
                script: library.getScript(relativePath, true),
                definition: library.getDefinition(relativePath)
            };
            result.definition.body = String(result.script.body || "");
            result.definition.shell = result.script.shell || "";
        }
        return result;
    }

    return {
        getDefinition: getDefinition,
        saveDefinition: saveDefinition,
        getSecretState: getSecretState,
        saveSecrets: saveSecrets,
        secretValues: secretValues,
        getSystemCredentialState: getSystemCredentialState,
        saveSystemCredentials: saveSystemCredentials,
        hasSystemCredential: hasSystemCredential
    };
};
