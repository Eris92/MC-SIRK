(function () {
    "use strict";

    function valueAt(row, path, fallback) {
        var current = row, parts = String(path || "").split(".");
        for (var i = 0; i < parts.length; i++) { if (current == null) return fallback; current = current[parts[i]]; }
        return current == null || current === "" ? fallback : current;
    }

    function approver(row) {
        if (row.approver && row.approver.name) return row.approver.name;
        var decisions = Array.isArray(row.approvalDecisions) ? row.approvalDecisions : [];
        for (var i = decisions.length - 1; i >= 0; i--) if (decisions[i].user && decisions[i].user.name) return decisions[i].user.name;
        return "—";
    }

    function parseDownloadResult(value) {
        var raw = String(value == null ? "" : value);
        var downloadPath = "";
        var lines = raw.split(/\r?\n/);
        var visible = [];
        lines.forEach(function (line) {
            var trimmed = String(line || "").trim();
            var match = /^CSV_DOWNLOAD:(.+)$/i.exec(trimmed);
            if (match) {
                if (!downloadPath) downloadPath = String(match[1] || "").trim();
                return;
            }
            if (/^__(?:MYCOMMANDS|COMMANDTABS)_PROGRESS__/i.test(trimmed)) return;
            if (/^Run as:/i.test(trimmed)) return;
            visible.push(line);
        });
        return { raw: raw, visible: visible.join("\n").trim(), downloadPath: downloadPath };
    }

    function rawResult(row) {
        var result = row && row.result || {};
        var value = result.output || result.rawOutput || result.message || row.output || row.rawOutput;
        if (value != null && value !== "") {
            value = typeof value === "string" ? value : JSON.stringify(value, null, 2);
            return parseDownloadResult(value).visible;
        }
        if (row.status === "pending") return "Waiting for approval.";
        if (row.status === "executing") return "Executing...";
        if (row.summary) return String(row.summary);
        try { return JSON.stringify(row, null, 2); } catch (error) { return String(row.status || "—"); }
    }

    function parseLine(line, delimiter) {
        var values = [], value = "", quoted = false;
        for (var i = 0; i < line.length; i++) {
            var ch = line.charAt(i);
            if (ch === '"') {
                if (quoted && line.charAt(i + 1) === '"') { value += '"'; i++; }
                else quoted = !quoted;
            } else if (ch === delimiter && !quoted) { values.push(value.trim()); value = ""; }
            else value += ch;
        }
        values.push(value.trim()); return values;
    }

    function structuredFromParsed(parsed) {
        var table = null, portal = null;
        if (!parsed) return { table: null, portal: null };
        if (parsed.meshPortal === true) portal = parsed;
        else if (parsed.meshTable === true) table = parsed;
        else if (parsed.data && parsed.data.meshTable === true) table = parsed.data;
        else if (parsed.data && parsed.data.table) table = parsed.data.table;
        else if (parsed.table && Array.isArray(parsed.table.rows)) table = parsed.table;
        else if (Array.isArray(parsed)) table = { title: "Result", rows: parsed };
        else if (Array.isArray(parsed.rows)) table = parsed;
        return { table: table, portal: portal };
    }

    function decodeBase64Utf8(value) {
        var binary = window.atob(String(value || ""));
        var bytes = new Uint8Array(binary.length);
        for (var index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
        if (typeof window.TextDecoder === "function") return new window.TextDecoder("utf-8").decode(bytes);
        var encoded = "";
        for (var offset = 0; offset < bytes.length; offset++) encoded += "%" + ("0" + bytes[offset].toString(16)).slice(-2);
        try { return decodeURIComponent(encoded); } catch (error) { return binary; }
    }

    function parseMyCommandsTable(raw) {
        var match = String(raw || "").match(/__MYCOMMANDS_TABLE_B64__([A-Za-z0-9+/=]+)/);
        if (!match) return null;
        try {
            var parsed = JSON.parse(decodeBase64Utf8(match[1]));
            var structured = structuredFromParsed(parsed);
            if (structured.table) return structured.table;
            if (parsed && typeof parsed === "object") return { title: "Result", rows: [parsed] };
        } catch (error) {}
        return null;
    }

    function parseJsonSuffix(raw) {
        try { return JSON.parse(raw); } catch (error) {}
        var lines = raw.split(/\r?\n/);
        for (var index = 0; index < lines.length; index++) {
            var candidate = lines.slice(index).join("\n").trim();
            if (!candidate) continue;
            try { return JSON.parse(candidate); } catch (error) {}
        }
        var ndjson = [];
        for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            var line = lines[lineIndex].trim();
            if (!line) continue;
            try {
                var item = JSON.parse(line);
                if (!item || typeof item !== "object" || Array.isArray(item)) { ndjson = []; break; }
                ndjson.push(item);
            } catch (error) { ndjson = []; break; }
        }
        return ndjson.length > 1 ? ndjson : null;
    }

    function parseStructured(value) {
        var raw = String(value == null ? "" : value).trim(), parsed = null, table = null, portal = null;
        if (!raw) return { raw: "", table: null, portal: null };

        table = parseMyCommandsTable(raw);
        if (!table) {
            parsed = parseJsonSuffix(raw);
            if (parsed) {
                var structured = structuredFromParsed(parsed);
                table = structured.table;
                portal = structured.portal;
            }
        }

        if (!table && !portal) {
            var lines = raw.split(/\r?\n/).filter(function (line) {
                return line.trim() && !/^__(?:MYCOMMANDS|COMMANDTABS)_PROGRESS__/i.test(line.trim());
            });
            if (lines.length > 1) {
                var delimiter = lines[0].indexOf("\t") >= 0 ? "\t" : lines[0].indexOf(";") >= 0 ? ";" : lines[0].indexOf(",") >= 0 ? "," : "";
                if (delimiter) {
                    var columns = parseLine(lines[0], delimiter);
                    table = { title: "Result", columns: columns, rows: lines.slice(1).map(function (line) {
                        var values = parseLine(line, delimiter), row = {};
                        columns.forEach(function (column, index) { row[column] = values[index] == null ? "" : values[index]; }); return row;
                    }) };
                }
            }
        }
        return { raw: raw, table: table, portal: portal };
    }

    function copyText(value) {
        if (window.SharedScriptTools && window.SharedScriptTools.copyText) return window.SharedScriptTools.copyText(value);
        value = String(value == null ? "" : value);
        if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(value);
        var area = document.createElement("textarea"); area.value = value; area.style.position = "fixed"; area.style.opacity = "0"; document.body.appendChild(area); area.select();
        try { document.execCommand("copy"); } finally { area.remove(); } return Promise.resolve();
    }

    function appendValue(cell, value) {
        if (value && typeof value === "object" && /^https:\/\//i.test(String(value.url || ""))) {
            var link = document.createElement("a"); link.href = value.url; link.target = "_blank"; link.rel = "noopener"; link.textContent = value.text || "Open"; cell.appendChild(link);
        } else cell.textContent = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
    }

    function tableWidthClass(columnCount) {
        if (columnCount >= 7) return "mc-results-table-wide";
        if (columnCount >= 4) return "mc-results-table-medium";
        return "mc-results-table-compact";
    }

    function tableColumnClass(title) {
        var key = String(title || "").trim().toLowerCase().replace(/\s+/g, "");
        if (key === "view") return "mc-results-col-view";
        if (key === "actions" || key === "action") return "mc-results-col-actions";
        if (key === "datetime" || key === "date" || key === "time" || key === "status" || key === "approval") return "mc-results-col-short";
        if (key === "request" || key === "summary" || key === "command" || key === "script" || key === "device" || key === "result") return "mc-results-col-text";
        if (key === "requester" || key === "approver") return "mc-results-col-medium";
        return "mc-results-col-default";
    }

    function renderStructured(host, data) {
        if (data.portal) {
            var portalHeading = document.createElement("h3"); portalHeading.textContent = data.portal.title || "Portal"; host.appendChild(portalHeading);
            if (data.portal.description) { var description = document.createElement("p"); description.textContent = data.portal.description; host.appendChild(description); }
            if (/^https:\/\//i.test(String(data.portal.url || ""))) { var link = document.createElement("a"); link.href = data.portal.url; link.target = "_blank"; link.rel = "noopener"; link.className = "btn btn-primary"; link.textContent = data.portal.buttonLabel || "Open"; host.appendChild(link); }
            return;
        }
        if (data.table && Array.isArray(data.table.rows)) {
            var rows = data.table.rows, columns = Array.isArray(data.table.columns) ? data.table.columns.slice() : [];
            if (!columns.length && rows.length) columns = Object.keys(rows[0] || {});
            var heading = document.createElement("h3"); heading.textContent = data.table.title || "Result"; host.appendChild(heading);
            var filter = document.createElement("input"); filter.type = "search"; filter.className = "mc-results-filter"; filter.placeholder = "Filter result rows"; host.appendChild(filter);
            var wrapper = document.createElement("div"); wrapper.className = "mc-results-table-wrap"; host.appendChild(wrapper);
            function draw() {
                wrapper.innerHTML = "";
                var query = String(filter.value || "").trim().toLocaleLowerCase();
                var visible = query ? rows.filter(function (row) {
                    return columns.map(function (column) {
                        var value = row && row[column];
                        return value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
                    }).join(" ").toLocaleLowerCase().indexOf(query) >= 0;
                }) : rows;
                var table = document.createElement("table"); table.className = "style1 mc-results-table mc-results-structured-table " + tableWidthClass(columns.length);
                var header = table.createTHead().insertRow(); columns.forEach(function (column) { var cell = document.createElement("th"); cell.className = tableColumnClass(column); cell.textContent = column; header.appendChild(cell); });
                var body = table.createTBody(); visible.forEach(function (source) { var row = body.insertRow(); columns.forEach(function (column) { var cell = row.insertCell(); cell.className = tableColumnClass(column); appendValue(cell, source && source[column]); }); });
                wrapper.appendChild(table);
            }
            var timer = 0; filter.oninput = function () { clearTimeout(timer); timer = setTimeout(draw, 100); }; draw(); return;
        }
        var output = document.createElement("pre"); output.className = "mc-results-viewer-output"; output.textContent = data.raw || "No output."; host.appendChild(output);
    }

    function copyResult(data, button) {
        var output = data.raw;
        if (data.table && Array.isArray(data.table.rows)) {
            var rows = data.table.rows, columns = Array.isArray(data.table.columns) ? data.table.columns.slice() : [];
            if (!columns.length && rows.length) columns = Object.keys(rows[0] || {});
            output = [columns.join("\t")].concat(rows.map(function (row) { return columns.map(function (column) { var value = row && row[column]; return String(value == null ? "" : typeof value === "object" ? JSON.stringify(value) : value).replace(/[\t\r\n]+/g, " "); }).join("\t"); })).join("\n");
        }
        return copyText(output).then(function () { if (!button) return; button.textContent = "Copied"; setTimeout(function () { if (button.isConnected) button.textContent = "Copy"; }, 1200); });
    }

    function appendResult(host, raw, options) {
        options = options || {};
        var parsedOutput = parseDownloadResult(raw);
        var data = parseStructured(parsedOutput.visible);
        data.downloadPath = parsedOutput.downloadPath;
        var actions = document.createElement("div");
        actions.className = "mc-results-viewer-actions mc-results-inline-actions";
        var copy = document.createElement("button");
        copy.type = "button";
        copy.className = "btn btn-secondary btn-sm";
        copy.textContent = "Copy";
        copy.onclick = function () {
            copyResult(data, copy).catch(function () { copy.textContent = "Copy failed"; });
        };
        actions.appendChild(copy);
        if (parsedOutput.downloadPath) {
            var download = document.createElement("button");
            download.type = "button";
            download.className = "btn btn-secondary btn-sm mc-results-download-button";
            download.textContent = "Download CSV";
            download.onclick = function () {
                var url = window.SirkPlatformCore.assetUrl("", "download", { path: parsedOutput.downloadPath });
                window.location.href = url;
            };
            actions.appendChild(download);
        }
        host.appendChild(actions);
        var content = document.createElement("div");
        content.className = "mc-results-viewer-content mc-results-inline-content";
        renderStructured(content, data);
        var details = document.createElement("details");
        details.className = "mc-results-debug";
        var summary = document.createElement("summary");
        summary.textContent = "Debug / raw output";
        details.appendChild(summary);
        var debug = document.createElement("pre");
        debug.textContent = parsedOutput.raw;
        details.appendChild(debug);
        content.appendChild(details);
        host.appendChild(content);
        return data;
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
        });
    }

    function hostDialogManager() {
        var modern = typeof window.setModalContent === "function" &&
            typeof window.showModal === "function" &&
            document.getElementById("xxAddAgentModal") &&
            document.getElementById("xxAddAgentModalConf") &&
            document.getElementById("dialog2");
        if (modern) return { mode: "modern", setContent: window.setModalContent, show: window.showModal };
        var classic = typeof window.setDialogMode === "function" &&
            document.getElementById("dialog") &&
            document.getElementById("id_dialogOptions");
        if (classic) return { mode: "classic", show: window.setDialogMode };
        return null;
    }

    function openViewer(row, options) {
        options = options || {};
        var raw = typeof options.resultValue === "function" ? options.resultValue(row) : rawResult(row);
        var manager = hostDialogManager();
        if (!manager) throw new Error("Native MeshCentral dialog manager is unavailable.");
        var hostId = "SirkResultsViewerNativeHost";
        var contentHtml = '<div id="' + hostId + '" class="mc-results-viewer"></div>';
        var title = escapeHtml(options.dialogTitle || row.title || "Result");
        if (manager.mode === "modern") {
            manager.setContent("xxAddAgent", title, contentHtml, "extra-large");
            manager.show("xxAddAgentModal");
        } else {
            manager.show(2, title, 1, null, contentHtml);
        }
        var host = document.getElementById(hostId);
        if (!host) throw new Error("Native MeshCentral result dialog content is unavailable.");
        appendResult(host, raw, options);
        if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.refresh === "function") window.MeshThemeAdapter.refresh(host);
        var close = document.getElementById("idx_dlgOkButton") || document.getElementById("idx_dlgCancelButton");
        if (close && typeof close.focus === "function") close.focus();
    }

    function defaultColumns(kind) {
        var dateTime = { title: "DateTime", value: function (row) { return row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"; } };
        var command = { title: kind === "commands" ? "Command" : "Script", value: function (row) { return row.title || valueAt(row, "result.command", "") || valueAt(row, "fields.script", "") || row.summary || "—"; } };
        var device = { title: "Device", value: function (row) { return valueAt(row, "result.nodeName", "") || valueAt(row, "result.nodeId", "") || String(row.summary || "").replace(/^Device:\s*/i, "") || "—"; } };
        var columns = kind === "commands" ? [dateTime, device, command] : [dateTime, command];
        columns.push(
            { title: "Requester", value: function (row) { return valueAt(row, "requester.name", "—"); } },
            { title: "Approver", value: approver },
            { title: "Approval", value: function (row) { var progress = row.approvalProgress || {}; return progress.text || ((progress.approved || 0) + "/" + (progress.total || 0)); } },
            { title: "Status", value: function (row) { return row.status || "—"; }, className: function (row) { return "mc-results-status mc-results-status-" + String(row.status || "unknown").toLowerCase(); } },
            { title: "Result", value: function (row) { var value = rawResult(row); return value.length > 180 ? value.slice(0, 180) + "…" : value; } }
        );
        return columns;
    }

    function searchText(row, columns) {
        var values = columns.map(function (column) { try { return typeof column.value === "function" ? column.value(row) : valueAt(row, column.path, ""); } catch (error) { return ""; } });
        values.push(rawResult(row)); try { values.push(JSON.stringify(row)); } catch (error) {}
        return values.join(" ").toLocaleLowerCase();
    }

    window.SharedResultsView = {
        parseStructured: parseStructured,
        parseDownloadResult: parseDownloadResult,
        openViewer: openViewer,
        copyText: copyText,
        rawResult: rawResult,
        mountResult: function (host, value, options) {
            host.innerHTML = "";
            return appendResult(host, value, options);
        },
        mountStatus: function (host, options) {
            options = options || {};
            window.SharedStatusNav.mount(host, { selected: options.selected || "", counts: options.counts, onSelect: options.onSelect });
        },
        mountTable: function (host, options) {
            options = options || {};
            var sourceRows = Array.isArray(options.rows) ? options.rows.slice() : [];
            var columns = options.columns || defaultColumns(options.kind || "scripts");
            host.innerHTML = "";
            if (options.title) { var title = document.createElement("h3"); title.className = "mc-results-title"; title.textContent = options.title; host.appendChild(title); }
            var filter = document.createElement("input"); filter.type = "search"; filter.className = "mc-results-filter"; filter.placeholder = options.filterPlaceholder || "Filter results"; filter.value = options.filterValue || "";
            if (options.filter !== false) host.appendChild(filter);
            var tableHost = document.createElement("div"); host.appendChild(tableHost);
            function render() {
                tableHost.innerHTML = "";
                var query = String(filter.value || "").trim().toLocaleLowerCase();
                var rows = query ? sourceRows.filter(function (row) { return searchText(row, columns).indexOf(query) >= 0; }) : sourceRows;
                if (!rows.length) {
                    var empty = document.createElement("div"); empty.className = "mc-shared-card"; empty.appendChild(document.createElement("strong")).textContent = "No results";
                    var message = document.createElement("div"); message.className = "mc-shared-muted"; message.textContent = options.emptyText || "No results match the selected status or filter."; empty.appendChild(message); tableHost.appendChild(empty); return;
                }
                var wrapper = document.createElement("div"); wrapper.className = "mc-results-table-wrap";
                var renderedColumnCount = columns.length + (options.showView !== false ? 1 : 0) + (typeof options.actions === "function" ? 1 : 0);
                var table = document.createElement("table"); table.className = "style1 mc-results-table mc-results-table-" + String(options.kind || "scripts") + " " + tableWidthClass(renderedColumnCount); wrapper.appendChild(table); tableHost.appendChild(wrapper);
                var header = table.createTHead().insertRow(); columns.forEach(function (column) { var cell = document.createElement("th"); cell.className = tableColumnClass(column.title); cell.textContent = column.title; header.appendChild(cell); });
                if (options.showView !== false) { var viewHead = document.createElement("th"); viewHead.className = "mc-results-col-view"; viewHead.textContent = "View"; header.appendChild(viewHead); }
                if (typeof options.actions === "function") { var actionHead = document.createElement("th"); actionHead.className = "mc-results-col-actions"; actionHead.textContent = "Actions"; header.appendChild(actionHead); }
                var body = table.createTBody(); rows.forEach(function (row) {
                    var tableRow = body.insertRow();
                    columns.forEach(function (column) {
                        var cell = tableRow.insertCell();
                        cell.className = tableColumnClass(column.title);
                        if (typeof column.render === "function") { column.render(cell, row); return; }
                        var value = typeof column.value === "function" ? column.value(row) : valueAt(row, column.path, "—");
                        var stateClass = typeof column.className === "function" ? column.className(row) || "" : column.className || "";
                        if (stateClass) cell.className += " " + stateClass;
                        appendValue(cell, value);
                    });
                    if (options.showView !== false) {
                        var viewCell = tableRow.insertCell(), view = document.createElement("button");
                        viewCell.className = "mc-results-col-view";
                        view.type = "button";
                        view.className = "btn btn-secondary btn-sm mc-results-view-button";
                        view.textContent = "View";
                        if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.button === "function") window.MeshThemeAdapter.button(view, "secondary");
                        view.onclick = function () { openViewer(row, options); };
                        viewCell.appendChild(view);
                    }
                    if (typeof options.actions === "function") { var actionCell = tableRow.insertCell(); actionCell.className = "mc-results-col-actions"; options.actions(actionCell, row); }
                });
            }
            var timer = 0; filter.oninput = function () { clearTimeout(timer); timer = setTimeout(render, 120); }; render();
        }
    };
}());