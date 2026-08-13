(function () {
    "use strict";

    var tools = window.SharedScriptTools;
    if (!tools || tools.__sirkJiraProtocolWizard) return;

    var optionProvider = null;
    var originalSetProvider = tools.setParameterOptionProvider;
    var originalOpen = tools.openParameterDialog;
    if (typeof originalOpen !== "function") return;

    function text(value) { return String(value == null ? "" : value); }
    function hasWorkflow(item, name) {
        return (item && Array.isArray(item.extraHeaders) ? item.extraHeaders : []).some(function (header) {
            var match = /^SirkWorkflow\s*:\s*(\S+)\s*$/i.exec(text(header).trim());
            return !!match && match[1].toLowerCase() === text(name).toLowerCase();
        });
    }
    function isProtocol(item) { return hasWorkflow(item, "JiraAssetProtocol"); }
    function isCache(item) { return hasWorkflow(item, "JiraAssetsCache") || hasWorkflow(item, "JiraUsersCache"); }
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
    function cacheItem(item) {
        var prepared = copy(item);
        (prepared && Array.isArray(prepared.variables) ? prepared.variables : []).forEach(function (entry) {
            if (entry && entry.control === "switch" && text(entry.name) === "Force") entry.inlineControl = true;
        });
        return prepared;
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
    function runStep(options, item, baseValues, primaryLabel, providerOverride) {
        var provider = arguments.length >= 5 ? providerOverride : providerFor(baseValues, options.resolveOptions);
        return originalOpen({
            item: item,
            trigger: options.trigger,
            primaryLabel: primaryLabel,
            resolveOptions: provider
        });
    }
    function runWizard(options) {
        var item = options.item;
        var jiraUser = variable(item, "JiraUser");
        var asset = variable(item, "PcName");
        var transfer = variable(item, "IsTransferProtocol");
        var itPerson = variable(item, "ItPerson");
        if (!jiraUser || !asset || !transfer || !itPerson) return originalOpen(options);

        var activeOnly = {
            name: "JiraUserActiveOnly",
            label: "Tylko aktywni użytkownicy",
            required: false,
            control: "switch",
            defaultValue: "true",
            inlineControl: true
        };
        var search = {
            name: "JiraUserSearch",
            label: "Szukaj",
            required: false,
            control: "text",
            defaultValue: "",
            inlineLabel: true
        };
        jiraUser = copy(jiraUser);
        jiraUser.label = "Użytkownicy";
        jiraUser.description = "";
        jiraUser.hideLabel = true;
        jiraUser.listMode = true;
        jiraUser.submitOnDoubleClick = true;
        jiraUser.searchVariable = "JiraUserSearch";
        jiraUser.activeOnlyVariable = "JiraUserActiveOnly";
        asset = copy(asset);
        asset.label = "Sprzęt";
        asset.description = "";
        asset.hideLabel = true;
        asset.control = "assetmulti";
        transfer = copy(transfer);
        transfer.description = "";
        transfer.control = "select";
        transfer.listMode = true;
        transfer.hideLabel = true;
        transfer.defaultValue = "true";
        transfer.options = [
            { value: "true", label: "Przekazanie sprzętu" },
            { value: "false", label: "Odbiór sprzętu" }
        ];
        itPerson = copy(itPerson);
        itPerson.description = "";
        itPerson.optionSource = "mesh-users";
        delete itPerson.defaultValue;

        var userStep = stepItem(item, "Jira Asset Protocol - User", "", [activeOnly, search, jiraUser]);
        var assetStep = stepItem(item, "Sprzęt do protokołu", "", [asset]);
        assetStep.fitOptionWidth = true;
        var protocolStep = stepItem(item, "Jira Asset Protocol - Protocol", "", [transfer, itPerson]);

        var userProvider = providerFor({}, options.resolveOptions);
        var readyUsers = typeof userProvider === "function" ?
            Promise.resolve(userProvider(jiraUser, {}, userStep)) :
            Promise.resolve(jiraUser.options || []);

        return readyUsers.then(function (optionsValue) {
            var preparedUsers = Array.isArray(optionsValue) ? optionsValue.slice() : [];
            jiraUser.options = preparedUsers;
            return runStep(options, userStep, {}, "Next", function () {
                return preparedUsers;
            });
        }).then(function (userValues) {
                if (userValues == null) return null;
                var selectedUser = Object.assign({}, userValues);
                var assetProvider = providerFor(selectedUser, options.resolveOptions);
                var readyOptions = typeof assetProvider === "function" ?
                    Promise.resolve(assetProvider(assetStep.variables[0], {}, assetStep)) :
                    Promise.resolve(assetStep.variables[0].options || []);
                return readyOptions.then(function (optionsValue) {
                    assetStep.variables[0].options = Array.isArray(optionsValue) ? optionsValue.slice() : [];
                    return runStep(options, assetStep, selectedUser, "Next", null);
                }).then(function (assetValues) {
                    if (assetValues == null) return null;
                    var accumulated = Object.assign({}, selectedUser, assetValues);
                    return runStep(options, protocolStep, accumulated, options.primaryLabel || (item.requiresApproval ? "Request" : "Run")).then(function (protocolValues) {
                        if (protocolValues == null) return null;
                        var result = Object.assign({}, accumulated, protocolValues);
                        result.IsTransferProtocol = text(result.IsTransferProtocol).toLowerCase() === "true";
                        delete result.JiraUserActiveOnly;
                        delete result.JiraUserSearch;
                        return result;
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
        if (isProtocol(options.item)) return runWizard(options);
        if (isCache(options.item)) return originalOpen(Object.assign({}, options, { item: cacheItem(options.item) }));
        return originalOpen(options);
    };
    tools.jiraProtocolWizardContract = {
        isProtocol: isProtocol,
        isCache: isCache,
        cacheItem: cacheItem,
        stepItem: stepItem
    };
    tools.__sirkJiraProtocolWizard = true;
}());
