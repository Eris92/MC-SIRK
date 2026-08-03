# Frontend index

Czytaj ten indeks dla zadań dotyczących natywnego interfejsu MeshCentral, wspólnego UI i rendererów modułów.

## Warstwy

| Warstwa | Katalog | Główne zastosowanie |
|---|---|---|
| native adapter | `public/native/` | integracja z GUI MeshCentral |
| shared runtime/UI | `public/shared/` | core, runtime, shell, ikony, style i komponenty |
| renderery modułów | `public/modules/` | pojedynczy renderer każdego modułu |

## Native UI

Zacznij od mapy assetów w `admin.js`, a następnie wybierz:

```text
public/native/mesh-plugin-core.js
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
| Automation | `public/modules/automation/index.js` |
| Commands | `public/modules/commands/index.js` |
| Device Transfers | `public/modules/move-requests/index.js` |

Dla jednego modułu może istnieć tylko jeden renderer.

## Weryfikacja

Przed zmianą potwierdź loader w `admin.js`. Następnie wybierz test z `test/INDEX.md`. Dla zmian wspólnego runtime, UI contract lub loadera uruchom pełne `npm test`.
