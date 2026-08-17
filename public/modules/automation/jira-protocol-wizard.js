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
    function actionControls(options) {
        var host = document.querySelector && document.querySelector(".mc-parameter-dialog-content .mc-parameter-checklist");
        if (!host) throw new Error("Jira protocol equipment controls are unavailable.");
        var rows = Array.prototype.slice.call(host.querySelectorAll(".mc-parameter-checklist-item"));
        var byValue = Object.create(null);
        (Array.isArray(options) ? options : []).forEach(function (option) {
            var key = optionValue(option);
            if (key) byValue[key] = option;
        });
        var controls = [];
        rows.forEach(function (row) {
            var box = row.querySelector('input[type="checkbox"]');
            if (!box || !box.value) return;
            var option = byValue[text(box.value)] || {};
            var disabled = Array.isArray(option.disabledActions) ? option.disabledActions : [];
            var wrapper = document.createElement("div");
            wrapper.className = "mc-parameter-checklist-item mc-parameter-checklist-item-actions";
            var parent = row.parentNode;
            parent.insertBefore(wrapper, row);
            row.className = "mc-parameter-checklist-choice";
            wrapper.appendChild(row);

            var action = document.createElement("div");
            action.className = "mc-parameter-checklist-action";
            var label = document.createElement("span");
            label.className = "mc-parameter-checklist-action-label";
            label.textContent = "Operacja";
            var select = document.createElement("select");
            select.className = "mc-definition-input mc-parameter-checklist-action-select";
            [
                { value: "none", label: "Bez zmian" },
                { value: "receive", label: "Przyjęcie sprzętu" },
                { value: "return", label: "Zdanie sprzętu" }
            ].forEach(function (choice) {
                var node = document.createElement("option");
                node.value = choice.value;
                node.textContent = choice.label;
                node.disabled = disabled.indexOf(choice.value) >= 0;
                select.appendChild(node);
            });
            select.value = "none";
            action.appendChild(label);
            action.appendChild(select);
            wrapper.appendChild(action);
            if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.control === "function") {
                window.MeshThemeAdapter.control(select);
            }
            controls.push({ value: text(box.value), checkbox: box, select: select });
        });
        if (controls.length !== Object.keys(byValue).length) {
            throw new Error("Jira protocol equipment action controls could not be initialized.");
        }
        return controls;
    }
    function actionValues(controls) {
        var map = {};
        (Array.isArray(controls) ? controls : []).forEach(function (control) {
            if (!control.checkbox || control.checkbox.checked !== true) return;
            var action = text(control.select && control.select.value).toLowerCase();
            map[control.value] = action === "receive" || action === "return" ? action : "none";
        });
        return JSON.stringify(map);
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

        itPerson = copy(itPerson);
        itPerson.description = "";
        itPerson.optionSource = "mesh-users";
        delete itPerson.defaultValue;

        var userStep = stepItem(item, "Jira Asset Protocol - User", "", [activeOnly, search, jiraUser]);
        var assetStep = stepItem(item, "Sprzęt do protokołu", "", [asset]);
        assetStep.fitOptionWidth = true;
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
                Promise.resolve(assetProvider(assetStep.variables[0], {}, assetStep)) :
                Promise.resolve(assetStep.variables[0].options || []);
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
                assetStep.variables[0].options = Array.isArray(optionsValue) ? optionsValue.slice() : [];
                var dialog = runStep(options, assetStep, selectedUser, "Next", null);
                var controls = actionControls(assetStep.variables[0].options);
                return dialog.then(function (assetValues) {
                    if (assetValues == null) return null;
                    assetValues.JiraAssetActionsJson = actionValues(controls);
                    var accumulated = Object.assign({}, selectedUser, assetValues);
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
        actionValues: actionValues,
        isProtocol: isProtocol,
        isCache: isCache,
        cacheItem: cacheItem,
        stepItem: stepItem
    };
    tools.__sirkJiraProtocolWizard = true;
}());
