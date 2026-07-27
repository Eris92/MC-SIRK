"use strict";

var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var targets = ["public", "views", "web", "test"];
var extensions = /\.(js|css|html|handlebars)$/i;
var replacements = [
    [/mc-portal-module-shell/g, "sirk-standalone-view-scroll"], [/mc-portal-placeholder-shell/g, "sirk-standalone-view-scroll"],
    [/mc-portal-placeholder-content/g, "sirk-content"], [/mc-portal-module-toolbar/g, "sirk-toolbar-host"],
    [/mc-portal-module-workspace/g, "sirk-layout-host"], [/mc-portal-module-layout/g, "sirk-layout"],
    [/mc-portal-module-primary/g, "sirk-column-primary"], [/mc-portal-module-secondary/g, "sirk-column-secondary"],
    [/mc-portal-module-details/g, "sirk-column-details"], [/mc-portal-module-tabs/g, "sirk-tabs"],
    [/mc-portal-toolbar-button/g, "sirk-toolbar-button"], [/mc-portal-toolbar-icon/g, "sirk-toolbar-icon"],
    [/mc-portal-filter/g, "sirk-filter"], [/mc-portal-nav-item/g, "sirk-nav-item"], [/mc-portal-nav-icon/g, "sirk-nav-icon"],
    [/mc-portal-card-grid/g, "sirk-card-grid"], [/mc-portal-card/g, "sirk-card"], [/mc-portal-actions/g, "sirk-actions"],
    [/mc-portal-button-danger/g, "sirk-button-danger"], [/mc-portal-button/g, "sirk-button"], [/mc-portal-view-surface/g, "sirk-standalone-view-scroll"],
    [/mc-shared-page/g, "sirk-standalone-view-scroll"], [/mc-shared-layout-host/g, "sirk-layout-host"], [/mc-shared-layout/g, "sirk-layout"],
    [/mc-shared-primary/g, "sirk-column-primary"], [/mc-shared-secondary/g, "sirk-column-secondary"],
    [/mc-shared-details/g, "sirk-column-details"], [/mc-shared-toolbar-host/g, "sirk-toolbar-host"],
    [/mc-shared-toolbar-button/g, "sirk-toolbar-button"], [/mc-shared-toolbar-icon/g, "sirk-toolbar-icon"],
    [/mc-shared-toolbar-search/g, "sirk-toolbar-search"], [/mc-shared-toolbar-group/g, "sirk-group"],
    [/mc-shared-toolbar-left/g, "sirk-left"], [/mc-shared-toolbar-center/g, "sirk-center"],
    [/mc-shared-toolbar-right/g, "sirk-right"], [/mc-shared-toolbar/g, "sirk-toolbar"], [/mc-shared-tabs/g, "sirk-tabs"],
    [/mc-shared-nav-item/g, "sirk-nav-item"], [/mc-shared-card/g, "sirk-card"], [/mc-shared-error/g, "sirk-error"], [/mc-shared-output/g, "sirk-output"],
    [/sirk-platform-management-host/g, ""], [/sirk-native-management/g, ""], [/sirk-management-shell/g, "sirk-standalone-view-scroll"],
    [/sirk-management-toolbar-status/g, "sirk-toolbar-status"], [/sirk-management-toolbar/g, "sirk-toolbar"],
    [/sirk-management-workspace/g, "sirk-layout"], [/sirk-management-column/g, ""],
    [/sirk-management-list/g, "sirk-list"], [/sirk-management-content/g, "sirk-content"],
    [/sirk-management-item-icon/g, "sirk-nav-icon"], [/sirk-management-item/g, "sirk-nav-item"],
    [/sirk-management-tool/g, "sirk-toolbar-button"], [/sirk-management-search/g, "sirk-filter"], [/is-management-collapsed/g, "is-collapsed"]
];

function uniqueClasses(value) {
    var seen = Object.create(null);
    var names = String(value || "").trim().split(/\s+/).filter(Boolean);
    var hasSpecificColumn = names.some(function (name) { return /^sirk-column-(?:primary|secondary|details)$/.test(name); });
    return names.filter(function (name) {
        if (name === "sirk-column" && hasSpecificColumn) return false;
        if (seen[name]) return false;
        seen[name] = true;
        return true;
    }).join(" ");
}

function normalize(output, extension) {
    output = output.replace(/className\s*=\s*"([^"]*)"/g, function (_, names) { return 'className = "' + uniqueClasses(names) + '"'; });
    output = output.replace(/class="([^"]*)"/g, function (_, names) { return 'class="' + uniqueClasses(names) + '"'; });
    output = output.replace(/"((?:sirk-[a-z0-9-]+\s+){1,}sirk-[a-z0-9-]+)"/gi, function (_, names) { return '"' + uniqueClasses(names) + '"'; });
    output = output.replace(/^\s*host\s*$/gm, "");
    output = output.replace(/\.classList\.add\(""\);?/g, "");
    output = output.replace(/\.classList\.add\("",\s*/g, ".classList.add(");
    if (/\.css$/i.test(extension)) {
        output = output.replace(/\.sirk-column(?!-)/g, ":is(.sirk-column-primary,.sirk-column-secondary,.sirk-column-details)");
    }
    return output;
}

function walk(directory) {
    if (!fs.existsSync(directory)) return;
    fs.readdirSync(directory, { withFileTypes: true }).forEach(function (entry) {
        var file = path.join(directory, entry.name);
        if (entry.isDirectory()) { walk(file); return; }
        if (!extensions.test(entry.name)) return;
        var source = fs.readFileSync(file, "utf8");
        var output = source;
        replacements.forEach(function (item) { output = output.replace(item[0], item[1]); });
        output = normalize(output, entry.name);
        if (output !== source) fs.writeFileSync(file, output);
    });
}

targets.forEach(function (target) { walk(path.join(root, target)); });
console.log("Portal class cleanup completed.");