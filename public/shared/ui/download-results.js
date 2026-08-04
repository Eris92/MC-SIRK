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

    function commandsPage() {
        return document.querySelector(".mc-shared-page-mycommands");
    }

    function selectedRunButton() {
        var page = commandsPage();
        if (!page) return null;
        var buttons = page.querySelectorAll(".mc-command-run-button");
        for (var index = buttons.length - 1; index >= 0; index -= 1) {
            if (buttons[index].isConnected) return buttons[index];
        }
        return null;
    }

    function hasRuntimeVariables(button) {
        var page = button && typeof button.closest === "function"
            ? button.closest(".mc-shared-page-mycommands")
            : commandsPage();
        return !!(page && page.querySelector(
            ".mc-script-runtime-variables input, " +
            ".mc-script-runtime-variables select, " +
            ".mc-script-runtime-variables textarea"
        ));
    }

    function scheduleSelectedRun(sequence, attempt) {
        if (sequence !== commandSelectionSequence) return;

        var button = selectedRunButton();
        if (!button) {
            if (attempt < 120) {
                window.setTimeout(function () {
                    scheduleSelectedRun(sequence, attempt + 1);
                }, 50);
            }
            return;
        }

        if (hasRuntimeVariables(button)) return;
        if (button.disabled) return;
        if (button.getAttribute("data-sirk-auto-run") === String(sequence)) return;

        button.setAttribute("data-sirk-auto-run", String(sequence));
        button.click();
    }

    function beginSelectedRun() {
        var sequence = ++commandSelectionSequence;
        window.setTimeout(function () {
            scheduleSelectedRun(sequence, 0);
        }, 0);
    }

    function installCommandsCatalogHook() {
        var catalog = window.SharedCatalogView;
        if (!catalog || typeof catalog.mount !== "function" || catalog.mount.__sirkCommandAutoRunWrapped) return false;

        var original = catalog.mount;
        var wrapped = function (options) {
            var effectiveOptions = options;
            if (options && typeof options.onScript === "function") {
                effectiveOptions = Object.assign({}, options);
                var originalOnScript = options.onScript;
                effectiveOptions.onScript = function (item) {
                    var result = originalOnScript(item);
                    beginSelectedRun();
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
        var target = event.target && event.target.closest
            ? event.target.closest(".mc-shared-page-mycommands .mc-tree-script")
            : null;
        if (!target) return;
        beginSelectedRun();
    }, false);

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
