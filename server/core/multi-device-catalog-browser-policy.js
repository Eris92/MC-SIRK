"use strict";

function createStartupWrapper(originalStartup) {
    if (typeof originalStartup !== "function") return originalStartup;
    var originalSource = originalStartup.toString();
    var source = [
        "return function () {",
        "    var startupResult = (" + originalSource + ").apply(this, arguments);",
        "    if (typeof window === \"undefined\" || typeof document === \"undefined\") return startupResult;",
        "    function installCatalogBridge() {",
        "        var shared = window.SharedScriptTools;",
        "        if (!shared || typeof shared.create !== \"function\") return false;",
        "        if (shared.__sirkMultiDeviceCatalogBridge) return true;",
        "        var originalCreate = shared.create;",
        "        shared.create = function () {",
        "            var tool = originalCreate.apply(this, arguments);",
        "            if (!tool || typeof tool.openMultiExecution !== \"function\" || tool.__sirkMultiDeviceCatalogBridge) return tool;",
        "            var originalOpen = tool.openMultiExecution;",
        "            tool.openMultiExecution = function (shell, script, currentNodeId, submit) {",
        "                var core = window.SirkPlatformCore;",
        "                if (!core || typeof core.api !== \"function\") return originalOpen.call(tool, shell, script, currentNodeId, submit);",
        "                return core.api(\"mycommands\", \"multi-devices\").then(function (catalog) {",
        "                    var oldNodes = window.nodes;",
        "                    var oldMeshes = window.meshes;",
        "                    if (catalog && Array.isArray(catalog.nodes)) window.nodes = catalog.nodes;",
        "                    if (catalog && catalog.meshes && typeof catalog.meshes === \"object\") window.meshes = catalog.meshes;",
        "                    try {",
        "                        return originalOpen.call(tool, shell, script, currentNodeId, submit);",
        "                    } finally {",
        "                        window.nodes = oldNodes;",
        "                        window.meshes = oldMeshes;",
        "                    }",
        "                }).catch(function (error) {",
        "                    if (window.console && typeof window.console.warn === \"function\") window.console.warn(\"SIRK multi-device catalog fallback\", error);",
        "                    return originalOpen.call(tool, shell, script, currentNodeId, submit);",
        "                });",
        "            };",
        "            tool.__sirkMultiDeviceCatalogBridge = true;",
        "            return tool;",
        "        };",
        "        shared.__sirkMultiDeviceCatalogBridge = true;",
        "        return true;",
        "    }",
        "    if (!installCatalogBridge()) {",
        "        var onScriptLoad = function (event) {",
        "            var target = event && event.target;",
        "            if (!target || target.id !== \"sirk-platform-script-tools\") return;",
        "            document.removeEventListener(\"load\", onScriptLoad, true);",
        "            installCatalogBridge();",
        "        };",
        "        document.addEventListener(\"load\", onScriptLoad, true);",
        "    }",
        "    return startupResult;",
        "};"
    ].join("\n");
    return Function(source)();
}

function apply(plugin) {
    if (!plugin || plugin.__sirkMultiDeviceCatalogBrowserPolicy) return;
    plugin.onWebUIStartupEnd = createStartupWrapper(plugin.onWebUIStartupEnd);
    plugin.__sirkMultiDeviceCatalogBrowserPolicy = true;
}

module.exports.apply = apply;
module.exports.createStartupWrapper = createStartupWrapper;
