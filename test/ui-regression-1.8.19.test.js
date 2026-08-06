"use strict";
var assert=require("assert"),fs=require("fs"),path=require("path"),root=path.join(__dirname,"..");
function source(file){return fs.readFileSync(path.join(root,file),"utf8");}
var client=source("public/shared/ui/tabs.js"),server=source("server/core/runtime.js"),audit=source("server/core/audit-log.js"),template=source("views/SIRK-Portal.handlebars");
assert.ok(client.indexOf("var(--sdc-depth,0) * 6px")>=0,"Quick 6 px indentation missing");
assert.ok(client.indexOf("var(--mc-tree-depth,0) * 6px")>=0,"Shared tree 6 px indentation missing");
assert.ok(client.indexOf("mc-tree-script-actions{display:flex!important")>=0,"Edit/Multi actions visibility missing");
assert.ok(client.indexOf("data-sirk-icon-tone")>=0&&client.indexOf("GEAR")>=0,"Semantic colors or System gear missing");
assert.ok(client.indexOf("Ustawienia aktywnej karty sieciowej")>=0,"Network settings translation missing");
assert.ok(server.indexOf("installCommandsExtension")>=0&&server.indexOf('asset === "multi-execute" && value.commandId')>=0,"Commands backend extension missing");
assert.ok(server.indexOf("auditFactory.createAuditLog")>=0&&audit.indexOf("forbidden")>=0,"Persistent redacted audit missing");
assert.ok(template.indexOf('class="mc-admin-shell"')>=0&&template.indexOf('data-tab="general"')>=0&&template.indexOf('data-tab="logs"')>=0,"Admin layout/tabs missing");
assert.ok(template.indexOf("Menu icon mode")>=0&&template.indexOf("auditLog")>=0,"General icon mode or logs UI missing");
console.log("SIRK 1.8.19 compact release contract: OK");
