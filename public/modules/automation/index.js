(function () {
    "use strict";

    var tree = null;
    var mode = "scripts";
    var VULN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>';
    var VULN_RISKS = ["critical", "high", "medium", "low", "info"];
    var VULN_PAGE_SIZE = 100;
    var vulnState = { sequence: 0, data: null, error: null, loading: false, risk: "", page: 1, sort: "risk", desc: false, filters: { host: "", pluginId: "", name: "", minScore: "", exploit: "", fix: "active" } };
    var status = "";
    var treeState = { selectedRoot: "", selectedScript: "", expanded: {} };
    var outputs = Object.create(null);
    var executionsInFlight = Object.create(null);
    var progressSequence = 0;
    var tools = window.SharedScriptTools.create({
        storageKey: "sirkPlatform.myscripts.preferences",
        deepLinkParameter: "myscript"
    });
    tools.restoreTreeState(treeState);

    function admin(shell) {
        return !!(shell.state.bootstrap && shell.state.bootstrap.access && shell.state.bootstrap.access.siteAdmin);
    }

    function usesCredentials(script) {
        if (script && Array.isArray(script.secretVariables) && script.secretVariables.length > 0) return true;
        return !!(script && Array.isArray(script.extraHeaders) && script.extraHeaders.some(function (header) {
            return /^SirkSystemCredential\s*:\s*\S+/i.test(String(header || "").trim());
        }));
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

    function confirmExecution(script, trigger) {
        if (!script || script.confirmExecution !== true) return Promise.resolve(true);
        if (!tools || typeof tools.openConfirmationDialog !== "function") {
            return Promise.reject(new Error("Native MeshCentral confirmation dialog is unavailable."));
        }
        return tools.openConfirmationDialog({
            title: script.label || script.name || "Confirm execution",
            message: "Run \"" + (script.label || script.name || script.path || "this script") + "\" now?",
            trigger: trigger, item: script,
            primaryLabel: script.requiresApproval ? "Request" : "Run"
        });
    }

    function requestOutput(request) {
        request = request || {};
        var result = request.result || {};
        if (result.output != null && result.output !== "") return String(result.output);
        if (result.rawOutput != null && result.rawOutput !== "") return String(result.rawOutput);
        if (result.message != null && result.message !== "") return String(result.message);
        if (request.status === "pending") return "Waiting for approval.";
        if (request.status === "awaiting_confirmation") return "Protocol prepared. Awaiting confirmation.";
        if (request.status === "confirming") return "Finalizing Jira Assets...";
        if (request.status === "executing") return "Executing...";
        if (request.status === "failed") return "Script execution failed.";
        return "No output.";
    }

    function createResultHost() {
        var resultHost = document.createElement("div");
        resultHost.className = "mc-script-live-result mc-script-result-only";
        return resultHost;
    }

    function requestArtifacts(request, type) {
        var artifacts = request && request.result && Array.isArray(request.result.artifacts) ? request.result.artifacts : [];
        return artifacts.filter(function (artifact) { return artifact && artifact.type === type && artifact.id && artifact.requestId; });
    }
    function pdfArtifacts(request) { return requestArtifacts(request, "pdf"); }
    function certificateArtifacts(request) { return requestArtifacts(request, "certificate"); }
    function certificateButton(artifact, className) {
        var download = document.createElement("button");
        download.type = "button";
        download.className = className;
        download.textContent = "Download certificate";
        download.onclick = function () { window.location.href = artifactUrl(artifact, "download"); };
        return download;
    }

    function artifactUrl(artifact, modeValue) {
        return window.SirkPlatformCore.assetUrl("", "download", {
            requestId: artifact.requestId,
            artifactId: artifact.id,
            mode: modeValue || "download"
        });
    }

    function appendArtifactActions(host, request) {
        var artifacts = pdfArtifacts(request);
        var certificates = certificateArtifacts(request);
        if (!artifacts.length && !certificates.length) return;
        var actions = host.querySelector(".mc-results-inline-actions");
        if (!actions) {
            actions = document.createElement("div");
            actions.className = "mc-results-viewer-actions mc-results-inline-actions";
            host.appendChild(actions);
        }
        artifacts.forEach(function (artifact) {
            var open = document.createElement("button");
            open.type = "button";
            open.className = "btn btn-secondary btn-sm";
            open.textContent = artifact.label || "Open PDF";
            open.onclick = function () { window.open(artifactUrl(artifact, "open"), "_blank", "noopener"); };
            actions.appendChild(open);

            var download = document.createElement("button");
            download.type = "button";
            download.className = "btn btn-secondary btn-sm mc-results-download-button";
            download.textContent = "Download PDF";
            download.onclick = function () { window.location.href = artifactUrl(artifact, "download"); };
            actions.appendChild(download);
        });
        certificates.forEach(function (artifact) {
            actions.appendChild(certificateButton(artifact, "btn btn-secondary btn-sm mc-results-download-button"));
        });
    }

    function protocolHeading(request) {
        var data = request && request.result && request.result.data;
        if (!data || !Array.isArray(data.assets)) return "";
        if (data.hasChanges === false || data.mode === "reconciliation") return "PROTOKÓŁ UZGODNIENIA STANU SPRZĘTU";
        if (data.hasChanges === true || data.mode === "changes") return "PROTOKÓŁ ZMIAN SPRZĘTU";
        return data.mode === "return" ? "PROTOKÓŁ ZWROTU SPRZĘTU" : "PROTOKÓŁ PRZEKAZANIA SPRZĘTU";
    }

    function protocolEquipmentOutput(request) {
        var data = request && request.result && request.result.data || {};
        var assets = Array.isArray(data.assets) ? data.assets : [];
        return JSON.stringify({
            meshTable: true,
            title: "Sprzęt",
            columns: ["Operacja", "Hostname", "Producent", "Model", "Numer seryjny", "Numer inwentarzowy", "Asset ID"],
            rows: assets.map(function (asset) {
                asset = asset || {};
                return {
                    "Operacja": String(asset.actionLabel || ""),
                    "Hostname": String(asset.hostname || ""),
                    "Producent": String(asset.manufacturer || ""),
                    "Model": String(asset.model || ""),
                    "Numer seryjny": String(asset.serialNumber || ""),
                    "Numer inwentarzowy": String(asset.inventoryNumber || ""),
                    "Asset ID": String(asset.assetIdentifier || "")
                };
            })
        });
    }

    function renderResult(host, request) {
        request = request || {};
        host.innerHTML = "";
        if (request.status === "pending" || request.status === "approved" || request.status === "executing" || request.status === "confirming") {
            var waiting = document.createElement("pre");
            waiting.className = "mc-shared-output";
            waiting.textContent = requestOutput(request);
            host.appendChild(waiting);
            return;
        }
        if (request.status === "failed" || request.status === "rejected") host.classList.add("mc-shared-error");
        else host.classList.remove("mc-shared-error");
        var heading = protocolHeading(request);
        var originalOutput = requestOutput(request);
        window.SharedResultsView.mountResult(host, heading ? protocolEquipmentOutput(request) : originalOutput, {
            title: request.title || "Result",
            heading: heading,
            debugValue: heading ? (request.result && request.result.rawOutput != null ? request.result.rawOutput : originalOutput) : null
        });
        appendArtifactActions(host, request);
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

    function renderProtocolProgress(resultHost, request, progress) {
        resultHost.innerHTML = "";
        resultHost.classList.remove("mc-shared-error");
        var bar = document.createElement("progress");
        bar.className = "mc-script-protocol-progress";
        bar.max = 100;
        bar.value = Math.max(0, Math.min(100, Number(progress && progress.percent) || 0));
        var label = document.createElement("div");
        label.className = "mc-shared-muted";
        if (request.status === "pending" || request.status === "approved") label.textContent = "Waiting for approval.";
        else label.textContent = (progress && progress.stage || "Executing...") + " — " + bar.value + "%";
        resultHost.appendChild(bar);
        resultHost.appendChild(label);
    }

    function pollProtocol(shell, script, request, resultHost, sequence, attempt, button) {
        if (sequence !== progressSequence) return;
        attempt = Number(attempt) || 0;
        if (attempt >= 900) {
            switchToResult(shell.state.page.details, resultHost, "Protocol progress timed out.");
            if (button) button.disabled = false;
            return;
        }
        shell.api("progress", { id: request.id }).then(function (response) {
            if (sequence !== progressSequence) return;
            var current = response.request || request;
            var currentProgress = response.progress || {};
            outputs[script.path] = current;
            if (["awaiting_confirmation", "completed", "failed", "rejected", "superseded"].indexOf(String(current.status || "")) >= 0) {
                renderResult(resultHost, current);
                if (button) button.disabled = false;
                sync(shell);
                return;
            }
            renderProtocolProgress(resultHost, current, currentProgress);
            window.setTimeout(function () {
                pollProtocol(shell, script, current, resultHost, sequence, attempt + 1, button);
            }, 1000);
        }).catch(function (error) {
            if (sequence !== progressSequence) return;
            resultHost.innerHTML = "";
            resultHost.classList.add("mc-shared-error");
            resultHost.textContent = error.message || String(error);
            if (button) button.disabled = false;
        });
    }

    // #407: File values chosen in the shared parameter dialog are read only now, on submit,
    // and sent as bounded base64 next to the ordinary values; the server validates them again.
    function isFileValue(value) {
        return !!value && typeof value === "object" && typeof value.name === "string" && typeof value.size === "number" && typeof value.slice === "function";
    }
    function readFile(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () {
                var result = String(reader.result || "");
                var comma = result.indexOf(",");
                resolve({ name: String(file.name || "upload"), data: comma >= 0 ? result.slice(comma + 1) : "" });
            };
            reader.onerror = function () { reject(new Error("The selected file could not be read.")); };
            reader.readAsDataURL(file);
        });
    }
    function splitFileValues(values) {
        var plain = {};
        var names = [];
        Object.keys(values || {}).forEach(function (name) {
            var value = values[name];
            if (isFileValue(value)) names.push(name);
            else if (value !== null) plain[name] = value;
        });
        return Promise.all(names.map(function (name) { return readFile(values[name]); })).then(function (contents) {
            var files = {};
            names.forEach(function (name, index) { files[name] = contents[index]; });
            return { values: plain, files: files };
        });
    }

    function submit(shell, script, button, values, detailsHost, resultHost, errorHost) {
        var executionKey = String(script && script.path || "");
        if (executionKey && executionsInFlight[executionKey]) return executionsInFlight[executionKey];

        var operation = confirmExecution(script, button || document.activeElement).then(function (confirmed) {
            if (!confirmed) return;
            if (button) button.disabled = true;
            switchToResult(detailsHost, resultHost, "Executing script...");

            var sequence = ++progressSequence;
            var protocolPending = false;
            return splitFileValues(values).then(function (prepared) {
                return shell.post("request", {
                    scriptPath: script.path,
                    variableValues: prepared.values,
                    files: prepared.files,
                    confirmedExecution: script.confirmExecution === true,
                    note: ""
                });
            }).then(function (response) {
                var request = response.request || {};
                outputs[script.path] = request;
                if (response.protocol === true && request.id) {
                    protocolPending = true;
                    pollProtocol(shell, script, request, resultHost, sequence, 0, button);
                } else renderResult(resultHost, request);
            }).catch(function (error) {
                var request = {
                    status: "failed",
                    title: script.label || script.name,
                    result: { message: error.message || String(error) }
                };
                outputs[script.path] = request;
                renderResult(resultHost, request);
            }).then(function () {
                if (button && !protocolPending) button.disabled = false;
                sync(shell);
            });
        }).catch(function (error) {
            if (errorHost) showValidationError(shell, errorHost, error);
            else {
                switchToResult(detailsHost, resultHost, error.message || String(error));
                resultHost.classList.add("mc-shared-error");
            }
        });

        if (!executionKey) return operation;
        executionsInFlight[executionKey] = operation;
        return operation.then(function (value) {
            delete executionsInFlight[executionKey];
            return value;
        }, function (error) {
            delete executionsInFlight[executionKey];
            throw error;
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

            if (executeOnSelect === true && hasVariables) {
                sync(shell);
                if (!tools || typeof tools.openParameterDialog !== "function") {
                    switchToResult(detailsHost, resultHost, "Native MeshCentral parameter dialog is unavailable.");
                    resultHost.classList.add("mc-shared-error");
                    return;
                }
                tools.openParameterDialog({
                    item: script,
                    trigger: document.activeElement,
                    primaryLabel: script.requiresApproval ? "Request" : "Run"
                }).then(function (values) {
                    if (values == null) return;
                    submit(shell, script, null, values, detailsHost, resultHost, null);
                }).catch(function (error) {
                    switchToResult(detailsHost, resultHost, error.message || String(error));
                    resultHost.classList.add("mc-shared-error");
                });
                return;
            }

            var card = shell.card(script.label || script.name, script.description || script.path);
            card.classList.add("mc-script-run-card");
            if (typeof tools.appendRebootNotice === "function") tools.appendRebootNotice(card, script);

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
                    item: script,
                    trigger: button,
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
        }).catch(function (error) {
            shell.error(shell.state.page.details, error);
        });
    }

    function actions(shell, script) {
        var definitions = tools.scriptActions(script, {
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
            onLinkCopied: function (item) {}
        });
        if (tools.state.editMode && admin(shell) && !definitions.some(function (definition) {
            return definition && definition.key === "credentials";
        })) {
            var enabled = usesCredentials(script);
            definitions.unshift({
                key: "credentials",
                icon: "key",
                disabled: !enabled,
                className: "mc-tree-credential-action",
                title: enabled ? "Configure script credentials" : "This script does not use credentials",
                onClick: enabled ? function () {
                    treeState.selectedScript = script.path;
                    tools.openCredentialsEditor(shell, script, function () {
                        note(shell, "Credentials saved", "Encrypted credentials for this script were updated.");
                    });
                } : null
            });
        }
        return definitions;
    }

    function primary(shell, host) {
        window.SharedCatalogView.mount({
            primaryContainer: shell.state.page.primary,
            treeContainer: host,
            tree: tree,
            state: treeState,
            search: shell.state.search,
            resultsActive: mode === "results",
            extraItems: admin(shell) ? [{
                key: "vulnerabilities", label: vulnMsg("Podatności", "Vulnerabilities"), iconMarkup: VULN_ICON, active: mode === "vulnerabilities",
                onClick: function () { progressSequence++; mode = "vulnerabilities"; treeState.selectedScript = ""; vulnState.data = null; vulnState.error = null; vulnState.page = 1; shell.render(); }
            }] : [],
            emptyText: tools.state.favoritesOnly ? "No favorite scripts found." : "No scripts found.",
            filterScript: tools.filterScript,
            scriptActions: function (script) { return actions(shell, script); },
            onResults: function () {
                progressSequence++;
                mode = "results";
                treeState.selectedScript = "";
                shell.render();
            },
            onRootSelect: function () {
                progressSequence++;
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

    function resultActions(cell, row) {
        certificateArtifacts(row).forEach(function (artifact) {
            cell.appendChild(certificateButton(artifact, "btn btn-secondary btn-sm"));
        });
        var artifacts = pdfArtifacts(row);
        if (!artifacts.length) return;
        artifacts.forEach(function (artifact) {
            var open = document.createElement("button");
            open.type = "button";
            open.className = "btn btn-secondary btn-sm";
            open.textContent = "Open PDF";
            open.onclick = function () { window.open(artifactUrl(artifact, "open"), "_blank", "noopener"); };
            cell.appendChild(open);

            var download = document.createElement("button");
            download.type = "button";
            download.className = "btn btn-secondary btn-sm";
            download.textContent = "Download PDF";
            download.onclick = function () { window.location.href = artifactUrl(artifact, "download"); };
            cell.appendChild(download);
        });
    }

    function results(shell) {
        progressSequence++;
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
                actions: resultActions,
                emptyText: "No script results match the selected status."
            });
            sync(shell);
        });
    }

    // All-host Nessus table for Site Admin (#425 follow-up): per-column filters
    // in the table header, sorting, paging and CSV export of the filtered rows.
    function vulnMsg(polish, english) {
        var language = "";
        try { language = window.localStorage.getItem("sirkPortal.language") || ""; } catch (error) {}
        if (!language) language = String(document.documentElement.lang || navigator.language || "");
        return /^pl/i.test(language) ? polish : english;
    }
    function vulnRiskLabel(risk) {
        var labels = { critical: ["Krytyczne", "Critical"], high: ["Wysokie", "High"], medium: ["Średnie", "Medium"], low: ["Niskie", "Low"], info: ["Info", "Info"] };
        var value = labels[risk] || [risk, risk];
        return vulnMsg(value[0], value[1]);
    }
    function loadAllVulnerabilities(shell, force) {
        if (vulnState.loading || (vulnState.data && force !== true)) return;
        var sequence = ++vulnState.sequence;
        vulnState.loading = true;
        vulnState.error = null;
        shell.api("vulnerabilities-all").then(function (response) {
            if (sequence !== vulnState.sequence) return;
            vulnState.loading = false;
            vulnState.data = response;
            if (mode === "vulnerabilities") shell.render();
        }).catch(function (error) {
            if (sequence !== vulnState.sequence) return;
            vulnState.loading = false;
            vulnState.error = error && error.message || String(error);
            if (mode === "vulnerabilities") shell.render();
        });
    }
    function allVulnerabilityRows() {
        var rows = [];
        (vulnState.data && vulnState.data.hosts || []).forEach(function (host) {
            (host.findings || []).forEach(function (finding) {
                var fields = finding.fields || {};
                rows.push({
                    host: host.host || host.hostOriginal || "",
                    hostOs: host.hostOs || "",
                    scan: host.generationDate || "",
                    stale: host.stale === true,
                    risk: finding.risk,
                    score: finding.score,
                    exploit: finding.exploit === true,
                    excluded: finding.excluded === true,
                    exclusion: finding.exclusion || null,
                    repaired: finding.repaired === true,
                    repair: finding.repair || null,
                    remediation: finding.remediation || null,
                    note: finding.note || null,
                    pluginId: String(fields["Plugin ID"] || ""),
                    name: String(fields["Plugin Name"] || ""),
                    occurrences: finding.occurrences || 1,
                    fields: fields
                });
            });
        });
        return rows;
    }
    function filteredVulnerabilityRows() {
        var f = vulnState.filters;
        var host = f.host.trim().toLowerCase(), plugin = f.pluginId.trim(), name = f.name.trim().toLowerCase();
        var minScore = f.minScore === "" ? null : Number(f.minScore);
        var rows = allVulnerabilityRows().filter(function (row) {
            if (vulnState.risk && row.risk !== vulnState.risk) return false;
            if (host && row.host.toLowerCase().indexOf(host) < 0) return false;
            if (plugin && row.pluginId.indexOf(plugin) !== 0) return false;
            if (name && row.name.toLowerCase().indexOf(name) < 0) return false;
            if (minScore != null && !isNaN(minScore) && !(Number(row.score) >= minScore)) return false;
            if (f.exploit && row.exploit !== (f.exploit === "yes")) return false;
            if (f.fix === "active" && (row.excluded || row.repaired)) return false;
            if (f.fix === "fix" && (row.excluded || row.repaired || !row.remediation)) return false;
            if (f.fix === "excluded" && !row.excluded) return false;
            if (f.fix === "repaired" && !row.repaired) return false;
            return true;
        });
        var direction = vulnState.desc ? -1 : 1;
        rows.sort(function (a, b) {
            var key = vulnState.sort, result = 0;
            if (key === "risk") result = VULN_RISKS.indexOf(a.risk) - VULN_RISKS.indexOf(b.risk) || (Number(b.score) || 0) - (Number(a.score) || 0);
            else if (key === "score") result = (Number(a.score) || 0) - (Number(b.score) || 0);
            else if (key === "exploit") result = (a.exploit ? 1 : 0) - (b.exploit ? 1 : 0);
            else result = String(a[key] || "").localeCompare(String(b[key] || ""), undefined, { numeric: true });
            return result * direction || a.host.localeCompare(b.host);
        });
        return rows;
    }
    function csvCell(value) {
        var textValue = String(value == null ? "" : value);
        if (/^[=+\-@\t\r]/.test(textValue)) textValue = "'" + textValue;
        return '"' + textValue.replace(/"/g, '""') + '"';
    }
    function exportVulnerabilities(rows) {
        var header = ["Host", "Risk", "Plugin ID", "Plugin Name", "Score", "Exploit", "Excluded", "Remediation", "Host OS", "Scan", "Occurrences", "Repair"];
        var lines = [header.map(csvCell).join(";")].concat(rows.map(function (row) {
            return [row.host, row.risk, row.pluginId, row.name, row.score == null ? "" : row.score, row.exploit ? "True" : "False", row.excluded ? "True" : "False", row.remediation ? row.remediation.scriptPath : "", row.hostOs, row.scan, row.occurrences, repairText(row)].map(csvCell).join(";");
        }));
        var blob = new Blob(["﻿" + lines.join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" });
        var link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "vulnerabilities-" + new Date().toISOString().slice(0, 10) + ".csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(link.href); }, 0);
    }
    // "Repair" value: the exporter's CSV value, or the time a pinned remediation
    // was run from the portal (hidden until a newer scan reports it again).
    function repairText(row) {
        var repair = row.repaired && row.repair;
        if (!repair) return "";
        if (repair.source === "csv") return repair.value || repair.repairedAt || "True";
        return repair.repairedAt ? new Date(repair.repairedAt).toISOString().replace("T", " ").slice(0, 19) : "True";
    }
    function vulnerabilityDetail(row) {
        var extra = [{ Field: "Occurrences", Value: String(row.occurrences) }];
        if (row.excluded) extra.push({ Field: vulnMsg("Wykluczenie", "Exclusion"), Value: (row.exclusion && row.exclusion.reason || "—") + (row.exclusion && row.exclusion.expires ? " (" + row.exclusion.expires + ")" : "") });
        if (row.note) extra.push({ Field: vulnMsg("Opis", "Description"), Value: row.note.reason });
        if (row.remediation) extra.push({ Field: vulnMsg("Naprawa", "Remediation"), Value: row.remediation.scriptPath });
        if (row.repaired) extra.push({ Field: vulnMsg("Naprawione", "Repaired"), Value: repairText(row) + (row.repair && row.repair.by ? " (" + row.repair.by + ")" : "") + (row.repair && row.repair.source === "portal" ? vulnMsg(" — z portalu, ukryte do następnego skanu", " — from the portal, hidden until the next scan") : "") });
        return JSON.stringify({ meshTable: true, title: vulnMsg("Szczegóły podatności", "Vulnerability details"), columns: ["Field", "Value"], rows: Object.keys(row.fields).map(function (key) { return { Field: key, Value: String(row.fields[key] == null ? "" : row.fields[key]) }; }).concat(extra) });
    }
    function vulnerabilities(shell) {
        primary(shell, document.createElement("div"));
        loadAllVulnerabilities(shell, false);
        var all = allVulnerabilityRows().filter(function (row) { return !row.excluded && !row.repaired; });
        var counts = {};
        all.forEach(function (row) { counts[row.risk] = (counts[row.risk] || 0) + 1; });
        var items = [{ key: "", title: vulnMsg("Wszystkie", "All"), icon: VULN_ICON, badge: vulnState.data ? all.length : null }].concat(VULN_RISKS.map(function (risk) {
            return { key: risk, title: vulnRiskLabel(risk), icon: VULN_ICON, badge: vulnState.data ? counts[risk] || 0 : null };
        }));
        window.SharedResultsView.mountStatus(shell.state.page.secondary, { selected: vulnState.risk, items: items, onSelect: function (value) { vulnState.risk = value; vulnState.page = 1; shell.render(); } });
        var details = shell.state.page.details;
        details.innerHTML = "";
        if (vulnState.error) {
            var failed = shell.card(vulnMsg("Podatności", "Vulnerabilities"), vulnMsg("Nie można odczytać podatności: ", "Cannot read vulnerabilities: ") + vulnState.error);
            failed.classList.add("mc-shared-error");
            details.appendChild(failed);
            sync(shell);
            return;
        }
        if (!vulnState.data) {
            details.appendChild(shell.card(vulnMsg("Podatności", "Vulnerabilities"), vulnMsg("Wczytywanie danych Nessus…", "Loading Nessus data…")));
            sync(shell);
            return;
        }
        var importState = vulnState.data.import || {};
        var summary = shell.card(vulnMsg("Podatności — wszystkie hosty", "Vulnerabilities — all hosts"),
            vulnMsg("Hosty: ", "Hosts: ") + (vulnState.data.hosts || []).length + " · " + vulnMsg("Import: ", "Imported: ") + (importState.importedAt ? new Date(importState.importedAt).toLocaleString() : "—"));
        if (importState.lastError) summary.appendChild(shell.element("div", "mc-shared-error", vulnMsg("Ostatni błąd importu: ", "Last import error: ") + importState.lastError.reason));
        details.appendChild(summary);

        var wrap = shell.element("div", "mc-vuln-table-wrap");
        var table = document.createElement("table");
        table.className = "mc-vuln-table";
        var columns = [
            { key: "host", title: "Host", filter: "host" },
            { key: "risk", title: vulnMsg("Ryzyko", "Risk") },
            { key: "pluginId", title: "Plugin ID", filter: "pluginId" },
            { key: "name", title: vulnMsg("Nazwa", "Name"), filter: "name" },
            { key: "score", title: "Score", filter: "minScore" },
            { key: "exploit", title: "Exploit", filter: "exploit" },
            { key: "fix", title: vulnMsg("Naprawa", "Fix"), filter: "fix" },
            { key: "scan", title: vulnMsg("Skan", "Scan") }
        ];
        var head = table.createTHead();
        var titles = head.insertRow();
        var filters = head.insertRow();
        filters.className = "mc-vuln-filter-row";
        var body = table.createTBody();
        var pager = shell.element("div", "mc-script-manage-actions mc-vuln-pager");
        function fill() {
            var rows = filteredVulnerabilityRows();
            var pages = Math.max(1, Math.ceil(rows.length / VULN_PAGE_SIZE));
            vulnState.page = Math.min(Math.max(1, vulnState.page), pages);
            body.innerHTML = "";
            rows.slice((vulnState.page - 1) * VULN_PAGE_SIZE, vulnState.page * VULN_PAGE_SIZE).forEach(function (row) {
                var tr = body.insertRow();
                tr.className = "mc-vuln-row" + (row.excluded || row.repaired ? " is-excluded" : "");
                tr.tabIndex = 0;
                [row.host + (row.stale ? vulnMsg(" (nieaktualny)", " (stale)") : ""), vulnRiskLabel(row.risk), row.pluginId, row.name, row.score == null ? "—" : String(row.score), row.exploit ? vulnMsg("Tak", "Yes") : vulnMsg("Nie", "No"),
                    row.excluded ? vulnMsg("wykluczone", "excluded") : row.repaired ? vulnMsg("naprawione ", "repaired ") + repairText(row) : row.remediation ? row.remediation.scriptPath : row.note ? row.note.reason : "—", row.scan].forEach(function (value, index) {
                    var cell = tr.insertCell();
                    cell.textContent = value;
                    if (index === 1) cell.className = "mc-vulnerability-risk mc-vulnerability-risk-" + row.risk;
                });
                function open() { window.SharedResultsView.openViewer(row, { resultValue: vulnerabilityDetail, title: vulnMsg("Szczegóły podatności", "Vulnerability details") }); }
                tr.onclick = open;
                tr.onkeydown = function (event) { if (event.key === "Enter") { event.preventDefault(); open(); } };
            });
            if (!rows.length) {
                var empty = body.insertRow().insertCell();
                empty.colSpan = columns.length;
                empty.className = "mc-shared-muted";
                empty.textContent = vulnMsg("Brak podatności dla wybranych filtrów.", "No vulnerabilities match the selected filters.");
            }
            pager.innerHTML = "";
            var prev = shell.element("button", "btn btn-secondary", "‹"); prev.type = "button"; prev.disabled = vulnState.page <= 1; prev.onclick = function () { vulnState.page--; fill(); };
            var next = shell.element("button", "btn btn-secondary", "›"); next.type = "button"; next.disabled = vulnState.page >= pages; next.onclick = function () { vulnState.page++; fill(); };
            var exportButton = shell.element("button", "btn btn-secondary", vulnMsg("Eksport CSV (", "Export CSV (") + rows.length + ")"); exportButton.type = "button"; exportButton.disabled = !rows.length;
            exportButton.onclick = function () { exportVulnerabilities(rows); };
            pager.appendChild(prev);
            pager.appendChild(shell.element("span", "mc-shared-muted", vulnState.page + " / " + pages + " (" + rows.length + ")"));
            pager.appendChild(next);
            pager.appendChild(exportButton);
        }
        columns.forEach(function (column) {
            var th = document.createElement("th");
            var sortButton = shell.element("button", "mc-vuln-sort", column.title + (vulnState.sort === column.key ? (vulnState.desc ? " ▼" : " ▲") : ""));
            sortButton.type = "button";
            sortButton.onclick = function () {
                if (vulnState.sort === column.key) vulnState.desc = !vulnState.desc;
                else { vulnState.sort = column.key; vulnState.desc = column.key === "score" || column.key === "exploit"; }
                vulnState.page = 1;
                shell.render();
            };
            th.appendChild(sortButton);
            titles.appendChild(th);
            var cell = document.createElement("th");
            var control = null;
            if (column.filter === "exploit" || column.filter === "fix") {
                control = document.createElement("select");
                var options = column.filter === "exploit"
                    ? [["", vulnMsg("Wszystkie", "All")], ["yes", vulnMsg("Tak", "Yes")], ["no", vulnMsg("Nie", "No")]]
                    : [["active", vulnMsg("Aktywne", "Active")], ["fix", vulnMsg("Z naprawą", "With fix")], ["excluded", vulnMsg("Wykluczone", "Excluded")], ["repaired", vulnMsg("Naprawione", "Repaired")], ["all", vulnMsg("Wszystkie", "All")]];
                options.forEach(function (option) { var item = document.createElement("option"); item.value = option[0]; item.textContent = option[1]; control.appendChild(item); });
                control.onchange = function () { vulnState.filters[column.filter] = control.value; vulnState.page = 1; fill(); };
            } else if (column.filter) {
                control = document.createElement("input");
                control.type = column.filter === "minScore" ? "number" : "search";
                if (column.filter === "minScore") { control.min = "0"; control.max = "10"; control.step = "0.1"; control.placeholder = "≥"; }
                else control.placeholder = vulnMsg("Filtruj", "Filter");
                control.oninput = function () { vulnState.filters[column.filter] = control.value; vulnState.page = 1; fill(); };
            }
            if (control) {
                control.className = "mc-definition-input mc-vuln-filter";
                control.value = vulnState.filters[column.filter];
                control.setAttribute("aria-label", column.title);
                if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.control === "function") window.MeshThemeAdapter.control(control);
                cell.appendChild(control);
            }
            filters.appendChild(cell);
        });
        wrap.appendChild(table);
        details.appendChild(wrap);
        details.appendChild(pager);
        fill();
        sync(shell);
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
        if (mode === "vulnerabilities") { vulnState.data = null; vulnState.error = null; loadAllVulnerabilities(shell, true); shell.render(); return; }
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
                return mode === "results" ? results(shell) : mode === "vulnerabilities" && admin(shell) ? vulnerabilities(shell) : scripts(shell);
            });
        }
    });

    if (tools && typeof tools.setParameterOptionProvider === "function") {
        tools.setParameterOptionProvider(function (variable, values, item) {
            var control = String(variable && variable.control || "").toLowerCase();
            if (!item || !item.path || (control !== "user" && control !== "asset" && control !== "assetmulti")) return [];
            return module.api.post("variable-options", {
                scriptPath: item.path,
                variableName: variable.name,
                values: values || {}
            }).then(function (response) {
                return response && Array.isArray(response.items) ? response.items : [];
            });
        });
    }

    window.SirkPlatformModules.myscripts = module;
}());
