# SIRK Management Platform 0.1.1-dev.22

**Status:** development pre-1.0 — brak pierwszego pełnego wydania produktu  
**Repozytorium:** `MC-SIRK`  
**Techniczny identyfikator pluginu MeshCentral:** `SIRKPortal`  
**Nazwa wyświetlana:** `SIRK Management Platform`  
**Nazwa skrócona:** `SIRK Platform`

SIRK Management Platform jest pluginem działającym w natywnym interfejsie MeshCentral. Zawiera backend, panel administracyjny, My Scripts, Commands, Approval Center, Device Transfers, integracje i mechanizmy wykonywania poleceń na urządzeniach.

Repozytorium nie utrzymuje kompatybilności z testową strukturą `MyCompany` ani historycznymi warstwami naprawczymi runtime/DOM.

## Wersjonowanie

Projekt nie osiągnął jeszcze `1.0.0`.

Preferowana konwencja development to `0.1.1.X`. Ponieważ npm wymaga poprawnego SemVer, repo reprezentuje tę samą rewizję jako `0.1.1-dev.X`, np. `0.1.1.42 -> 0.1.1-dev.42`.

Historyczne numery `1.8.x` były wewnętrzną numeracją developmentu i nie są podstawą kolejnych wersji. Pierwszy świadomie zaakceptowany kompletny produkt jest zarezerwowany dla `1.0.0`.

Szczegóły: [`docs/agent/14-Agent-Wersjonowanie-Pre1.md`](docs/agent/14-Agent-Wersjonowanie-Pre1.md).

## Dokumentacja kanoniczna

Zacznij od:

1. [`AGENTS.md`](AGENTS.md)
2. [`docs/INDEX.md`](docs/INDEX.md)
3. indeksu właściwej warstwy

Najważniejsze dokumenty:

- [Aktualny stan projektu](docs/PROJECT-STATE.md)
- [Struktura repozytorium](docs/REPOSITORY-LAYOUT.md)
- [Frontend index](public/INDEX.md)
- [Backend index](server/INDEX.md)
- [Test index](test/INDEX.md)
- [Aktualne development notes](docs/releases/0.1.1-dev.22.md)

## Warstwy

```text
backend Node/MeshCentral        -> server/
natywna integracja MeshCentral -> public/native/
frontend współdzielony         -> public/shared/
renderery modułów              -> public/modules/
panel administracyjny          -> web/admin/
widok panelu                   -> views/SIRK-Portal.handlebars
narzędzia instalacyjne         -> tools/install/
```

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

Mapę assetów utrzymuje `admin.js`.

## Natywny UI MeshCentral

Plugin nie posiada niezależnego motywu dla standardowych kontrolek.

`MeshThemeAdapter` w `public/shared/ui/toolbar-config.js` mapuje elementy na klasy aktywnego interfejsu MeshCentral:

- Classic: `style10`, `style10s`, `style3x`, `style3sel`;
- Modern: Bootstrap używany przez MeshCentral, m.in. `btn-*`, `nav-link`, `list-group-item`, `card`, `form-control`, `form-select`, `table`.

CSS pluginu odpowiada za geometrię, przewijanie i responsywność. Hover, selected, standardowe powierzchnie, przyciski, formularze i tabele pozostają własnością MeshCentral. SIRK może neutralizować wyłącznie hostowe transformacje zmieniające geometrię własnych powierzchni, bez przejmowania kolorów hover/selected.

Kanoniczne desktopowe kolumny shared UI:

```text
primary:            165–205 px
collapsed primary:  64 px
secondary:          285–340 px
details:            pozostała przestrzeń
```

Globalna geometria workspace znajduje się w `public/shared/ui/shared-ui.css`. `layout.js` odpowiada tylko za strukturę DOM i stan Collapse.

## MeshCentral Events

SIRK nie utrzymuje własnego systemu audit logów. `server/core/mesh-events.js` przekazuje zdarzenia akcji do natywnego `MeshCentral.DispatchEvent()`.

