(function () {
    "use strict";

    var tools = window.SharedScriptTools;
    if (!tools || tools.__sirkJiraProtocolWizard) return;

    var optionProvider = null;
    var originalSetProvider = tools.setParameterOptionProvider;
    var originalOpen = tools.openParameterDialog;
    if (typeof originalOpen !== "function") return;

    function text(value) { return String(value == null ? "" : value); }
    function isProtocol(item) {
        return (item && Array.isArray(item.extraHeaders) ? item.extraHeaders : []).some(function (header) {
            return /^SirkWorkflow\s*:\s*JiraAssetProtocol\s*$/i.test(text(header).trim());
        });
    }
    function variable(item, name) {
        return (item && Array.isArray(item.variables) ? item.variables : []).filter(function (entry) {
            return text(entry && entry.name) === name;
        })[0] || null;
    }
    function copy(value) {
        if (!value || typeof value !== "object") return value;
        try { return JSON.parse(JSON.stringify(value)); }
        catch (error) { return value; }
    }
    function stepItem(item, label, description, variables) {
        return {
            path: item.path,
            label: label,
            description: description,
            locales: {},
            requiresApproval: item.requiresApproval === true,
            extraHeaders: Array.isArray(item.extraHeaders) ? item.extraHeaders.slice() : [],
            variables: variables.filter(Boolean).map(copy)
        };
    }
    function providerFor(baseValues, explicitProvider) {
        var provider = typeof explicitProvider === "function" ? explicitProvider : optionProvider;
        if (typeof provider !== "function") return null;
        return function (dynamicVariable, currentValues, item) {
            var merged = Object.assign({}, baseValues || {}, currentValues || {});
            return provider(dynamicVariable, merged, item);
        };
    }
    function runStep(options, item, baseValues, primaryLabel) {
        return originalOpen({
            item: item,
            trigger: options.trigger,
            primaryLabel: primaryLabel,
            resolveOptions: providerFor(baseValues, options.resolveOptions)
        });
    }
    function runWizard(options) {
        var item = options.item;
        var jiraUser = variable(item, "JiraUser");
        var asset = variable(item, "PcName");
        var transfer = variable(item, "IsTransferProtocol");
        var itPerson = variable(item, "ItPerson");
        if (!jiraUser || !asset || !transfer || !itPerson) return originalOpen(options);

        var filter = {
            name: "JiraUserFilter",
            label: "Jira users",
            description: "Choose whether inactive Jira accounts are included in the next user list.",
            required: true,
            control: "select",
            defaultValue: "active",
            options: [
                { value: "active", label: "Active only" },
                { value: "all", label: "All" }
            ]
        };
        var scopeStep = stepItem(item, "Jira Asset Protocol - User scope", "Choose which Jira accounts are visible.", [filter]);
        var userStep = stepItem(item, "Jira Asset Protocol - User", "Select a Jira user from the cached server-side list.", [jiraUser]);
        var assetStep = stepItem(item, "Jira Asset Protocol - Asset", "Select equipment currently assigned to the selected Jira user.", [asset]);
        var protocolStep = stepItem(item, "Jira Asset Protocol - Protocol", "Confirm transfer/return mode and the IT person before generating the protected PDF.", [transfer, itPerson]);

        return runStep(options, scopeStep, {}, "Next").then(function (scopeValues) {
            if (scopeValues == null) return null;
            return runStep(options, userStep, scopeValues, "Next").then(function (userValues) {
                if (userValues == null) return null;
                var selectedUser = Object.assign({}, scopeValues, userValues);
                return runStep(options, assetStep, selectedUser, "Next").then(function (assetValues) {
                    if (assetValues == null) return null;
                    var accumulated = Object.assign({}, selectedUser, assetValues);
                    return runStep(options, protocolStep, accumulated, options.primaryLabel || (item.requiresApproval ? "Request" : "Run")).then(function (protocolValues) {
                        if (protocolValues == null) return null;
                        var result = Object.assign({}, accumulated, protocolValues);
                        delete result.JiraUserFilter;
                        return result;
                    });
                });
            });
        });
    }

    if (typeof originalSetProvider === "function") {
        tools.setParameterOptionProvider = function (provider) {
            optionProvider = typeof provider === "function" ? provider : null;
            return originalSetProvider.call(tools, provider);
        };
    }

    tools.openParameterDialog = function (options) {
        options = options || {};
        return isProtocol(options.item) ? runWizard(options) : originalOpen(options);
    };
    tools.jiraProtocolWizardContract = {
        isProtocol: isProtocol,
        stepItem: stepItem
    };
    tools.__sirkJiraProtocolWizard = true;
}());
