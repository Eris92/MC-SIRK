(function () {
    "use strict";

    function text(value) { return String(value == null ? "" : value); }

    function copyText(value) {
        value = text(value);
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function" && window.isSecureContext) {
            return navigator.clipboard.writeText(value);
        }
        return new Promise(function (resolve, reject) {
            var field = document.createElement("textarea");
            field.value = value;
            field.readOnly = true;
            field.style.position = "fixed";
            field.style.left = "-10000px";
            document.body.appendChild(field);
            field.focus(); field.select();
            try {
                if (!document.execCommand("copy")) throw new Error("Copy failed.");
                resolve();
            } catch (error) { reject(error); }
            finally { field.remove(); }
        });
    }

    function uniqueStrings(values) {
        var seen = Object.create(null);
        return (Array.isArray(values) ? values : []).map(text).filter(function (item) {
            if (!item || seen[item]) return false;
            seen[item] = true; return true;
        });
    }

    function findRootAndParents(tree, scriptPath) {
        var result = { root: "", parents: [] };
        var roots = window.SharedDirectoryTree.roots(tree);
        function walk(node, parents) {
            if (!node) return false;
            if (node.type === "script") return node.path === scriptPath;
            var next = parents.slice();
            if (node.path && node.path !== "__root__") next.push(node.path);
            var children = node.children || [];
            for (var i = 0; i < children.length; i++) {
                if (walk(children[i], next)) { result.parents = next; return true; }
            }
            return false;
        }
        for (var i = 0; i < roots.length; i++) {
            if (walk(roots[i], [])) { result.root = roots[i].path; break; }
        }
        return result;
    }

    function formRow(labelText, control) {
        var row = document.createElement("label");
        row.className = "mc-script-form-row";
        var label = document.createElement("span");
        label.className = "mc-script-form-label";
        label.textContent = labelText;
        row.appendChild(label); row.appendChild(control);
        return row;
    }

    function nodeName(id) {
        var stores = [window.nodes, window.meshes, window.devices];
        for (var i = 0; i < stores.length; i++) {
            var item = stores[i] && stores[i][id];
            if (item && (item.name || item.rname || item.host)) return item.name || item.rname || item.host;
        }
        return id;
    }

    function selectedDevices(currentNodeId) {
        var result = [], seen = Object.create(null);
        function add(id, name) {
            id = text(id).trim();
            if (!id || seen[id]) return;
            if (id.indexOf("node/") < 0 && id.indexOf("node//") < 0) return;
            seen[id] = true;
            result.push({ id: id, name: text(name || nodeName(id)) });
        }
        function scan(value) {
            if (!value) return;
            if (typeof value === "string") { add(value); return; }
            if (Array.isArray(value)) { value.forEach(scan); return; }
            if (typeof value !== "object") return;
            var id = value.nodeId || value.nodeid || value._id || value.id;
            if (id) add(id, value.name || value.rname || value.host);
            Object.keys(value).forEach(function (key) {
                if (key.indexOf("node/") >= 0) add(key, value[key] && value[key].name);
            });
        }
        [
            "selectedNodes", "selectedNodeIds", "selectedDevices",
            "multiSelectedNodes", "checkedNodes", "deviceSelection",
            "selectedDeviceIds", "multiSelectedDevices"
        ].forEach(function (name) { try { scan(window[name]); } catch (error) {} });

        var selector = [
            'input[type="checkbox"]:checked[data-nodeid]',
            'input[type="checkbox"]:checked[data-node-id]',
            'input[type="checkbox"]:checked[value*="node/"]',
            '[aria-selected="true"][data-nodeid]',
            '[aria-selected="true"][data-node-id]',
            '.selected[data-nodeid]', '.selected[data-node-id]'
        ].join(",");
        Array.prototype.forEach.call(document.querySelectorAll(selector), function (element) {
            var row = element.closest && element.closest("[data-nodeid],[data-node-id]");
            var id = element.getAttribute("data-nodeid") || element.getAttribute("data-node-id") ||
                (row && (row.getAttribute("data-nodeid") || row.getAttribute("data-node-id"))) ||
                element.value;
            var name = element.getAttribute("data-nodename") || element.getAttribute("data-node-name") ||
                (row && (row.getAttribute("data-nodename") || row.getAttribute("data-node-name")));
            add(id, name);
        });
        if (!result.length && currentNodeId) add(currentNodeId);
        return result;
    }

    function element(tag, className, value) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (value != null) node.textContent = value;
        return node;
    }

    function field(labelText, control) {
        var row = element("label", "mc-definition-field");
        row.appendChild(element("span", "mc-definition-label", labelText));
        row.appendChild(control);
        return row;
    }

    function splitDirective(item) {
        item = item || {};
        function splitRaw(raw) {
            var pieces = text(raw).trim().split(",");
            var name = text(pieces.shift()).trim().replace(/^[\s$%]+/, "");
            return { name: name, value: pieces.join(",").trim() };
        }
        var fallback = splitRaw(item.value);
        var values = item.values && typeof item.values === "object" ? item.values : {};
        return {
            directive: text(item.directive || "Variable"),
            name: text(item.name || fallback.name),
            pl: text(values.pl || fallback.value),
            en: text(values.en || fallback.value)
        };
    }

    function directiveValue(row) {
        var name = text(row.name.value).trim().replace(/^[\s$%]+/, "");
        if (!name) return null;
        return {
            directive: row.type.value,
            name: name,
            values: {
                pl: text(row.pl.value).trim(),
                en: text(row.en.value).trim()
            }
        };
    }

    function createSelect(values, selected) {
        var select = element("select", "mc-definition-input mc-definition-type");
        values.forEach(function (value) {
            var option = element("option", "", value);
            option.value = value;
            option.selected = value === selected;
            select.appendChild(option);
        });
        return select;
    }

    function createDirectiveTable(title, rows, types, emptyType) {
        var section = element("section", "mc-definition-section");
        var header = element("div", "mc-definition-section-header");
        header.appendChild(element("h4", "", title));
        var headerActions = element("div", "mc-definition-section-actions");
        var add = element("button", "btn btn-secondary btn-sm", "Add variable");
        add.type = "button";
        headerActions.appendChild(add);
        header.appendChild(headerActions);
        section.appendChild(header);

        var wrapper = element("div", "mc-definition-table-wrap");
        var table = element("table", "style1 mc-definition-table");
        var head = table.createTHead().insertRow();
        ["Type", "Variable name", "PL — label | description | options", "EN — label | description | options", ""].forEach(function (name) {
            head.appendChild(element("th", "", name));
        });
        var body = table.createTBody();
        wrapper.appendChild(table);
        section.appendChild(wrapper);

        var controls = [];

        function addRow(value) {
            value = value || { directive: emptyType, name: "", pl: "", en: "" };
            var tr = body.insertRow();
            var type = createSelect(types, types.indexOf(value.directive) >= 0 ? value.directive : emptyType);
            var name = element("input", "mc-definition-input");
            name.type = "text";
            name.value = value.name || "";
            name.placeholder = "ApiToken";
            var pl = element("input", "mc-definition-input");
            pl.type = "text";
            pl.value = value.pl || "";
            pl.placeholder = "Polska nazwa | Polski opis";
            var en = element("input", "mc-definition-input");
            en.type = "text";
            en.value = value.en || "";
            en.placeholder = "English name | English description";
            var remove = element("button", "btn btn-secondary btn-sm mc-definition-remove", "×");
            remove.type = "button";
            tr.insertCell().appendChild(type);
            tr.insertCell().appendChild(name);
            tr.insertCell().appendChild(pl);
            tr.insertCell().appendChild(en);
            tr.insertCell().appendChild(remove);
            var record = { row: tr, type: type, name: name, pl: pl, en: en };
            controls.push(record);
            remove.onclick = function () {
                var index = controls.indexOf(record);
                if (index >= 0) controls.splice(index, 1);
                tr.remove();
            };
            return record;
        }

        (rows || []).map(splitDirective).forEach(addRow);
        add.onclick = function () { addRow(); };

        return {
            element: section,
            headerActions: headerActions,
            addRow: addRow,
            names: function () {
                return controls.map(function (row) {
                    return text(row.name.value).trim().replace(/^[\s$%]+/, "").toLowerCase();
                }).filter(Boolean);
            },
            values: function () {
                return controls.map(function (row) {
                    return directiveValue(row);
                }).filter(Boolean);
            }
        };
    }

    function detectExternalVariables(sourceText) {
        var source = text(sourceText);
        var assigned = Object.create(null);
        var referenced = Object.create(null);
        var excluded = {
            args: true, error: true, false: true, home: true, host: true, input: true,
            matches: true, myinvocation: true, null: true, pid: true, profile: true,
            psboundparameters: true, pscmdlet: true, pscommandpath: true, psitem: true,
            psscriptroot: true, pwd: true, shellid: true, this: true, true: true,
            _: true, env: true, foreach: true, switch: true, executioncontext: true,
            lastexitcode: true, nestedpromptlevel: true, ofS: true
        };

        source.split(/\r?\n/).forEach(function (line) {
            var code = line.replace(/#.*$/, "");
            var assignment = code.match(/^\s*\$([A-Za-z_][A-Za-z0-9_]*)\s*(?:\[[^\]]+\]\s*)?(?:=|\+=|-=|\*=|\/=)/);
            if (assignment) assigned[assignment[1].toLowerCase()] = true;
            var match;
            var pattern = /\$([A-Za-z_][A-Za-z0-9_]*)/g;
            while ((match = pattern.exec(code))) {
                referenced[match[1].toLowerCase()] = match[1];
            }
        });

        return Object.keys(referenced).filter(function (key) {
            return !assigned[key] && !excluded[key];
        }).map(function (key) {
            return referenced[key];
        }).sort(function (a, b) {
            return a.localeCompare(b);
        });
    }

    function createSystemCredentialsSection(state) {
        state = state || { profiles: [] };
        var section = element("section", "mc-definition-section mc-definition-system-credentials");
        section.appendChild(element("h4", "", "Credentials / secrets - System"));
        section.appendChild(element(
            "div",
            "mc-shared-muted mc-system-credentials-description",
            "Use credentials configured globally in SirkPlatform. Secrets remain encrypted and are not copied into the script."
        ));
        var list = element("div", "mc-system-credentials-list");
        var boxes = [];
        var profiles = Array.isArray(state.profiles) ? state.profiles : [];

        profiles.forEach(function (profile) {
            var label = element("label", "mc-system-credential-item");
            var box = element("input");
            box.type = "checkbox";
            box.value = profile.name;
            box.checked = profile.selected === true;
            box.disabled = profile.configured !== true;
            label.appendChild(box);
            label.appendChild(element("span", "mc-system-credential-name", profile.label || profile.name));
            label.appendChild(element(
                "span",
                profile.configured ? "mc-system-credential-configured" : "mc-system-credential-unavailable",
                profile.configured ? "Configured" : "Not configured globally"
            ));
            list.appendChild(label);
            boxes.push(box);
        });

        if (!profiles.length) {
            list.appendChild(element("div", "mc-shared-muted", "No global integration profiles are available."));
        }
        section.appendChild(list);
        return {
            element: section,
            selected: function () {
                return boxes.filter(function (box) { return box.checked && !box.disabled; })
                    .map(function (box) { return box.value; });
            }
        };
    }

    function installDefinitionEditor(tool) {
        tool.openDefinitionEditor = function (shell, script, onSaved) {
            Promise.all([
                shell.api("definition", { path: script.path }),
                shell.api("script-secrets", { path: script.path }).catch(function () { return { secrets: { variables: [] } }; }),
                shell.api("system-credentials", { path: script.path }).catch(function () { return { systemCredentials: { profiles: [] } }; })
            ]).then(function (responses) {
                var value = responses[0].definition || {};
                var secretState = responses[1].secrets || { variables: [] };
                var systemState = responses[2].systemCredentials || { profiles: [] };
                var host = shell.state.page.details;
                host.innerHTML = "";

                var card = shell.card("Edit: " + (value.label || script.label || script.name), value.path || script.path);
                card.classList.add("mc-script-definition-card", "mc-script-definition-form");

                var locales = value.locales || {};
                var plLocale = locales.pl || {};
                var enLocale = locales.en || {};
                var namePl = element("input", "mc-definition-input");
                namePl.type = "text";
                namePl.value = plLocale.label || value.label || script.label || script.name || "";
                var descriptionPl = element("textarea", "mc-definition-input");
                descriptionPl.rows = 3;
                descriptionPl.value = plLocale.description || value.description || "";
                var nameEn = element("input", "mc-definition-input");
                nameEn.type = "text";
                nameEn.value = enLocale.label || value.label || script.label || script.name || "";
                var descriptionEn = element("textarea", "mc-definition-input");
                descriptionEn.rows = 3;
                descriptionEn.value = enLocale.description || value.description || "";

                var top = element("div", "mc-definition-top-grid");
                top.appendChild(field("Nazwa (PL)", namePl));
                top.appendChild(field("Opis (PL)", descriptionPl));
                top.appendChild(field("Name (EN)", nameEn));
                top.appendChild(field("Description (EN)", descriptionEn));
                card.appendChild(top);

                var approval = element("section", "mc-definition-section mc-definition-approval");
                approval.appendChild(element("h4", "", "Approval"));
                var approvalBoxes = element("div", "mc-script-approval-levels");
                [1, 2, 3].forEach(function (level) {
                    var item = element("label", "mc-definition-check");
                    var box = element("input");
                    box.type = "checkbox";
                    box.value = String(level);
                    box.checked = (value.approvalLevels || []).map(Number).indexOf(level) >= 0;
                    item.appendChild(box);
                    item.appendChild(document.createTextNode(" Level " + level));
                    approvalBoxes.appendChild(item);
                });
                approval.appendChild(approvalBoxes);
                card.appendChild(approval);

                var variables = createDirectiveTable(
                    "Variables",
                    value.variables || [],
                    ["Variable", "VariableRequired", "VariableSelect", "VariableSelectRequired", "VariableSwitch", "VariableSwitchRequired", "VariableUser", "VariableUserRequired", "VariableAsset", "VariableAssetRequired"],
                    "Variable"
                );
                card.appendChild(variables.element);

                var secrets = createDirectiveTable(
                    "Credentials / secrets",
                    value.secretVariables || [],
                    ["SaveSecret", "SaveSecretRequired"],
                    "SaveSecretRequired"
                );
                card.appendChild(secrets.element);

                var systemCredentials = createSystemCredentialsSection(systemState);
                card.appendChild(systemCredentials.element);

                var execution = element("section", "mc-definition-section");
                execution.appendChild(element("h4", "", "Execution"));
                var runAs = createSelect(["0", "2"], String(value.runAsUser || 0));
                Array.prototype.forEach.call(runAs.options, function (option) {
                    option.textContent = option.value === "2" ? "Logged-on user" : "SYSTEM";
                });
                execution.appendChild(field("Run as", runAs));
                var multiLabel = element("label", "mc-definition-check");
                var multi = element("input");
                multi.type = "checkbox";
                multi.checked = value.multiHost === true;
                multiLabel.appendChild(multi);
                multiLabel.appendChild(document.createTextNode(" Allow multi-device execution"));
                execution.appendChild(multiLabel);
                var confirmLabel = element("label", "mc-definition-check");
                var confirmExecution = element("input");
                confirmExecution.type = "checkbox";
                confirmExecution.checked = value.confirmExecution === true;
                confirmLabel.appendChild(confirmExecution);
                confirmLabel.appendChild(document.createTextNode(" Require confirmation before execution"));
                execution.appendChild(confirmLabel);
                var desktopLabel = element("label", "mc-definition-check");
                var showOnDesktop = element("input");
                showOnDesktop.type = "checkbox";
                showOnDesktop.checked = value.showOnDesktop !== false;
                desktopLabel.appendChild(showOnDesktop);
                desktopLabel.appendChild(document.createTextNode(" Available during a Desktop connection (Quick commands)"));
                execution.appendChild(desktopLabel);
                var cardLabel = element("label", "mc-definition-check");
                var showWithoutDesktop = element("input");
                showWithoutDesktop.type = "checkbox";
                showWithoutDesktop.checked = value.showWithoutDesktop !== false;
                cardLabel.appendChild(showWithoutDesktop);
                cardLabel.appendChild(document.createTextNode(" Available without a Desktop connection (My Commands)"));
                execution.appendChild(cardLabel);
                card.appendChild(execution);

                var sourceDetails = element("details", "mc-definition-source");
                sourceDetails.open = true;
                sourceDetails.appendChild(element("summary", "", "Script code"));
                var source = element("textarea", "mc-script-editor mc-definition-source-editor");
                source.spellcheck = false;
                source.value = text(value.body);
                sourceDetails.appendChild(source);
                card.appendChild(sourceDetails);

                var detect = element("button", "btn btn-secondary btn-sm", "Detect variables from script");
                detect.type = "button";
                detect.onclick = function () {
                    var existing = variables.names();
                    var added = 0;
                    detectExternalVariables(source.value).forEach(function (variableName) {
                        if (existing.indexOf(variableName.toLowerCase()) >= 0) return;
                        variables.addRow({ directive: "VariableRequired", name: variableName, pl: variableName, en: variableName });
                        existing.push(variableName.toLowerCase());
                        added++;
                    });
                    detect.textContent = added ? ("Added " + added + " variable" + (added === 1 ? "" : "s")) : "No new variables detected";
                    window.setTimeout(function () { detect.textContent = "Detect variables from script"; }, 1600);
                };
                variables.headerActions.insertBefore(detect, variables.headerActions.firstChild);

                if ((secretState.variables || []).length) {
                    var hint = element("div", "mc-definition-secret-state");
                    hint.appendChild(element("strong", "", "Credential status: "));
                    hint.appendChild(document.createTextNode(secretState.variables.map(function (item) {
                        return item.name + " — " + (item.configured ? "configured" : item.required ? "required" : "not configured");
                    }).join(" | ")));
                    card.appendChild(hint);
                }

                var actions = element("div", "mc-script-manage-actions");
                var save = shell.element("button", "btn btn-primary btn-sm", "Save");
                var credentials = shell.element("button", "btn btn-secondary btn-sm", "Credentials");
                var cancel = shell.element("button", "btn btn-secondary btn-sm", "Cancel");
                save.type = credentials.type = cancel.type = "button";

                save.onclick = function () {
                    save.disabled = true;
                    Promise.all([
                        shell.post("definition", {
                            path: script.path,
                            definition: {
                                locales: {
                                    pl: { label: namePl.value, description: descriptionPl.value },
                                    en: { label: nameEn.value, description: descriptionEn.value }
                                },
                                approvalLevels: Array.prototype.map.call(approvalBoxes.querySelectorAll("input:checked"), function (box) { return Number(box.value); }),
                                variables: variables.values(),
                                secretVariables: secrets.values(),
                                runAsUser: Number(runAs.value) || 0,
                                multiHost: multi.checked,
                                confirmExecution: confirmExecution.checked,
                                showOnDesktop: showOnDesktop.checked,
                                showWithoutDesktop: showWithoutDesktop.checked,
                                body: source.value
                            }
                        }),
                        shell.post("system-credentials", {
                            path: script.path,
                            selected: systemCredentials.selected()
                        }).catch(function () { return null; })
                    ]).then(function (results) {
                        tool.state.editMode = false;
                        if (typeof onSaved === "function") onSaved(results[0]);
                    }).catch(function (error) {
                        save.disabled = false;
                        var note = element("div", "mc-shared-error", error.message || String(error));
                        card.appendChild(note);
                    });
                };

                credentials.onclick = function () {
                    tool.openCredentialsEditor(shell, script, function (result) {
                        if (typeof onSaved === "function") onSaved(result || null);
                    });
                };
                cancel.onclick = function () {
                    tool.state.editMode = false;
                    if (typeof onSaved === "function") onSaved(null);
                };

                actions.appendChild(save);
                actions.appendChild(credentials);
                actions.appendChild(cancel);
                card.appendChild(actions);
                host.appendChild(card);
                namePl.focus();
            }).catch(function (error) {
                shell.error(shell.state.page.details, error);
            });
        };
    }


    window.SharedScriptTools = {
        copyText: copyText,
        selectedDevices: selectedDevices,
        create: function (options) {
            options = options || {};
            var storageKey = options.storageKey || "sirkPlatform.scripts.preferences";
            var deepLinkParameter = options.deepLinkParameter || "script";
            var state = {
                favorites: [], favoritesOnly: false, editMode: false,
                linkPickMode: false, multiPickMode: false, deepLinkApplied: false
            };

            function readPreferences() {
                try {
                    var stored = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
                    if (Array.isArray(stored)) return { favorites: stored };
                    return stored && typeof stored === "object" ? stored : {};
                } catch (error) { return {}; }
            }
            function savePreferences(extra) {
                try {
                    var current = readPreferences();
                    current.favorites = uniqueStrings(state.favorites);
                    current.favoritesOnly = state.favoritesOnly === true;
                    Object.keys(extra || {}).forEach(function (key) { current[key] = extra[key]; });
                    window.localStorage.setItem(storageKey, JSON.stringify(current));
                } catch (error) {}
            }
            var preferences = readPreferences();
            state.favorites = uniqueStrings(preferences.favorites);
            state.favoritesOnly = preferences.favoritesOnly === true;

            function isFavorite(path) { return state.favorites.indexOf(text(path)) >= 0; }
            function toggleFavorite(path) {
                path = text(path); if (!path) return false;
                var index = state.favorites.indexOf(path);
                if (index >= 0) state.favorites.splice(index, 1); else state.favorites.push(path);
                savePreferences(); return isFavorite(path);
            }
            function selectedLink(path) {
                var url = new URL(window.location.href);
                if (typeof window.xxcurrentView !== "undefined") url.searchParams.set("viewmode", String(window.xxcurrentView));
                url.searchParams.set(deepLinkParameter, text(path));
                return url.href;
            }
            function copyScriptLink(path) {
                if (!path) return Promise.resolve(false);
                var url = selectedLink(path);
                try { window.history.replaceState(window.history.state, document.title, url); } catch (error) {}
                return copyText(url).catch(function () { window.prompt("Copy the script link:", url); }).then(function () { return true; });
            }
            function updateTitle(toolbar, key, title) {
                if (toolbar && typeof toolbar.setTitle === "function") toolbar.setTitle(key, title);
                else if (toolbar && toolbar.buttons && toolbar.buttons[key]) {
                    toolbar.buttons[key].title = title;
                    toolbar.buttons[key].setAttribute("aria-label", title);
                }
            }
            function stopPickModes(except) {
                if (except !== "link") state.linkPickMode = false;
                if (except !== "multi") state.multiPickMode = false;
            }

            function openCredentialsEditor(shell, script, onSaved) {
                shell.api("script-secrets", { path: script.path }).then(function (response) {
                    var value = response.secrets || {}, host = shell.state.page.details;
                    host.innerHTML = "";
                    var card = shell.card("Script credentials", script.label || script.name);
                    card.classList.add("mc-script-credentials-card");
                    var controls = [];
                    (value.variables || []).forEach(function (variable) {
                        var group = document.createElement("div"); group.className = "mc-script-secret-row";
                        var input = document.createElement("input"); input.type = "password"; input.autocomplete = "new-password";
                        input.placeholder = variable.configured ? "Configured — leave empty to keep" : "Enter secret";
                        var clear = document.createElement("input"); clear.type = "checkbox";
                        var clearLabel = document.createElement("label"); clearLabel.appendChild(clear); clearLabel.appendChild(document.createTextNode(" Clear saved value"));
                        var status = document.createElement("span"); status.className = variable.configured ? "mc-secret-configured" : "mc-secret-missing";
                        status.textContent = variable.configured ? "Configured" : (variable.required ? "Required" : "Not configured");
                        group.appendChild(formRow(variable.label + (variable.required ? " *" : ""), input)); group.appendChild(status); group.appendChild(clearLabel);
                        card.appendChild(group); controls.push({ variable: variable, input: input, clear: clear });
                    });
                    if (!controls.length) card.appendChild(document.createTextNode("This script has no SaveSecret directives."));
                    var save = shell.element("button", "btn btn-primary btn-sm", "Save credentials"); save.type = "button";
                    save.onclick = function () {
                        var values = {}, clearNames = [];
                        controls.forEach(function (item) { if (item.input.value) values[item.variable.name] = item.input.value; if (item.clear.checked) clearNames.push(item.variable.name); });
                        save.disabled = true;
                        shell.post("script-secrets", { path: script.path, values: values, clearNames: clearNames }).then(function (result) { if (typeof onSaved === "function") onSaved(result); }).catch(function (error) { save.disabled = false; shell.error(host, error); });
                    };
                    card.appendChild(save); host.appendChild(card);
                }).catch(function (error) { shell.error(shell.state.page.details, error); });
            }

            function openMultiExecution(shell, script, currentNodeId, submit) {
                var devices = selectedDevices(currentNodeId), host = shell.state.page.details;
                host.innerHTML = "";
                var card = shell.card("Multi-device execution", script.label || script.name);
                card.classList.add("mc-multi-editor-card");
                if (!devices.length) {
                    card.appendChild(document.createTextNode("Select devices in MeshCentral before using this action.")); host.appendChild(card); return;
                }
                var list = document.createElement("div"); list.className = "mc-multi-device-list";
                devices.forEach(function (device) {
                    var row = document.createElement("label"), box = document.createElement("input"); box.type = "checkbox"; box.checked = true; box.value = device.id;
                    row.appendChild(box); row.appendChild(document.createTextNode(" " + device.name)); row.title = device.id; list.appendChild(row);
                });
                card.appendChild(list);
                var run = shell.element("button", "btn btn-primary btn-sm", "Run on selected devices"); run.type = "button";
                run.onclick = function () {
                    var ids = Array.prototype.map.call(list.querySelectorAll('input:checked'), function (box) { return box.value; });
                    if (!ids.length) return;
                    if (!window.confirm("Run '" + (script.label || script.name) + "' on " + ids.length + " selected device(s)?")) return;
                    run.disabled = true;
                    Promise.resolve(submit(ids)).catch(function (error) { run.disabled = false; shell.error(host, error); });
                };
                card.appendChild(run); host.appendChild(card);
            }

            var tool = {
                state: state, isFavorite: isFavorite, toggleFavorite: toggleFavorite, copyText: copyText,
                selectedDevices: selectedDevices,
                filterScript: function (script) { return !state.favoritesOnly || isFavorite(script.path); },
                saveTreeState: function (treeState) { savePreferences({ selectedRoot: text(treeState && treeState.selectedRoot) }); },
                restoreTreeState: function (treeState) { var stored = readPreferences(); if (stored.selectedRoot) treeState.selectedRoot = text(stored.selectedRoot); },
                applyDeepLink: function (tree, treeState) {
                    if (state.deepLinkApplied || !tree) return; state.deepLinkApplied = true;
                    try {
                        var path = new URL(window.location.href).searchParams.get(deepLinkParameter);
                        if (!path || !window.SharedDirectoryTree.find(tree, path)) return;
                        var location = findRootAndParents(tree, path); treeState.selectedScript = path;
                        if (location.root) treeState.selectedRoot = location.root;
                        (location.parents || []).forEach(function (folder) { treeState.expanded[folder] = true; });
                    } catch (error) {}
                },
                syncToolbar: function (toolbar, mode, selectedScript, config) {
                    if (!toolbar) return; config = config || {}; var scriptsMode = mode !== "results";
                    toolbar.setActive("favorites", state.favoritesOnly && scriptsMode);
                    toolbar.setActive("manage", state.editMode && scriptsMode);
                    toolbar.setActive("link", state.linkPickMode && scriptsMode);
                    toolbar.setActive("multi", state.multiPickMode && scriptsMode);
                    toolbar.setEnabled("favorites", scriptsMode); toolbar.setEnabled("manage", scriptsMode && config.canEdit === true);
                    toolbar.setEnabled("link", scriptsMode); toolbar.setEnabled("multi", scriptsMode && config.enableMulti === true);
                    toolbar.setVisible("manage", config.canEdit === true); toolbar.setVisible("multi", config.enableMulti === true);
                    updateTitle(toolbar, "favorites", state.favoritesOnly ? "Show all scripts" : "Show favorites");
                    updateTitle(toolbar, "manage", state.editMode ? "Close edit mode" : "Edit script definitions");
                    updateTitle(toolbar, "link", state.linkPickMode ? "Close link mode" : selectedScript ? "Copy link to selected script" : "Show link icons beside scripts");
                    updateTitle(toolbar, "multi", state.multiPickMode ? "Close multi-device mode" : "Show multi-device icons beside scripts");
                },
                toggleFavorites: function (toolbar, onChange) { state.favoritesOnly = !state.favoritesOnly; savePreferences(); if (toolbar) toolbar.setActive("favorites", state.favoritesOnly); if (onChange) onChange(); },
                toggleEdit: function (toolbar, onChange) { state.editMode = !state.editMode; stopPickModes("edit"); if (toolbar) { toolbar.setActive("manage", state.editMode); toolbar.setActive("link", false); toolbar.setActive("multi", false); } if (onChange) onChange(); },
                toggleLink: function (toolbar, selectedScript, onChange, onCopied) {
                    if (selectedScript) return copyScriptLink(selectedScript).then(function () { if (toolbar) toolbar.setActive("link", true); setTimeout(function () { if (toolbar) toolbar.setActive("link", false); }, 900); if (onCopied) onCopied(selectedScript); return true; });
                    state.linkPickMode = !state.linkPickMode; stopPickModes(state.linkPickMode ? "link" : "");
                    if (toolbar) { toolbar.setActive("link", state.linkPickMode); toolbar.setActive("multi", false); }
                    if (onChange) onChange(); return Promise.resolve(false);
                },
                toggleMulti: function (toolbar, onChange) { state.multiPickMode = !state.multiPickMode; if (state.multiPickMode) state.editMode = false; stopPickModes(state.multiPickMode ? "multi" : ""); if (toolbar) { toolbar.setActive("multi", state.multiPickMode); toolbar.setActive("manage", false); toolbar.setActive("link", false); } if (onChange) onChange(); },
                openCredentialsEditor: openCredentialsEditor,
                openMultiExecution: openMultiExecution,
                scriptActions: function (script, config) {
                    config = config || {}; var actions = [];
                    if (state.linkPickMode) actions.push({ key: "link", icon: "🔗", title: "Copy bookmarkable link for this script", onClick: function () { copyScriptLink(script.path).then(function () { if (config.onLinkCopied) config.onLinkCopied(script); }); } });
                    if (state.editMode) {
                        var hasCredentials = !!(script.secretVariables && script.secretVariables.length);
                        if (config.canEdit === true) actions.push({ key: "credentials", icon: "🔑", disabled: !hasCredentials, className: "mc-tree-credential-action", title: hasCredentials ? "Configure script credentials" : "No script credentials configured", onClick: function () { if (hasCredentials && config.onCredentials) config.onCredentials(script); } });
                        actions.push({ key: "favorite", icon: "★", active: isFavorite(script.path), className: "mc-tree-favorite-action", title: isFavorite(script.path) ? "Remove from favorites" : "Add to favorites", onClick: function () { toggleFavorite(script.path); if (config.onFavoriteChanged) config.onFavoriteChanged(script); } });
                        actions.push({ key: "link", icon: "🔗", title: "Copy bookmarkable link for this script", onClick: function () { copyScriptLink(script.path).then(function () { if (config.onLinkCopied) config.onLinkCopied(script); }); } });
                        if (config.canEdit === true) actions.push({ key: "edit", icon: "✎", title: "Edit script definition and approval levels", onClick: function () { if (config.onEdit) config.onEdit(script); } });
                    }
                    if (state.multiPickMode && config.enableMulti === true) actions.push({ key: "multi", icon: "⟳", title: "Run this script on selected devices", onClick: function () { if (config.onMulti) config.onMulti(script); } });
                    return actions;
                }
            };
            installDefinitionEditor(tool);
            return tool;
        }
    };
}());