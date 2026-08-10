(function () {
    "use strict";

    var tree = null;
    var mode = "scripts";
    var status = "";
    var treeState = { selectedRoot: "", selectedScript: "", expanded: {} };
    var outputs = Object.create(null);
    var tools = window.SharedScriptTools.create({
        storageKey: "sirkPlatform.myscripts.preferences",
        deepLinkParameter: "myscript"
    });
    tools.restoreTreeState(treeState);
    var progressSequence = 0;
    var openedArtifacts = new Set();

    function protocolScript(item) {
        return !!(item && Array.isArray(item.extraHeaders) && item.extraHeaders.some(function (header) {
            return /^SirkWorkflow\s*:\s*JiraAssetProtocol$/i.test(String(header || "").trim());
        }));
    }
    window.SharedScriptTools.setParameterOptionProvider(function (variable, values, item) {
        if (!protocolScript(item) || (variable.control !== "user" && variable.control !== "asset")) return Promise.resolve(variable.options || []);
        return window.SirkPlatformCore.api("myscripts", "variable-options", null, {
            path: item.path, variable: variable.name, values: JSON.stringify(values || {})
        }).then(function (response) { return response.options || []; });
    });

    function admin(shell) {
        return !!(shell.state.bootstrap && shell.state.bootstrap.access && shell.state.bootstrap.access.siteAdmin);
    }

    function sync(shell) {
        tools.syncToolbar(shell.state.page && shell.state.page.toolbar, mode, treeState.selectedScript, {
            canEdit: admin(shell),
            enableMulti: false
        });
    }

    function note(shell, title, message, error) {
        var host = shell.state.page.details;
        host.innerHTML = "";
        var card = shell.card(title, message);
        if (error) card.classList.add("mc-shared-error");
        host.appendChild(card);
        sync(shell);
    }

    function empty(shell) {
        note(
            shell,
            "Output",
            tools.state.favoritesOnly && !tools.state.favorites.length
                ? "No favorite scripts. Enable Edit and add a script to Favorites."
                : "Select a script to run it."
        );
    }

    function confirmExecution(script) {
        if (!script || script.confirmExecution !== true) return true;
        return window.confirm(
            "Run \"" + (script.label || script.name || script.path || "this script") + "\" now?"
        );
    }

    function requestOutput(request) {
        request = request || {};
        var result = request.result || {};
        if (result.output != null && result.output !== "") return String(result.output);
        if (result.rawOutput != null && result.rawOutput !== "") return String(result.rawOutput);
        if (result.message != null && result.message !== "") return String(result.message);
        if (request.status === "pending") return "Waiting for approval.";
        if (request.status === "executing") return "Executing...";
        if (request.status === "failed") return "Script execution failed.";
        return "No output.";
    }

    function createResultHost() {
        var resultHost = document.createElement("div");
        resultHost.className = "mc-script-live-result mc-script-result-only";
        return resultHost;
    }

    function renderResult(host, request) {
        request = request || {};
        host.innerHTML = "";
        if (request.status === "pending" || request.status === "executing") {
            var waiting = document.createElement("pre");
            waiting.className = "mc-shared-output";
            waiting.textContent = requestOutput(request);
            host.appendChild(waiting);
            return;
        }
        if (request.status === "failed") host.classList.add("mc-shared-error");
        else host.classList.remove("mc-shared-error");
        window.SharedResultsView.mountResult(host, requestOutput(request), {
            title: request.title || "Result"
        });
    }


    function showValidationError(shell, errorHost, error) {
        errorHost.innerHTML = "";
        errorHost.appendChild(shell.element(
            "div",
            "mc-shared-error",
            error.message || String(error)
        ));
    }

    function switchToResult(detailsHost, resultHost, message) {
        detailsHost.innerHTML = "";
        detailsHost.appendChild(resultHost);
        resultHost.innerHTML = "";
        resultHost.appendChild(document.createElement("pre"));
        resultHost.firstChild.className = "mc-shared-output";
        resultHost.firstChild.textContent = message;
    }

    function openArtifactOnce(request) {
        var artifact = request && request.result && request.result.artifact;
        if (!artifact || !artifact.id || openedArtifacts.has(artifact.id)) return;
        openedArtifacts.add(artifact.id);
        window.open(window.SirkPlatformCore.assetUrl("myscripts", "artifact", { id: artifact.id, type: artifact.type || "pdf" }), "_blank", "noopener");
    }

    function pollProtocol(shell, script, request, resultHost, sequence, attempt) {
        if (sequence !== progressSequence) return;
        attempt = Number(attempt) || 0;
        if (attempt >= 900) { switchToResult(shell.state.page.details, resultHost, "Protocol progress timed out."); return; }
        shell.api("progress", { id: request.id }).then(function (response) {
            if (sequence !== progressSequence) return;
            var progress = response.progress || {};
            var current = response.request || request;
            outputs[script.path] = current;
            if (current.status === "completed" || current.status === "failed" || current.status === "rejected") {
                renderResult(resultHost, current);
                openArtifactOnce(current);
                sync(shell);
                return;
            }
            resultHost.innerHTML = "";
            var bar = document.createElement("progress"); bar.className = "mc-script-protocol-progress"; bar.max = 100; bar.value = Number(progress.percent) || 0;
            var label = document.createElement("div"); label.className = "mc-shared-muted";
            label.textContent = current.status === "pending" ? "Waiting for approval." : (progress.stage || current.status || "Executing...") + " — " + bar.value + "%";
            resultHost.appendChild(bar); resultHost.appendChild(label);
            window.setTimeout(function () { pollProtocol(shell, script, current, resultHost, sequence, attempt + 1); }, 1000);
        }).catch(function (error) {
            if (sequence !== progressSequence) return;
            resultHost.innerHTML = ""; resultHost.classList.add("mc-shared-error");
            resultHost.textContent = error.message || String(error);
        });
    }

    function submit(shell, script, button, values, detailsHost, resultHost, errorHost) {
        if (!confirmExecution(script)) {
            if (errorHost) showValidationError(shell, errorHost, new Error("Execution cancelled."));
            else switchToResult(detailsHost, resultHost, "Execution cancelled.");
            return;
        }

        if (button) button.disabled = true;
        switchToResult(detailsHost, resultHost, "Executing script...");

        var sequence = ++progressSequence;
        shell.post("request", {
            scriptPath: script.path,
            variableValues: values || {},
            confirmedExecution: script.confirmExecution === true,
            note: ""
        }).then(function (response) {
            var request = response.request || {};
            outputs[script.path] = request;
            if (response.protocol === true && request.id) pollProtocol(shell, script, request, resultHost, sequence, 0);
            else renderResult(resultHost, request);
        }).catch(function (error) {
            var request = {
                status: "failed",
                title: script.label || script.name,
                result: { message: error.message || String(error) }
            };
            outputs[script.path] = request;
            renderResult(resultHost, request);
        }).then(function () {
            if (button) button.disabled = false;
            sync(shell);
        });
    }

    function show(shell, item, executeOnSelect) {
        progressSequence++;
        shell.api("script", { path: item.path }).then(function (response) {
            var script = response.script;
            var detailsHost = shell.state.page.details;
            detailsHost.innerHTML = "";

            var previous = outputs[script.path];
            if (previous && executeOnSelect !== true) {
                var previousHost = createResultHost();
                detailsHost.appendChild(previousHost);
                renderResult(previousHost, previous);
                sync(shell);
                return;
            }

            var hasVariables = Array.isArray(script.variables) && script.variables.length > 0;
            var resultHost = createResultHost();

            if (executeOnSelect === true && !hasVariables) {
                detailsHost.appendChild(resultHost);
                sync(shell);
                submit(shell, script, null, {}, detailsHost, resultHost, null);
                return;
            }

            var card = shell.card(script.label || script.name, script.description || script.path);
            card.classList.add("mc-script-run-card");

            var button = shell.element(
                "button",
                "btn btn-primary",
                script.requiresApproval ? "Request" : "Run"
            );
            button.type = "button";
            card.appendChild(button);

            var errorHost = document.createElement("div");
            errorHost.className = "mc-script-run-error";
            card.appendChild(errorHost);
            detailsHost.appendChild(card);

            button.onclick = function () {
                if (!hasVariables) {
                    submit(shell, script, button, {}, detailsHost, resultHost, errorHost);
                    return;
                }
                if (!tools || typeof tools.openParameterDialog !== "function") {
                    switchToResult(detailsHost, resultHost, "Native MeshCentral parameter dialog is unavailable.");
                    resultHost.classList.add("mc-shared-error");
                    return;
                }
                tools.openParameterDialog({
                    item: script, trigger: button,
                    primaryLabel: script.requiresApproval ? "Request" : "Run"
                }).then(function (values) {
                    if (values == null) return;
                    submit(shell, script, button, values, detailsHost, resultHost, errorHost);
                }).catch(function (error) {
                    switchToResult(detailsHost, resultHost, error.message || String(error));
                    resultHost.classList.add("mc-shared-error");
                });
            };
            sync(shell);
            if (executeOnSelect === true && hasVariables) button.click();
        }).catch(function (error) {
            shell.error(shell.state.page.details, error);
        });
    }

    function actions(shell, script) {
        return tools.scriptActions(script, {
            canEdit: admin(shell),
            enableMulti: false,
            onEdit: function (item) {
                treeState.selectedScript = item.path;
                tools.openDefinitionEditor(shell, item, function (result) {
                    if (result && result.tree) tree = result.tree;
                    tools.state.editMode = false;
                    shell.render();
                });
            },
            onCredentials: function (item) {
                treeState.selectedScript = item.path;
                tools.openCredentialsEditor(shell, item, function () {
                    note(shell, "Credentials saved", "Encrypted credentials for this script were updated.");
                });
            },
            onFavoriteChanged: function (item) {
                if (tools.state.favoritesOnly && !tools.isFavorite(item.path)) {
                    treeState.selectedScript = "";
                }
                shell.render();
            },
            onLinkCopied: function () {}
        });
    }

    function primary(shell, host) {
        window.SharedCatalogView.mount({
            primaryContainer: shell.state.page.primary,
            treeContainer: host,
            tree: tree,
            state: treeState,
            search: shell.state.search,
            resultsActive: mode === "results",
            emptyText: tools.state.favoritesOnly ? "No favorite scripts found." : "No scripts found.",
            filterScript: tools.filterScript,
            scriptActions: function (script) { return actions(shell, script); },
            onResults: function () {
                mode = "results";
                treeState.selectedScript = "";
                shell.render();
            },
            onRootSelect: function () {
                mode = "scripts";
                treeState.selectedScript = "";
                tools.saveTreeState(treeState);
                setTimeout(shell.render, 0);
            },
            onScript: function (script) {
                mode = "scripts";
                show(shell, script, true);
            }
        });
    }

    function results(shell) {
        primary(shell, document.createElement("div"));
        window.SharedResultsView.mountStatus(shell.state.page.secondary, {
            selected: status,
            onSelect: function (value) {
                status = value;
                shell.render();
            }
        });
        sync(shell);
        return shell.api("results", {
            status: status,
            q: shell.state.search,
            page: 1,
            perPage: 200
        }).then(function (response) {
            window.SharedResultsView.mountTable(shell.state.page.details, {
                title: "Script results",
                kind: "scripts",
                rows: response.rows || [],
                emptyText: "No script results match the selected status."
            });
            sync(shell);
        });
    }

    function scripts(shell) {
        primary(shell, shell.state.page.secondary);
        if (!treeState.selectedScript) {
            empty(shell);
            return;
        }
        var script = window.SharedDirectoryTree.find(tree, treeState.selectedScript);
        if (script && tools.filterScript(script)) show(shell, script, false);
        else {
            treeState.selectedScript = "";
            empty(shell);
        }
    }

    function refresh(shell) {
        var toolbar = shell.state.page && shell.state.page.toolbar;
        if (toolbar) toolbar.setEnabled("refresh", false);
        shell.post("refresh", {}).then(function (response) {
            tree = response.tree || tree;
            if (
                treeState.selectedScript &&
                !window.SharedDirectoryTree.find(tree, treeState.selectedScript)
            ) treeState.selectedScript = "";
            shell.render();
        }).catch(function (error) {
            note(shell, "Refresh failed", error.message || String(error), true);
        }).then(function () {
            if (toolbar) toolbar.setEnabled("refresh", true);
        });
    }

    var module = window.SirkPlatformModuleShell.create({
        key: "myscripts",
        title: "My Scripts",
        menuTitle: "My Scripts",
        order: 160,
        preset: "myscripts",
        buttons: {
            collapse: true,
            favorites: {
                side: "left",
                order: 20,
                onClick: function (toolbar) {
                    tools.toggleFavorites(toolbar, function () {
                        mode = "scripts";
                        treeState.selectedScript = "";
                        module.api.render();
                    });
                }
            },
            link: false,
            manage: {
                title: "Edit",
                side: "left",
                order: 40,
                onClick: function (toolbar) {
                    tools.toggleEdit(toolbar, module.api.render);
                }
            },
            refresh: {
                side: "left",
                order: 50,
                onClick: function () { refresh(module.api); }
            },
            multi: false,
            search: { side: "left", order: 70 },
            clear: false,
            settings: false
        },
        tabs: [],
        defaultTab: "scripts",
        render: function (shell) {
            return shell.api("scripts").then(function (response) {
                tree = response.tree;
                tools.applyDeepLink(tree, treeState);
                return mode === "results" ? results(shell) : scripts(shell);
            });
        }
    });

    window.SirkPlatformModules.myscripts = module;
}());
