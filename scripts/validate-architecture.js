"use strict";

var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var errors = [];

function absolute(relative) { return path.join(root, relative); }
function exists(relative) { return fs.existsSync(absolute(relative)); }
function read(relative) { return fs.readFileSync(absolute(relative), "utf8").replace(/^\uFEFF/, ""); }
function need(source, value, message) { if (source.indexOf(value) < 0) errors.push(message); }
function reject(source, pattern, message) { if (pattern.test(source)) errors.push(message); }
function walk(relative) {
    if (!exists(relative)) return [];
    return fs.readdirSync(absolute(relative), { withFileTypes: true }).reduce(function (result, entry) {
        var child = path.posix.join(relative.replace(/\\/g, "/"), entry.name);
        return result.concat(entry.isDirectory() ? walk(child) : [child]);
    }, []);
}
function directoryHasFiles(relative) { return walk(relative).length > 0; }

var required = [
    "SIRKPortal.js", "SIRKPortalAdmin.js", "plugin-main.js", "admin.js", "config.json", "package.json",
    "server/core/runtime.js", "server/core/settings-store.js", "server/core/secret-store.js",
    "server/core/approval-service.js", "server/core/device-service.js", "server/core/integration-service.js",
    "server/core/audit-log.js", "server/core/shared.js",
    "server/modules/approval-center/index.js", "server/modules/automation/index.js",
    "server/modules/commands/index.js", "server/modules/move-requests/index.js",
    "public/shared/core.js", "public/shared/runtime.js", "public/shared/module-shell.js",
    "public/shared/ui/shared-ui.css", "public/shared/ui/toolbar-config.js", "public/shared/ui/toolbar.css",
    "public/modules/approvals/index.js", "public/modules/automation/index.js",
    "public/modules/commands/index.js", "public/modules/move-requests/index.js",
    "views/SIRK-Portal.handlebars", "web/admin/admin.js", "web/admin/admin.css",
    "docs/INDEX.md", "server/INDEX.md", "public/INDEX.md", "web/INDEX.md", "scripts/INDEX.md", "test/INDEX.md"
];
required.forEach(function (relative) { if (!exists(relative)) errors.push("Missing canonical file: " + relative); });

function validateSyntax(relative) {
    if (!exists(relative) || !/\.js$/i.test(relative)) return;
    try { new Function(read(relative)); }
    catch (error) { errors.push("Syntax error in " + relative + ": " + error.message); }
}
walk("server").concat(walk("public"), walk("web"), ["SIRKPortal.js", "SIRKPortalAdmin.js", "plugin-main.js", "admin.js"])
    .filter(function (relative, index, list) { return /\.js$/i.test(relative) && list.indexOf(relative) === index; })
    .forEach(validateSyntax);

if (exists("config.json") && exists("package.json")) {
    var config = JSON.parse(read("config.json"));
    var packageJson = JSON.parse(read("package.json"));
    if (config.name !== "SIRK Management Platform") errors.push("config.name must be SIRK Management Platform.");
    if (config.shortName !== "SIRKPortal") errors.push("config.shortName must be SIRKPortal.");
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(config.shortName)) errors.push("config.shortName must be JavaScript-safe.");
    if (packageJson.name !== "sirk-portal") errors.push("package.json name must be sirk-portal.");
    if (config.version !== packageJson.version) errors.push("config.json and package.json versions must match.");
    ["homepage", "changelogUrl", "configUrl", "downloadUrl", "versionHistoryUrl"].forEach(function (key) {
        if (String(config[key] || "").indexOf("Eris92/MC-SIRK") < 0) errors.push("config.json " + key + " must reference Eris92/MC-SIRK.");
    });
}

var entry = exists("SIRKPortal.js") ? read("SIRKPortal.js") : "";
need(entry, 'require("./plugin-main.js")', "Entrypoint must load plugin-main.js.");
need(entry, "module.exports.SIRKPortal", "Entrypoint must export SIRKPortal.");
need(entry, 'createPlugin(parent, "SIRKPortal")', "Entrypoint must initialize SIRKPortal.");
reject(entry, /MyCompany|SIRK-Portal|module\.exports\.apply(?:Agent|Elevated|Logged)/, "Entrypoint contains legacy identifiers or test-only exports.");

if (exists("SIRKPortalAdmin.js")) need(read("SIRKPortalAdmin.js"), 'require("./admin.js")', "Admin entrypoint must load admin.js.");

