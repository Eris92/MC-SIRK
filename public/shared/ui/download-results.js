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

    function isCommandsCatalog(options) {
        var children = options && options.tree && Array.isArray(options.tree.children) ? options.tree.children : [];
        var paths = children.map(function (item) { return String(item && item.path || ""); });
        return paths.indexOf("@menu/scripts") >= 0 && paths.some(function (value) {
            return /^@menu\/(?:network|system|other)$/i.test(value);
        });
    }

    function runtimeVariableFields(button) {
        var card = button && typeof button.closest === "function"
            ? button.closest(".mc-admin-card, .mc-shared-card, .mc-card, section")
            : null;
        card = card || button && button.parentElement;
        return card && card.querySelector(".mc-script-runtime-variables input, .mc-script-runtime-variables select, .mc-script-runtime-variables textarea");
    }

    function scheduleAutomaticRun(item, sequence, previousButtons, attempt) {
        if (sequence !== commandSelectionSequence) return;
        if (item && Array.isArray(item.variables) && item.variables.length) return;

        var buttons = Array.prototype.slice.call(document.querySelectorAll(".mc-command-run-button"));
        var button = null;
        for (var index = buttons.length - 1; index >= 0; index--) {
            if (previousButtons.indexOf(buttons[index]) < 0 && buttons[index].isConnected) {
                button = buttons[index];
                break;
            }
        }

        if (!button) {
            if (attempt < 80) {
                window.setTimeout(function () {
                    scheduleAutomaticRun(item, sequence, previousButtons, attempt + 1);
                }, 50);
            }
            return;
        }

        if (runtimeVariableFields(button)) return;
        if (button.disabled || button.getAttribute("data-sirk-auto-run") === String(sequence)) return;

        button.setAttribute("data-sirk-auto-run", String(sequence));
        button.click();
    }

    function installCommandsCatalogHook() {
        var catalog = window.SharedCatalogView;
        if (!catalog || typeof catalog.mount !== "function" || catalog.mount.__sirkCommandAutoRunWrapped) return false;

        var original = catalog.mount;
        var wrapped = function (options) {
            var effectiveOptions = options;
            if (isCommandsCatalog(options) && typeof options.onScript === "function") {
                effectiveOptions = Object.assign({}, options);
                var originalOnScript = options.onScript;
                effectiveOptions.onScript = function (item) {
                    var previousButtons = Array.prototype.slice.call(document.querySelectorAll(".mc-command-run-button"));
                    var sequence = ++commandSelectionSequence;
                    var result = originalOnScript(item);
                    scheduleAutomaticRun(item, sequence, previousButtons, 0);
                    return result;
                };
            }
            return original.call(catalog, effectiveOptions);
        };
        wrapped.__sirkCommandAutoRunWrapped = true;
        catalog.mount = wrapped;
        return true;
    }

    function scan() {
        installMountHook();
        installCommandsCatalogHook();
        document.querySelectorAll(".mc-results-viewer, .mc-script-output, .mc-shared-result").forEach(enhanceHost);
    }

    installMountHook();
    installCommandsCatalogHook();
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
