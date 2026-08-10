from pathlib import Path

VERSION_OLD = "0.1.1-dev.43"
VERSION_NEW = "0.1.1-dev.44"


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, value):
    Path(path).write_text(value, encoding="utf-8")


def replace_exact(path, old, new, expected=1):
    source = read(path)
    count = source.count(old)
    if count != expected:
        raise SystemExit(f"{path}: expected {expected} matches for {old!r}, found {count}")
    write(path, source.replace(old, new))


replace_exact("package.json", '"version": "0.1.1-dev.43"', '"version": "0.1.1-dev.44"')
replace_exact("config.json", '"version": "0.1.1-dev.43"', '"version": "0.1.1-dev.44"')
replace_exact("README.md", "# SIRK Management Platform 0.1.1-dev.43", "# SIRK Management Platform 0.1.1-dev.44")
replace_exact(
    "README.md",
    "- [Aktualne development notes](docs/releases/0.1.1-dev.43.md)",
    "- [Aktualne development notes](docs/releases/0.1.1-dev.44.md)"
)
replace_exact("docs/PROJECT-STATE.md", "Current version: `0.1.1-dev.43`", "Current version: `0.1.1-dev.44`")
replace_exact("docs/PROJECT-STATE.md", "package.json -> 0.1.1-dev.43", "package.json -> 0.1.1-dev.44")
replace_exact("docs/PROJECT-STATE.md", "config.json  -> 0.1.1-dev.43", "config.json  -> 0.1.1-dev.44")
replace_exact(
    "docs/PROJECT-STATE.md",
    "Aktualne development notes: `docs/releases/0.1.1-dev.43.md`.",
    "Aktualne development notes: `docs/releases/0.1.1-dev.44.md`."
)

release_index = read("docs/releases/README.md")
marker = "Aktualna linia development:\n\n"
entry = "- [`0.1.1-dev.44`](0.1.1-dev.44.md) — shared native execution parameter dialog (#253) plus real Windows Shell smoke infrastructure (#238); real MeshCentral parameter-dialog smoke pending;\n"
if release_index.count(marker) != 1 or "[`0.1.1-dev.44`]" in release_index:
    raise SystemExit("docs/releases/README.md: invalid dev.44 insertion state")
write("docs/releases/README.md", release_index.replace(marker, marker + entry, 1))

changelog = read("changelog.md")
if changelog.startswith("## 0.1.1-dev.44"):
    raise SystemExit("changelog.md already contains dev.44")
changelog_entry = """## 0.1.1-dev.44 - 2026-08-10

- Shared UI #253: move parameterized execution for Quick, My Commands and My Scripts to one native MeshCentral dialog while preserving existing Output/Results ownership and payload semantics.
- Support text/select/switch/user/asset controls, shared required validation, one bounded option-provider hook, Multi values collected once, and the real `script-tools -> parameter-dialog -> Quick` loader dependency without serializing independent deferred assets.
- Windows #238: carry forward the integrated read-only Windows PowerShell 5.1 `NameSpace(49)` smoke in the maintained workflow; no Shell verb or network mutation.
- Pre-bump #253 Test #607 / Actions `31394561056` GREEN on Linux `npm test` and Windows smoke; #238 original run `31390869438` GREEN. Final exact-version CI required before merge. No tag/GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.44.md`.

"""
write("changelog.md", changelog_entry + changelog)

history = read("version-history.json")
if not history.startswith("[\n") or '"version": "0.1.1-dev.44"' in history:
    raise SystemExit("version-history.json: invalid dev.44 insertion state")
history_entry = """[
  {
    "version": "0.1.1-dev.44",
    "date": "2026-08-10",
    "summary": "Shared native execution parameter dialog (#253) plus real Windows Shell smoke infrastructure (#238).",
    "notes": "docs/releases/0.1.1-dev.44.md"
  },
"""
write("version-history.json", history_entry + history[2:])
