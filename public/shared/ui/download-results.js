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

    function ensureCommandRunStyle() {
        if (document.getElementById("sirk-command-run-style")) return;
        var style = document.createElement("style");
        style.id = "sirk-command-run-style";
        style.textContent = [
            ".mc-shared-page-mycommands .mc-command-run-button{",
            "display:inline-flex!important;align-items:center!important;justify-content:center!important;",
            "min-width:96px!important;min-height:34px!important;padding:7px 14px!important;",
            "margin:10px 0!important;border:1px solid #3158bd!important;border-radius:5px!important;",
            "background:#3867d6!important;color:#fff!important;font-weight:700!important;",
            "visibility:visible!important;opacity:1!important;position:relative!important;z-index:2!important}",
            ".mc-shared-page-mycommands .mc-command-run-button:hover{background:#3158bd!important}",
            ".mc-shared-page-mycommands .mc-command-run-button:disabled{opacity:.6!important;cursor:wait!important}"
        ].join("");
        (document.head || document.documentElement).appendChild(style);
    }

    function currentRunButtons() {
        return Array.prototype.slice.call(document.querySelectorAll(
            ".mc-shared-page-mycommands .mc-command-run-button"
        ));
    }

    function newRunButton(previousButtons) {
        var buttons = currentRunButtons();
        for (var index = buttons.length - 1; index >= 0; index -= 1) {
            if (buttons[index].isConnected && previousButtons.indexOf(buttons[index]) < 0) {
                return buttons[index];
            }
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
            if (attempt < 160) {
                window.setTimeout(function () {
                    scheduleSelectedRun(sequence, previousButtons, attempt + 1);
                }, 50);
            }
            return;
        }

        if (hasRuntimeVariables(button)) return;
        if (button.getAttribute("data-sirk-auto-run") === String(sequence)) return;

        if (button.disabled) {
            if (attempt < 160) {
                window.setTimeout(function () {
                    scheduleSelectedRun(sequence, previousButtons, attempt + 1);
                }, 50);
            }
            return;
        }

        button.setAttribute("data-sirk-auto-run", String(sequence));
        button.click();
    }

    function beginSelectedRun() {
        ensureCommandRunStyle();
        var previousButtons = currentRunButtons();
        var sequence = ++commandSelectionSequence;
        window.setTimeout(function () {
            scheduleSelectedRun(sequence, previousButtons, 0);
        }, 0);
    }

    document.addEventListener("click", function (event) {
        var target = event.target && event.target.closest
            ? event.target.closest(".mc-shared-page-mycommands .mc-tree-script")
            : null;
        if (!target) return;

        // Capture phase runs before SharedDirectoryTree replaces the clicked DOM subtree.
        // That guarantees the newly rendered Run action can be located afterwards.
        beginSelectedRun();
    }, true);

    function scan() {
        ensureCommandRunStyle();
        installMountHook();
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
