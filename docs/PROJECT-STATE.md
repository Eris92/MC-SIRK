# SIRK Management Platform — project state

Status: `development pre-1.0`  
Current version: `0.1.1-dev.36`
Product release: **none yet**  
First complete product release: reserved for `1.0.0` after explicit release gate.

Previous `1.8.x` numbering was internal development numbering only. It is historical evidence, not the current version line and not proof of a product release.

## Produkt i runtime

MC-SIRK jest natywnym pluginem MeshCentral — nie jest nowym standalone Portalem z wielorepozytoryjnego projektu SIRK.

Kanoniczne entrypointy:

```text
SIRKPortal.js
SIRKPortalAdmin.js
```

Backend:

```text
SIRKPortal.js
  -> plugin-main.js
    -> server/core/runtime.js
      -> server/modules/*
```

Frontend:

```text
plugin-main.js
  -> public/shared/core.js
  -> public/shared/ui/*
  -> public/shared/module-shell.js
  -> public/shared/runtime.js
  -> public/modules/*
```

Dane runtime:

```text
meshcentral-data/sirk-platform-data
```

Nie utrzymywać compatibility z `MyCompany`, `mycompany-data`, starymi loaderami ani historycznymi warstwami DOM/runtime.

## Kanoniczni ownerzy

- `server/core/mesh-events.js` — adapter zdarzeń SIRK do `MeshCentral.DispatchEvent()`;
- `public/shared/core.js` — workspace, menu, aktywny moduł, request guard oraz finalne first-paint klasy/active state/geometria i source ikon left menu; brakujący menu node jest tworzony dopiero po zakończeniu bieżącego natywnego `goPageEnd`, a późniejsza rekonsyliacja nie przepisuje niezmienionego widocznego stanu;
- `public/shared/ui/settings.js` / `SirkIconMode` — jeden browser owner polityki `auto/classic/modern` dla ikon menu;
- `public/shared/runtime.js` — browser bootstrap, permission-safe native surface readiness, native page/device lifecycle i bounded module startup; `goPageStart` unieważnia poprzedni page-ready state, a `goPageEnd` wykonuje jeden bounded menu reconcile;
- `public/shared/module-shell.js` — lifecycle modułów i atomic render;
- `public/shared/ui/layout.js` — layout i Collapse;
- `public/shared/ui/shared-ui.css` — współdzielona geometria workspace/kolumn;
- `public/shared/ui/toolbar.js` + `toolbar-api.js` — toolbar i Edit/Multi;
- `public/shared/ui/toolbar-config.js` — `MeshThemeAdapter` i integracja natywnych klas MeshCentral;
- `public/shared/ui/results.js` — wyniki, CSV oraz live content Results montowany do natywnego dialog managera MeshCentral;
- `public/native/desktop-commands.js` — jedyny owner stanu/lifecycle Quick;
- `public/native/desktop-commands.css` — geometria Quick;
- `admin.js` — mapa assetów i chroniony download CSV.

`public/shared/ui/page.js` nie normalizuje ani nie podmienia left menu po pierwszym paint. Rodzina/source ikon, natywne klasy, active state i finalna geometria left menu należą do `SirkIconMode -> core.ensureMenu()`.

Przed dodaniem nowego ownera sprawdź `docs/agent/12-Agent-Wydajnosc-Reuse.md`.

## UI i rendering

Plugin nie utrzymuje własnej pełnej palety standardowych kontrolek MeshCentral. `MeshThemeAdapter` mapuje elementy na natywne klasy Classic/Modern; CSS pluginu odpowiada głównie za geometrię, przewijanie, responsywność i wymagane wyjątki integracyjne.

Kanoniczne kolumny desktop:

```text
primary: 165–205 px
secondary: 285–340 px
collapsed primary: 64 px
```

Edit i Multi są wzajemnie wykluczające i używają jednego kontraktu geometrii: bazowy text track drugiej kolumny pozostaje bez zmian, a `secondary` rośnie wyłącznie o zmierzoną szerokość action rail oraz jego column gap. Zmiana geometrii obu trybów następuje po atomic render commit, aby action DOM nie ściskał ani nie przestawiał labeli podczas przełączenia.

Moduły renderują do odłączonych elementów i wykonują atomic commit. `renderSequence` odrzuca nieaktualny render. Przejście SIRK -> SIRK nie powinno przechodzić przez pusty stan ani odtwarzać Devices.

## Quick

`public/native/desktop-commands.js` pozostaje jednym ownerem stanu Quick.

- Collapse/Output korzystają ze shared preferences My Commands;
- attention/pending są runtime state;
- attention uzbraja wyłącznie nowy wynik wykonania;
- pokazanie Output kasuje attention;
- brak osobnego output controllera i zbędnego observera DOM;
- launcher ma stałą geometrię 38 px;
- ukrycie Output używa `is-details-collapsed`.

## Zdarzenia i security

Akcje SIRK zapisują się w natywnym MeshCentral Events przez `DispatchEvent()`.

Nie logować haseł, sekretów, tokenów, payloadów ani outputu poleceń. Nie tworzyć osobnego audit store, jeśli bieżący contract nadal opiera się na MeshCentral Events.

## Request lifecycle

`public/shared/core.js` jest ownerem request guard:

- GET ma bounded timeout i `AbortController`;
- zmiana widoku może anulować GET;
- write requests nie dziedziczą automatycznie timeoutu przeznaczonego dla odczytów.

Nie dodawać równoległych request/polling loops, jeśli istniejący lifecycle może zostać rozszerzony.

## Shared state

Approval Center, Commands i My Scripts współdzielą Collapse:

```text
sirkPlatform.layout.shared-script-columns.collapsed
```

`SharedLayout` synchronizuje aktywne layouty. Pozostałe layouty zachowują własne klucze.

## Wersjonowanie

Aktualne źródła wersji:

```text
package.json -> 0.1.1-dev.36
config.json  -> 0.1.1-dev.36
```

Preferowana konwencja użytkownika `0.1.1.X` jest mapowana na SemVer-compatible `0.1.1-dev.X`, ponieważ npm wymaga poprawnego SemVer.

Nie kontynuować numeracji `1.8.x`. Szczegóły: `docs/agent/14-Agent-Wersjonowanie-Pre1.md`.

Aktualne development notes: `docs/releases/0.1.1-dev.36.md`.

Nie tworzyć taga/GitHub Release ani `1.0.0` bez jawnej decyzji użytkownika i spełnienia release gate.

## Weryfikacja

Kanoniczna pełna komenda:

```bash
npm test
```

Nie uruchamiaj jej automatycznie dla każdej małej zmiany. Najpierw targeted test; pełny suite dla zmian runtime, loadera, shared UI, struktury, security/public contractu lub przed release.

GitHub Issues w `Eris92/MC-SIRK` są stanem aktywnych zadań. Trwałe decyzje przekrojowe zapisuj oszczędnie w `docs/memory/PROJECT_MEMORY.md`.
