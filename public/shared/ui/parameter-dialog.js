(function () {
    "use strict";

    var tools = window.SharedScriptTools;
    if (!tools) throw new Error("SharedScriptTools must load before the parameter dialog.");

    var dialogSequence = 0;
    var sharedOptionProvider = null;

    function text(value) { return String(value == null ? "" : value); }
    function language() {
        try { return window.localStorage.getItem("sirkPortal.language") === "en" ? "en" : "pl"; }
        catch (error) { return document.documentElement.lang === "en" ? "en" : "pl"; }
    }
    function localized(item, field) {
        var locale = item && item.locales && item.locales[language()];
        return text(locale && locale[field] || item && item[field] || "");
    }
    function controlKind(variable) {
        var kind = text(variable && variable.control || "text").trim().toLowerCase();
        return ["select", "switch", "user", "asset"].indexOf(kind) >= 0 ? kind : "text";
    }
    function defaultValue(variable) {
        return text(variable && variable.defaultValue != null ? variable.defaultValue : "");
    }
    function checkedDefault(variable) {
        return /^(1|true|yes|tak|on)$/i.test(defaultValue(variable));
    }
    function optionValue(option) {
        if (option && typeof option === "object") return text(option.value == null ? option.id == null ? "" : option.id : option.value);
        return text(option);
    }
    function optionLabel(option) {
        if (option && typeof option === "object") return localized(option, "label") || text(option.name || option.value || option.id || "");
        return text(option);
    }
    function hostDialogManager() {
        var modern = typeof window.setModalContent === "function" && typeof window.showModal === "function" &&
            document.getElementById("xxAddAgentModal") && document.getElementById("xxAddAgentModalConf") && document.getElementById("dialog2");
        if (modern) return { mode: "modern", setContent: window.setModalContent, show: window.showModal };
        var classicSetDialog = typeof window.setDialogMode === "function" ? window.setDialogMode :
            (typeof setDialogMode === "function" ? setDialogMode : null);
        var classic = classicSetDialog && document.getElementById("dialog") && document.getElementById("id_dialogOptions");
        if (classic) return { mode: "classic", show: classicSetDialog };
        return null;
    }
    function readButtonText(button) {
        return text(button && (button.value != null ? button.value : button.textContent));
    }
    function writeButtonText(button, value) {
        if (!button) return;
        if (button.value != null) button.value = value;
        else button.textContent = value;
    }
    function appendOption(select, option) {
        var node = document.createElement("option");
        node.value = optionValue(option);
        node.textContent = optionLabel(option) || node.value;
        select.appendChild(node);
    }
    function setOptions(select, options, variable, placeholder) {
        while (select.firstChild) select.removeChild(select.firstChild);
        if (placeholder) {
            var empty = document.createElement("option");
            empty.value = "";
            empty.textContent = placeholder;
            select.appendChild(empty);
        }
        (Array.isArray(options) ? options : []).forEach(function (option) { appendOption(select, option); });
        var preferred = defaultValue(variable);
        if (preferred) select.value = preferred;
        if (!select.value && select.options.length && !placeholder) select.selectedIndex = 0;
    }
    function currentValues(records) {
        var values = {};
        records.forEach(function (record) {
            values[record.variable.name] = record.kind === "switch" ? record.control.checked : record.control.value;
        });
        return values;
    }
    function assetUserDependency(records, assetRecord) {
        records = Array.isArray(records) ? records : [];
        var explicit = text(assetRecord && assetRecord.variable && assetRecord.variable.dependsOn).trim();
        if (explicit) {
            return records.filter(function (record) {
                return record.kind === "user" && text(record.variable && record.variable.name) === explicit;
            })[0] || null;
        }
        var assetIndex = records.indexOf(assetRecord);
        for (var index = assetIndex - 1; index >= 0; index--) {
            if (records[index] && records[index].kind === "user") return records[index];
        }
        return null;
    }
    function assetDependsOnUser(records, assetRecord, userRecord) {
        return !!userRecord && assetUserDependency(records, assetRecord) === userRecord;
    }
    function firstFocusable(records) {
        for (var index = 0; index < records.length; index++) {
            if (records[index].control && !records[index].control.disabled) return records[index].control;
        }
        return null;
    }
    function setStatus(status, message, error) {
        if (!status) return;
        status.className = "mc-parameter-dialog-status" + (error ? " mc-shared-error" : "");
        status.textContent = text(message);
    }
    function validate(records, status) {
        records.forEach(function (record) { record.control.removeAttribute("aria-invalid"); });
        for (var index = 0; index < records.length; index++) {
            var record = records[index];
            if (!record.variable.required || record.kind === "switch") continue;
            var value = text(record.control.value).trim();
            if (!value) {
                record.control.setAttribute("aria-invalid", "true");
                setStatus(status, (localized(record.variable, "label") || record.variable.name) + " is required.", true);
                if (typeof record.control.focus === "function") record.control.focus();
                return null;
            }
        }
        setStatus(status, "", false);
        return currentValues(records);
    }

    function buildContent(item, prefix) {
        var content = document.createElement("div");
        content.className = "mc-parameter-dialog-content";
        var description = localized(item, "description") || text(item && item.description);
        if (description) {
            var intro = document.createElement("p");
            intro.className = "mc-shared-muted";
            intro.textContent = description;
            content.appendChild(intro);
        }
        var definitions = [];
        (item.variables || []).forEach(function (variable, index) {
            var kind = controlKind(variable);
            var row = document.createElement("label");
            row.className = "mc-script-form-row mc-parameter-dialog-field";
            var caption = document.createElement("span");
            caption.className = "mc-script-form-label";
            caption.textContent = (localized(variable, "label") || text(variable.name)) + (variable.required ? " *" : "");
            row.appendChild(caption);
            var control = document.createElement(kind === "select" || kind === "user" || kind === "asset" ? "select" : "input");
            control.id = prefix + "Control" + index;
            control.name = text(variable.name);
            control.className = "mc-definition-input";
            if (kind === "switch") {
                control.type = "checkbox";
                control.checked = checkedDefault(variable);
            } else if (kind === "text") {
                control.type = "text";
                control.value = defaultValue(variable);
                control.autocomplete = "off";
            } else {
                setOptions(control, variable.options || [], variable, kind === "user" || kind === "asset" ? "Loading…" : "");
            }
            row.appendChild(control);
            var help = localized(variable, "description") || text(variable.description || "");
            if (help) {
                var hint = document.createElement("span");
                hint.className = "mc-shared-muted";
                hint.textContent = help;
                row.appendChild(hint);
            }
            content.appendChild(row);
            definitions.push({ variable: variable, kind: kind, id: control.id });
        });
        var status = document.createElement("div");
        status.id = prefix + "Status";
        status.className = "mc-parameter-dialog-status";
        status.setAttribute("aria-live", "polite");
        content.appendChild(status);
        return { element: content, definitions: definitions, statusId: status.id };
    }

    function openParameterDialog(options) {
        options = options || {};
        var item = options.item || {};
        if (!Array.isArray(item.variables) || !item.variables.length) return Promise.resolve({});
        var manager = hostDialogManager();
        if (!manager) return Promise.reject(new Error("Native MeshCentral dialog manager is unavailable."));

        var sequence = ++dialogSequence;
        var prefix = "SirkParameterDialog" + sequence;
        var built = buildContent(item, prefix);
        var title = localized(item, "label") || text(item.label || item.name || "Parameters");
        if (manager.mode === "modern") manager.setContent("xxAddAgent", title, built.element.innerHTML);
        else manager.show(2, title, 3, null, built.element.innerHTML);

        var records = built.definitions.map(function (definition) {
            return {
                variable: definition.variable,
                kind: definition.kind,
                control: document.getElementById(definition.id),
                loading: false,
                loadFailed: false,
                loadSequence: 0
            };
        });
        var status = document.getElementById(built.statusId);
        var submit = document.getElementById("idx_dlgOkButton");
        var cancel = document.getElementById("idx_dlgCancelButton");
        var close = document.getElementById("id_dialogclose");
        if (records.some(function (record) { return !record.control; }) || !status || !submit) {
            return Promise.reject(new Error("Native MeshCentral parameter dialog controls are unavailable."));
        }
        records.forEach(function (record) {
            if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.control === "function") window.MeshThemeAdapter.control(record.control);
        });

        var provider = typeof options.resolveOptions === "function" ? options.resolveOptions : sharedOptionProvider;
        var trigger = options.trigger || document.activeElement;
        var primaryLabel = text(options.primaryLabel || (item.requiresApproval ? "Request" : "Run"));
        var originalSubmitText = readButtonText(submit);
        var originalSubmitDisabled = !!submit.disabled;
        var modernModal = document.getElementById("xxAddAgentModal");
        var submitting = false;
        var settled = false;
        var cleaned = false;

        return new Promise(function (resolve, reject) {
            function restoreFocus() {
                if (trigger && trigger.isConnected !== false && typeof trigger.focus === "function") trigger.focus();
            }
            function refreshSubmitState() {
                submit.disabled = submitting || records.some(function (record) {
                    return record.loading || (record.loadFailed && record.variable.required);
                });
            }
            function cleanup() {
                if (cleaned) return;
                cleaned = true;
                if (manager.mode === "classic") submit.removeEventListener("click", onClassicSubmit, true);
                if (cancel) cancel.removeEventListener("click", onCancel, true);
                if (close) close.removeEventListener("click", onCancel, true);
                if (modernModal) modernModal.removeEventListener("hidden.bs.modal", onHidden);
                records.forEach(function (record) {
                    if (record.kind === "user") record.control.removeEventListener("change", onUserChanged);
                });
                writeButtonText(submit, originalSubmitText);
                submit.disabled = originalSubmitDisabled;
                restoreFocus();
            }
            function finish(value) {
                if (settled) return;
                settled = true;
                resolve(value);
            }
            function onCancel() {
                if (!settled) finish(null);
                cleanup();
            }
            function onHidden() {
                if (!settled) finish(null);
                cleanup();
            }
            function loadDynamic(record) {
                if ((record.kind !== "user" && record.kind !== "asset") || typeof provider !== "function") {
                    if (record.kind === "user" || record.kind === "asset") {
                        setOptions(record.control, record.variable.options || [], record.variable, record.variable.required ? "Select…" : "None");
                    }
                    return Promise.resolve();
                }
                var requestSequence = ++record.loadSequence;
                record.loading = true;
                record.loadFailed = false;
                record.control.disabled = true;
                setOptions(record.control, [], record.variable, "Loading…");
                refreshSubmitState();
                return Promise.resolve(provider(record.variable, currentValues(records), item)).then(function (optionsValue) {
                    if (cleaned || requestSequence !== record.loadSequence) return;
                    record.loading = false;
                    record.loadFailed = false;
                    record.control.disabled = false;
                    setOptions(record.control, optionsValue, record.variable, record.variable.required ? "Select…" : "None");
                    refreshSubmitState();
                }).catch(function (error) {
                    if (cleaned || requestSequence !== record.loadSequence) return;
                    record.loading = false;
                    record.loadFailed = true;
                    record.control.disabled = true;
                    setOptions(record.control, [], record.variable, "Unavailable");
                    setStatus(status, error && error.message || String(error), true);
                    refreshSubmitState();
                });
            }
            function onUserChanged(event) {
                if (!event || !event.currentTarget) return;
                var userRecord = records.filter(function (record) {
                    return record.kind === "user" && record.control === event.currentTarget;
                })[0] || null;
                records.filter(function (record) {
                    return record.kind === "asset" && assetDependsOnUser(records, record, userRecord);
                }).forEach(function (record) { loadDynamic(record); });
            }
            function submitRequest() {
                if (submitting || settled) return false;
                var values = validate(records, status);
                if (!values) return false;
                submitting = true;
                refreshSubmitState();
                finish(values);
                if (manager.mode === "classic") cleanup();
                return true;
            }
            function onClassicSubmit(event) {
                if (submitRequest()) return;
                if (event) {
                    if (event.preventDefault) event.preventDefault();
                    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                    else if (event.stopPropagation) event.stopPropagation();
                }
            }

            writeButtonText(submit, primaryLabel);
            refreshSubmitState();
            records.filter(function (record) { return record.kind === "user"; }).forEach(function (record) {
                record.control.addEventListener("change", onUserChanged);
            });
            if (cancel) cancel.addEventListener("click", onCancel, true);
            if (close) close.addEventListener("click", onCancel, true);

            if (manager.mode === "modern") {
                if (modernModal) modernModal.addEventListener("hidden.bs.modal", onHidden);
                manager.show("xxAddAgentModal", "idx_dlgOkButton", submitRequest);
            } else submit.addEventListener("click", onClassicSubmit, true);

            Promise.all(records.filter(function (record) {
                return record.kind === "user" || record.kind === "asset";
            }).map(loadDynamic)).then(function () {
                if (cleaned) return;
                var focus = firstFocusable(records);
                if (focus && typeof focus.focus === "function") focus.focus();
            }).catch(function (error) {
                if (!cleaned) {
                    setStatus(status, error && error.message || String(error), true);
                    refreshSubmitState();
                }
            });
        });
    }

    tools.setParameterOptionProvider = function (provider) {
        sharedOptionProvider = typeof provider === "function" ? provider : null;
    };
    tools.openParameterDialog = openParameterDialog;
    tools.parameterDialogContract = {
        assetDependsOnUser: assetDependsOnUser,
        assetUserDependency: assetUserDependency,
        controlKind: controlKind,
        currentValues: currentValues,
        validate: validate
    };
}());
