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
        return ["select", "switch", "user", "asset", "assetmulti"].indexOf(kind) >= 0 ? kind : "text";
    }
    function allowCustom(item, variable) {
        var name = text(variable && variable.name).trim().toLowerCase();
        if (!name) return false;
        return (item && Array.isArray(item.extraHeaders) ? item.extraHeaders : []).some(function (header) {
            var match = /^SirkAllowCustom\s*:\s*(.+)$/i.exec(text(header).trim());
            if (!match) return false;
            return match[1].split(",").map(function (value) { return value.trim().toLowerCase(); }).indexOf(name) >= 0;
        });
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
        if (!select.value) {
            var selected = (Array.isArray(options) ? options : []).filter(function (option) {
                return option && typeof option === "object" && option.selected === true;
            })[0];
            if (selected) select.value = optionValue(selected);
        }
        if (!select.value && select.options.length && !placeholder) select.selectedIndex = 0;
    }
    function setChecklistOptions(host, control, options, single) {
        while (host && host.firstChild) host.removeChild(host.firstChild);
        var selected = text(control && control.value).split(/[;,|\r\n]+/).filter(Boolean);
        var fragment = host ? document.createDocumentFragment() : null;
        (Array.isArray(options) ? options : []).forEach(function (option, index) {
            if (!host) return;
            var value = optionValue(option);
            if (!value) return;
            var row = document.createElement("label");
            row.className = "mc-parameter-checklist-item";
            var box = document.createElement("input");
            box.type = single ? "radio" : "checkbox";
            if (single) box.name = control.name + "Option";
            box.value = value;
            box.checked = selected.indexOf(value) >= 0;
            if (box.checked) box.setAttribute("checked", "checked");
            box.id = host.id + "Option" + index;
            var label = document.createElement("span");
            label.textContent = optionLabel(option) || value;
            row.appendChild(box);
            row.appendChild(label);
            fragment.appendChild(row);
        });
        if (host && fragment) host.appendChild(fragment);
    }
    function setDatalistOptions(list, options) {
        while (list && list.firstChild) list.removeChild(list.firstChild);
        (Array.isArray(options) ? options : []).forEach(function (option) {
            if (!list) return;
            var node = document.createElement("option");
            node.value = optionValue(option);
            node.label = optionLabel(option) || node.value;
            list.appendChild(node);
        });
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
            if (records[index].control && records[index].control.type !== "hidden" && !records[index].control.disabled) return records[index].control;
            if (records[index].optionHost) {
                var option = records[index].optionHost.querySelector('input:not([disabled])');
                if (option) return option;
            }
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
        if (item && item.fitOptionWidth === true) content.classList.add("mc-parameter-dialog-fit-options");
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
            var customUser = kind === "user" && allowCustom(item, variable);
            var listMode = variable.listMode === true && (kind === "user" || kind === "select");
            var multiline = variable.multiline === true && kind === "text";
            var row = document.createElement("label");
            row.className = "mc-script-form-row mc-parameter-dialog-field";
            if (item && item.fitOptionWidth === true) row.classList.add("mc-parameter-dialog-fit-options");
            if (variable.inlineLabel === true) row.classList.add("mc-parameter-dialog-inline-label");
            var caption = document.createElement("span");
            caption.className = "mc-script-form-label";
            caption.textContent = (localized(variable, "label") || text(variable.name)) + (variable.required ? " *" : "");
            if (variable.hideLabel !== true && !(kind === "switch" && variable.inlineControl === true)) row.appendChild(caption);
            var useSelect = kind === "select" || kind === "asset" || (kind === "user" && !customUser);
            var control = document.createElement(multiline ? "textarea" : listMode ? "input" : useSelect ? "select" : "input");
            control.id = prefix + "Control" + index;
            control.name = text(variable.name);
            control.className = "mc-definition-input";
            var listId = "";
            var optionHostId = "";
            if (kind === "assetmulti" || listMode) {
                row.classList.add("mc-parameter-dialog-checklist-row");
                control.type = "hidden";
                control.value = defaultValue(variable);
                row.appendChild(control);
                var optionHost = document.createElement("div");
                optionHostId = prefix + "Checklist" + index;
                optionHost.id = optionHostId;
                optionHost.className = "mc-parameter-checklist";
                row.appendChild(optionHost);
                if ((kind === "assetmulti" && Array.isArray(variable.options)) || (listMode && kind === "select")) {
                    setChecklistOptions(optionHost, control, variable.options || [], listMode);
                }
            } else if (kind === "switch") {
                control.type = "checkbox";
                control.checked = checkedDefault(variable);
                if (control.checked) control.setAttribute("checked", "checked");
                row.appendChild(control);
                if (variable.inlineControl === true) {
                    row.classList.add("mc-parameter-dialog-inline-check");
                    if (variable.hideLabel !== true) row.appendChild(caption);
                }
            } else if (kind === "text" || customUser) {
                if (!multiline) control.type = "text";
                else control.rows = Math.max(3, Math.min(12, Number(variable.rows) || 5));
                control.value = defaultValue(variable);
                control.autocomplete = "off";
                if (customUser) {
                    listId = prefix + "Options" + index;
                    control.setAttribute("list", listId);
                }
                row.appendChild(control);
                if (customUser) {
                    var list = document.createElement("datalist");
                    list.id = listId;
                    row.appendChild(list);
                }
            } else {
                setOptions(control, variable.options || [], variable, kind === "user" || kind === "asset" ? "Loading…" : "");
                row.appendChild(control);
            }
            var help = localized(variable, "description") || text(variable.description || "");
            if (help) {
                var hint = document.createElement("span");
                hint.className = "mc-shared-muted";
                hint.textContent = help;
                row.appendChild(hint);
            }
            content.appendChild(row);
            definitions.push({ variable: variable, kind: kind, customUser: customUser, listMode: listMode, id: control.id, listId: listId, optionHostId: optionHostId });
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
                customUser: definition.customUser,
                listMode: definition.listMode,
                control: document.getElementById(definition.id),
                list: definition.listId ? document.getElementById(definition.listId) : null,
                optionHost: definition.optionHostId ? document.getElementById(definition.optionHostId) : null,
                allOptions: [],
                loading: false,
                loadFailed: false,
                loadSequence: 0
            };
        });
        var status = document.getElementById(built.statusId);
        var submit = document.getElementById("idx_dlgOkButton");
        var cancel = document.getElementById("idx_dlgCancelButton");
        var close = document.getElementById("id_dialogclose");
            if (records.some(function (record) { return !record.control || (record.customUser && !record.list) || ((record.kind === "assetmulti" || record.listMode) && !record.optionHost); }) || !status || !submit) {
            return Promise.reject(new Error("Native MeshCentral parameter dialog controls are unavailable."));
        }
        records.forEach(function (record) {
            if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.control === "function") window.MeshThemeAdapter.control(record.control);
        });

        var provider = options.resolveOptions === null ? null :
            (typeof options.resolveOptions === "function" ? options.resolveOptions : sharedOptionProvider);
        var trigger = options.trigger || document.activeElement;
        var primaryLabel = text(options.primaryLabel || (item.requiresApproval ? "Request" : "Run"));
        var originalSubmitText = readButtonText(submit);
        var originalSubmitDisabled = !!submit.disabled;
        var modernModal = document.getElementById("xxAddAgentModal");
        var submitting = false;
        var submittedValues = null;
        var valuesChangeSequence = 0;
        var valuesChangePending = false;
        var valuesChangeFailed = false;
        var settled = false;
        var cleaned = false;

        return new Promise(function (resolve) {
            function restoreFocus() {
                if (trigger && trigger.isConnected !== false && typeof trigger.focus === "function") trigger.focus();
            }
            function refreshSubmitState() {
                submit.disabled = submitting || valuesChangePending || valuesChangeFailed || records.some(function (record) {
                    return !record.customUser && (record.loading || (record.loadFailed && record.variable.required));
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
                    if (record.kind === "user") {
                        if (record.customUser && record.variable.liveInput === true) record.control.removeEventListener("input", onUserChanged);
                        else record.control.removeEventListener("change", onUserChanged);
                    }
                    if (record.optionHost) {
                        record.optionHost.removeEventListener("change", onChecklistChanged);
                        record.optionHost.removeEventListener("dblclick", onOptionDoubleClick);
                    }
                    record.control.removeEventListener("input", onFilterChanged);
                    record.control.removeEventListener("change", onFilterChanged);
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
                if (!settled) finish(submitting ? submittedValues : null);
                cleanup();
            }
            function loadDynamic(record) {
                if ((record.kind !== "user" && record.kind !== "asset" && record.kind !== "assetmulti") || typeof provider !== "function") {
                    if (record.customUser) setDatalistOptions(record.list, record.variable.options || []);
                    else if (record.kind === "user" || record.kind === "asset") {
                        setOptions(record.control, record.variable.options || [], record.variable, record.variable.required ? "Select…" : "None");
                    }
                    return Promise.resolve();
                }
                var requestSequence = ++record.loadSequence;
                if (record.customUser) {
                    return Promise.resolve(provider(record.variable, currentValues(records), item)).then(function (optionsValue) {
                        if (cleaned || requestSequence !== record.loadSequence) return;
                        setDatalistOptions(record.list, optionsValue);
                    }).catch(function (error) {
                        if (cleaned || requestSequence !== record.loadSequence) return;
                        setDatalistOptions(record.list, []);
                        setStatus(status, error && error.message || String(error), false);
                    });
                }
                record.loading = true;
                record.loadFailed = false;
                record.control.disabled = true;
                if (record.kind === "assetmulti" || record.listMode) setChecklistOptions(record.optionHost, record.control, [], record.listMode);
                else setOptions(record.control, [], record.variable, "Loading…");
                refreshSubmitState();
                return Promise.resolve(provider(record.variable, currentValues(records), item)).then(function (optionsValue) {
                    if (cleaned || requestSequence !== record.loadSequence) return;
                    record.loading = false;
                    record.loadFailed = false;
                    record.control.disabled = false;
                    record.allOptions = Array.isArray(optionsValue) ? optionsValue.slice() : [];
                    if (record.kind === "assetmulti" || record.listMode) setChecklistOptions(record.optionHost, record.control, record.allOptions, record.listMode);
                    else applyUserFilter(record);
                    refreshSubmitState();
                }).catch(function (error) {
                    if (cleaned || requestSequence !== record.loadSequence) return;
                    record.loading = false;
                    record.loadFailed = true;
                    record.control.disabled = true;
                    if (record.kind === "assetmulti" || record.listMode) setChecklistOptions(record.optionHost, record.control, [], record.listMode);
                    else setOptions(record.control, [], record.variable, "Unavailable");
                    setStatus(status, error && error.message || String(error), true);
                    refreshSubmitState();
                });
            }
            function valueRecord(name) {
                return records.filter(function (record) { return text(record.variable && record.variable.name) === text(name); })[0] || null;
            }
            function notifyValuesChanged(record) {
                if (typeof options.onValuesChanged !== "function") return null;
                var sequence = ++valuesChangeSequence;
                var operation;
                try { operation = options.onValuesChanged(currentValues(records), record && record.variable, item); }
                catch (error) { operation = Promise.reject(error); }
                if (!operation || typeof operation.then !== "function") return null;
                valuesChangePending = true;
                valuesChangeFailed = false;
                setStatus(status, text(options.valuesChangePendingMessage || "Loading..."), false);
                refreshSubmitState();
                return Promise.resolve(operation).then(function (value) {
                    if (cleaned || sequence !== valuesChangeSequence) return value;
                    valuesChangePending = false;
                    valuesChangeFailed = false;
                    setStatus(status, "", false);
                    refreshSubmitState();
                    return value;
                }).catch(function (error) {
                    if (cleaned || sequence !== valuesChangeSequence) return;
                    valuesChangePending = false;
                    valuesChangeFailed = true;
                    setStatus(status, error && error.message || String(error), true);
                    refreshSubmitState();
                });
            }
            function applyUserFilter(record) {
                if (!record || record.kind !== "user" || record.customUser || (!record.variable.searchVariable && !record.variable.activeOnlyVariable)) {
                    if (record && record.kind !== "assetmulti" && !record.listMode) setOptions(record.control, record.allOptions, record.variable, record.variable.required ? "Select…" : "None");
                    return;
                }
                var searchRecord = valueRecord(record.variable.searchVariable);
                var activeRecord = valueRecord(record.variable.activeOnlyVariable);
                var query = text(searchRecord && searchRecord.control.value).trim().toLowerCase();
                var activeOnly = !activeRecord || activeRecord.control.checked;
                var filtered = record.allOptions.filter(function (option) {
                    if (activeOnly && option && typeof option === "object" && option.active === false) return false;
                    return !query || (optionLabel(option) + " " + optionValue(option)).toLowerCase().indexOf(query) >= 0;
                });
                var previous = record.control.value;
                if (record.listMode) setChecklistOptions(record.optionHost, record.control, filtered, true);
                else setOptions(record.control, filtered, record.variable, record.variable.required ? "Select…" : "None");
                if (previous && filtered.some(function (option) { return optionValue(option) === previous; })) record.control.value = previous;
            }
            function onFilterChanged(event) {
                var changedName = text(event && event.currentTarget && event.currentTarget.name);
                records.filter(function (record) {
                    return record.kind === "user" && (text(record.variable.searchVariable) === changedName || text(record.variable.activeOnlyVariable) === changedName);
                }).forEach(applyUserFilter);
            }
            function onChecklistChanged(event) {
                var host = event && event.currentTarget;
                var record = records.filter(function (candidate) { return candidate.optionHost === host; })[0];
                if (!record) return;
                record.control.value = Array.prototype.filter.call(host.querySelectorAll('input[type="checkbox"],input[type="radio"]'), function (box) {
                    return box.checked;
                }).map(function (box) { return box.value; }).join(";");
                setStatus(status, "", false);
                notifyValuesChanged(record);
            }
            function onOptionDoubleClick(event) {
                var host = event && event.currentTarget;
                var record = records.filter(function (candidate) { return candidate.optionHost === host; })[0];
                var option = event && event.target && event.target.closest ? event.target.closest("label") : null;
                var box = option && option.querySelector ? option.querySelector('input[type="radio"]') : null;
                if (!record || !box || record.variable.submitOnDoubleClick !== true) return;
                box.checked = true;
                record.control.value = box.value;
                var pending = notifyValuesChanged(record);
                if (pending) pending.then(function () { if (!cleaned && !valuesChangeFailed) submitRequest(); });
                else submitRequest();
            }
            function onUserChanged(event) {
                if (!event || !event.currentTarget) return;
                var userRecord = records.filter(function (record) {
                    return record.kind === "user" && record.control === event.currentTarget;
                })[0] || null;
                notifyValuesChanged(userRecord);
                records.filter(function (record) {
                    return (record.kind === "asset" || record.kind === "assetmulti") && assetDependsOnUser(records, record, userRecord);
                }).forEach(function (record) { loadDynamic(record); });
            }
            function submitRequest() {
                if (submitting || settled) return false;
                var values = validate(records, status);
                if (!values) return false;
                submitting = true;
                submittedValues = values;
                refreshSubmitState();
                if (manager.mode === "classic") {
                    finish(values);
                    cleanup();
                }
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
                if (record.customUser && record.variable.liveInput === true) record.control.addEventListener("input", onUserChanged);
                else record.control.addEventListener("change", onUserChanged);
            });
            records.forEach(function (record) {
                if (record.optionHost) {
                    record.optionHost.addEventListener("change", onChecklistChanged);
                    if (record.variable.submitOnDoubleClick === true) record.optionHost.addEventListener("dblclick", onOptionDoubleClick);
                }
                if (record.kind === "text") record.control.addEventListener("input", onFilterChanged);
                else if (record.kind === "switch") record.control.addEventListener("change", onFilterChanged);
            });
            if (cancel) cancel.addEventListener("click", onCancel, true);
            if (close) close.addEventListener("click", onCancel, true);

            if (manager.mode === "modern") {
                manager.show("xxAddAgentModal", "idx_dlgOkButton", submitRequest);
                if (modernModal) modernModal.addEventListener("hidden.bs.modal", onHidden);
                refreshSubmitState();
            } else submit.addEventListener("click", onClassicSubmit, true);

            Promise.all(records.filter(function (record) {
                return record.kind === "user" || record.kind === "asset" || record.kind === "assetmulti";
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

    function openConfirmationDialog(options) {
        options = options || {};
        var manager = hostDialogManager();
        if (!manager) return Promise.reject(new Error("Native MeshCentral dialog manager is unavailable."));

        var content = document.createElement("div");
        content.className = "mc-parameter-dialog-content";
        var message = document.createElement("p");
        message.className = "mc-shared-muted";
        message.textContent = text(options.message || "Confirm execution.");
        content.appendChild(message);

        var title = text(options.title || "Confirm execution");
        if (manager.mode === "modern") manager.setContent("xxAddAgent", title, content.innerHTML);
        else manager.show(2, title, 3, null, content.innerHTML);

        var submit = document.getElementById("idx_dlgOkButton");
        var cancel = document.getElementById("idx_dlgCancelButton");
        var close = document.getElementById("id_dialogclose");
        if (!submit) return Promise.reject(new Error("Native MeshCentral confirmation controls are unavailable."));

        var trigger = options.trigger || document.activeElement;
        var primaryLabel = text(options.primaryLabel || "Run");
        var originalSubmitText = readButtonText(submit);
        var originalSubmitDisabled = !!submit.disabled;
        var modernModal = document.getElementById("xxAddAgentModal");
        var settled = false;
        var cleaned = false;

        return new Promise(function (resolve) {
            function restoreFocus() {
                if (trigger && trigger.isConnected !== false && typeof trigger.focus === "function") trigger.focus();
            }
            function cleanup() {
                if (cleaned) return;
                cleaned = true;
                if (manager.mode === "classic") submit.removeEventListener("click", onAccept, true);
                if (cancel) cancel.removeEventListener("click", onCancel, true);
                if (close) close.removeEventListener("click", onCancel, true);
                if (modernModal) modernModal.removeEventListener("hidden.bs.modal", onHidden);
                writeButtonText(submit, originalSubmitText);
                submit.disabled = originalSubmitDisabled;
                restoreFocus();
            }
            function finish(value) {
                if (settled) return;
                settled = true;
                resolve(value);
            }
            function onAccept(event) {
                if (event && manager.mode === "classic") {
                    if (event.preventDefault) event.preventDefault();
                    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                    else if (event.stopPropagation) event.stopPropagation();
                }
                finish(true);
                if (manager.mode === "classic") cleanup();
                return true;
            }
            function onCancel() {
                finish(false);
                cleanup();
            }
            function onHidden() {
                if (!settled) finish(false);
                cleanup();
            }

            writeButtonText(submit, primaryLabel);
            submit.disabled = false;
            if (cancel) cancel.addEventListener("click", onCancel, true);
            if (close) close.addEventListener("click", onCancel, true);

            if (manager.mode === "modern") {
                if (modernModal) modernModal.addEventListener("hidden.bs.modal", onHidden);
                manager.show("xxAddAgentModal", "idx_dlgOkButton", onAccept);
            } else submit.addEventListener("click", onAccept, true);
        });
    }

    tools.setParameterOptionProvider = function (provider) {
        sharedOptionProvider = typeof provider === "function" ? provider : null;
    };
    tools.openParameterDialog = openParameterDialog;
    tools.openConfirmationDialog = openConfirmationDialog;
    tools.parameterDialogContract = {
        allowCustom: allowCustom,
        assetDependsOnUser: assetDependsOnUser,
        assetUserDependency: assetUserDependency,
        controlKind: controlKind,
        currentValues: currentValues,
        optionProvider: function () { return sharedOptionProvider; },
        validate: validate
    };

    var createTools = tools.create;
    if (typeof createTools === "function") {
        tools.create = function (options) {
            var instance = createTools(options);
            if (instance && typeof instance === "object") {
                instance.openParameterDialog = function (dialogOptions) {
                    return tools.openParameterDialog(dialogOptions);
                };
                instance.openConfirmationDialog = function (dialogOptions) {
                    return tools.openConfirmationDialog(dialogOptions);
                };
                instance.setParameterOptionProvider = function (provider) {
                    return tools.setParameterOptionProvider(provider);
                };
            }
            return instance;
        };
    }
}());
