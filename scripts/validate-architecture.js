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
function directoryHasFiles(relative) {
    return exists(relative) && fs.readdirSync(absolute(relative), { withFileTypes: true }).some(function (entry) {
        return entry.isFile() || (entry.isDirectory() && directoryHasFiles(path.posix.join(relative, entry.name)));
    });
}

var required = [
    "SIRKPortal.js", "SIRKPortalAdmin.js", "plugin-main.js", "admin.js", "config.json", "package.json",
    "server/core/runtime.js", "server/core/settings-store.js", "server/core/secret-store.js",
    "server/core/approval-service.js", "server/core/device-service.js", "server/core/integration-service.js", "server/core/shared.js",
    "server/modules/approval-center/index.js", "server/modules/automation/index.js", "server/modules/commands/index.js",
    "server/modules/jira/index.js", "server/modules/move-requests/index.js",
    "server/modules/security/index.js",
    "public/native/mesh-plugin-core.js", "public/shared/core.js", "public/shared/runtime.js",
    "public/modules/approvals/index.js", "public/modules/automation/index.js", "views/SIRK-Portal.handlebars",
    "docs/INDEX.md", "server/INDEX.md", "public/INDEX.md", "web/INDEX.md", "scripts/INDEX.md", "test/INDEX.md"
];

required.forEach(function (relative) { if (!exists(relative)) errors.push("Missing canonical file: " + relative); });

function validateSyntax(relative) {
    if (!exists(relative) || !/\.js$/i.test(relative)) return;
    try { new Function(read(relative)); }
    catch (error) { errors.push("Syntax error in " + relative + ": " + error.message); }
}

["SIRKPortal.js", "SIRKPortalAdmin.js", "plugin-main.js", "admin.js", "server/core/runtime.js"].forEach(validateSyntax);

if (exists("config.json") && exists("package.json")) {
    var config = JSON.parse(read("config.json"));
    var packageJson = JSON.parse(read("package.json"));
    if (config.name !== "SIRK Management Platform") errors.push("config.name must be SIRK Management Platform.");
    if (config.shortName !== "SIRKPortal") errors.push("config.shortName must be SIRKPortal.");
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(config.shortName)) errors.push("config.shortName must be JavaScript-safe.");
    if (packageJson.name !== "sirk-portal") errors.push("package.json name must be sirk-portal.");
    if (config.version !== packageJson.version) errors.push("config.json and package.json versions must match.");
    ["homepage", "changelogUrl", "configUrl", "downloadUrl", "versionHistoryUrl"].forEach(function (key) {
        if (String(config[key] || "").indexOf("Eris92/SIRK-Portal") < 0) errors.push("config.json " + key + " must reference Eris92/SIRK-Portal.");
    });
}

if (exists("SIRKPortal.js")) {
    var entry = read("SIRKPortal.js");
    need(entry, 'require("./plugin-main.js")', "Entrypoint must load plugin-main.js.");
    need(entry, "module.exports.SIRKPortal", "Entrypoint must export SIRKPortal.");
    need(entry, 'createPlugin(parent, "SIRKPortal")', "Entrypoint must initialize SIRKPortal.");
    reject(entry, /MyCompany|SIRK-Portal/, "Entrypoint contains removed or unsafe plugin identifiers.");
}

if (exists("SIRKPortalAdmin.js")) {
    var adminEntry = read("SIRKPortalAdmin.js");
    need(adminEntry, 'require("./admin.js")', "Admin entrypoint must load admin.js.");
}

if (exists("plugin-main.js")) {
    var pluginMain = read("plugin-main.js");
    need(pluginMain, 'require("./admin.js")', "Plugin bootstrap must load admin.js.");
    need(pluginMain, 'require("./server/core/runtime.js")', "Plugin bootstrap must load server/core/runtime.js.");
    need(pluginMain, "__SIRK_PLATFORM_VERSION__", "Browser bootstrap must expose the SIRK Platform version.");
    need(pluginMain, 'path.join(dataBase, "sirk-platform-data")', "Plugin bootstrap must use sirk-platform-data.");
    reject(pluginMain, /MyCompanyRuntime|__MYCOMPANY_VERSION__|mycompany-data|\.\/core\/|\.\/modules\//, "Plugin bootstrap contains removed legacy runtime paths or aliases.");
}

if (exists("plugin-main-standalone.js") || exists("server/standalone.js") || directoryHasFiles("public/portal") || directoryHasFiles("public/vendor/sirk-portal") || directoryHasFiles("server/modules/portal")) errors.push("Removed Portal integration files must not exist.");

if (exists("admin.js")) {
    var admin = read("admin.js");
    [
        'require("./server/core/shared.js")', 'require("./server/core/plugin-admin-service-backup-discovery.js")',
        'require("./server/core/server-admin-service.js")', '"core.js": ["public/shared/core.js"',
        '"mesh-plugin-core.js": ["public/native/mesh-plugin-core.js"',
        '"approvalcenter.js": ["public/modules/approvals/index.js"', '"shared-ui/toolbar.js": ["public/shared/ui/toolbar.js"',
        'res.render("SIRK-Portal"', 'title: "SIRK Management Platform"'
    ].forEach(function (value) { need(admin, value, "Admin router missing canonical integration: " + value); });
    reject(admin, /MyCompanyAdminData|views\/MyCompany|\.\/core\/|\.\/modules\//, "Admin router contains removed MyCompany or root backend paths.");
}

if (exists("views/SIRK-Portal.handlebars")) {
    var view = read("views/SIRK-Portal.handlebars");
    need(view, "SIRK Management Platform", "Admin view must use SIRK Management Platform branding.");
    need(view, "SirkPlatformAdminData", "Admin view must expose SirkPlatformAdminData.");
    need(view, "sirk-platform-admin", "Admin view must use canonical SIRK admin identifiers.");
    reject(view, /MyCompanyAdminData|mycompany-admin/, "Admin view contains removed MyCompany identifiers.");
}

if (exists("marketplace.json")) {
    var marketplace = JSON.parse(read("marketplace.json"));
    if (!marketplace || !Array.isArray(marketplace.plugins)) errors.push("Marketplace catalog must contain a plugins array.");
    else marketplace.plugins.forEach(function (entry) {
        if (!entry.name || !entry.shortName || !entry.configUrl) errors.push("Marketplace entry is incomplete.");
        if (String(entry.configUrl || "").indexOf("https://") !== 0) errors.push("Marketplace configUrl must use HTTPS.");
    });
}

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
console.log("Canonical loader and metadata validation: OK");
console.log("JavaScript-safe plugin identifier validation: OK");
console.log("Index-first documentation validation: OK");
