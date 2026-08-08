from pathlib import Path
import json

OLD = "0.1.1-dev.6"
NEW = "0.1.1-dev.7"

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

replace_exact("README.md", "# SIRK Management Platform 0.1.1-dev.6", "# SIRK Management Platform 0.1.1-dev.7")
replace_exact("README.md", "docs/releases/0.1.1-dev.6.md", "docs/releases/0.1.1-dev.7.md")
replace_exact("docs/PROJECT-STATE.md", "Current version: `0.1.1-dev.6`", "Current version: `0.1.1-dev.7`")
replace_exact("docs/PROJECT-STATE.md", "package.json -> 0.1.1-dev.6", "package.json -> 0.1.1-dev.7")
replace_exact("docs/PROJECT-STATE.md", "config.json  -> 0.1.1-dev.6", "config.json  -> 0.1.1-dev.7")
replace_exact("docs/PROJECT-STATE.md", "docs/releases/0.1.1-dev.6.md", "docs/releases/0.1.1-dev.7.md")

p = Path("docs/releases/README.md")
text = p.read_text()
anchor = "Aktualna linia development:\n\n"
if text.count(anchor) != 1:
    raise SystemExit("release README anchor mismatch")
entry = "- [`0.1.1-dev.7`](0.1.1-dev.7.md) — bieżąca rewizja development z krótszymi Commands labels, neutralnym shared navigation UI i czytelnymi tabelami Results do real MeshCentral smoke;\n"
text = text.replace(anchor, anchor + entry, 1)
text = text.replace("- [`0.1.1-dev.6`](0.1.1-dev.6.md) — bieżąca rewizja development", "- [`0.1.1-dev.6`](0.1.1-dev.6.md) — poprzednia rewizja development", 1)
p.write_text(text)

p = Path("changelog.md")
text = p.read_text()
anchor = "# Changelog\n\n"
if text.count(anchor) != 1:
    raise SystemExit("changelog anchor mismatch")
block = """## 0.1.1-dev.7 — 2026-08-08

- Bump the pre-1.0 development revision so MeshCentral update detection can install the current shared UI and Results batch from `main`.
- Use canonical short built-in command labels (`Network Control`, `Network Settings`, `PowerShell`, `CMD`) without changing stable command IDs or execution semantics.
- Keep ordinary first/second-column navigation icons neutral/native, reuse the shared visible selected-state contract in Approval Center, and preserve semantic colors only for meaningful states such as active Favorites and Quick Output attention.
- Keep shared Results tables readable with semantic column roles and horizontal scrolling instead of fixed-layout compression.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.7.md`.

"""
text = text.replace(anchor, anchor + block, 1)
text = text.replace("Current development notes: `docs/releases/0.1.1-dev.6.md`.", "Development notes: `docs/releases/0.1.1-dev.6.md`.", 1)
p.write_text(text)

p = Path("version-history.json")
history = json.loads(p.read_text())
if not history or history[0].get("version") != OLD:
    raise SystemExit("version-history current entry mismatch")
history.insert(0, {
    "version": NEW,
    "date": "2026-08-08",
    "changes": [
        "Bump the pre-1.0 development revision so MeshCentral update detection can install the current shared UI and Results batch from main.",
        "Use canonical short Network Control, Network Settings, PowerShell and CMD labels without changing stable command IDs or execution semantics.",
        "Keep ordinary shared navigation icons neutral/native while reusing one visible selected-state contract in Approval Center and preserving semantic colors only for meaningful states.",
        "Keep shared Results tables readable with semantic column roles and horizontal scrolling instead of fixed-layout compression.",
        "Keep the change as a development revision below 1.0.0 with no automatic tag or GitHub Release."
    ]
})
p.write_text(json.dumps(history, indent=2, ensure_ascii=False) + "\n")

Path("docs/releases/0.1.1-dev.7.md").write_text("""# MC-SIRK 0.1.1-dev.7 — shared UI and Results smoke revision

Status: development pre-1.0, not a product release.

`0.1.1-dev.7` podnosi rewizję development, aby mechanizm aktualizacji MeshCentral pobrał aktualny zweryfikowany batch `main` do kolejnego real smoke.

Ta rewizja obejmuje:

- krótkie canonical labels w built-in Commands: `Network Control`, `Network Settings`, `PowerShell` i `CMD`, przy zachowaniu istniejących command IDs, execution strings i permissions;
- neutralne/native `currentColor` dla zwykłych ikon nawigacji i list w shared UI/Quick, z odrębnym Scripts glyph oraz prostszym System gear;
- semantic color tylko dla znaczącego stanu, m.in. aktywnego Favorite i Quick Output attention, a nie jako identyfikator zwykłej kategorii/wiersza;
- Approval Center korzystający ze wspólnego visible selected-state contractu z `active` / `is-active` / `aria-selected` i natywnym `MeshThemeAdapter.nav()`;
- Shared Results tables z `table-layout:auto`, czytelnymi semantic column roles i istniejącym horizontal overflow wrapperem zamiast kompresji kolumn przez fixed layout;
- brak nowych observerów, polling loops, runtime autosizingu tabel lub per-module kopii shared zachowania.

Bump nie zmienia release gate: wszystkie development revisions pozostają `< 1.0.0`. `1.0.0` jest zarezerwowane dla pierwszego kompletnego product release po jawnej decyzji użytkownika i wymaganym real MeshCentral smoke.

Nie tworzyć tagu ani GitHub Release dla tej development revision bez jawnego polecenia użytkownika.
""")
