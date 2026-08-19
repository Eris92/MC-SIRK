# SIRK Management Platform — project state

Status: `development pre-1.0`  
Current version: `0.1.130`
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

`runtime-state.json` w tym katalogu jest małym, nie-sekretnym dowodem aktywnej instancji pluginu: zawiera wersję z dysku, wersję załadowanego runtime, PID, rzeczywisty plugin root i czas załadowania. Instalator usuwa poprzedni marker przed restartem i akceptuje deployment dopiero po pojawieniu się świeżego, zgodnego stanu.

Bundled My Scripts mają jeden kanoniczny source root: `pluginRoot/seed/MyScripts`. Metadata/tree/dynamic options oraz wykonanie używają tego samego katalogu. Historyczne katalogi skryptów pod `sirk-platform-data` nie są usuwane ani modyfikowane, ale nie mogą przesłaniać bundled definitions.

Nie utrzymywać compatibility z `MyCompany`, `mycompany-data`, starymi loaderami ani historycznymi warstwami DOM/runtime.

## Kanoniczni ownerzy

- `SIRKPortal.js` — stabilny backend bootstrap pluginu; przy ponownej instancji odczytuje wersję z bieżącego `config.json`, dla tej samej wersji reuse istniejący runtime, a po zmianie wersji czyści wyłącznie wewnętrzny cache modułów MC-SIRK i ładuje aktualne `plugin-main.js`/policy bez patchowania MeshCentral; po utworzeniu pluginu zapisuje `runtime-state.json`, aby deployment mógł udowodnić zgodność disk/runtime/plugin root zamiast ufać samym metadanym;
- `tools/install/Install-SIRK-Portal-FromGit.ps1` — utrzymywany deployment owner: wykrywa rzeczywistą usługę Windows MeshCentral, buduje runtime-only artifact, weryfikuje kompletne SHA-256 po instalacji i kończy sukcesem dopiero po świeżym runtime proof z uruchomionego procesu;
- `server/core/mesh-events.js` — adapter zdarzeń SIRK do `MeshCentral.DispatchEvent()`;
- `server/core/approval-service.js` — shared approval lifecycle, w tym opcjonalny post-result `awaiting_confirmation` potwierdzany przez original requestera albo Site Admina;
- `server/core/jira-asset-service.js` — jeden server-side owner Jira users cache (24h freshness/stale fallback), Jira user options i dynamic Jira Assets options; token nie trafia do cache;
- `server/core/jira-protocol-service.js` — kanoniczny Jira Asset Protocol owner: stable asset identity, przygotowanie PDF, expected final inventory i przejście do shared requester confirmation;
- `server/core/jira-asset-confirmation-service.js` — bounded live ownership/schema snapshot, stale-state verification i finalne Jira Assets writes po confirmation;
- `server/core/sms-service.js` — server-side owner wysyłki SMS i Voice SMS przez SMSAPI.pl, w tym multi-recipient, maskowanie numerów w output oraz jawne `encoding=utf-8` dla SMS;
- `server/core/ad-directory-service.js` — owner opcji AD i pomocniczych bounded zapytań katalogowych; dla resetu hasła zwraca bez live preflightu deduplikowane Jira-cache tożsamości z użytecznym `emailAddress`/UPN, dzięki czemu dialog nie czeka na pełne dopasowanie katalogu; dokładne `UserPrincipalName` wybranego użytkownika jest rozwiązywane dopiero przez skrypt resetu tuż przed zmianą hasła; bezpośredni Windows bridge `ad-directory-query.ps1` pozostaje machine-readable `System.DirectoryServices` fallbackiem bez modułu ActiveDirectory/defaultowego `AD:` i bez publikowania surowego CLIXML;
- `server/core/sms-external-api.js` — chroniony oddzielnym tokenem endpoint `POST /sirk-sms/v1/send` z limitem 30 żądań/minutę/adres IP;
- `server/core/automation-root.js` — jeden source-root owner bundled My Scripts: zawsze `pluginRoot/seed/MyScripts`; persistent data-root directories nie shadowują metadata ani dynamic-option definitions;
- `server/modules/automation/index.js` — publiczny My Scripts access boundary; ścieżki z segmentem `_...`, w tym `_shared`, pozostają wewnętrzne i nie są publikowane ani wykonywane przez publiczne My Scripts API; `ad-users` wymaga credentialu AD, ale konsumuje server-owned Jira users cache bez redundantnego przypisania Jira do skryptu resetu;
- `public/shared/core.js` — workspace, menu, aktywny moduł, request guard oraz finalne first-paint klasy/active state/geometria i source ikon left menu; brakujący menu node jest tworzony dopiero po zakończeniu bieżącego natywnego `goPageEnd`, a późniejsza rekonsyliacja nie przepisuje niezmienionego widocznego stanu;
- `public/shared/ui/settings.js` / `SirkIconMode` — jeden browser owner polityki `auto/classic/modern` dla ikon menu;
- `public/shared/runtime.js` — browser bootstrap, permission-safe native surface readiness, native page/device lifecycle i bounded module startup; `goPageStart` unieważnia poprzedni page-ready state, a `goPageEnd` wykonuje jeden bounded menu reconcile;
- `public/shared/module-shell.js` — lifecycle modułów i atomic render;
- `public/shared/ui/layout.js` — layout i Collapse;
- `public/shared/ui/shared-ui.css` — współdzielona geometria workspace/kolumn;
- `public/shared/ui/toolbar.js` + `toolbar-api.js` — toolbar i Edit/Multi;
- `public/shared/ui/toolbar-config.js` — `MeshThemeAdapter` i integracja natywnych klas MeshCentral;
- `public/shared/ui/parameter-dialog.js` — jeden owner natywnego MeshCentral parameter/confirmation dialog lifecycle; w Modern udany parameter submit jest finalizowany dopiero po hostowym `hidden.bs.modal`, aby kolejny dialog nie ścigał się z trwającym hide transition;
- `public/shared/ui/results.js` — wyniki, CSV oraz live content Results montowany do natywnego dialog managera MeshCentral; dla nagromadzonego outputu wybiera najnowszy `CSV_DOWNLOAD:` i uruchamia pobranie przez transient same-origin attachment link bez nawigacji workspace;
- `public/modules/automation/index.js` — My Scripts renderer i browser-side per-script single-flight guard zapobiegający równoległym duplicate submitom tej samej ścieżki;
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
- ukrycie Output używa klasy `is-details-collapsed`.

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
package.json -> 0.1.130
config.json  -> 0.1.130
```

Od rewizji 125 trzeci segment `0.1.X` jest numerem development. Poprzednie `0.1.1-dev.X` są historyczne, ponieważ bieżący updater MeshCentral usuwa suffix po `-` przed porównaniem wersji i nie rozróżniał kolejnych `dev.X`.

Nie kontynuować numeracji `1.8.x`. Szczegóły: `docs/agent/14-Agent-Wersjonowanie-Pre1.md`.

Aktualne development notes: `docs/releases/0.1.130.md`.

Nie tworzyć taga/GitHub Release ani `1.0.0` bez jawnej decyzji użytkownika i spełnienia release gate.

## Weryfikacja

Kanoniczna pełna komenda:

```bash
npm test
```

Nie uruchamiaj jej automatycznie dla każdej małej zmiany. Najpierw targeted test; pełny suite dla zmian runtime, loadera, shared UI, struktury, security/public contractu lub przed release.

GitHub Issues w `Eris92/MC-SIRK` są stanem aktywnych zadań. Trwałe decyzje przekrojowe zapisuj oszczędnie w `docs/memory/PROJECT_MEMORY.md`.
