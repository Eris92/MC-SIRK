from pathlib import Path
import json

OLD = "0.1.1-dev.37"
NEW = "0.1.1-dev.38"
DATE = "2026-08-10"


def replace_exact(path, old, new, expected=1):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f"Unexpected {path} marker count for {old!r}: {count}")
    p.write_text(text.replace(old, new), encoding="utf-8")

for file in ["package.json", "config.json"]:
    path = Path(file)
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("version") != OLD:
        raise RuntimeError(f"Unexpected {file} version: {data.get('version')}")
    data["version"] = NEW
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

replace_exact("README.md", f"# SIRK Management Platform {OLD}", f"# SIRK Management Platform {NEW}")
replace_exact("README.md", f"docs/releases/{OLD}.md", f"docs/releases/{NEW}.md")
replace_exact("docs/PROJECT-STATE.md", f"Current version: `{OLD}`", f"Current version: `{NEW}`")
replace_exact("docs/PROJECT-STATE.md", f"package.json -> {OLD}", f"package.json -> {NEW}")
replace_exact("docs/PROJECT-STATE.md", f"config.json  -> {OLD}", f"config.json  -> {NEW}")
replace_exact("docs/PROJECT-STATE.md", f"docs/releases/{OLD}.md", f"docs/releases/{NEW}.md")

release_index = Path("docs/releases/README.md")
index_text = release_index.read_text(encoding="utf-8")
marker = f"- [`{OLD}`]({OLD}.md)"
if index_text.count(marker) != 1:
    raise RuntimeError("Current release-index marker missing or duplicated")
new_line = f"- [`{NEW}`]({NEW}.md) — follow-up po real `{OLD}` smoke: Network Settings korzysta z jednego shared logged-on-user launch ownera zamiast modułowego interactive-SYSTEM pre-wrappera; Results nie wymusza już natywnego `modal-xl`;\n"
release_index.write_text(index_text.replace(marker, new_line + marker, 1), encoding="utf-8")

changelog_path = Path("changelog.md")
old_changelog = changelog_path.read_text(encoding="utf-8")
if old_changelog.startswith(f"## {NEW}"):
    raise RuntimeError("dev.38 changelog already exists")
entry = f'''## {NEW} - {DATE}

- Follow up real `{OLD}` smoke evidence: Network Settings still failed although the same `FolderItemVerb.DoIt()` operation worked manually, and Results View remained visually unchanged.
- Fix the Network invocation root cause: built-in `runAsUser: 2` commands no longer get pre-wrapped by the Commands module into the legacy `SIRK-Desktop-*` interactive-SYSTEM launcher; the existing `server/core/logged-on-user-command-policy.js` is now the single owner of logged-on-user execution.
- Remove the obsolete module-local `desktopLaunch()` / `interactiveDesktopCommand()` implementation instead of layering another launcher, while preserving the Network command body, stable IDs, route/adapter selection and real `Properties/Właściwości` verb.
- Fix the Results geometry owner identified in the native MeshCentral contract: stop passing `extra-large` to `setModalContent()`, so MC-SIRK no longer forces `modal-xl` on `#xxAddAgentModalConf`; result rendering, Copy, CSV, Debug and native close lifecycle remain unchanged.
- Full runtime/shared regression Test #528 is green before the version bump. Keep #128 and #237 open for real `{NEW}` re-smoke; no tag or GitHub Release.

Current development notes: `docs/releases/{NEW}.md`.

'''
changelog_path.write_text(entry + old_changelog, encoding="utf-8")

history_path = Path("version-history.json")
history = json.loads(history_path.read_text(encoding="utf-8"))
if not isinstance(history, list) or not history or history[0].get("version") != OLD:
    raise RuntimeError("Unexpected version-history head")
if any(item.get("version") == NEW for item in history):
    raise RuntimeError("dev.38 already exists in version-history")
