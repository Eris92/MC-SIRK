# Frontend index

Czytaj ten indeks dla zadań dotyczących natywnego interfejsu MeshCentral, wspólnego UI i rendererów modułów.

## Warstwy

| Warstwa | Katalog | Główne zastosowanie |
|---|---|---|
| native | `public/native/` | integracja Quick/Approval z natywnym GUI MeshCentral |
| shared runtime/UI | `public/shared/` | core, runtime, shell, theme adapter, layout i komponenty |
| renderery modułów | `public/modules/` | pojedynczy renderer każdego modułu |

## Native UI

Zacznij od mapy assetów w `admin.js`.

```text
public/native/desktop-commands.js
public/native/desktop-commands.css
public/native/approval.css
```

Nie istnieją warstwy `mesh-plugin-core.js` ani `quick-output-state.js`.

## Shared UI

```text
public/shared/core.js
public/shared/module-shell.js
public/shared/runtime.js
public/shared/styles/main.css
public/shared/ui/shared-ui.css
public/shared/ui/toolbar-config.js
public/shared/ui/toolbar.js
public/shared/ui/toolbar-api.js
public/shared/ui/layout.js
public/shared/ui/results.js
public/shared/ui/script-tools.js
public/shared/ui/tree.js
```

Najważniejszy podział odpowiedzialności:

- `core.js` — workspace/menu/request API;
- `module-shell.js` — lifecycle i atomic render;
- `layout.js` — DOM i Collapse state, bez CSS runtime;
- `shared-ui.css` — globalna geometria workspace;
- `toolbar-config.js` — `MeshThemeAdapter` i native classes;
- `toolbar.js` — jeden mount path toolbaru;
- `toolbar-api.js` — stan toolbaru i geometria Edit/Multi;
- `results.js` — render wyników i CSV;
- `script-tools.js` — Edit/Multi/credentials dla skryptów.

Nie twórz ponownie `public/shared-ui/`, płaskich plików aplikacyjnych w `public/` ani warstw naprawczych DOM po renderze.

## Renderery modułów

| Moduł | Renderer |
|---|---|
| Automation / My Scripts | `public/modules/automation/index.js` |
| Commands | `public/modules/commands/index.js` |
| Approval Center | `public/modules/approvals/index.js` |
| Device Transfers | `public/modules/move-requests/index.js` |

Dla jednego modułu może istnieć tylko jeden renderer.

## Weryfikacja

Przed zmianą assetu potwierdź mapowanie w `admin.js` i kolejność loadera w `plugin-main.js`. Następnie wybierz test z `test/INDEX.md`. Dla zmian wspólnego runtime, UI contract, layoutu, theme adaptera albo loadera uruchom pełne:

```bash
npm test
```
