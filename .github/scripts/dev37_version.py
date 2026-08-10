from pathlib import Path
import json

OLD = "0.1.1-dev.36"
NEW = "0.1.1-dev.37"
DATE = "2026-08-10"


def replace_required(path, old, new, minimum=1):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count < minimum:
        raise RuntimeError(f"Expected at least {minimum} occurrences in {path}, found {count}: {old}")
    p.write_text(text.replace(old, new), encoding="utf-8")


# Active version sources.
for file in ["package.json", "config.json"]:
    data = json.loads(Path(file).read_text(encoding="utf-8"))
    if data.get("version") != OLD:
        raise RuntimeError(f"Unexpected {file} version: {data.get('version')}")
    data["version"] = NEW
    Path(file).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# Current documentation pointers only.
replace_required("README.md", f"# SIRK Management Platform {OLD}", f"# SIRK Management Platform {NEW}")
replace_required("README.md", f"docs/releases/{OLD}.md", f"docs/releases/{NEW}.md")
replace_required("docs/PROJECT-STATE.md", f"Current version: `{OLD}`", f"Current version: `{NEW}`")
replace_required("docs/PROJECT-STATE.md", f"package.json -> {OLD}", f"package.json -> {NEW}")
replace_required("docs/PROJECT-STATE.md", f"config.json  -> {OLD}", f"config.json  -> {NEW}")
replace_required("docs/PROJECT-STATE.md", f"docs/releases/{OLD}.md", f"docs/releases/{NEW}.md")

release_index = Path("docs/releases/README.md")
index_text = release_index.read_text(encoding="utf-8")
marker = f"- [`{OLD}`]({OLD}.md)"
if marker not in index_text:
    raise RuntimeError("Current release index marker not found")
new_line = f"- [`{NEW}`]({NEW}.md) — follow-up po real `{OLD}` smoke: Results bez podwójnej powierzchni/geometrii oraz Network Settings wybierający tylko adapter `Up` i wykonujący rzeczywisty Shell `Properties/Właściwości` verb;\n"
index_text = index_text.replace(marker, new_line + marker, 1)
release_index.write_text(index_text, encoding="utf-8")

changelog = Path("changelog.md")
old_changelog = changelog.read_text(encoding="utf-8")
entry = f'''## {NEW} - {DATE}

- Follow up real `{OLD}` smoke evidence: Results content is present but the plugin root still owns a second card/viewport geometry inside the native MeshCentral modal, while Network Settings still does not open properties from the plugin.
- Remove standalone Results overlay/viewport geometry and stop mapping `.mc-results-viewer` to a second card, leaving the native MeshCentral modal as the sole outer surface/geometry owner while preserving parsed/table/Copy/CSV/Debug content.
- Tighten Network Settings default-route eligibility so each `Alive` route must map to a `Get-NetAdapter` object with `Status = Up`; preserve IPv4-first/IPv6 fallback and deterministic route/interface metric ordering.
- Replace the dev.36 PIDL/ShellExecuteEx false-success path with the actual `FolderItem.Verbs()` `Properties/Właściwości` verb and `FolderItemVerb.DoIt()` path proven to open the adapter properties UI on the real Windows host.
- Keep Issues #237 and #128 open for real dev.37 re-smoke; keep the revision below `1.0.0` with no tag or GitHub Release.

Current development notes: `docs/releases/{NEW}.md`.

'''
if old_changelog.startswith(f"## {NEW}"):
    raise RuntimeError("dev.37 changelog already exists")
changelog.write_text(entry + old_changelog, encoding="utf-8")

history_path = Path("version-history.json")
history = json.loads(history_path.read_text(encoding="utf-8"))
if not isinstance(history, list) or not history or history[0].get("version") != OLD:
    raise RuntimeError("Unexpected version-history head")
if any(item.get("version") == NEW for item in history):
    raise RuntimeError("dev.37 already exists in version-history")
