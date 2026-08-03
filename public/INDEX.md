# Frontend index

Czytaj ten indeks dla zadań dotyczących natywnego interfejsu MeshCentral, wspólnego UI i rendererów modułów.

## Warstwy

| Warstwa | Katalog | Główne zastosowanie |
|---|---|---|
| native UI MeshCentral | `public/portal/` | widoki, nawigacja i style osadzone w MeshCentral |
| native adapter | `public/native/` | device tabs i integracja z GUI MeshCentral |
| shared runtime/UI | `public/shared/` | core, runtime, shell, ikony, style i komponenty |
| renderery modułów | `public/modules/` | pojedynczy renderer każdego modułu |

## Native UI

Zacznij od mapy assetów w `admin.js`, a następnie wybierz:

```text
public/native/mesh-plugin-core.js
public/native/device-tabs.js
public/native/device-tabs.css
public/native/approval.css
```

## Shared UI

```text
public/shared/core.js
public/shared/runtime.js
public/shared/module-shell.js
public/shared/icon-registry.js
public/shared/styles/
public/shared/ui/
```

Nie twórz ponownie `public/shared-ui/` ani płaskich plików aplikacyjnych w `public/`.

## Renderery modułów

| Moduł | Renderer |
|---|---|
| Approvals | `public/modules/approvals/index.js` |
| Automation | `public/modules/automation/index.js` |
| Commands | `public/modules/commands/index.js` |
| Jira | `public/modules/jira/index.js` |
| Device Transfers | `public/modules/move-requests/index.js` |
| Security | `public/modules/security/index.js` |

Dla jednego modułu może istnieć tylko jeden renderer.

## Weryfikacja

Przed zmianą potwierdź loader w `admin.js`. Następnie wybierz test z `test/INDEX.md`. Dla zmian wspólnego runtime, UI contract lub loadera uruchom pełne `npm test`.