var pluginMain = exists("plugin-main.js") ? read("plugin-main.js") : "";
need(pluginMain, 'require("./admin.js")', "Plugin bootstrap must load admin.js.");
need(pluginMain, 'require("./server/core/runtime.js")', "Plugin bootstrap must load server/core/runtime.js.");
need(pluginMain, "__SIRK_PLATFORM_VERSION__", "Browser bootstrap must expose the SIRK Platform version.");
need(pluginMain, 'path.join(dataBase, "sirk-platform-data")', "Plugin bootstrap must use sirk-platform-data.");
reject(pluginMain, /MyCompanyRuntime|__MYCOMPANY_VERSION__|mycompany-data|runtime-base|mesh-plugin-core|quick-output-state/, "Plugin bootstrap contains a removed compatibility layer.");
reject(pluginMain, /window\.(?:WebKit)?MutationObserver\s*=|setInterval\s*\(/, "Plugin bootstrap must not patch globals or poll the DOM.");

if (exists("plugin-main-standalone.js") || exists("server/standalone.js") || directoryHasFiles("public/portal") || directoryHasFiles("public/vendor/sirk-portal") || directoryHasFiles("server/modules/portal")) {
    errors.push("Removed Portal integration files must not exist.");
}

var serverRuntime = exists("server/core/runtime.js") ? read("server/core/runtime.js") : "";
need(serverRuntime, 'require("./audit-log.js")', "Canonical runtime must own audit logging.");
need(serverRuntime, "function saveAdminSettings", "Canonical runtime must own admin settings persistence.");
reject(serverRuntime, /runtime-base|originalApiPost|__sirk/, "Canonical runtime must not depend on compatibility wrappers or monkey patches.");
if (exists("server/core/runtime-base.js")) errors.push("Duplicate runtime-base.js must not exist.");

var browserRuntime = exists("public/shared/runtime.js") ? read("public/shared/runtime.js") : "";
need(browserRuntime, "window.SirkPlatformRuntime", "Browser runtime must expose SirkPlatformRuntime.");
need(browserRuntime, "runtime.initialize", "Browser runtime must own module loading.");
reject(browserRuntime, /setInterval\s*\(|MutationObserver|\.api\s*=\s*function|installMyCommandsFix|secretDefinitions/, "Browser runtime must remain loader/lifecycle only.");

var publicJs = walk("public").filter(function (relative) { return /\.js$/i.test(relative); });
publicJs.forEach(function (relative) {
    var source = read(relative);
    if (/setInterval\s*\(/.test(source)) errors.push("Polling is forbidden in maintained browser code: " + relative);
    if (/document\.createElement\(["']style["']\)/.test(source)) errors.push("Runtime style injection is forbidden; use static CSS: " + relative);
    if (/window\.(?:WebKit)?MutationObserver\s*=/.test(source)) errors.push("Global MutationObserver replacement is forbidden: " + relative);
    if (/MutationObserver/.test(source) && relative !== "public/shared/ui/toolbar-config.js") {
        errors.push("Only the scoped MeshThemeAdapter may observe public UI mutations: " + relative);
    }
    if (/mesh-plugin-core|quick-output-state|runtime-base|__sirk18|data-sirk-[^\"']*version/i.test(source)) {
        errors.push("Versioned or removed compatibility contract remains in: " + relative);
    }
});

var admin = exists("admin.js") ? read("admin.js") : "";
[
    'require("./server/core/shared.js")', '"core.js": ["public/shared/core.js"',
    '"runtime.js": ["public/shared/runtime.js"', '"moverequests.js": ["public/modules/move-requests/index.js"',
    '"shared-ui/toolbar.js": ["public/shared/ui/toolbar.js"', 'res.render("SIRK-Portal"',
    'title: "SIRK Management Platform"'
].forEach(function (value) { need(admin, value, "Admin router missing canonical integration: " + value); });
reject(admin, /MyCompanyAdminData|views\/MyCompany|runtime-base|mesh-plugin-core|quick-output-state/, "Admin router contains removed compatibility code.");

var view = exists("views/SIRK-Portal.handlebars") ? read("views/SIRK-Portal.handlebars") : "";
need(view, "SIRK Management Platform", "Admin view must use SIRK Management Platform branding.");
need(view, "SirkPlatformAdminData", "Admin view must expose SirkPlatformAdminData.");
need(view, "sirk-platform-admin", "Admin view must use canonical SIRK admin identifiers.");
reject(view, /MyCompanyAdminData|mycompany-admin|<style\b/i, "Admin view contains legacy identifiers or inline implementation styles.");

var sharedUiCss = exists("public/shared/ui/shared-ui.css") ? read("public/shared/ui/shared-ui.css") : "";
var toolbarCss = exists("public/shared/ui/toolbar.css") ? read("public/shared/ui/toolbar.css") : "";
need(toolbarCss, ".sirk-shared-list-item", "Shared list geometry must have one static CSS owner.");
need(sharedUiCss, ".mc-tree-folder-body{margin:0 0 0 6px}", "Nested trees must use the canonical 6 px indentation.");
need(toolbarCss, "var(--sdc-depth,0) * 6px", "Quick second-column indentation must match the shared 6 px step.");
reject(toolbarCss, /\.mc-tree-folder-body\s*\{/, "Tree indentation belongs to shared-ui.css, not toolbar.css.");

if (exists("AGENTS.md")) {
    var agents = read("AGENTS.md");
    ["docs/INDEX.md", "server/INDEX.md", "public/INDEX.md", "web/INDEX.md", "scripts/INDEX.md", "test/INDEX.md"].forEach(function (value) {
        need(agents, value, "AGENTS.md is missing index routing: " + value);
    });
}

if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
}

console.log("SIRK Platform architecture validation: OK");
console.log("Single runtime / loader lifecycle validation: OK");
console.log("No browser polling or compatibility monkey-patches: OK");
console.log("Static style ownership validation: OK");
console.log("Index-first documentation validation: OK");
