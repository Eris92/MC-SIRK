from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
old = "0.1.1-dev.15"
new = "0.1.1-dev.16"

def replace_once(path, old_text, new_text):
    p = root / path
    text = p.read_text(encoding="utf-8")
    count = text.count(old_text)
    if count != 1:
        raise SystemExit(f"Expected one match in {path}: {old_text!r}, got {count}")
    p.write_text(text.replace(old_text, new_text, 1), encoding="utf-8")

# SemVer sources.
replace_once("package.json", f'"version": "{old}"', f'"version": "{new}"')
replace_once("config.json", f'"version": "{old}"', f'"version": "{new}"')

# Active documentation pointers only; historical entries stay unchanged.
replace_once("README.md", f"# SIRK Management Platform {old}", f"# SIRK Management Platform {new}")
replace_once("README.md", f"docs/releases/{old}.md", f"docs/releases/{new}.md")

replace_once("docs/PROJECT-STATE.md", f"Current version: `{old}`", f"Current version: `{new}`")
replace_once("docs/PROJECT-STATE.md", f"package.json -> {old}", f"package.json -> {new}")
replace_once("docs/PROJECT-STATE.md", f"config.json  -> {old}", f"config.json  -> {new}")
replace_once("docs/PROJECT-STATE.md", f"Aktualne development notes: `docs/releases/{old}.md`.", f"Aktualne development notes: `docs/releases/{new}.md`.")

release_index = root / "docs/releases/README.md"
text = release_index.read_text(encoding="utf-8")
old_line = f"- [`{old}`]({old}.md) — bieżąca rewizja development z natywnym `modal-content` dla Move Request i primary Submit po real dev.14 re-smoke;"
if old_line not in text:
    raise SystemExit("Current release-index line not found")
new_lines = (
    f"- [`{new}`]({new}.md) — bieżąca rewizja development z pełnym native modal variable-owner chainem dla Move Request po real dev.15 re-smoke;\n"
    f"- [`{old}`]({old}.md) — poprzednia rewizja development z natywnym `modal-content` dla Move Request i primary Submit po real dev.14 re-smoke;"
)
release_index.write_text(text.replace(old_line, new_lines, 1), encoding="utf-8")

changelog = root / "changelog.md"
text = changelog.read_text(encoding="utf-8")
marker = "# Changelog\n\n"
if not text.startswith(marker):
    raise SystemExit("Unexpected changelog header")
section = f'''## {new} — 2026-08-08

- Bump the pre-1.0 development revision so MeshCentral update detection installs the complete native Move Request modal variable-owner fix from current `main`.
- Keep `mc-move-dialog modal-content` in Modern while assigning the existing overlay the native `modal` class that owns Bootstrap modal surface variables.
- Reuse the existing `MeshThemeAdapter` root/refresh lifecycle and apply it to the detached overlay before first paint; do not add another modal framework or background workaround.
- Preserve Classic `style10`, native primary `Submit request`, Move Request backend semantics and the existing #127 pending/success/error lifecycle.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/{new}.md`.

'''
changelog.write_text(marker + section + text[len(marker):], encoding="utf-8")

history_path = root / "version-history.json"
history = json.loads(history_path.read_text(encoding="utf-8"))
if not isinstance(history, list) or not history or history[0].get("version") != old:
    raise SystemExit("Unexpected version-history head")
history.insert(0, {
    "version": new,
    "date": "2026-08-08",
    "changes": [
        "Bump the pre-1.0 development revision so MeshCentral update detection installs the complete native Move Request modal variable-owner fix from current main.",
        "Keep modal-content on the Move Request dialog and give its existing Modern overlay the native modal class that owns Bootstrap modal surface variables.",
        "Reuse the existing MeshThemeAdapter refresh path before first paint without adding a background workaround, observer, timer, request loop or new modal framework.",
        "Preserve Classic style10, native primary Submit request and the existing guarded Move Request submit/status lifecycle.",
        "Keep the change as a development revision below 1.0.0 with no automatic tag or GitHub Release."
    ]
})
history_path.write_text(json.dumps(history, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

note = root / f"docs/releases/{new}.md"
if note.exists():
    raise SystemExit(f"{note} already exists")
note.write_text(f'''# MC-SIRK {new} — development revision

Status: **development pre-1.0, not a product release**.

This revision exposes the complete native Move Request modal variable-owner fix from PR #188 to MeshCentral update detection after real `{old}` smoke confirmed that `modal-content` alone did not inherit the host modal surface correctly.

## Included runtime baseline

- `MeshThemeAdapter` remains the single owner of native UI classes and theme refresh.
- Modern Move Request uses the existing overlay as the native `modal` variable owner and keeps the dialog itself as `modal-content`.
- The complete detached overlay is passed through the existing `MeshThemeAdapter.refresh()` before first paint; the normal shared observer continues to own later theme changes.
- Classic Move Request remains on `style10` with the existing system-color fallback.
- `Submit request` remains on the existing `sirk-primary-action` mapping and receives native primary/blue treatment.
- Move Request backend behavior and #127 pending/success/error lifecycle are unchanged.
- No background workaround, extra observer, timer, request loop, DOM repair layer or new modal framework was added.

## Version policy

`{new}` remains below `1.0.0`. It does not open the product release gate and does not create a tag or GitHub Release.

Runtime implementation baseline: PR #188, `main` commit `c0de39e4f2a379f99b4c96cf771a1025ee012f6d`.
''', encoding="utf-8")

# Temporary validation helpers must not survive into the validated commit.
(root / ".github/workflows/issue-189-bump.yml").unlink(missing_ok=True)
Path(__file__).unlink(missing_ok=True)
