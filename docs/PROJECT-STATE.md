# SIRK Management Platform — project state

Status: `verified`  
Data weryfikacji: `2026-08-07`  
Wersja: `1.8.21`

## Stan

Plugin działa wyłącznie jako natywne rozszerzenie MeshCentral. Nie utrzymuje kompatybilności z historyczną strukturą `MyCompany`, starymi loaderami ani warstwami naprawczymi DOM/runtime.

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

## Właściciele odpowiedzialności

- `server/core/mesh-events.js` — adapter zdarzeń SIRK do natywnego `MeshCentral.DispatchEvent()`;
- `public/shared/core.js` — workspace, menu i aktywny moduł SIRK;
- `public/shared/module-shell.js` — lifecycle modułów i atomic render;
- `public/shared/ui/layout.js` — struktura layoutu i stan Collapse, bez CSS runtime;
- `public/shared/ui/shared-ui.css` — globalna geometria workspace i kolumn;
- `public/shared/ui/toolbar.js` — jeden mount path toolbaru dla modułów i Quick;
- `public/shared/ui/toolbar-api.js` — stan toolbaru i geometria Edit/Multi;
- `public/shared/ui/toolbar-config.js` — `MeshThemeAdapter` i natywne klasy MeshCentral;
- `public/native/desktop-commands.js` — jedyny owner stanu i lifecycle Quick;
- `public/native/desktop-commands.css` — geometria panelu Quick;
- `public/shared/ui/results.js` — render wyników i obsługa linków do CSV;
- `admin.js` — mapa assetów oraz chroniony endpoint pobierania wygenerowanych CSV.

## Zdarzenia i logowanie

Akcje SIRK są zapisywane w natywnym systemie **MeshCentral Events** przez `DispatchEvent()`.

- nie istnieje osobny plik `audit.jsonl`;
- nie istnieje osobny backend `audit-log.js`;
- panel administracyjny SIRK nie ma własnej zakładki Logs;
- event zawiera czytelne `msg`, `action`, użytkownika i — gdy dotyczy — `nodeid`;
- hasła, sekrety, tokeny, payloady i output poleceń nie są kopiowane do zdarzeń SIRK;
- brak `nolog` oznacza, że persistence pozostaje własnością MeshCentral.

## UI

Plugin nie utrzymuje własnej palety dla standardowych kontrolek MeshCentral.

`MeshThemeAdapter` mapuje elementy na natywne klasy:

- Classic: `style10`, `style10s`, `style3x`, `style3sel`;
- Modern: Bootstrap używany przez MeshCentral, m.in. `btn-*`, `nav-link`, `list-group-item`, `card`, `form-control`, `form-select`, `table`.

CSS pluginu odpowiada za geometrię, przewijanie i responsywność. Hover, selected, standardowe powierzchnie i warianty przycisków pozostają własnością aktywnego UI MeshCentral. SIRK może neutralizować hostowy `transform/scale/zoom` wyłącznie wewnątrz własnych powierzchni, gdy zmienia on geometrię.

Kanoniczne kolumny desktop:

```text
primary:   165–205 px
secondary: 285–340 px
collapsed primary: 64 px
```

Edit i Multi są wzajemnie wykluczające się. Action track jest mierzony na żywo i rezerwowany wewnątrz istniejącej szerokości `secondary`; włączenie trybu nie może poszerzać drugiej kolumny ani przesuwać `details`. Edit działa również wtedy, gdy pierwsza kolumna jest już zwinięta.

Favorites zachowuje aktywny stan logiczny/accessibility, ale semantyczny żółty kolor należy wyłącznie do ikony gwiazdki.

Zaznaczenie w shared trees i Quick jest nakładane synchronicznie przez `MeshThemeAdapter`, a observer pozostaje jedynie fallbackiem dla zmian hostowego motywu.

## Renderowanie

Moduły renderują `secondary` i `details` do odłączonych elementów. `renderSequence` odrzuca nieaktualny render, a zawartość live DOM jest podmieniana dopiero podczas atomic commit. Dzięki temu przełączanie i odświeżanie nie przechodzi przez pusty stan.

Przejście SIRK -> SIRK nie wykonuje pośredniego `go(1)` i nie odtwarza widoku Devices.

## Quick

Quick ma jednego właściciela stanu w `public/native/desktop-commands.js`.

- Collapse i Output są przechowywane w shared preferences My Commands;
- attention/pending są stanem runtime, nie osobnym storage contract;
- attention jest uzbrajany wyłącznie przez nowy wynik wykonania;
- zwykłe kliknięcia, Refresh i ładowanie metadanych nie uzbrajają ponownie attention;
- pokazanie Output kasuje attention;
- brak osobnego output controllera;
- brak obserwatora DOM Quick;
- launcher ma stałą geometrię 38 px;
- ukrycie Output używa wyłącznie klasy `is-details-collapsed`;
- panel korzysta z natywnych klas interakcji MeshCentral i geometrycznego guardu przeciw hostowemu skalowaniu na hover.

## Admin icon mode

`General -> Menu icon mode` zapisuje `auto`, `classic` albo `modern` do `settings.json`. Test regresji wymaga poprawnego round-trip przez `pluginadmin.ashx`, trwałości po utworzeniu nowego runtime oraz preferowania świeżo zapisanego `SirkPlatformAdminData.uiSettings.iconMode` nad starym browser bootstrapem.

## Usunięte warstwy compatibility

W repozytorium nie występują już:

```text
download-results.js
script-edit-actions.js
mesh-plugin-core.js
quick-output-state.js
runtime-base.js
audit-log.js
```

Usunięto także historyczny snapshot testowy `ui-regression-1.8.19.test.js`.

## Collapse

Approval Center, Commands i My Scripts współdzielą jeden stan:

```text
sirkPlatform.layout.shared-script-columns.collapsed
```

`SharedLayout` migruje istniejący per-module stan do klucza wspólnego i synchronizuje aktywne layouty. Pozostałe layouty zachowują własne klucze.

## Request lifecycle

`public/shared/core.js` jest właścicielem request guard:

- GET ma bounded timeout i `AbortController`;
- zmiana widoku może anulować GET;
- write requests nie dostają automatycznego timeoutu przeznaczonego dla odczytów.

## Dane i kompatybilność

Jedyny katalog danych runtime:

```text
meshcentral-data/sirk-platform-data
```

Repozytorium nie migruje `mycompany-data` i nie utrzymuje zgodności wstecznej z testowymi strukturami pluginu.

## Weryfikacja

Kanoniczna komenda:

```bash
npm test
```

Suite obejmuje testy funkcjonalne, security regression, walidację natywnego MeshCentral Events, layoutu repozytorium oraz architektury. CI korzysta z Node.js 24 i `actions/checkout@v7` / `actions/setup-node@v7`.

Ostatni pełny wynik dla zmian regresyjnych przed bumpem release: `SUCCESS` — GitHub Actions #282.
