"use strict";

var fs = require("fs");
var path = require("path");
var shared = require("./shared.js");

function createStartupWrapper(originalStartup) {
    if (typeof originalStartup !== "function") return originalStartup;
    var originalSource = originalStartup.toString();
    var source = [
        "return function () {",
        "    var startupResult = (" + originalSource + ").apply(this, arguments);",
        "    if (typeof window === \"undefined\" || typeof document === \"undefined\") return startupResult;",
        "    function loadWizard() {",
        "        if (document.getElementById(\"sirk-platform-jira-protocol-wizard\")) return;",
        "        var script = document.createElement(\"script\");",
        "        var url = new URL(\"pluginadmin.ashx\", window.location.href);",
        "        url.searchParams.set(\"pin\", String(window.__SIRK_PLATFORM_PIN__ || \"SIRKPortal\"));",
        "        url.searchParams.set(\"asset\", \"jira-protocol-wizard.js\");",
        "        url.searchParams.set(\"v\", String(window.__SIRK_PLATFORM_VERSION__ || \"0\"));",
        "        script.id = \"sirk-platform-jira-protocol-wizard\";",
        "        script.src = url.href;",
        "        script.async = false;",
        "        (document.head || document.documentElement).appendChild(script);",
        "    }",
        "    if (window.SharedScriptTools && typeof window.SharedScriptTools.openParameterDialog === \"function\") {",
        "        loadWizard();",
        "    } else {",
        "        var onScriptLoad = function (event) {",
        "            var target = event && event.target;",
        "            if (!target || target.id !== \"sirk-platform-parameter-dialog\") return;",
        "            document.removeEventListener(\"load\", onScriptLoad, true);",
        "            loadWizard();",
        "        };",
        "        document.addEventListener(\"load\", onScriptLoad, true);",
        "    }",
        "    return startupResult;",
        "};"
    ].join("\n");
    return Function(source)();
}

function wrapAdmin(handler) {
    if (!handler || typeof handler.req !== "function") return handler;
    var originalReq = handler.req;
    handler.req = function (req, res, user) {
        var asset = String(req && req.query && req.query.asset || "");
        if (asset !== "jira-protocol-wizard.js") return originalReq.call(handler, req, res, user);
        if (!user) {
            shared.send(res, 403, "text/plain; charset=utf-8", "Forbidden");
            return;
        }
        fs.readFile(path.join(__dirname, "..", "..", "public", "modules", "automation", "jira-protocol-wizard.js"), function (error, data) {
            if (error) shared.send(res, 404, "text/plain; charset=utf-8", "Not found");
            else shared.send(res, 200, "text/javascript; charset=utf-8", data);
        });
    };
    return handler;
}

function apply(plugin) {
    if (!plugin || plugin.__sirkJiraProtocolWizardPolicy) return;
    plugin.onWebUIStartupEnd = createStartupWrapper(plugin.onWebUIStartupEnd);
    plugin.admin = wrapAdmin(plugin.admin);
    plugin.__sirkJiraProtocolWizardPolicy = true;
}

module.exports.apply = apply;
module.exports.createStartupWrapper = createStartupWrapper;
module.exports.wrapAdmin = wrapAdmin;
