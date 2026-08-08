from pathlib import Path
import json

OLD = "0.1.1-dev.7"
NEW = "0.1.1-dev.8"

for filename in ("package.json", "config.json"):
    p = Path(filename)
    data = json.loads(p.read_text())
    if data.get("version") != OLD:
        raise SystemExit(f"{filename}: expected {OLD}, got {data.get('version')}")
    data["version"] = NEW
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

def replace_exact(path, old, new, expected=1):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{path}: expected {expected} matches for {old!r}, got {count}")
    p.write_text(text.replace(old, new, expected))

replace_exact("README.md", "# SIRK Management Platform 0.1.1-dev.7", "# SIRK Management Platform 0.1.1-dev.8")
replace_exact("README.md", "docs/releases/0.1.1-dev.7.md", "docs/releases/0.1.1-dev.8.md")
replace_exact("docs/PROJECT-STATE.md", "Current version: `0.1.1-dev.7`", "Current version: `0.1.1-dev.8`")
replace_exact("docs/PROJECT-STATE.md", "package.json -> 0.1.1-dev.7", "package.json -> 0.1.1-dev.8")
replace_exact("docs/PROJECT-STATE.md", "config.json  -> 0.1.1-dev.7", "config.json  -> 0.1.1-dev.8")
replace_exact("docs/PROJECT-STATE.md", "docs/releases/0.1.1-dev.7.md", "docs/releases/0.1.1-dev.8.md")

p = Path("docs/releases/README.md")
text = p.read_text()
anchor = "Aktualna linia development:\n\n"
if text.count(anchor) != 1:
    raise SystemExit("release README anchor mismatch")
entry = "- [`0.1.1-dev.8`](0.1.1-dev.8.md) — bieżąca rewizja development ze stałym rozmiarem ikon 1. kolumny przy Collapse/Expand do real MeshCentral smoke;\n"
text = text.replace(anchor, anchor + entry, 1)
text = text.replace("- [`0.1.1-dev.7`](0.1.1-dev.7.md) — bieżąca rewizja development", "- [`0.1.1-dev.7`](0.1.1-dev.7.md) — poprzednia rewizja development", 1)
p.write_text(text)

p = Path("changelog.md")
text = p.read_text()
anchor = "# Changelog\n\n"
if text.count(anchor) != 1:
    raise SystemExit("changelog anchor mismatch")
block = """## 0.1.1-dev.8 — 2026-08-08

- Bump the pre-1.0 development revision so MeshCentral update detection can install the stable first-column icon geometry fix from current `main`.
- Keep direct first-column shared/Quick icons at one 28 px box / 24 px SVG size in both expanded and collapsed states instead of scaling artwork during Collapse/Expand.
- Preserve compact second-column icon geometry, the 64 px collapsed track, neutral icon colors and shared selected-state indicators without runtime measurement or extra lifecycle work.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.8.md`.

"""
text = text.replace(anchor, anchor + block, 1)
text = text.replace("Current development notes: `docs/releases/0.1.1-dev.7.md`.", "Development notes: `docs/releases/0.1.1-dev.7.md`.", 1)
p.write_text(text)

p = Path("version-history.json")
history = json.loads(p.read_text())
if not history or history[0].get("version") != OLD:
    raise SystemExit("version-history current entry mismatch")
history.insert(0, {
    "version": NEW,
    "date": "2026-08-08",
    "changes": [
        "Bump the pre-1.0 development revision so MeshCentral update detection can install the stable first-column icon geometry fix from current main.",
        "Keep direct first-column shared and Quick icons at one 28 px box / 24 px SVG size in expanded and collapsed states instead of scaling during Collapse/Expand.",
        "Preserve compact second-column icon geometry, the 64 px collapsed track, neutral icon colors and shared selected-state indicators without runtime measurement or extra lifecycle work.",
        "Keep the change as a development revision below 1.0.0 with no automatic tag or GitHub Release."
    ]
})
p.write_text(json.dumps(history, indent=2, ensure_ascii=False) + "\n")

Path("docs/releases/0.1.1-dev.8.md").write_text("""# MC-SIRK 0.1.1-dev.8 — stable first-column icon geometry revision

Status: development pre-1.0, not a product release.

`0.1.1-dev.8` podnosi rewizję development, aby mechanizm aktualizacji MeshCentral pobrał poprawkę #155 ze zweryfikowanego `main`.

Ta rewizja obejmuje:

- direct first-column icons w shared UI i Quick używają jednego stałego boxu 28 px oraz SVG 24 px w stanie expanded i collapsed;
- Collapse/Expand zmienia szerokość pierwszej kolumny, centrowanie i widoczność labeli, ale nie skaluje artwork;
- custom/root images korzystają z tego samego primary icon-size ownera z `object-fit:contain`;
- compact 20 px geometry ikon poza pierwszą kolumną pozostaje bez zmian;
- Approval native `mc-nav-icon`, neutral icon color contract oraz shared selected-state indicator pozostają zachowane;
- brak JS measurement, observerów, timerów, post-toggle repair lub dodatkowego renderowania dla rozmiaru ikon.

Bump nie zmienia release gate: wszystkie development revisions pozostają `< 1.0.0`. `1.0.0` jest zarezerwowane dla pierwszego kompletnego product release po jawnej decyzji użytkownika i wymaganym real MeshCentral smoke.

Nie tworzyć tagu ani GitHub Release dla tej development revision bez jawnego polecenia użytkownika.
""")