- nie powstaje `audit.jsonl`;
- panel SIRK nie ma osobnej zakładki Logs;
- persistence, filtrowanie i prezentacja zdarzeń należą do MeshCentral Events;
- eventy SIRK zawierają użytkownika i, gdy dotyczy, urządzenie;
- hasła, sekrety, tokeny, payloady i output poleceń nie są kopiowane do eventów.

## Atomic render

`public/shared/module-shell.js` renderuje nowe `secondary` i `details` poza live DOM. `renderSequence` odrzuca nieaktualne operacje, a zawartość strony jest podmieniana dopiero podczas atomic commit.

Przejście pomiędzy workspace SIRK nie wykonuje pośredniego `go(1)`, dzięki czemu Devices nie jest odtwarzane pomiędzy modułami.

## Edit / Multi

Edit i Multi-device są wzajemnie wykluczające się, ale oba przyciski pozostają widoczne, jeżeli użytkownik ma wymagane uprawnienia.

Action track jest mierzony na żywo przez `toolbar-api.js`. Edit i Multi zachowują identyczną szerokość bazowego text tracku; `secondary` rozszerza się tylko o rzeczywistą szerokość action rail oraz jego column gap. Zmiana live geometrii obu trybów następuje po atomic render commit, dzięki czemu pojawienie lub zniknięcie akcji nie zmienia wrappingu ani położenia labeli. Style geometrii są statyczne; runtime nie generuje arkusza CSS.

## Quick

Quick jest montowany na natywnej powierzchni Desktop i ma jednego właściciela stanu w:

```text
public/native/desktop-commands.js
```

- launcher ma stałą szerokość 38 px;
- Collapse i Output korzystają ze wspólnych preferences My Commands;
- ukrycie Output używa klasy `is-details-collapsed`;
- attention/pending są stanem runtime;
- czerwony attention jest uzbrajany wyłącznie przez nowy wynik wykonania i kasowany po pokazaniu wyniku;
- zwykłe kliknięcia, Refresh i ładowanie metadanych nie uzbrajają ponownie attention;
- Quick nie używa własnego MutationObservera;
- wiersze otrzymują natywne zaznaczenie MeshCentral synchronicznie podczas renderu.

Nie istnieją już warstwy `mesh-plugin-core.js` ani `quick-output-state.js`.

## Wyniki i CSV

`public/shared/ui/results.js` jest jednym rendererem wyników. Rozpoznaje wygenerowane raporty CSV i prowadzi do uwierzytelnionego endpointu `admin.js`.

Endpoint pobierania:

- wymaga użytkownika MeshCentral;
- ogranicza ścieżkę do kanonicznych katalogów skryptów;
- dopuszcza wyłącznie `.csv`;
- wysyła plik jako attachment z `nosniff`.

## Dane trwałe

Jedyny katalog danych runtime:

```text
meshcentral-data/sirk-platform-data
```

Plugin nie odczytuje, nie kopiuje i nie migruje `meshcentral-data/mycompany-data`.

## Usunięte warstwy compatibility

W kodzie i startupie nie występują:

```text
download-results.js
script-edit-actions.js
mesh-plugin-core.js
quick-output-state.js
runtime-base.js
audit-log.js
```

Nie należy ich przywracać. Funkcje dawnych helperów mają obecnie jednoznacznych właścicieli opisanych w `docs/PROJECT-STATE.md`.

## Instalacja z Git

Uruchom jako Administrator:

```powershell
.\tools\install\Install-SIRK-Portal-FromGit_RUN.ps1
```

Implementacja:

```text
tools/install/Install-SIRK-Portal-FromGit.ps1
```

Plugin jest instalowany do:

```text
meshcentral-data/plugins/SIRKPortal
```

## Testy

```bash
npm test
```

Suite automatycznie uruchamia wszystkie `test/*.test.js`, security regression oraz:

```text
scripts/validate-repository-layout.js
scripts/validate-architecture.js
```

CI używa Node.js 24 oraz `actions/checkout@v7` / `actions/setup-node@v7`.

Wersje `package.json` i `config.json` muszą być identyczne.
