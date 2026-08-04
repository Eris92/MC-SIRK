(function () {
    "use strict";

    if (window.__sirkDownloadResultsInstalled) return;
    window.__sirkDownloadResultsInstalled = true;

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

    function scan() {
        installMountHook();
        document.querySelectorAll(".mc-results-viewer, .mc-script-output, .mc-shared-result").forEach(enhanceHost);
    }

    installMountHook();
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