history.insert(0, {
    "version": NEW,
    "date": DATE,
    "changes": [
        "Bump the pre-1.0 development revision for the real dev.37 Network invocation-owner and Results native-geometry follow-up.",
        "Remove the Commands module's duplicate interactive Desktop launcher and preserve runAsUser 2 until the canonical logged-on-user-command-policy owns the active WTS/user-session launch.",
        "Keep the proven Network Settings Status=Up and real FolderItem Properties/Właściwości verb body unchanged while removing the legacy interactive-SYSTEM SIRK-Desktop pre-wrapper from this execution path.",
        "Stop forcing MeshCentral extra-large/modal-xl geometry for Results; retain native dialog lifecycle and table/Copy/CSV/Debug behavior. Test #528 is green; #128/#237 stay open for real dev.38 smoke; no automatic tag or GitHub Release."
    ]
})
history_path.write_text(json.dumps(history, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

notes_path = Path(f"docs/releases/{NEW}.md")
if notes_path.exists():
    raise RuntimeError("dev.38 notes already exist")
notes = f'''# {NEW}

Status: **development pre-1.0**. This is a real-smoke follow-up to `{OLD}`. It is a test build, not a product release. No tag or GitHub Release is created.

## Real dev.37 evidence

### Network Settings (#128)

`{OLD}` still did not open adapter properties from MC-SIRK even though the same core PowerShell/Shell operation was proven manually on the Windows host. That evidence moved the root cause away from `FolderItemVerb.DoIt()` itself and into the MC-SIRK invocation chain.

Current-code tracing found duplicate execution ownership:

1. the canonical catalog correctly marked Network Settings as `runAsUser: 2`;
2. `server/modules/commands/index.js::buildCommand()` intercepted that value before transport and wrapped the command in its own `interactiveDesktopCommand()` / `SIRK-Desktop-*` scheduled-task launcher, changing it to `runAsUser: 0`;
3. because the value was already zero, the canonical `server/core/logged-on-user-command-policy.js` never owned the command;
4. the elevated Quick policy recognized the legacy `SIRK-Desktop-*` marker and could convert it into an interactive **SYSTEM** launch.

This differs materially from the manually working logged-on-user invocation and violated the intended single-owner `runAsUser: 2` contract.

### Results View (#237)

`{OLD}` View looked unchanged because the dev.37 CSS/card correction did not touch the actual visible Modern dialog size owner. MC-SIRK still called:

```text
setModalContent("xxAddAgent", ..., "extra-large")
```

MeshCentral applies that size as `modal-xl` directly to the native `#xxAddAgentModalConf` dialog. The working Move Request path uses the same native dialog manager without a size override.

## Changes

### Network — one logged-on-user execution owner

- Remove the Commands module's private `desktopLaunch()` and `interactiveDesktopCommand()` implementation.
- Stop converting built-in `runAsUser: 2` commands to a module-owned `runAsUser: 0` wrapper.
- Preserve the canonical command `type` and `runAsUser` through `buildCommand()` so `server/core/logged-on-user-command-policy.js` owns the active WTS/Explorer user-session launch.
- Preserve the Network Settings command body itself: IPv4/IPv6 deterministic default-route selection, `Status = Up`, `Namespace(49)`, exact `Properties/Właściwości` verb and `FolderItemVerb.DoIt()`.
- Preserve stable IDs, Favorites/overrides and Network Control behavior.
- Add regressions that reject a second `SIRK-Desktop-*` launcher in the Commands module and exercise a Network Settings-shaped command through the shared logged-on-user policy.

### Results — native MeshCentral geometry owner

- Stop passing `"extra-large"` to Modern `setModalContent()`.
- Do not add replacement widths, resize handlers, observers or timers.
- MeshCentral keeps ownership of native dialog geometry; `SharedResultsView` remains only the content renderer.
- Preserve structured/table output, horizontal scrolling, Copy, generated CSV Download, expandable full Debug and native Modern/Classic close lifecycle.
- Add negative regressions preventing `extra-large` from returning in the Results renderer.

## Automated verification before version bump

Full **Test #528** on PR #250's clean runtime state is GREEN, including:

- `SYSTEM and logged-on-user command policy: OK`
- `Logged-on-user command policy: OK`
- `Native UI integration contracts: OK`
- `Network panel and active-adapter properties use an operational adapter and the real Windows Shell Properties verb: OK`
- `Results viewer completes the native Modern/Classic MeshCentral dialog contract before mounting output: OK`
- `Results viewer first paint is final, structured output is tabular, Debug preserves full raw output and native modal owns outer geometry: OK`
- `Security regression tests: OK`

A final full `npm test` is required on the exact `{NEW}` metadata state before integration.

## Required real smoke

After installing `{NEW}`:

1. **Network Settings** — run on the same Windows host/session where the direct `FolderItemVerb.DoIt()` test succeeded. It must open properties for the preferred eligible `Up` adapter. Confirm there is no SYSTEM-owned GUI behavior and no helper CMD/PowerShell flash.
2. **Network Control** — still opens only the Network Connections panel.
3. **Results View** — open the same request/result used for the dev.37 report. Confirm the dialog no longer has the unchanged oversized/nested appearance caused by forced `modal-xl`; content, Copy, CSV (where available), Debug and close must still work.
4. Repeat Network Settings with VPN/multiple adapters where practical to confirm the preferred operational default route is still selected.

Do not close #128 or #237 until this real `{NEW}` evidence satisfies their acceptance criteria.
'''
notes_path.write_text(notes, encoding="utf-8")

if json.loads(Path("package.json").read_text(encoding="utf-8"))["version"] != NEW:
    raise RuntimeError("package version mismatch")
if json.loads(Path("config.json").read_text(encoding="utf-8"))["version"] != NEW:
    raise RuntimeError("config version mismatch")
if json.loads(history_path.read_text(encoding="utf-8"))[0]["version"] != NEW:
    raise RuntimeError("version-history head mismatch")
