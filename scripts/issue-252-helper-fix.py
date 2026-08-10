from pathlib import Path

helper_path = Path("scripts/issue-252-apply.py")
helper = helper_path.read_text(encoding="utf-8")

# Apply the one fragile insertion directly in the temporary checkout. Nothing is
# committed until every subsequent guarded transformation succeeds.
service_path = Path("server/core/jira-assets-service.js")
service = service_path.read_text(encoding="utf-8")
marker = "\n\nfunction allStrings(value, result, depth) {"
if service.count(marker) != 1 or "function writeJsonAtomicSync" in service:
    raise SystemExit("jira-assets-service atomic-write insertion state is unexpected")
atomic = '''

function writeJsonAtomicSync(fs, path, target, value) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    var temporary = target + "." + process.pid + "." + shared.randomId(5) + ".tmp";
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + "\\n", "utf8");
    fs.renameSync(temporary, target);
}'''
service_path.write_text(service.replace(marker, atomic + marker, 1), encoding="utf-8")

# Remove the now-unnecessary first guarded replace_once() block from the main
# transformer. Locate it structurally between the section comment and the next
# exact replacement call.
section = helper.index("# jira-assets-service: synchronous atomic writes")
first = helper.index("replace_once(", section)
second = helper.index("replace_once(", first + len("replace_once("))
helper = helper[:first] + helper[second:]

# The shared module has no parseJsonObject helper; keep query JSON parsing local
# and bounded to a plain object.
old = '                var currentValues = shared.parseJsonObject(q.values, {});'
new = '''                var currentValues = {};
                try { currentValues = q.values ? JSON.parse(String(q.values)) : {}; } catch (error) { currentValues = {}; }
                if (!currentValues || typeof currentValues !== "object" || Array.isArray(currentValues)) currentValues = {};'''
if helper.count(old) != 1:
    raise SystemExit("variable-options JSON parser replacement state is unexpected")
helper = helper.replace(old, new, 1)

if "shared.parseJsonObject" in helper:
    raise SystemExit("shared.parseJsonObject must not remain")
helper_path.write_text(helper, encoding="utf-8")
