from pathlib import Path


def once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, got {count}")
    return text.replace(old, new, 1)

results_path = Path("public/shared/ui/results.js")
results = results_path.read_text(encoding="utf-8")

raw_anchor = '''    function rawResult(row) {
        var result = row && row.result || {};
        var value = result.output || result.rawOutput || result.message || row.output || row.rawOutput;
        if (value != null && value !== "") return typeof value === "string" ? value : JSON.stringify(value, null, 2);
        if (row.status === "pending") return "Waiting for approval.";
        if (row.status === "executing") return "Executing...";
        if (row.summary) return String(row.summary);
        try { return JSON.stringify(row, null, 2); } catch (error) { return String(row.status || "—"); }
    }
'''
raw_replacement = '''    function parseDownloadResult(value) {
        var raw = String(value == null ? "" : value);
        var downloadPath = "";
        var lines = raw.split(/\\r?\\n/);
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
        return { raw: raw, visible: visible.join("\\n").trim(), downloadPath: downloadPath };
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
'''
results = once(results, raw_anchor, raw_replacement, "integrate download marker parsing")

append_old = '''    function appendResult(host, raw, options) {
        options = options || {};
        var data = parseStructured(raw);
        var actions = document.createElement("div"); actions.className = "mc-results-viewer-actions mc-results-inline-actions";
        var copy = document.createElement("button"); copy.type = "button"; copy.className = "btn btn-secondary btn-sm"; copy.textContent = "Copy"; copy.onclick = function () { copyResult(data, copy).catch(function () { copy.textContent = "Copy failed"; }); };
        actions.appendChild(copy); host.appendChild(actions);
        var content = document.createElement("div"); content.className = "mc-results-viewer-content mc-results-inline-content"; renderStructured(content, data);
        var details = document.createElement("details"); details.className = "mc-results-debug";
        var summary = document.createElement("summary"); summary.textContent = "Debug / raw output"; details.appendChild(summary);
        var debug = document.createElement("pre"); debug.textContent = data.raw; details.appendChild(debug); content.appendChild(details); host.appendChild(content);
        return data;
    }
'''
append_new = '''    function appendResult(host, raw, options) {
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
'''
results = once(results, append_old, append_new, "render CSV download directly")

columns_start = results.index("    function defaultColumns(kind) {")
columns_end = results.index("    function searchText", columns_start)
columns_new = '''    function defaultColumns(kind) {
        var dateTime = { title: "DateTime", value: function (row) { return row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"; } };
        var command = { title: kind === "commands" ? "Command" : "Script", value: function (row) { return row.title || valueAt(row, "result.command", "") || valueAt(row, "fields.script", "") || row.summary || "—"; } };
        var device = { title: "Device", value: function (row) { return valueAt(row, "result.nodeName", "") || valueAt(row, "result.nodeId", "") || String(row.summary || "").replace(/^Device:\\s*/i, "") || "—"; } };
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

'''
results = results[:columns_start] + columns_new + results[columns_end:]

results = once(
    results,
    '                var table = document.createElement("table"); table.className = "style1 mc-results-table"; wrapper.appendChild(table); tableHost.appendChild(wrapper);\n',
    '                var table = document.createElement("table"); table.className = "style1 mc-results-table mc-results-table-" + String(options.kind || "scripts"); wrapper.appendChild(table); tableHost.appendChild(wrapper);\n',
    "tag result table kind"
)
results = once(results, "        parseStructured: parseStructured,\n", "        parseStructured: parseStructured,\n        parseDownloadResult: parseDownloadResult,\n", "export download parser")
results_path.write_text(results, encoding="utf-8")

# Consolidate layout rules in static CSS.
css_path = Path("public/shared/ui/shared-ui.css")
css = css_path.read_text(encoding="utf-8")
extra = '''
.mc-results-table{table-layout:fixed}
.mc-results-table-commands th:nth-child(1){width:160px}
.mc-results-table-commands th:nth-child(2){width:150px}
.mc-results-table-commands th:nth-child(4),.mc-results-table-commands th:nth-child(5){width:120px}
.mc-results-table-commands th:nth-child(6),.mc-results-table-commands th:nth-child(7){width:92px}
.mc-results-download-button{white-space:nowrap}
'''
if ".mc-results-table-commands th:nth-child(1)" not in css:
    css = css.rstrip() + "\n" + extra
css_path.write_text(css, encoding="utf-8")

for relative in ["public/shared/ui/download-results.js", "public/shared/ui/result-layout.js"]:
    Path(relative).unlink()

plugin_path = Path("plugin-main.js")
plugin = plugin_path.read_text(encoding="utf-8")
for line in [
    '            ["sirk-platform-download-results", "download-results.js"],\n',
    '            ["sirk-platform-result-layout", "shared-ui/result-layout.js"],\n',
]:
    if line not in plugin:
        raise SystemExit(f"plugin-main asset line missing: {line.strip()}")
    plugin = plugin.replace(line, "", 1)
plugin_path.write_text(plugin, encoding="utf-8")

admin_path = Path("admin.js")
admin = admin_path.read_text(encoding="utf-8")
for line in [
    '        "download-results.js": ["public/shared/ui/download-results.js", "text/javascript; charset=utf-8"],\n',
    '        "shared-ui/result-layout.js": ["public/shared/ui/result-layout.js", "text/javascript; charset=utf-8"],\n',
]:
    if line not in admin:
        raise SystemExit(f"admin asset line missing: {line.strip()}")
    admin = admin.replace(line, "", 1)
admin_path.write_text(admin, encoding="utf-8")

print("Result decorators consolidated")
