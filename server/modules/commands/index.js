"use strict";

var shared = require("../../core/shared.js");
var libraryFactory = require("../../core/script-confirmation-library.js");
var adminFactory = require("../../core/script-admin-service.js");
var folderAccess = require("../../core/folder-access.js");

module.exports.createModule = function (context) {
    var root = context.path.join(context.pluginRoot, "seed", "MyCommands");
    var resultsPath = context.path.join(context.dataRoot, "mycommands", "results.json");
    var fallbackResultsPath = context.path.join(context.dataRoot, "mycommands", "command-results.json");
    var activeResultsPath = resultsPath;
    var memoryRows = [];
    var library = libraryFactory.createScriptLibrary({ fs: context.fs, path: context.path, root: root, readOnly: true, allowWrite: true });
    var admin = adminFactory.createScriptAdminService({ context: context, library: library, namespace: "script-secrets.mycommands" });
    var unregister = null;

    var catalog = {
        network: {
            key: "network", title: "Network", icon: "🌐", commands: [
                { id: "flushdns", label: "Flush DNS", description: "Clear the DNS client cache.", type: 1, runAsUser: 0, cmd: "ipconfig /flushdns" },
                { id: "network-settings", label: "Network Connections", locales: { pl: { label: "Panel Sieciowy" }, en: { label: "Network Connections" } }, description: "Open the native Network Connections panel.", type: 1, runAsUser: 2, cmd: "start \"\" control.exe ncpa.cpl" },
                { id: "network-adapter-properties", label: "Network Adapter Properties", locales: { pl: { label: "Właściwości Sieciowe" }, en: { label: "Network Adapter Properties" } }, description: "Open properties for the adapter used by the preferred active default route.", type: 1, runAsUser: 2, cmd: "start \"\" powershell.exe -NoProfile -WindowStyle Hidden -Command \"$route=Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue|Where-Object{$_.State -eq 'Alive'}|Sort-Object @{Expression={([long]$_.RouteMetric)+([long]$_.InterfaceMetric)};Ascending=$true},InterfaceMetric,RouteMetric,InterfaceIndex|Select-Object -First 1;if(-not $route){$route=Get-NetRoute -DestinationPrefix '::/0' -ErrorAction SilentlyContinue|Where-Object{$_.State -eq 'Alive'}|Sort-Object @{Expression={([long]$_.RouteMetric)+([long]$_.InterfaceMetric)};Ascending=$true},InterfaceMetric,RouteMetric,InterfaceIndex|Select-Object -First 1};if(-not $route){throw 'No active default route was found.'};$adapter=Get-NetAdapter -InterfaceIndex $route.InterfaceIndex -ErrorAction Stop;$shell=New-Object -ComObject Shell.Application;$folder=$shell.Namespace(3);if(-not $folder){throw 'Network Connections shell folder is unavailable.'};$item=$folder.Items()|Where-Object{$_.Name -eq $adapter.Name}|Select-Object -First 1;if(-not $item){throw ('Network connection was not found: '+$adapter.Name)};$item.InvokeVerb('properties')\"" },
                { id: "dns", label: "Check DNS", description: "Resolve a DNS name.", type: 2, runAsUser: 0, variables: [{ name: "name", label: "DNS name", required: true, control: "text", defaultValue: "" }], cmd: "Resolve-DnsName -Name $name | Format-Table -AutoSize" },
                { id: "port", label: "Check port", description: "Test a TCP or UDP port.", type: 2, runAsUser: 0, variables: [{ name: "hostName", label: "Host name or IP", required: true, control: "text", defaultValue: "" }, { name: "port", label: "Port", required: true, control: "text", defaultValue: "443" }, { name: "protocol", label: "Protocol", required: true, control: "select", defaultValue: "TCP", options: [{ value: "TCP", label: "TCP" }, { value: "UDP", label: "UDP" }] }], cmd: "if ($protocol -eq 'UDP') { $client=New-Object Net.Sockets.UdpClient; try { $client.Connect($hostName,[int]$port); $bytes=[Text.Encoding]::UTF8.GetBytes('MyCommands UDP probe'); [void]$client.Send($bytes,$bytes.Length); 'UDP datagram sent to {0}:{1}' -f $hostName,$port } finally { $client.Dispose() } } else { Test-NetConnection -ComputerName $hostName -Port ([int]$port) -InformationLevel Detailed }" },
                { id: "netstat", label: "Open ports", description: "Show listening ports and active connections.", type: 1, runAsUser: 0, cmd: "netstat -ano" },
                { id: "netstat-port", label: "Filter by port", description: "Filter netstat output by port.", type: 1, runAsUser: 0, variables: [{ name: "port", label: "Port", required: true, control: "text", defaultValue: "443" }], cmd: "netstat -ano | findstr /R /C:\":%port%[ ]\"" }
            ]
        },
        system: {
            key: "system", title: "System", icon: "⚙", commands: [
                { id: "powershell", label: "Open PowerShell", description: "Open a PowerShell window for the interactive user.", type: 1, runAsUser: 2, cmd: "start \"\" powershell.exe -NoExit" },
                { id: "cmd", label: "Open CMD", description: "Open Command Prompt for the interactive user.", type: 1, runAsUser: 2, cmd: "start \"\" cmd.exe /K" },
                { id: "regedit", label: "Registry Editor", description: "Open Registry Editor.", type: 1, runAsUser: 2, cmd: "start \"\" regedit.exe" },
                { id: "secpol", label: "Local Security Policy", description: "Open secpol.msc.", type: 1, runAsUser: 2, cmd: "start \"\" secpol.msc" },
                { id: "firewall", label: "Windows Firewall", description: "Open Windows Firewall management.", type: 1, runAsUser: 2, cmd: "start \"\" mmc.exe wf.msc" },
                { id: "mmc", label: "MMC", description: "Open Microsoft Management Console.", type: 1, runAsUser: 2, cmd: "start \"\" mmc.exe" },
                { id: "services", label: "Services", description: "Open Services management.", type: 1, runAsUser: 2, cmd: "start \"\" mmc.exe services.msc" },
                { id: "devices", label: "Device Manager", description: "Open Device Manager.", type: 1, runAsUser: 2, cmd: "start \"\" mmc.exe devmgmt.msc" },
                { id: "events", label: "Event Viewer", description: "Open Event Viewer.", type: 1, runAsUser: 2, cmd: "start \"\" mmc.exe eventvwr.msc" },
                { id: "taskmgr", label: "Task Manager", description: "Open Task Manager.", type: 1, runAsUser: 2, cmd: "start \"\" taskmgr.exe" }
            ]
        },
        other: {
            key: "other", title: "Other", icon: "◆", commands: [
                { id: "printers", label: "Printer Management", description: "Open printer management.", type: 1, runAsUser: 2, cmd: "start \"\" printmanagement.msc" },
                { id: "certlm", label: "Certificates (computer)", description: "Open local computer certificates.", type: 1, runAsUser: 2, cmd: "start \"\" certlm.msc" },
                { id: "certcu", label: "Certificates (user)", description: "Open current user certificates.", type: 1, runAsUser: 2, cmd: "start \"\" certmgr.msc" },
                { id: "indexing", label: "Indexing Options", description: "Open Indexing Options.", type: 1, runAsUser: 2, cmd: "start \"\" control.exe /name Microsoft.IndexingOptions" },
                { id: "cleanup", label: "Disk Cleanup", description: "Open Disk Cleanup.", type: 1, runAsUser: 2, cmd: "start \"\" cleanmgr.exe" }
            ]
        }
    };

    function allowed(user) {
        if (!user) return false;
        if (shared.isSiteAdmin(user)) return true;
        var groups = (context.settings.read().modules.mycommands || {}).accessGroupIds;
        groups = Array.isArray(groups) ? groups : [];
        return !groups.length || shared.isUserInAnyGroup(user, groups);
    }
    function folderRules() { return (context.settings.read().modules.mycommands || {}).folderPermissions || {}; }
    function folderKeys() { return ["@menu/scripts"].concat(Object.keys(catalog).map(function (key) { return "@menu/" + key; })); }
    function canUseScripts(user) { return folderAccess.canAccess(user, folderRules(), "@menu/scripts"); }
    function requireScriptAccess(user) { if (!canUseScripts(user)) throw new Error("Folder access denied."); }
    function requireCommandAccess(user, commandId) {
        var found = findCatalogCommand(commandId);
        if (!found || !folderAccess.canAccess(user, folderRules(), "@menu/" + found.category.key)) throw new Error("Folder access denied.");
        return found;
    }
    function scriptAvailability() { return (context.settings.read().modules.mycommands || {}).scriptAvailability || {}; }
    function scriptAvailabilityKey(relativePath) { return String(relativePath || "").replace(/\\/g, "/").toLowerCase(); }
    function effectiveScriptAvailability(relativePath) {
        var override = scriptAvailability()[scriptAvailabilityKey(relativePath)] || {};
        return { showOnDesktop: override.showOnDesktop !== false, showWithoutDesktop: override.showWithoutDesktop !== false };
    }
    function decorateScriptTree(node, surface, showAll) {
        var value = shared.copy(node);
        if (value.type === "script") {
            var availability = effectiveScriptAvailability(value.path);
            value.showOnDesktop = availability.showOnDesktop;
            value.showWithoutDesktop = availability.showWithoutDesktop;
            if (!showAll && surface === "desktop" && !availability.showOnDesktop) return null;
            if (!showAll && surface !== "desktop" && !availability.showWithoutDesktop) return null;
            return value;
        }
        value.children = (value.children || []).map(function (child) { return decorateScriptTree(child, surface, showAll); }).filter(Boolean);
        return value;
    }
    function visibleTree(user, surface) {
        var value = library.getTree();
        if (!canUseScripts(user)) value.children = [];
        return decorateScriptTree(value, surface || "card", surface !== "desktop" && shared.isSiteAdmin(user));
    }
    function visibleCatalog(user) {
        return publicCatalog().filter(function (category) { return folderAccess.canAccess(user, folderRules(), "@menu/" + category.key); });
    }
    function folderSettings() {
        var rules = folderRules();
        return [{ key: "@menu/scripts", label: "Scripts", locales: { pl: { label: "Skrypty" }, en: { label: "Scripts" } } }].concat(Object.keys(catalog).map(function (key) {
            return { key: "@menu/" + key, label: catalog[key].title, locales: catalog[key].locales || {} };
        })).map(function (item) {
            var rule = rules[item.key];
            item.enabled = !rule || rule.enabled !== false;
            item.allowAll = !!(rule && rule.allowAll === true);
            item.groupIds = rule && Array.isArray(rule.groupIds) ? rule.groupIds : [];
            return item;
        });
    }
    function requireAdmin(user) { if (!shared.isSiteAdmin(user)) throw new Error("Permission denied."); }
    function approvalLevels(levels) {
        levels = Array.isArray(levels) ? levels.map(Number) : [];
        return [1, 2, 3].filter(function (level) { return levels.indexOf(level) >= 0; });
    }
    function commandOverrides() { return (context.settings.read().modules.mycommands || {}).commandOverrides || {}; }
    function effectiveCommand(command, categoryKey) {
        var override = commandOverrides()[command.id] || {};
        var result = shared.copy(command);
        if (override.label) result.label = shared.cleanText(override.label, 200);
        if (Object.prototype.hasOwnProperty.call(override, "description")) result.description = shared.cleanText(override.description, 1000);
        result.approvalLevels = [];
        result.confirmExecution = override.confirmExecution === true;
        result.showOnDesktop = override.showOnDesktop !== false;
        result.showWithoutDesktop = Object.prototype.hasOwnProperty.call(override, "showWithoutDesktop") ? override.showWithoutDesktop === true : ["system", "other"].indexOf(String(categoryKey || "")) < 0;
        return result;
    }
    function executionRows() {
        var value;
        try {
            var stat = context.fs.statSync(activeResultsPath);
            if (!stat.isFile()) { var invalid = new Error("Command results path is not a file."); invalid.code = "EISDIR"; throw invalid; }
            value = JSON.parse(context.fs.readFileSync(activeResultsPath, "utf8").replace(/^\uFEFF/, ""));
        } catch (error) {
            var code = String(error && error.code || "");
            if (activeResultsPath === resultsPath && ["EACCES", "EBUSY", "EISDIR", "EPERM"].indexOf(code) >= 0) {
                activeResultsPath = fallbackResultsPath;
                value = shared.readJson(context.fs, activeResultsPath, { rows: memoryRows });
            } else value = { rows: memoryRows };
        }
        memoryRows = Array.isArray(value.rows) ? value.rows : memoryRows;
        return shared.copy(memoryRows);
    }
    function writeRows(rows) {
        memoryRows = shared.copy(rows);
        var value = { schemaVersion: 1, rows: rows };
        try { shared.writeJsonAtomic(context.fs, context.path, activeResultsPath, value); }
        catch (error) {
            var code = String(error && error.code || "");
            if (activeResultsPath === resultsPath && ["EACCES", "EBUSY", "EISDIR", "EPERM"].indexOf(code) >= 0) {
                activeResultsPath = fallbackResultsPath;
                try { shared.writeJsonAtomic(context.fs, context.path, activeResultsPath, value); } catch (ignored) {}
            } else if (activeResultsPath !== fallbackResultsPath) throw error;
        }
    }
    function saveExecution(row) {
        var rows = executionRows();
        rows.unshift(row);
        if (rows.length > 2000) rows.length = 2000;
        writeRows(rows);
    }

    function findCatalogCommand(commandId) {
        commandId = String(commandId || "");
        var keys = Object.keys(catalog);
        for (var index = 0; index < keys.length; index += 1) {
            var category = catalog[keys[index]];
            var command = (category.commands || []).find(function (item) { return item.id === commandId; });
            if (command) return { category: category, command: effectiveCommand(command, category.key) };
        }
        return null;
    }

    function publicVariables(variables) {
        return (variables || []).map(function (variable) {
            return {
                name: variable.name,
                label: variable.label,
                required: variable.required === true,
                control: variable.control || "text",
                defaultValue: variable.defaultValue == null ? "" : String(variable.defaultValue),
                options: (variable.options || []).map(function (option) {
                    return typeof option === "string" ? { value: option, label: option } : { value: String(option.value), label: String(option.label || option.value) };
                })
            };
        });
    }

    function publicCatalog() {
        return Object.keys(catalog).map(function (key) {
            var category = catalog[key];
            return {
                key: category.key,
                title: category.title,
                icon: category.icon,
                commands: category.commands.map(function (source) {
                    var command = effectiveCommand(source, category.key);
                    var levels = command.approvalLevels;
                    return {
                        id: command.id,
                        label: command.label,
                        description: command.description,
                        locales: command.locales || {},
                        variables: publicVariables(command.variables),
                        approvalLevels: levels,
                        requiresApproval: levels.length > 0,
                        confirmExecution: command.confirmExecution === true,
                        runAsUser: command.runAsUser,
                        showOnDesktop: command.showOnDesktop === true,
                        showWithoutDesktop: command.showWithoutDesktop === true
                    };
                })
            };
        });
    }

    function cleanValue(value, limit) { return shared.cleanText(value == null ? "" : value, limit || 4000); }
    function validateVariables(definitions, supplied) {
        supplied = supplied && typeof supplied === "object" && !Array.isArray(supplied) ? supplied : {};
        var result = {};
        (definitions || []).forEach(function (definition) {
            var value = Object.prototype.hasOwnProperty.call(supplied, definition.name) ? supplied[definition.name] : definition.defaultValue;
            if (definition.control === "switch") value = /^(1|true|yes|tak|on)$/i.test(String(value || "")) ? "true" : "false";
            else value = cleanValue(value, 4000);
            if (definition.control === "select") {
                var options = (definition.options || []).map(function (option) { return String(option.value == null ? option : option.value); });
                if (options.length && options.indexOf(String(value)) < 0) throw new Error("Invalid value for " + (definition.label || definition.name) + ".");
            }
            if (definition.required && !String(value).trim()) throw new Error((definition.label || definition.name) + " is required.");
            result[definition.name] = value;
        });
        return result;
    }
    function psQuote(value) { return String(value == null ? "" : value).replace(/'/g, "''"); }
    function cmdQuote(value) { return String(value == null ? "" : value).replace(/[\r\n]/g, " ").replace(/%/g, "%%").replace(/\^/g, "^^").replace(/!/g, "^^!").replace(/"/g, "^\""); }
    function desktopLaunch(commandText) {
        var match = /^start\s+""\s+(?:"([^"]+)"|(\S+))(?:\s+([\s\S]*))?$/i.exec(String(commandText || "").trim());
        if (!match) throw new Error("Invalid interactive Desktop command.");
        var executable = match[1] || match[2];
        var argumentsText = match[3] || "";
        if (/\.msc$/i.test(executable)) {
            argumentsText = '"' + executable + '"' + (argumentsText ? " " + argumentsText : "");
            executable = "mmc.exe";
        }
        return { executable: executable, argumentsText: argumentsText };
    }
    function interactiveDesktopCommand(commandText, label) {
        var launch = desktopLaunch(commandText);
        var processName = String(launch.executable).split(/[\\/]/).pop();
        var launchLine = '"' + launch.executable + '"' + (launch.argumentsText ? " " + launch.argumentsText : "");
        var vbs = [
            "Set shell = CreateObject(\"WScript.Shell\")",
            "Set before = CreateObject(\"Scripting.Dictionary\")",
            "Set wmi = GetObject(\"winmgmts:\\\\.\\root\\cimv2\")",
            "For Each proc In wmi.ExecQuery(\"SELECT ProcessId FROM Win32_Process WHERE Name='" + processName.replace(/'/g, "''") + "'\")",
            "  before(CStr(proc.ProcessId)) = True",
            "Next",
            "shell.Run \"" + launchLine.replace(/"/g, '""') + "\", 1, False",
            "For attempt = 1 To 25",
            "  WScript.Sleep 200",
            "  For Each proc In wmi.ExecQuery(\"SELECT ProcessId FROM Win32_Process WHERE Name='" + processName.replace(/'/g, "''") + "'\")",
            "    If Not before.Exists(CStr(proc.ProcessId)) Then shell.SendKeys \"%\" : If shell.AppActivate(CLng(proc.ProcessId)) Then CreateObject(\"Scripting.FileSystemObject\").DeleteFile WScript.ScriptFullName, True : WScript.Quit 0",
            "  Next",
            "Next",
            "For Each proc In wmi.ExecQuery(\"SELECT ProcessId FROM Win32_Process WHERE Name='" + processName.replace(/'/g, "''") + "'\")",
            "  shell.SendKeys \"%\" : If shell.AppActivate(CLng(proc.ProcessId)) Then CreateObject(\"Scripting.FileSystemObject\").DeleteFile WScript.ScriptFullName, True : WScript.Quit 0",
            "Next",
            "CreateObject(\"Scripting.FileSystemObject\").DeleteFile WScript.ScriptFullName, True"
        ].join("\r\n");
        var encodedVbs = Buffer.from(vbs, "utf8").toString("base64");
        return [
            "$userName=(Get-Process explorer -IncludeUserName -ErrorAction SilentlyContinue|Where-Object{$_.UserName}|Select-Object -First 1 -ExpandProperty UserName)",
            "if([string]::IsNullOrWhiteSpace($userName)){$userName=(Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue).UserName}",
            "if([string]::IsNullOrWhiteSpace($userName)){throw 'No interactive Windows user is logged on.'}",
            "$taskName='SIRK-Desktop-'+[guid]::NewGuid().ToString('N')",
            "$scriptDirectory=Join-Path $env:ProgramData 'SIRK Management Platform'",
            "New-Item -ItemType Directory -Path $scriptDirectory -Force|Out-Null",
            "$scriptPath=Join-Path $scriptDirectory ($taskName+'.vbs')",
            "[IO.File]::WriteAllBytes($scriptPath,[Convert]::FromBase64String('" + encodedVbs + "'))",
            "$action=New-ScheduledTaskAction -Execute ($env:SystemRoot+'\\System32\\wscript.exe') -Argument ('//B //NoLogo \"'+$scriptPath+'\"')",
            "$principal=New-ScheduledTaskPrincipal -UserId $userName -LogonType Interactive -RunLevel Limited",
            "try{",
            "Register-ScheduledTask -TaskName $taskName -Action $action -Principal $principal -Force -ErrorAction Stop|Out-Null",
            "Start-ScheduledTask -TaskName $taskName -ErrorAction Stop",
            "Start-Sleep -Milliseconds 750",
            "$taskInfo=Get-ScheduledTaskInfo -TaskName $taskName -ErrorAction Stop",
            "if($taskInfo.LastRunTime.Year-lt 2000){throw 'The interactive Desktop launcher did not start.'}",
            "Write-Output 'Started on the interactive desktop: " + psQuote(label || "Command") + "'",
            "}finally{Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue}"
        ].join(";");
    }
    function injectVariables(commandText, type, definitions, supplied, secretValues) {
        var values = validateVariables(definitions, supplied);
        Object.keys(secretValues || {}).forEach(function (name) { values[name] = String(secretValues[name] == null ? "" : secretValues[name]); });
        var names = Object.keys(values).filter(function (name) { return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name); });
        if (Number(type) === 2) return names.map(function (name) { return "$" + name + "='" + psQuote(values[name]) + "'"; }).join(";") + (names.length ? ";" : "") + commandText;
        return (names.length ? "@echo off\r\n" + names.map(function (name) { return "set \"" + name + "=" + cmdQuote(values[name]) + "\""; }).join("\r\n") + "\r\n" : "") + commandText;
    }

    function buildCommand(payload) {
        if (payload.scriptPath) {
            var script = library.getScript(payload.scriptPath, true);
            if (!script) throw new Error("Script not found.");
            if (payload.scriptHash && String(payload.scriptHash) !== String(script.hash)) throw new Error("The script changed after submission and was not executed.");
            var type = script.shell === "cmd" ? 1 : 2;
            return { label: script.label || script.name, cmd: injectVariables(script.body, type, script.variables || [], payload.variableValues, admin.secretValues(script.path)), type: type, runAsUser: Number(script.runAsUser) || 0 };
        }
        if (payload.commandId) {
            var found = findCatalogCommand(payload.commandId);
            if (!found) throw new Error("Command preset not found.");
            var commandText = injectVariables(found.command.cmd, found.command.type, found.command.variables || [], payload.variableValues, null);
            if (Number(found.command.runAsUser) === 2) return { label: found.command.label, cmd: interactiveDesktopCommand(commandText, found.command.label), type: 2, runAsUser: 0 };
            return { label: found.command.label, cmd: commandText, type: Number(found.command.type) || 1, runAsUser: Number(found.command.runAsUser) || 0 };
        }
        var custom = String(payload.command || "");
        if (!custom) throw new Error("Command is empty.");
        return { label: payload.label || "Custom command", cmd: custom, type: Number(payload.type) || 2, runAsUser: Number(payload.runAsUser) || 0 };
    }

    function normalizePayload(payload) {
        payload = shared.copy(payload || {});
        payload.variableValues = payload.variableValues && typeof payload.variableValues === "object" && !Array.isArray(payload.variableValues) ? payload.variableValues : {};
        if (payload.scriptPath) {
            var script = library.getScript(payload.scriptPath, true);
            if (!script) throw new Error("Script not found.");
            if (script.confirmExecution === true && payload.confirmedExecution !== true) throw new Error("Execution confirmation is required for this script.");
            payload.scriptPath = script.path;
            payload.scriptHash = script.hash;
            payload.label = script.label || script.name;
            payload.description = script.description || "";
            payload.approvalLevels = approvalLevels(script.approvalLevels || []);
            payload.confirmedExecution = script.confirmExecution === true;
            delete payload.command;
            delete payload.commandId;
            return payload;
        }
        if (payload.commandId) {
            var found = findCatalogCommand(payload.commandId);
            if (!found) throw new Error("Command preset not found.");
            if (found.command.confirmExecution === true && payload.confirmedExecution !== true) throw new Error("Execution confirmation is required for this command.");
            payload.commandId = found.command.id;
            payload.label = found.command.label;
            payload.description = found.command.description;
            payload.approvalLevels = [];
            payload.confirmedExecution = found.command.confirmExecution === true;
            delete payload.command;
            delete payload.scriptPath;
            return payload;
        }
        payload.approvalLevels = approvalLevels(payload.approvalLevels || []);
        return payload;
    }

    function execute(payload, request) {
        var user = shared.findUser(context.parent, request.requester && request.requester.id) || { _id: request.requester && request.requester.id, name: request.requester && request.requester.name };
        var command;
        try {
            if (payload.scriptPath) requireScriptAccess(user);
            if (payload.commandId) requireCommandAccess(user, payload.commandId);
            command = buildCommand(payload);
        } catch (error) { return Promise.reject(error); }
        return context.device.resolveNode(user, payload.nodeId, { requireCommandRights: true }).then(function (node) {
            var id = "sirk-platform-" + shared.randomId(10);
            return context.device.sendRunCommands(node, command, id, null).then(function (state) {
                var row = { id: id, requestId: request.id || "", nodeId: node.nodeId, nodeName: node.node && node.node.name || payload.nodeName || payload.nodeId, command: command.label, status: state.state, requester: request.requester, createdAt: Date.now(), updatedAt: Date.now(), output: "" };
                saveExecution(row);
                context.device.auditCommand(node, user, command);
                return row;
            });
        });
    }

    function executeDirect(user, value) {
        value = shared.copy(value || {});
        var payload;
        if (value.desktopDirect === true && value.scriptPath) {
            var script = library.getScript(value.scriptPath, true);
            if (!script) return Promise.reject(new Error("Script not found."));
            if (script.confirmExecution === true && value.confirmedExecution !== true) return Promise.reject(new Error("Execution confirmation is required for this script."));
            payload = { nodeId: value.nodeId, nodeName: value.nodeName, scriptPath: script.path, scriptHash: script.hash, label: script.label || script.name, description: script.description || "", approvalLevels: [], variableValues: value.variableValues && typeof value.variableValues === "object" && !Array.isArray(value.variableValues) ? value.variableValues : {}, confirmedExecution: script.confirmExecution === true };
        } else {
            payload = normalizePayload(value);
            if (payload.approvalLevels.length) return Promise.reject(new Error("This command requires approval."));
        }
        var request = { id: "", requester: { id: user && user._id || "", name: shared.userName(user) }, executionId: shared.randomId(12) };
        return execute(payload, request).then(function (result) {
            return { ok: true, direct: true, request: { status: result.status || "executing", result: result } };
        });
    }

    function outputForUser(user, id) {
        var row = executionRows().find(function (item) { return String(item.id) === String(id || ""); });
        if (!row) return { ok: true, ready: false, missing: true, output: "", status: "missing" };
        if (!shared.isSiteAdmin(user) && String(row.requester && row.requester.id || "") !== String(user && user._id || "")) throw new Error("Permission denied.");
        var ready = !!row.output || ["completed", "failed", "error"].indexOf(String(row.status || "").toLowerCase()) >= 0;
        return { ok: true, ready: ready, output: row.output || "", status: row.status || "", row: shared.copy(row) };
    }

    function approvalResults(user, query) {
        query = query || {};
        return context.approval.list(user, { type: "mycommands", status: query.status || "", q: query.q || "", page: Number(query.page) || 1, perPage: Math.min(200, Number(query.perPage) || 100) }).then(function (value) {
            var byId = Object.create(null);
            executionRows().forEach(function (row) { byId[String(row.id || "")] = row; });
            value.rows = (value.rows || []).filter(function (request) {
                var payload = request && request.payload || {};
                if (payload.scriptPath) return canUseScripts(user);
                if (payload.commandId) {
                    var found = findCatalogCommand(payload.commandId);
                    return !!found && folderAccess.canAccess(user, folderRules(), "@menu/" + found.category.key);
                }
                return true;
            }).map(function (request) {
                var id = request.result && request.result.id;
                if (id && byId[String(id)]) request.result = shared.copy(byId[String(id)]);
                return request;
            });
            value.ok = true;
            return value;
        });
    }

    function nodeIds(value) {
        var list = Array.isArray(value) ? value : String(value || "").split(/[\r\n,;]+/);
        var seen = Object.create(null);
        return list.map(function (id) { return String(id || "").trim(); }).filter(function (id) {
            if (!id || seen[id]) return false;
            seen[id] = true;
            return true;
        });
    }

    function multiExecute(user, value) {
        value = value || {};
        var settings = context.settings.read().modules.mycommands || {};
        var maxMultiHostNodes = Math.max(1, Math.min(1000, Number(settings.maxMultiHostNodes) || 200));
        var multiHostConcurrency = Math.max(1, Math.min(64, Number(settings.multiHostConcurrency) || 8));
        var ids = nodeIds(value.nodeIds);
        if (!ids.length && value.nodeId) ids = [String(value.nodeId)];
        if (!ids.length) throw new Error("Select at least one device.");
        if (ids.length > maxMultiHostNodes) throw new Error("A maximum of " + maxMultiHostNodes + " devices can be selected.");

        var source = { variableValues: value.variableValues || {}, multiHost: true };
        if (value.commandId) {
            var found = requireCommandAccess(user, value.commandId);
            if (found.command.confirmExecution === true && value.confirmedExecution !== true) {
                throw new Error("Execution confirmation is required for this command.");
            }
            source.commandId = found.command.id;
            source.confirmedExecution = found.command.confirmExecution === true;
        } else {
            requireScriptAccess(user);
            var script = library.getScript(value.scriptPath, true);
            if (!script) throw new Error("Script not found.");
            if (script.multiHost !== true) throw new Error("This script does not allow multi-device execution.");
            if (script.confirmExecution === true && value.confirmedExecution !== true) throw new Error("Execution confirmation is required for this script.");
            source.scriptPath = script.path;
            source.confirmedExecution = script.confirmExecution === true;
        }

        var cursor = 0;
        var rows = [];
        function worker() {
            if (cursor >= ids.length) return Promise.resolve();
            var id = ids[cursor++];
            var payload = shared.copy(source);
            payload.nodeId = id;
            payload.nodeName = id;
            return context.approval.submit("mycommands", user, payload, value.note).then(function (request) {
                rows.push({ nodeId: id, ok: true, request: request });
            }).catch(function (error) {
                rows.push({ nodeId: id, ok: false, error: String(error && error.message || error) });
            }).then(worker);
        }

        var workers = [];
        for (var index = 0; index < Math.min(multiHostConcurrency, ids.length); index += 1) workers.push(worker());
        return Promise.all(workers).then(function () {
            var failed = rows.filter(function (row) { return !row.ok; }).length;
            var pending = rows.filter(function (row) { return row.ok && row.request && row.request.status === "pending"; }).length;
            return { ok: failed === 0, total: ids.length, submitted: rows.length - failed, pending: pending, failed: failed, rows: rows };
        });
    }

    var provider = {
        type: "mycommands",
        moduleKey: "mycommands",
        title: "My Commands",
        tabTitle: "Commands",
        description: "Direct and multi-device command execution.",
        columns: ["createdAt", "title", "requester", "status"],
        normalizePayload: normalizePayload,
        getTitle: function (payload) { return payload.label || payload.scriptPath || payload.commandId || "Command"; },
        getSummary: function (payload) { return "Device: " + (payload.nodeName || payload.nodeId || "unknown"); },
        getApprovalLevels: function (payload) { return payload.approvalLevels || []; },
        canSubmit: allowed,
        getResources: function (user, query) {
            if (query && query.scriptPath) requireScriptAccess(user);
            var script = query && query.scriptPath ? library.getScript(query.scriptPath, true) : null;
            return { tree: visibleTree(user), catalog: visibleCatalog(user), script: script || null };
        },
        execute: execute
    };

    return {
        key: "mycommands",
        clientConfig: function () {
            var value = context.settings.read().modules.mycommands || {};
            return { key: "mycommands", name: "My Commands", menuTitle: "My Commands", script: "mycommands.js", style: "myscripts.css", showInMenu: false, showOnDevice: value.showOnDevice !== false, scriptsRoot: root, maxMultiHostNodes: Number(value.maxMultiHostNodes) || 200, multiHostConcurrency: Number(value.multiHostConcurrency) || 8, toolbar: { refresh: true, clear: false, favorites: true, search: true, manage: true, multiHost: true, settings: false } };
        },
        getAccess: function (user) { return { allowed: allowed(user), siteAdmin: shared.isSiteAdmin(user) }; },
        initialize: function () {
            library.ensure();
            if (!unregister) unregister = context.approval.registerProvider(provider);
            return Promise.resolve();
        },
        captureAgentData: function (command) {
            var id = command && (command.responseid || command.responseId);
            if (!id) return;
            var rows = executionRows();
            var row = rows.find(function (item) { return item.id === id; });
            if (!row) return;
            var output = command.value != null ? command.value : command.result != null ? command.result : command.stdout != null ? command.stdout : command.output;
            row.status = String(command.status || command.state || "completed");
            row.output = shared.cleanText(output == null ? "" : output, 1000000);
            row.updatedAt = Date.now();
            writeRows(rows);
        },
        apiGet: function (asset, req, user) {
            if (!allowed(user)) throw new Error("Permission denied.");
            var query = req && req.query || {};
            if (asset === "scripts") return { ok: true, tree: visibleTree(user, query.surface === "desktop" ? "desktop" : "card"), catalog: visibleCatalog(user), directExecutionAllowed: true, scriptsRoot: shared.isSiteAdmin(user) ? root : "" };
            if (asset === "catalog") return { ok: true, catalog: visibleCatalog(user) };
            if (asset === "script") { requireScriptAccess(user); var script = library.getScript(query.path, true); if (!script) throw new Error("Script not found."); return { ok: true, script: script }; }
            if (asset === "source") { requireAdmin(user); requireScriptAccess(user); var source = library.getSource(query.path); if (!source) throw new Error("Script not found."); return { ok: true, source: source }; }
            if (asset === "definition") { requireScriptAccess(user); var definition = admin.getDefinition(user, query.path); var availability = effectiveScriptAvailability(query.path); definition.showOnDesktop = availability.showOnDesktop; definition.showWithoutDesktop = availability.showWithoutDesktop; return { ok: true, definition: definition }; }
            if (asset === "script-secrets") { requireScriptAccess(user); return { ok: true, secrets: admin.getSecretState(user, query.path) }; }
            if (asset === "system-credentials") { requireScriptAccess(user); return { ok: true, systemCredentials: admin.getSystemCredentialState(user, query.path) }; }
            if (asset === "command-definition") { requireAdmin(user); var found = requireCommandAccess(user, query.id); return { ok: true, definition: { id: found.command.id, label: found.command.label, description: found.command.description, confirmExecution: found.command.confirmExecution === true, showOnDesktop: found.command.showOnDesktop === true, showWithoutDesktop: found.command.showWithoutDesktop === true } }; }
            if (asset === "output") return outputForUser(user, query.id);
            if (asset === "results") return approvalResults(user, query);
            if (asset === "settings") return { ok: true, settings: context.settings.read().modules.mycommands || {}, scriptsRoot: root };
            throw new Error("Unknown My Commands action.");
        },
        apiPost: function (asset, req, user) {
            if (!allowed(user)) throw new Error("Permission denied.");
            var value = req && req.body || {};
            if (asset === "execute") {
                if (value.scriptPath) {
                    requireScriptAccess(user);
                    var scriptAccess = effectiveScriptAvailability(value.scriptPath);
                    if (value.desktopDirect === true && scriptAccess.showOnDesktop !== true) throw new Error("This script is disabled during a Desktop connection.");
                    if (value.desktopDirect !== true && scriptAccess.showWithoutDesktop !== true) throw new Error("This script is available only during a Desktop connection.");
                }
                if (value.commandId) {
                    var accessible = requireCommandAccess(user, value.commandId).command;
                    if (value.desktopDirect === true && accessible.showOnDesktop !== true) throw new Error("This command is disabled during a Desktop connection.");
                    if (value.desktopDirect !== true && accessible.showWithoutDesktop !== true) throw new Error("This command is available only during a Desktop connection.");
                }
                var normalized = value.desktopDirect === true && value.scriptPath ? null : normalizePayload(value);
                if (value.desktopDirect === true && value.scriptPath || normalized && normalized.approvalLevels.length === 0) return executeDirect(user, value);
                return context.approval.submit("mycommands", user, value, value.note).then(function (request) { return { ok: true, request: request }; });
            }
            if (asset === "multi-execute") return multiExecute(user, value);
            if (asset === "refresh") { library.invalidate(); return { ok: true, tree: visibleTree(user), catalog: visibleCatalog(user) }; }
            if (asset === "source") { requireAdmin(user); requireScriptAccess(user); return { ok: true, script: library.saveSource(value.path, value.text), tree: visibleTree(user) }; }
            if (asset === "definition") {
                requireScriptAccess(user);
                var saved = admin.saveDefinition(user, value.path, value.definition);
                var definitions = scriptAvailability();
                definitions[scriptAvailabilityKey(value.path)] = { showOnDesktop: value.definition && value.definition.showOnDesktop === true, showWithoutDesktop: value.definition && value.definition.showWithoutDesktop === true };
                context.settings.updateSync(function (current) { current.modules.mycommands.scriptAvailability = definitions; return current; });
                saved.definition.showOnDesktop = definitions[scriptAvailabilityKey(value.path)].showOnDesktop;
                saved.definition.showWithoutDesktop = definitions[scriptAvailabilityKey(value.path)].showWithoutDesktop;
                saved.ok = true;
                saved.tree = visibleTree(user);
                return saved;
            }
            if (asset === "command-definition") {
                requireAdmin(user);
                var command = requireCommandAccess(user, value.id).command;
                var definitions = commandOverrides();
                definitions[command.id] = { label: shared.cleanText(value.label || command.label, 200), description: shared.cleanText(value.description, 1000), confirmExecution: value.confirmExecution === true, showOnDesktop: value.showOnDesktop === true, showWithoutDesktop: value.showWithoutDesktop === true };
                context.settings.updateSync(function (current) { current.modules.mycommands.commandOverrides = definitions; return current; });
                return { ok: true, catalog: visibleCatalog(user) };
            }
            if (asset === "script-secrets") { requireScriptAccess(user); return { ok: true, secrets: admin.saveSecrets(user, value.path, value.values, value.clearNames) }; }
            if (asset === "system-credentials") { requireScriptAccess(user); return { ok: true, systemCredentials: admin.saveSystemCredentials(user, value.path, value.selected) }; }
            if (asset === "settings") {
                requireAdmin(user);
                return context.settings.update(function (current) {
                    var config = current.modules.mycommands;
                    config.showInMenu = false;
                    config.showOnDevice = value.showOnDevice !== false;
                    config.accessGroupIds = Array.isArray(value.accessGroupIds) ? value.accessGroupIds.map(String) : [];
                    config.folderPermissions = folderAccess.normalizeRules(value.folderPermissions, folderKeys(), shared.getUserGroups(context.parent).map(function (group) { return group.id; }));
                    config.maxMultiHostNodes = Math.max(1, Math.min(1000, Number(value.maxMultiHostNodes) || 200));
                    config.multiHostConcurrency = Math.max(1, Math.min(64, Number(value.multiHostConcurrency) || 8));
                    return current;
                }).then(function () { return { ok: true }; });
            }
            throw new Error("Unknown My Commands action.");
        },
        getFolderSettings: folderSettings
    };
};
