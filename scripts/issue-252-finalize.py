from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
OLD = "0.1.1-dev.44"
NEW = "0.1.1-dev.45"
DATE = "2026-08-10"


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, content):
    (ROOT / path).write_text(content, encoding="utf-8")


def replace_once(path, old, new):
    content = read(path)
    count = content.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match for {old!r}, found {count}")
    write(path, content.replace(old, new, 1))

# Small correctness cleanup discovered during final diff review.
seed = "seed/MyScripts/Jira/Jira Asset Protocol.ps1"
seed_text = read(seed)
if "—" in seed_text:
    seed_text = seed_text.replace("—", "-")
write(seed, seed_text)

pdf_path = "server/core/pdf-text-renderer.js"
pdf = read(pdf_path)
wrong = '    "\' ":["00000","00000","00000","00000","00000","00000","00000"],'
right = '    "\'":["00000","00000","00000","00000","00000","00000","00000"],'
if wrong in pdf:
    pdf = pdf.replace(wrong, right, 1)
write(pdf_path, pdf)

# Canonical SemVer metadata.
for path in ["package.json", "config.json"]:
    value = json.loads(read(path))
    if value.get("version") != OLD:
        raise SystemExit(f"{path}: expected version {OLD}, got {value.get('version')}")
    value["version"] = NEW
    write(path, json.dumps(value, indent=2, ensure_ascii=False) + "\n")

replace_once("README.md", f"# SIRK Management Platform {OLD}", f"# SIRK Management Platform {NEW}")
replace_once("README.md", f"docs/releases/{OLD}.md", f"docs/releases/{NEW}.md")
replace_once("docs/PROJECT-STATE.md", f"Current version: `{OLD}`", f"Current version: `{NEW}`")

release_note = f"""# MC-SIRK {NEW}

Status: development pre-1.0 candidate do realnego smoke; brak tagu/GitHub Release.

## Zakres

- Issue #252: domknięcie natywnego My Scripts `Jira Asset Protocol` na aktualnej architekturze MC-SIRK.
- Reuse zmergowanego provider/cache z PR #260: bounded Jira users cache, zależne Assets, aktualny Cloud AQL i System Credentials Jira.
- Reuse zmergowanego typed artifact ownera z PR #262: request-bound opaque PDF, Approval visibility ACL, chronione Open/Download oraz zachowany legacy CSV contract.
- Kanoniczny workflow `seed/MyScripts/Jira/Jira Asset Protocol.ps1` z transfer/return, Jira user, zależnym assetem i osobą IT; bez legacy DirectoryTools i bez dostępu skryptu do Jira tokenu.
- Server-owned authoritative recheck user->asset przed wykonaniem, bounded multi-host parsing, jeden protocol lifecycle owner i rzeczywiste milestone progress 5/25/50/72/90/100.
- Shared dialog pozwala opt-in custom user przez `SirkAllowCustom` bez Jira-only formularza; `ItPerson` używa datalist, a asset nadal zależy tylko od właściwego wcześniejszego usera.
- Dependency-free server-side PDF renderer generuje rzeczywisty `%PDF-1.4`; gotowy PDF jest zapisywany dopiero po poprawnym renderer result.
- Live My Scripts odpytuje tylko istniejący request-authorized progress endpoint w bounded loop i otwiera PDF automatycznie najwyżej raz na live run; wynik zachowuje ręczne Open/Download także w historii.

## Weryfikacja przed bumpem

- PR #264 / Test #627, Actions `31401109532`: Linux `npm test` PASS.
- Ten sam run: Windows interactive-shell smoke PASS.
- Targeted `test/jira-protocol-runtime.test.js` jest częścią pełnego suite i sprawdza real PDF bytes, authoritative asset recheck, custom IT, bounded progress contract, brak tokenu/DirectoryTools oraz protected artifact handoff.

## Wymagany real smoke przed zamknięciem #252

1. Skonfigurować globalny Jira profile i przypisać go tylko do `Jira/Jira Asset Protocol.ps1`.
2. Otworzyć My Scripts -> Jira Asset Protocol w Modern i Classic; sprawdzić Jira user, zależny Asset, Transfer/Return i custom/wybraną osobę IT.
3. Potwierdzić, że zmiana Jira user odświeża Asset, a zmiana ItPerson nie zeruje Asset.
4. Wykonać run bez approval i z aktywnym approval: progress ma pokazywać realne etapy, a po sukcesie `100% / Ready`.
5. Potwierdzić dokładnie jeden automatyczny Open PDF na live run oraz działające ręczne Open/Download z live result i Results history.
6. Otworzyć PDF i zweryfikować transfer/return, użytkownika, IT, datę, hostname, model, serial i inventory/asset identifier.
7. Zweryfikować restricted folder visibility oraz brak ujawnienia tokenu Jira i filesystem path w UI/output/download URL.
8. Zasymulować niedostępne/usunięte przypisanie assetu przed wykonaniem: run ma zakończyć się kontrolowanym FAIL i bez gotowego PDF.

Issue #252 pozostaje otwarte do tego smoke. Wersja pozostaje < 1.0.0. Nie tworzono tagu ani GitHub Release.
"""
write(f"docs/releases/{NEW}.md", release_note)

release_index = read("docs/releases/README.md")
marker = f"- [`{OLD}`]({OLD}.md)"
if marker not in release_index or f"- [`{NEW}`]" in release_index:
    raise SystemExit("docs/releases/README.md insertion state is unexpected")
new_line = f"- [`{NEW}`]({NEW}.md) — Jira Asset Protocol #252: canonical workflow, authoritative Jira asset recheck, real milestone progress, dependency-free PDF i protected exactly-once Open/Download; real Jira/MeshCentral smoke pending;\n"
write("docs/releases/README.md", release_index.replace(marker, new_line + marker, 1))

changelog = read("changelog.md")
if changelog.startswith(f"## {NEW}"):
    raise SystemExit("changelog already contains dev45 at the top")
entry = f"""## {NEW} - {DATE}

- Jira #252: complete native My Scripts Asset Protocol on top of the existing Jira user/asset provider and request-bound typed PDF artifact owner.
- Revalidate the selected Jira user and current assigned assets server-side, support bounded multi-host input and generic opt-in custom IT person input without a Jira-only form or legacy DirectoryTools runtime.
- Add real milestone progress tied to the Approval request, dependency-free actual PDF generation, exactly-once live auto-open and manual protected Open/Download actions while preserving CSV behavior and withholding Jira credentials from the protocol renderer.
- Pre-bump PR #264 Test #627 / Actions `31401109532` GREEN on Linux `npm test` and Windows interactive-shell smoke. Real Jira + MeshCentral smoke remains required before closing #252. No tag/GitHub Release.

Current development notes: `docs/releases/{NEW}.md`.

"""
write("changelog.md", entry + changelog)

history_path = ROOT / "version-history.json"
history = json.loads(history_path.read_text(encoding="utf-8"))
if not isinstance(history, list) or not history or history[0].get("version") != OLD:
    raise SystemExit("version-history first entry is not the expected dev44 baseline")
if any(item.get("version") == NEW for item in history):
    raise SystemExit("version-history already contains dev45")
history.insert(0, {
    "version": NEW,
    "date": DATE,
    "summary": "Jira Asset Protocol #252: canonical My Scripts workflow with authoritative asset recheck, real milestone progress and protected generated PDF.",
    "notes": f"docs/releases/{NEW}.md"
})
history_path.write_text(json.dumps(history, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

print(f"Prepared {NEW} metadata and final Issue #252 correctness cleanup.")
