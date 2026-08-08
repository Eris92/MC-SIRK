from pathlib import Path
import json

OLD = "0.1.1-dev.8"
NEW = "0.1.1-dev.9"


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"missing target in {path}: {old}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


for path in ("package.json", "config.json"):
    replace_once(path, f'"version": "{OLD}"', f'"version": "{NEW}"')

replace_once("README.md", f"# SIRK Management Platform {OLD}", f"# SIRK Management Platform {NEW}")
replace_once("README.md", f"docs/releases/{OLD}.md", f"docs/releases/{NEW}.md")

state = Path("docs/PROJECT-STATE.md")
state_text = state.read_text(encoding="utf-8")
if OLD not in state_text:
    raise SystemExit("PROJECT-STATE does not contain current development version")
state.write_text(state_text.replace(OLD, NEW), encoding="utf-8")

release_index = Path("docs/releases/README.md")
text = release_index.read_text(encoding="utf-8")
needle = f"- [`{OLD}`]({OLD}.md)"
idx = text.find(needle)
if idx < 0:
    raise SystemExit("release index current entry not found")
line_end = text.find("\n", idx)
old_line = text[idx:line_end]
if "bieżąca" in old_line:
    previous_line = old_line.replace("bieżąca", "poprzednia", 1)
else:
    previous_line = old_line
new_line = f"- [`{NEW}`]({NEW}.md) — bieżąca rewizja development po corrective runtime smoke follow-up dla row geometry, command labels, Results containment i human-readable Move Request summaries;"
text = text[:idx] + new_line + "\n" + previous_line + text[line_end:]
release_index.write_text(text, encoding="utf-8")

changelog = Path("changelog.md")
text = changelog.read_text(encoding="utf-8")
header = "# Changelog\n"
if not text.startswith(header):
    raise SystemExit("unexpected changelog header")
entry = """
## 0.1.1-dev.9 — 2026-08-08

- Bump the pre-1.0 development revision so MeshCentral update detection installs the corrective runtime smoke follow-up from current `main`.
- Keep first-column icon row position stable across Collapse/Expand by preserving the expanded vertical origin and row step.
- Normalize only persisted historical built-in command default labels so My Commands and Quick converge on `Network Control`, `Network Settings`, `PowerShell` and `CMD` while genuine custom labels remain valid.
- Contain long unbroken Results text tokens inside their semantic cells and present Move Request source/target groups with visible human-readable names when available.
- Keep stable execution IDs, authorization and the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.9.md`.

"""
changelog.write_text(header + entry + text[len(header):], encoding="utf-8")

history = Path("version-history.json")
data = json.loads(history.read_text(encoding="utf-8"))
data.insert(0, {
    "version": NEW,
    "date": "2026-08-08",
    "changes": [
        "Bump the pre-1.0 development revision so MeshCentral update detection installs the corrective runtime smoke follow-up from current main.",
        "Keep first-column icon row position stable across Collapse/Expand by preserving the expanded vertical origin and row step.",
        "Normalize persisted historical built-in command default labels while preserving genuine custom labels and stable command IDs/execution.",
        "Contain long Results tokens and present Move Request group names from current visible mesh metadata with safe ID fallback.",
        "Keep the change as a development revision below 1.0.0 with no automatic tag or GitHub Release."
    ]
})
history.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

Path(f"docs/releases/{NEW}.md").write_text("""# MC-SIRK 0.1.1-dev.9 — runtime smoke corrective revision

Status: development pre-1.0, not a product release.

`0.1.1-dev.9` podnosi rewizję development, aby mechanizm aktualizacji MeshCentral pobrał corrective batch wynikający z real smoke `0.1.1-dev.8`.

Ta rewizja obejmuje aktualny stan `main`, w tym:

- first-column Collapse/Expand zachowuje ten sam pionowy origin i row step ikon, zamiast przesuwać artwork między stanami;
- persisted historyczne default labels built-in Commands nie nadpisują nowych canonical nazw `Network Control`, `Network Settings`, `PowerShell` i `CMD`, przy zachowaniu rzeczywistych custom overrides oraz stable IDs/execution;
- długi niełamliwy token w semantic Results text cell pozostaje w swojej komórce i nie nachodzi wizualnie na `View` / `Actions`;
- Move Requests prezentują source/target przez human-readable nazwy grup widocznych dla bieżącego użytkownika, z bezpiecznym fallbackiem do ID;
- istniejące ID-only Move Request summaries mogą być humanizowane w public presentation bez ujawniania private payloadu i bez migracji execution identifiers.

Bump nie zmienia release gate: wszystkie development revisions pozostają `< 1.0.0`. `1.0.0` jest zarezerwowane dla pierwszego kompletnego product release po jawnej decyzji użytkownika i wymaganym real MeshCentral smoke.

Nie tworzyć tagu ani GitHub Release dla tej development revision bez jawnego polecenia użytkownika.
""", encoding="utf-8")
