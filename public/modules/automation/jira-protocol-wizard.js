(function () {
    "use strict";

    var tools = window.SharedScriptTools;
    if (!tools || tools.__sirkJiraProtocolWizard) return;

    var MAX_PROTOCOL_ASSETS = 20;
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
    function runStep(options, item, baseValues, primaryLabel, providerOverride, stepOptions) {
        var provider = arguments.length >= 5 ? providerOverride : providerFor(baseValues, options.resolveOptions);
        return originalOpen(Object.assign({
            item: item,
            trigger: options.trigger,
            primaryLabel: primaryLabel,
            resolveOptions: provider
        }, stepOptions || {}));
    }
    function optionValue(option) {
        return text(option && typeof option === "object" ?
            (option.value == null ? (option.assetId == null ? option.objectId : option.assetId) : option.value) : option);
    }
    function selectedValues(value) {
        var seen = Object.create(null);
        return text(value).split(/[;,|\r\n]+/).map(function (entry) { return entry.trim(); }).filter(function (entry) {
            if (!entry || seen[entry]) return false;
            seen[entry] = true;
            return true;
        });
    }
    function filterOptions(options, query) {
        query = text(query).trim().toLowerCase();
        return (Array.isArray(options) ? options : []).filter(function (option) {
            if (!query) return true;
            var value = optionValue(option);
            var label = text(option && typeof option === "object" ? option.label : option);
            return (label + " " + value).toLowerCase().indexOf(query) >= 0;
        });
    }
    function splitInventory(options) {
        var warehouse = [], user = [];
        (Array.isArray(options) ? options : []).forEach(function (option) {
            (option && option.assignedToUser === true ? user : warehouse).push(option);
        });
        return { warehouse: warehouse, user: user };
    }
    function buildProtocolSelection(receiveValue, returnValue, userOptions) {
        var receive = selectedValues(receiveValue);
        var returns = selectedValues(returnValue);
        if (receive.length + returns.length > MAX_PROTOCOL_ASSETS) {
            throw new Error("Maksymalnie 20 pozycji może zmieniać stan w jednym protokole.");
        }
        var actions = Object.create(null);
        var selected = [];
        function add(value, action) {
            if (actions[value] && actions[value] !== action) throw new Error("Sprzęt nie może być jednocześnie przyjęty i zdany.");
            if (!actions[value]) selected.push(value);
            actions[value] = action;
        }
        receive.forEach(function (value) { add(value, "receive"); });
        returns.forEach(function (value) { add(value, "return"); });
        (Array.isArray(userOptions) ? userOptions : []).some(function (option) {
            if (selected.length >= MAX_PROTOCOL_ASSETS) return true;
            var value = optionValue(option);
            if (value && !actions[value]) add(value, "none");
            return false;
        });
        return {
            PcName: selected.join(";"),
            JiraAssetActionsJson: JSON.stringify(actions)
        };
    }
    function searchableAssetStep(item, assetVariable, label, description, searchName, options) {
        var search = {
            name: searchName,
            label: "Szukaj",
            required: false,
            control: "user",
            defaultValue: "",
            inlineLabel: true,
            liveInput: true
        };
        var preparedAsset = copy(assetVariable);
        preparedAsset.required = false;
        preparedAsset.control = "assetmulti";
        preparedAsset.label = "Sprzęt";
        preparedAsset.description = "";
        preparedAsset.hideLabel = true;
        preparedAsset.dependsOn = searchName;
        preparedAsset.options = Array.isArray(options) ? options.slice() : [];
        var step = stepItem(item, label, description, [search, preparedAsset]);
        step.fitOptionWidth = true;
        step.extraHeaders.push("SirkAllowCustom: " + searchName);
        return step;
    }
    function localSearchProvider(options, searchName, assetName) {
        return function (dynamicVariable, currentValues) {
            if (text(dynamicVariable && dynamicVariable.name) === searchName) return [];
            if (text(dynamicVariable && dynamicVariable.name) === assetName) {
                return filterOptions(options, currentValues && currentValues[searchName]);
            }
            return [];
        };
    }

    function runWizard(options) {
        var item = options.item;
        var jiraUser = variable(item, "JiraUser");
        var asset = variable(item, "PcName");
        var itPerson = variable(item, "ItPerson");
        if (!jiraUser || !asset || !itPerson) return originalOpen(options);

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
        asset.required = false;

        itPerson = copy(itPerson);
        itPerson.description = "";
        itPerson.optionSource = "mesh-users";
        delete itPerson.defaultValue;

        var userStep = stepItem(item, "Jira Asset Protocol - User", "", [activeOnly, search, jiraUser]);
        var protocolStep = stepItem(item, "Jira Asset Protocol - Protocol", "", [itPerson]);

        var userProvider = providerFor({}, options.resolveOptions);
        var assetPrefetch = { user: "", promise: null };
        function prefetchAssets(values) {
            var selectedUser = text(values && values.JiraUser);
            if (!selectedUser) return null;
            if (assetPrefetch.user === selectedUser && assetPrefetch.promise) return assetPrefetch.promise;
            var selectedValues = Object.assign({}, values || {});
            var assetProvider = providerFor(selectedValues, options.resolveOptions);
            var operation = typeof assetProvider === "function" ?
                Promise.resolve(assetProvider(asset, {}, item)) :
                Promise.resolve(asset.options || []);
            var tracked = operation.catch(function (error) {
                if (assetPrefetch.promise === tracked) assetPrefetch = { user: "", promise: null };
                throw error;
            });
            assetPrefetch = { user: selectedUser, promise: tracked };
            return tracked;
        }
        var readyUsers = typeof userProvider === "function" ?
            Promise.resolve(userProvider(jiraUser, {}, userStep)) :
            Promise.resolve(jiraUser.options || []);

        return readyUsers.then(function (optionsValue) {
            var preparedUsers = Array.isArray(optionsValue) ? optionsValue.slice() : [];
            jiraUser.options = preparedUsers;
            return runStep(options, userStep, {}, "Next", function () {
                return preparedUsers;
            }, {
                valuesChangePendingMessage: "Ładowanie sprzętu...",
                onValuesChanged: function (values, changedVariable) {
                    if (!changedVariable || text(changedVariable.name) !== "JiraUser") return null;
                    return prefetchAssets(values);
                }
            });
        }).then(function (userValues) {
            if (userValues == null) return null;
            var selectedUser = Object.assign({}, userValues);
            return prefetchAssets(selectedUser).then(function (optionsValue) {
                var inventory = splitInventory(optionsValue);
                var warehouseStep = searchableAssetStep(
                    item,
                    asset,
                    "Sprzęt z magazynu",
                    "Wybierz sprzęt do przekazania użytkownikowi (opcjonalnie).",
                    "WarehouseSearch",
                    inventory.warehouse
                );
                return runStep(
                    options,
                    warehouseStep,
                    selectedUser,
                    "Next",
                    localSearchProvider(inventory.warehouse, "WarehouseSearch", asset.name)
                ).then(function (warehouseValues) {
                    if (warehouseValues == null) return null;
                    var userEquipmentStep = searchableAssetStep(
                        item,
                        asset,
                        "Sprzęt użytkownika",
                        "Wybierz sprzęt do zdania przez użytkownika (opcjonalnie).",
                        "UserEquipmentSearch",
                        inventory.user
                    );
                    return runStep(
                        options,
                        userEquipmentStep,
                        selectedUser,
                        "Next",
                        localSearchProvider(inventory.user, "UserEquipmentSearch", asset.name)
                    ).then(function (userEquipmentValues) {
                        if (userEquipmentValues == null) return null;
                        var selection = buildProtocolSelection(
                            warehouseValues.PcName,
                            userEquipmentValues.PcName,
                            inventory.user
                        );
                        var accumulated = Object.assign({}, selectedUser, selection);
                        return runStep(
                            options,
                            protocolStep,
                            accumulated,
                            options.primaryLabel || (item.requiresApproval ? "Request" : "Run")
                        ).then(function (protocolValues) {
                            if (protocolValues == null) return null;
                            var result = Object.assign({}, accumulated, protocolValues);
                            delete result.JiraUserActiveOnly;
                            delete result.JiraUserSearch;
                            return result;
                        });
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
        if (isProtocol(options.item)) return runWizard(options);
        if (isCache(options.item)) return originalOpen(Object.assign({}, options, { item: cacheItem(options.item) }));
        return originalOpen(options);
    };
    tools.jiraProtocolWizardContract = {
        buildProtocolSelection: buildProtocolSelection,
        filterOptions: filterOptions,
        splitInventory: splitInventory,
        isProtocol: isProtocol,
        isCache: isCache,
        cacheItem: cacheItem,
        stepItem: stepItem
    };
    tools.__sirkJiraProtocolWizard = true;
}());
