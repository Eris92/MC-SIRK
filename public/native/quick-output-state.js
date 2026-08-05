(function () {
    "use strict";

    if (typeof window === "undefined" || typeof document === "undefined") return;

    function installRuntimeRequestGuard() {
        var core = window.SirkPlatformCore;
        var shell = window.SirkPlatformModuleShell;
        if (!core || !shell || typeof core.api !== "function" || typeof shell.create !== "function") return false;

        var originalApi = core.__sirkRuntimeRequestGuardOriginalApi || core.api;
        core.__sirkRuntimeRequestGuardOriginalApi = originalApi;
        core.requestTimeoutMs = Math.max(1000, Number(core.requestTimeoutMs) || 15000);

        core.api = function (moduleName, assetName, options, parameters) {
            var request = {};
            Object.keys(options || {}).forEach(function (key) { request[key] = options[key]; });
            var sourceSignal = request.signal || null;
            var boundedRead = String(request.method || "GET").toUpperCase() === "GET";
            var controller = (sourceSignal || boundedRead) && typeof AbortController === "function"
                ? new AbortController()
                : null;
            var timeoutMs = Math.max(1000, Number(core.requestTimeoutMs) || 15000);
            var timedOut = false;
            var externallyAborted = false;
            var timer = null;

            function abortFromSource() {
                externallyAborted = true;
                if (controller && !controller.signal.aborted) controller.abort();
            }
            function cleanup() {
                if (timer != null) window.clearTimeout(timer);
                if (sourceSignal && typeof sourceSignal.removeEventListener === "function") {
                    sourceSignal.removeEventListener("abort", abortFromSource);
                }
            }
            function timeoutError() {
                var target = String(moduleName || "runtime") + "/" + String(assetName || "request");
                var error = new Error("SIRK API timeout: " + target + " did not respond within " + timeoutMs + " ms.");
                error.name = "SirkApiTimeoutError";
                return error;
            }
            function cancelledError() {
                var error = new Error("SIRK API request cancelled because the view changed.");
                error.name = "AbortError";
                return error;
            }

            if (controller) {
                if (sourceSignal) {
                    if (sourceSignal.aborted) abortFromSource();
                    else if (typeof sourceSignal.addEventListener === "function") {
                        sourceSignal.addEventListener("abort", abortFromSource, { once: true });
                    }
                }
                request.signal = controller.signal;
                if (boundedRead) {
                    timer = window.setTimeout(function () {
                        timedOut = true;
                        if (!controller.signal.aborted) controller.abort();
                    }, timeoutMs);
                }
            }

            return Promise.resolve().then(function () {
                return originalApi.call(core, moduleName, assetName, request, parameters);
            }).then(function (result) {
                cleanup();
                if (timedOut) throw timeoutError();
                return result;
            }, function (error) {
                cleanup();
                if (timedOut) throw timeoutError();
                if (externallyAborted || (controller && controller.signal.aborted && error && error.name === "AbortError")) {
                    throw cancelledError();
                }
                throw error;
            });
        };

        var originalCreate = shell.__sirkRuntimeRequestGuardOriginalCreate || shell.create;
        shell.__sirkRuntimeRequestGuardOriginalCreate = originalCreate;
        shell.create = function (definition) {
            var module = originalCreate.call(shell, definition);
            if (!module || !module.api) return module;

            var api = module.api;
            var renderController = null;
            var originalRender = api.render;
            var originalClose = module.close;
            var originalNativePageStart = module.onNativePageStart;
            var originalDefinitionRender = definition && definition.render;

            function cancelRenderRequest() {
                if (renderController && !renderController.signal.aborted) renderController.abort();
                renderController = null;
            }

            if (typeof originalDefinitionRender === "function") {
                definition.render = function (shellApi) {
                    return Promise.resolve().then(function () {
                        return originalDefinitionRender.call(definition, shellApi);
                    }).catch(function (error) {
                        if (error && error.name === "AbortError") return null;
                        throw error;
                    });
                };
            }

            api.api = function (asset, parameters) {
                return core.api(
                    definition.key,
                    asset,
                    renderController ? { signal: renderController.signal } : null,
                    parameters
                );
            };

            api.render = function () {
                cancelRenderRequest();
                if (typeof AbortController === "function") renderController = new AbortController();
                return originalRender.apply(api, arguments);
            };
            module.render = api.render;

            module.close = function () {
                cancelRenderRequest();
                return typeof originalClose === "function" ? originalClose.apply(module, arguments) : undefined;
            };
            module.onNativePageStart = function () {
                cancelRenderRequest();
                return typeof originalNativePageStart === "function"
                    ? originalNativePageStart.apply(module, arguments)
                    : undefined;
            };
            return module;
        };
        return true;
    }

    installRuntimeRequestGuard();
    window.setTimeout(installRuntimeRequestGuard, 0);
    window.setTimeout(installRuntimeRequestGuard, 100);

    if (window.__sirkQuickOutputStateInstalled) return;
    window.__sirkQuickOutputStateInstalled = true;

    var USER_HIDDEN_KEY = "mc-sirk-quickcommands-output-hidden-v2";
    var ATTENTION_KEY = "mc-sirk-quickcommands-output-attention-v2";
    var OLD_PREFERRED_KEY = "mc-sirk-quickcommands-details-preferred-collapsed";
    var OLD_ATTENTION_KEY = "mc-sirk-quickcommands-details-attention";
    var LEGACY_HIDDEN_KEY = "mc-sirk-quickcommands-details-collapsed";

    function parseBoolean(value) {
        if (value == null || value === "") return null;
        if (/^(1|true|yes|on)$/i.test(String(value))) return true;
        if (/^(0|false|no|off)$/i.test(String(value))) return false;
        return null;
    }

    function readBoolean(key, fallback) {
        try {
            var value = parseBoolean(window.localStorage.getItem(key));
            return value == null ? fallback : value;
        } catch (error) { return fallback; }
    }

    function writeBoolean(key, value) {
        try { window.localStorage.setItem(key, value === true ? "1" : "0"); }
        catch (error) {}
    }

    var migratedHidden = readBoolean(USER_HIDDEN_KEY, null);
    if (migratedHidden == null) {
        migratedHidden = readBoolean(OLD_PREFERRED_KEY, readBoolean(LEGACY_HIDDEN_KEY, false));
        writeBoolean(USER_HIDDEN_KEY, migratedHidden);
    }

    function userHidden() { return readBoolean(USER_HIDDEN_KEY, migratedHidden === true); }
    function attention() { return readBoolean(ATTENTION_KEY, false); }

    function disableLegacyController() {
        writeBoolean(OLD_PREFERRED_KEY, false);
        writeBoolean(OLD_ATTENTION_KEY, false);
    }

    function setUserHidden(value) {
        migratedHidden = value === true;
        writeBoolean(USER_HIDDEN_KEY, migratedHidden);
        if (!migratedHidden) writeBoolean(ATTENTION_KEY, false);
        disableLegacyController();
    }

    function setAttention(value) {
        writeBoolean(ATTENTION_KEY, value === true);
        disableLegacyController();
    }

    function transientOutput(value) {
        return /^(Ładowanie poleceń|Loading commands|Polecenie wysłano do agenta|Command sent to the agent)/i.test(String(value || "").trim());
    }

    function actualDetailsCollapsed(panel) {
        var browser = panel && panel.querySelector(".sirk-quick-command-browser");
        return !!(browser && browser.classList.contains("is-details-collapsed"));
    }

    function detailsButton(panel) {
        if (!panel) return null;
        return panel.querySelector(".sirk-quick-command-details-toggle") ||
            Array.prototype.find.call(
                panel.querySelectorAll(".sirk-quick-command-toolbar-host .mc-shared-toolbar-button"),
                function (button) {
                    return /^(Ukryj wynik|Pokaż wynik|Hide output|Show output)$/i.test(String(button.title || "").trim());
                }
            );
    }

    function outputButtonTitle(hidden, current) {
        var english = /^(Hide output|Show output)$/i.test(String(current || "").trim());
        if (hidden) return english ? "Show output" : "Pokaż wynik";
        return english ? "Hide output" : "Ukryj wynik";
    }

    function applyLayout(panel) {
        if (!panel) return;
        disableLegacyController();
        if (userHidden()) panel.setAttribute("data-sirk-output-hidden", "1");
        else panel.removeAttribute("data-sirk-output-hidden");
    }

    function syncButton(panel, button) {
        button = button || detailsButton(panel);
        if (!button) return;
        var hidden = userHidden();
        var title = outputButtonTitle(hidden, button.title);
        button.title = title;
        button.setAttribute("aria-label", title);
        button.classList.add("sirk-quick-command-output-toggle");
        button.classList.toggle("is-active", !hidden);
        button.setAttribute("aria-pressed", hidden ? "false" : "true");
        button.classList.toggle("has-output-attention", hidden && attention());
    }

    function wrapButton(panel) {
        var button = detailsButton(panel);
        if (!button || button.__sirkStableOutputState || typeof button.onclick !== "function") {
            syncButton(panel, button);
            return;
        }

        var original = button.onclick;
        button.__sirkStableOutputState = true;
        button.onclick = function (event) {
            var wasHidden = userHidden();
            var actualCollapsed = actualDetailsCollapsed(panel);
            var result;

            disableLegacyController();
            if (wasHidden) {
                setUserHidden(false);
                setAttention(false);
                applyLayout(panel);
                if (actualCollapsed) result = original.call(button, event);
            } else {
                setUserHidden(true);
                setAttention(false);
                applyLayout(panel);
                if (!actualCollapsed) result = original.call(button, event);
            }

            disableLegacyController();
            window.setTimeout(function () {
                applyLayout(panel);
                syncButton(panel);
            }, 0);
            return result;
        };
        syncButton(panel, button);
    }

    function inspectOutput(panel) {
        var status = panel && panel.querySelector(".sirk-quick-command-status");
        var current = status ? String(status.textContent || "").trim() : "";
        var previous = String(panel && panel.__sirkStableLastOutput || "");
        var pending = panel && panel.__sirkStableOutputPending === true;

        if (panel) panel.__sirkStableLastOutput = current;
        if (transientOutput(current)) {
            if (panel) panel.__sirkStableOutputPending = true;
            return;
        }

        if (userHidden() && current && (pending || current !== previous)) {
            setAttention(true);
        }
        if (panel && current) panel.__sirkStableOutputPending = false;
    }

    function scanPanel(panel) {
        if (!panel) return;
        applyLayout(panel);
        wrapButton(panel);
        inspectOutput(panel);
        syncButton(panel);
    }

    function scan() {
        Array.prototype.forEach.call(
            document.querySelectorAll(".sirk-desktop-commands-panel"),
            scanPanel
        );
    }

    var style = document.getElementById("sirk-quick-output-state-style");
    if (!style) {
        style = document.createElement("style");
        style.id = "sirk-quick-output-state-style";
        style.textContent = [
            ".sirk-desktop-commands-panel[data-sirk-output-hidden=\"1\"]{width:min(545px,calc(100% - 52px))!important;transition:none!important}",
            ".sirk-desktop-commands-panel[data-sirk-output-hidden=\"1\"]:has(.sirk-quick-command-browser.is-collapsed){width:min(404px,calc(100% - 52px))!important}",
            ".sirk-desktop-commands-panel[data-sirk-output-hidden=\"1\"] .sirk-quick-command-browser.mc-shared-layout{grid-template-columns:minmax(165px,205px) minmax(285px,340px) 0!important;transition:none!important}",
            ".sirk-desktop-commands-panel[data-sirk-output-hidden=\"1\"] .sirk-quick-command-browser.mc-shared-layout.is-collapsed{grid-template-columns:64px minmax(285px,340px) 0!important}",
            ".sirk-desktop-commands-panel[data-sirk-output-hidden=\"1\"] .sirk-quick-command-details{display:none!important}",
            ".sirk-desktop-commands .sirk-quick-command-output-toggle.has-output-attention{border-color:rgba(220,38,38,.62)!important;background:rgba(220,38,38,.15)!important;color:#b42318!important}",
            "[data-bs-theme=dark] .sirk-desktop-commands .sirk-quick-command-output-toggle.has-output-attention,body.night .sirk-desktop-commands .sirk-quick-command-output-toggle.has-output-attention,body.dark .sirk-desktop-commands .sirk-quick-command-output-toggle.has-output-attention{border-color:rgba(248,113,113,.75)!important;background:rgba(248,113,113,.2)!important;color:#fca5a5!important}",
            "@media(max-width:1100px){.sirk-desktop-commands-panel[data-sirk-output-hidden=\"1\"]{width:min(485px,calc(100% - 52px))!important}.sirk-desktop-commands-panel[data-sirk-output-hidden=\"1\"]:has(.sirk-quick-command-browser.is-collapsed){width:min(364px,calc(100% - 52px))!important}.sirk-desktop-commands-panel[data-sirk-output-hidden=\"1\"] .sirk-quick-command-browser.mc-shared-layout{grid-template-columns:minmax(150px,185px) minmax(250px,300px) 0!important}.sirk-desktop-commands-panel[data-sirk-output-hidden=\"1\"] .sirk-quick-command-browser.mc-shared-layout.is-collapsed{grid-template-columns:64px minmax(250px,300px) 0!important}}",
            "@media(max-width:760px){.sirk-desktop-commands-panel[data-sirk-output-hidden=\"1\"]{width:calc(100% - 48px)!important}.sirk-desktop-commands-panel[data-sirk-output-hidden=\"1\"] .sirk-quick-command-browser.mc-shared-layout,.sirk-desktop-commands-panel[data-sirk-output-hidden=\"1\"] .sirk-quick-command-browser.mc-shared-layout.is-collapsed{grid-template-columns:1fr!important}}"
        ].join("");
        (document.head || document.documentElement).appendChild(style);
    }

    disableLegacyController();
    scan();
    window.setTimeout(scan, 0);
    window.setTimeout(scan, 100);
    window.setTimeout(scan, 500);

    if (typeof MutationObserver === "function") {
        var scheduled = false;
        new MutationObserver(function () {
            if (scheduled) return;
            scheduled = true;
            window.setTimeout(function () {
                scheduled = false;
                scan();
            }, 0);
        }).observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
}());