history.insert(0, {
    "version": NEW,
    "date": DATE,
    "changes": [
        "Bump the pre-1.0 development revision so MeshCentral update detection installs the follow-up to the real dev.36 Results geometry and Network Settings execution failures.",
        "Leave the native MeshCentral modal as the only Results outer surface and geometry owner by removing standalone viewer viewport sizing and second-card ownership while preserving structured output, Copy, CSV and full Debug.",
        "Require an Alive default route to map to an Up adapter before selection, preserving IPv4-first/IPv6 fallback and deterministic metrics so stale routes cannot select a disconnected interface.",
        "Use the real Network Connections FolderItem Properties/Właściwości verb with FolderItemVerb.DoIt(), proven on the user's Windows host after dev.36 ShellExecuteEx returned false-positive success; keep #237/#128 open for real dev.37 smoke and create no tag/GitHub Release."
    ]
})
history_path.write_text(json.dumps(history, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

notes = f'''# {NEW}

Status: **development pre-1.0**. This revision follows real MeshCentral `{OLD}` smoke failures reported on {DATE}. It is a test build, not a product release, and creates no tag or GitHub Release.

## Real dev.36 evidence

### Results viewer (#237)

The native MeshCentral modal is now opaque and result content is present, but real screenshots show a second inner Results rectangle whose size differs from the host modal and visibly shifts. Current code confirmed duplicate ownership: `.mc-results-viewer` still carried standalone `vw/vh` geometry and `MeshThemeAdapter` still mapped it to a `card` inside the already-native modal.

### Network Settings (#128)

The plugin still did not open adapter properties. Manual diagnostics on the real Windows host established two concrete facts:

1. an `Alive` default route mapped to `Ethernet 2`, but `Get-NetAdapter` reported that adapter as **Disconnected**;
2. the dev.36 PIDL + `ShellExecuteEx(properties)` path returned SUCCESS without opening the target UI, while filtering candidates to adapters with `Status = Up`, enumerating the selected Network Connections `FolderItem.Verbs()`, selecting the actual `Properties/Właściwości` verb and calling `FolderItemVerb.DoIt()` **did open the adapter properties UI**.

Issues #237 and #128 remain open until this revision passes real re-smoke.

## Changes

### Results — one native surface owner

- Keep `public/shared/ui/results.js` as the single Results renderer and keep the native Modern/Classic dialog lifecycle from dev.36.
- Remove obsolete plugin-owned Results overlay CSS.
- Replace standalone `.mc-results-viewer` viewport sizing with a normal `width:100%` content root inside the host modal.
- Remove `.mc-results-viewer` from `MeshThemeAdapter` card mapping, while retaining it as a plugin root so child controls/tables still receive native theme ownership.
- No new modal, timer, observer, rerender loop or private light/dark palette.

### Network Settings — operational adapter + real Shell verb

- Preserve stable ID `network-adapter-properties`, label `Network Settings`, `runAsUser: 2`, the existing interactive launcher and `Namespace(49)` Network Connections owner.
- For each `Alive` IPv4 default-route candidate, resolve `Get-NetAdapter -InterfaceIndex ...`; only candidates whose adapter has `Status = Up` are eligible. If none qualify, repeat for IPv6.
- Preserve deterministic ordering by route metric + interface metric with InterfaceIndex tie-break.
- Keep the selected route and already-validated adapter paired; resolve the exact Network Connections `FolderItem` by adapter name.
- Enumerate `FolderItem.Verbs()`, normalize accelerator `&`, select `Properties` or `Właściwości`, and execute that exact `FolderItemVerb.DoIt()`.
- Remove the ineffective embedded C#/PIDL/`ShellExecuteEx` path. No fixed sleep, second launcher, privilege change or panel-only fallback.

## Automated verification before version bump

Runtime/shared changes passed full **Test #513** on the clean dev.36-metadata PR state, including:

- `Canonical short command labels preserve stable IDs and execution: OK`
- `Network panel and active-adapter properties use an operational adapter and the real Windows Shell Properties verb: OK`
- `Results viewer first paint is final, structured output is tabular, Debug preserves full raw output and native modal owns outer geometry: OK`
- generated CSV, Commands/Plugins, Move Request, runtime/shared UI/startup and security regressions: GREEN.

A final full `npm test` is still required on the exact `{NEW}` metadata state before merge.

## Required real smoke

After installing `{NEW}` from canonical `main`:

1. **Results / Request details** — open the same rows used for dev.36 evidence. There must be one native modal surface only: no inner card/window border, no `vw/vh`-sized inner rectangle and no visible geometry jump. Structured results should remain tabular; Copy, CSV where available and expandable full Debug must work.
2. **Network Settings** — on the same Windows host, run Network Settings with an interactive user. It must ignore the stale/disconnected default-route adapter, select an eligible `Up` adapter deterministically and open that adapter's properties without helper CMD/PowerShell flash.
3. **Network Control regression** — must still open only the Network Connections panel.
4. Where practical, repeat Network Settings with multiple adapters/VPN routes and verify the selected properties belong to the preferred operational default route.

Do not close #237 or #128 until this real evidence satisfies their acceptance criteria.
'''
notes_path = Path(f"docs/releases/{NEW}.md")
if notes_path.exists():
    raise RuntimeError("dev.37 notes already exist")
notes_path.write_text(notes, encoding="utf-8")

# Final local metadata sanity.
package_version = json.loads(Path("package.json").read_text(encoding="utf-8"))["version"]
config_version = json.loads(Path("config.json").read_text(encoding="utf-8"))["version"]
if package_version != NEW or config_version != NEW or package_version != config_version:
    raise RuntimeError("package/config version mismatch")
if json.loads(history_path.read_text(encoding="utf-8"))[0]["version"] != NEW:
    raise RuntimeError("version-history head mismatch")
