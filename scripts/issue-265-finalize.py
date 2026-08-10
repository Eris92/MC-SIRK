from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
OLD = "0.1.1-dev.45"
NEW = "0.1.1-dev.46"
DATE = "2026-08-10"


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, content):
    (ROOT / path).write_text(content, encoding="utf-8")


def replace_once(path, old, new):
    content = read(path)
    if content.count(old) != 1:
        raise SystemExit(f"{path}: expected exactly one match for {old!r}")
    write(path, content.replace(old, new, 1))

for path in ["package.json", "config.json"]:
    value = json.loads(read(path))
    if value.get("version") != OLD:
        raise SystemExit(f"{path}: expected {OLD}, got {value.get('version')}")
    value["version"] = NEW
    write(path, json.dumps(value, indent=2, ensure_ascii=False) + "\n")

replace_once("README.md", f"# SIRK Management Platform {OLD}", f"# SIRK Management Platform {NEW}")
replace_once("README.md", f"docs/releases/{OLD}.md", f"docs/releases/{NEW}.md")
replace_once("docs/PROJECT-STATE.md", f"Current version: `{OLD}`", f"Current version: `{NEW}`")

release_note = f"""# MC-SIRK {NEW}

Status: development pre-1.0 candidate do realnego smoke; brak tagu/GitHub Release.

## Zakres

- Issue #265: final Approve w Move Requests nie może już kończyć się false-success bez fizycznego przeniesienia urządzenia.
- Usunięto założenie o nieistniejącym w aktualnym upstream MeshCentral helperze `MoveNodeToMesh`. Aktualny contract MeshCentral to websocket action `changeDeviceMesh`; server owner sprawdza source/target edit rights, zgodność typu mesh, zapisuje `node.meshid` przez `cleanDevice` + DB, aktualizuje sesję/MQTT/CIRA/device-share i emituje `nodemeshchange`.
- `server/core/device-service.js` jest jedynym MC-SIRK ownerem tej operacji: wykonuje ją jako oryginalny requester, wymusza ten sam domain, source+target `MESHRIGHT_EDITMESH`, zgodny `mtype`, dokładnie jeden zapis node i jeden bounded DB read weryfikujący docelowy `meshid`.
- Target równy bieżącemu mesh jest idempotentnym sukcesem bez zapisu. Brak usera, targetu, praw, native DB/serialization capability, błąd zapisu lub mismatch po weryfikacji kończy wykonanie błędem.
- `server/modules/move-requests/index.js` nie zawiera fallbacku success; brak `context.device.moveNodeToMesh` odrzuca Promise, więc Approval zapisuje `failed`.
- Zachowano #224 single-pending/idempotency semantics oraz istniejące human-readable summary/ACL contracty.

## Weryfikacja przed bumpem

- PR #267 / Test #637, Actions `31403516643`: Linux `npm test` PASS.
- Ten sam run: Windows interactive-shell smoke PASS.
- `test/move-request-execution.test.js`: success + exactly-one write/read, already-current zero-write, cross-domain, type mismatch, source/target rights, missing native capability, verification mismatch, deleted requester, agent/MQTT/CIRA/share/event side effects.
- `test/move-request-single-pending.test.js`: #224 regression + success->completed i native failure->persisted failed.
- Aktualny upstream MeshCentral `af0e618f746f04794e3adf611ca4bc9d43dbec92`: `meshctrl.js` wysyła `{{action:'changeDeviceMesh', nodeids:[...], meshid:...}}`; `meshuser.js` wykonuje `GetNodeWithRights`, `GetMeshRights`, `cleanDevice`, `db.Set`, agent/MQTT/MPS/share update i `nodemeshchange`.

## Wymagany real smoke przed zamknięciem #265

1. Utworzyć Move Request dla testowego hosta A -> grupa B i zatwierdzić finalny wymagany poziom.
2. Potwierdzić, że host faktycznie pojawia się w grupie B i znika z grupy A bez restartu strony/serwera.
3. Potwierdzić terminalny status `completed` dopiero po zmianie mesh.
4. Powtórzyć request B -> B: sukces idempotentny, bez ubocznego ruchu.
5. Użytkownik bez source/target edit rights: kontrolowany `failed`, urządzenie bez zmian.
6. Stary/usunięty target albo requester: kontrolowany `failed`, brak false-success.
7. Sprawdzić, że po ruchu connected agent nadal jest widoczny/online i kolejne Commands działają.
8. Potwierdzić #224: dwa szybkie requesty dla tego samego node zostawiają tylko najnowszy `pending`.

Issue #265 pozostaje otwarte do realnego MeshCentral smoke. Wersja pozostaje < 1.0.0. Nie tworzono tagu ani GitHub Release.
"""
write(f"docs/releases/{NEW}.md", release_note)

index = read("docs/releases/README.md")
marker = f"- [`{OLD}`]({OLD}.md)"
if marker not in index or f"- [`{NEW}`]" in index:
    raise SystemExit("release index insertion state unexpected")
line = f"- [`{NEW}`]({NEW}.md) — Move Requests #265: verified current MeshCentral changeDeviceMesh execution, fail-closed persistence verification i zachowane #224 single-pending; real move smoke pending;\n"
write("docs/releases/README.md", index.replace(marker, line + marker, 1))

changelog = read("changelog.md")
if changelog.startswith(f"## {NEW}"):
    raise SystemExit("changelog already contains dev46")
entry = f"""## {NEW} - {DATE}

- Move Requests #265: replace the assumed `MoveNodeToMesh` false-success path with the current MeshCentral `changeDeviceMesh` persistence/session/event semantics in the shared device owner.
- Execute as the original requester with same-domain/source-target edit-right/type checks, exactly one node write plus one bounded DB verification read; already-current target is a zero-write success and all missing/error/mismatch paths fail closed.
- Preserve #224 single-pending/idempotency and human-readable summary contracts; pre-bump PR #267 Test #637 / Actions `31403516643` GREEN on Linux `npm test` and Windows interactive-shell smoke. Real MeshCentral move smoke remains required before closing #265. No tag/GitHub Release.

Current development notes: `docs/releases/{NEW}.md`.

"""
write("changelog.md", entry + changelog)

history = json.loads(read("version-history.json"))
if not isinstance(history, list) or not history or history[0].get("version") != OLD:
    raise SystemExit("version-history baseline is not dev45")
if any(item.get("version") == NEW for item in history):
    raise SystemExit("version-history already contains dev46")
history.insert(0, {
    "version": NEW,
    "date": DATE,
    "summary": "Move Requests #265: verified current MeshCentral device-group move with fail-closed persistence verification.",
    "notes": f"docs/releases/{NEW}.md"
})
write("version-history.json", json.dumps(history, indent=2, ensure_ascii=False) + "\n")

print(f"Prepared {NEW} metadata for Issue #265.")
