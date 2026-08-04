(function () {
    "use strict";

    if (window.__sirkDownloadResultsInstalled) return;
    window.__sirkDownloadResultsInstalled = true;

    var commandSelectionSequence = 0;

    function language() {
        try { return localStorage.getItem("sirkPortal.language") === "en" ? "en" : "pl"; }
        catch (error) { return "pl"; }
    }

    function parseOutput(value) {
        var raw = String(value == null ? "" : value);
        var visible = [];
        var downloadPath = "";

        raw.split(/\r?\n/).forEach(function (line) {
            var trimmed = String(line || "").trim();
            var marker = trimmed.match(/^CSV_DOWNLOAD:\s*(.+)$/i);
            if (marker) {
                downloadPath = marker[1].trim();
                return;
            }
            if (/^__(?:MYCOMMANDS|COMMANDTABS)_PROGRESS__/i.test(trimmed)) return;
            visible.push(line);
        });

        while (visible.length && !String(visible[0]).trim()) visible.shift();
        while (visible.length && !String(visible[visible.length - 1]).trim()) visible.pop();

        return {
            raw: raw,
            visible: visible.join("\n"),
            downloadPath: downloadPath
        };
    }

    function downloadUrl(filePath) {
        var url = new URL("pluginadmin.ashx", window.location.href);
        url.searchParams.set("pin", window.__SIRK_PLATFORM_PIN__ || "SIRKPortal");
        url.searchParams.set("asset", "download");
        url.searchParams.set("path", filePath);
        return url.href;
    }

    function appendDownload(host, filePath) {
        if (!host || !filePath) return;
        var actions = host.querySelector(".mc-results-inline-actions, .mc-results-viewer-actions");
        if (!actions || actions.querySelector("[data-sirk-download]")) return;

        var link = document.createElement("a");
        link.className = "btn btn-primary btn-sm";
        link.setAttribute("data-sirk-download", "true");
        link.href = downloadUrl(filePath);
        link.textContent = language() === "pl" ? "Pobierz" : "Download";
        actions.insertBefore(link, actions.firstChild);
    }

    function restoreRawDebug(host, raw) {
        if (!host) return;
        var debug = host.querySelector(".mc-results-debug pre");
        if (debug) debug.textContent = raw;
    }

    function cleanVisibleOutput(host, visible) {
        if (!host) return;
        var output = host.querySelector(".mc-results-viewer-output");
        if (output) output.textContent = visible || (language() === "pl" ? "Brak wyniku." : "No output.");
    }

    function enhanceHost(host) {
        if (!host) return;
        var debug = host.querySelector(".mc-results-debug pre");
        if (!debug) return;
        var parsed = parseOutput(debug.textContent);
        if (!parsed.downloadPath) return;
        cleanVisibleOutput(host, parsed.visible);
        appendDownload(host, parsed.downloadPath);
    }

    function installMountHook() {
        var view = window.SharedResultsView;
        if (!view || typeof view.mountResult !== "function" || view.mountResult.__sirkDownloadWrapped) return false;

        var original = view.mountResult;
        var wrapped = function (host, value, options) {
            var parsed = parseOutput(value);
            var result = original.call(view, host, parsed.visible, options);
            restoreRawDebug(host, parsed.raw);
            appendDownload(host, parsed.downloadPath);
            return result;
        };
        wrapped.__sirkDownloadWrapped = true;
        view.mountResult = wrapped;
        return true;
    }

    function validNodeId(value) {
        return /^node\/[^/]+\/[^/]+$/.test(String(value == null ? "" : value).trim());
    }

    function nodeIdFrom(value) {
        if (!value) return "";
        if (typeof value === "string") return validNodeId(value) ? value.trim() : "";
        var candidates = [value._id, value.nodeid, value.nodeId, value.id];
        for (var index = 0; index < candidates.length; index += 1) {
            if (validNodeId(candidates[index])) return String(candidates[index]).trim();
        }
        return "";
    }

    function currentDeviceNodeId(fallback) {
        var runtime = window.SirkPlatformRuntime;
        var candidates = [
            window.currentNode,
            runtime && runtime.state && runtime.state.currentNode,
            fallback,
            runtime && runtime.state && runtime.state.nodeId,
            window.selectedNode
        ];
        for (var index = 0; index < candidates.length; index += 1) {
            var value = nodeIdFrom(candidates[index]);
            if (value) return value;
        }
        return "";
    }

    function installCommandNodeResolver() {
        var core = window.SirkPlatformCore;
        if (!core || typeof core.post !== "function" || core.post.__sirkCommandNodeResolver) return false;

        var original = core.post;
        var wrapped = function (moduleName, assetName, values) {
            if (String(moduleName || "").toLowerCase() === "mycommands" &&
                String(assetName || "").toLowerCase() === "execute") {
                var nodeId = currentDeviceNodeId(values && values.nodeId);
                if (!nodeId) {
                    return Promise.reject(new Error(language() === "pl"
                        ? "Nie można ustalić identyfikatora bieżącego urządzenia. Odśwież kartę urządzenia."
                        : "Unable to determine the current device identifier. Refresh the device page."));
                }
                values = Object.assign({}, values || {}, { nodeId: nodeId });
            }
            return original.call(core, moduleName, assetName, values);
        };
        wrapped.__sirkCommandNodeResolver = true;
        core.post = wrapped;
        return true;
    }

    function ensureCommandRunStyle() {
        if (document.getElementById("sirk-command-run-style")) return;
        var style = document.createElement("style");
        style.id = "sirk-command-run-style";
        style.textContent = [
            ".mc-command-run-button{",
            "display:inline-flex!important;align-items:center!important;justify-content:center!important;",
            "min-width:96px!important;min-height:34px!important;padding:7px 14px!important;",
            "margin:10px 0!important;border:1px solid #3158bd!important;border-radius:5px!important;",
            "background:#3867d6!important;color:#fff!important;font-weight:700!important;",
            "visibility:visible!important;opacity:1!important;position:relative!important;z-index:2!important}",
            ".mc-command-run-button:hover{background:#3158bd!important}",
            ".mc-command-run-button:disabled{opacity:.6!important;cursor:wait!important}"
        ].join("");
        (document.head || document.documentElement).appendChild(style);
    }

    function addRunAsOption(select, value, label) {
        var option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
    }

    function normalizeRunAsEditors() {
        document.querySelectorAll(
            ".mc-shared-page-mycommands .mc-script-definition-form .mc-definition-section"
        ).forEach(function (section) {
            if (section.getAttribute("data-sirk-run-as-fixed") === "1") return;
            var heading = section.querySelector("h4");
            if (!heading || String(heading.textContent || "").trim().toLowerCase() !== "execution") return;

            var select = section.querySelector("select.mc-definition-type, select.mc-definition-input, select");
            if (!select) return;
            var values = Array.prototype.map.call(select.options || [], function (option) {
                return String(option.value);
            });
            if (values.indexOf("0") < 0 || (values.indexOf("1") < 0 && values.indexOf("2") < 0)) return;

            var selected = String(select.value) === "0" ? "0" : "2";
            select.innerHTML = "";
            addRunAsOption(select, "0", "SYSTEM");
            addRunAsOption(select, "2", language() === "pl" ? "Zalogowany użytkownik" : "Logged-on user");
            select.value = selected;
            select.setAttribute("data-sirk-run-as-mode", "system-or-user-only");

            var note = document.createElement("div");
            note.className = "mc-shared-muted sirk-run-as-note";
            note.textContent = language() === "pl"
                ? "SYSTEM uruchamia skrypt jako konto usługi MeshAgent. Zalogowany użytkownik wymaga aktywnej sesji i nie przechodzi awaryjnie na SYSTEM."
                : "SYSTEM runs through the MeshAgent service account. Logged-on user requires an active session and never falls back to SYSTEM.";
            section.appendChild(note);
            section.setAttribute("data-sirk-run-as-fixed", "1");
        });
    }

    function commandPage() {
        return document.querySelector(".mc-shared-page-mycommands");
    }

    function currentRunButtons() {
        var page = commandPage();
        return page ? Array.prototype.slice.call(page.querySelectorAll(".mc-command-run-button")) : [];
    }

    function newRunButton(previousButtons) {
        var buttons = currentRunButtons();
        for (var index = buttons.length - 1; index >= 0; index -= 1) {
            if (buttons[index].isConnected && previousButtons.indexOf(buttons[index]) < 0) return buttons[index];
        }
        return null;
    }

    function hasRuntimeVariables(button) {
        var card = button && typeof button.closest === "function"
            ? button.closest(".mc-shared-card, section")
            : null;
        return !!(card && card.querySelector(
            ".mc-script-runtime-variables input, " +
            ".mc-script-runtime-variables select, " +
            ".mc-script-runtime-variables textarea"
        ));
    }

    function scheduleSelectedRun(sequence, previousButtons, attempt) {
        if (sequence !== commandSelectionSequence) return;

        var button = newRunButton(previousButtons);
        if (!button) {
            if (attempt < 200) {
                window.setTimeout(function () {
                    scheduleSelectedRun(sequence, previousButtons, attempt + 1);
                }, 50);
            }
            return;
        }

        if (hasRuntimeVariables(button)) return;
        if (button.getAttribute("data-sirk-auto-run") === String(sequence)) return;
        if (button.disabled) {
            if (attempt < 200) {
                window.setTimeout(function () {
                    scheduleSelectedRun(sequence, previousButtons, attempt + 1);
                }, 50);
            }
            return;
        }

        button.setAttribute("data-sirk-auto-run", String(sequence));
        button.click();
    }

    function beginSelectedRun(previousButtons) {
        ensureCommandRunStyle();
        var sequence = ++commandSelectionSequence;
        previousButtons = Array.isArray(previousButtons) ? previousButtons : currentRunButtons();
        window.setTimeout(function () {
            scheduleSelectedRun(sequence, previousButtons, 0);
        }, 0);
    }

    function installCommandsCatalogHook() {
        if (window.__sirkNativeCommandAutoRun === true) return true;
        var catalog = window.SharedCatalogView;
        if (!catalog || typeof catalog.mount !== "function" || catalog.mount.__sirkCommandAutoRunWrapped) return false;

        var original = catalog.mount;
        var wrapped = function (options) {
            var effectiveOptions = options;
            if (options && typeof options.onScript === "function") {
                effectiveOptions = Object.assign({}, options);
                var originalOnScript = options.onScript;
                effectiveOptions.onScript = function (item) {
                    var previousButtons = currentRunButtons();
                    var result = originalOnScript(item);
                    beginSelectedRun(previousButtons);
                    return result;
                };
            }
            return original.call(catalog, effectiveOptions);
        };
        wrapped.__sirkCommandAutoRunWrapped = true;
        catalog.mount = wrapped;
        return true;
    }

    document.addEventListener("click", function (event) {
        if (window.__sirkNativeCommandAutoRun === true) return;
        var target = event.target && event.target.closest
            ? event.target.closest(".mc-shared-page-mycommands .mc-tree-script")
            : null;
        if (!target) return;

        beginSelectedRun(currentRunButtons());
    }, true);

    function scan() {
        installCommandNodeResolver();
        ensureCommandRunStyle();
        normalizeRunAsEditors();
        installMountHook();
        installCommandsCatalogHook();
        document.querySelectorAll(".mc-results-viewer, .mc-script-output, .mc-shared-result").forEach(enhanceHost);
    }

    scan();

    if (typeof MutationObserver === "function") {
        var pending = false;
        new MutationObserver(function () {
            if (pending) return;
            pending = true;
            window.setTimeout(function () {
                pending = false;
                scan();
            }, 0);
        }).observe(document.documentElement, { childList: true, subtree: true });
    }
}());
