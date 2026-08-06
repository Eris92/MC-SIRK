# SIRK Management Platform 1.8.7

**Repozytorium:** `SIRK-Portal`  
**Techniczny identyfikator pluginu MeshCentral:** `SIRKPortal`  
**Nazwa wyświetlana:** `SIRK Management Platform`  
**Nazwa skrócona w interfejsie:** `SIRK Platform`

SIRK Management Platform jest pluginem działającym wyłącznie w natywnym interfejsie MeshCentral. Zawiera backend, panel administracyjny, automatyzację, akceptacje, integracje i zarządzanie urządzeniami.

Repozytorium nie utrzymuje kompatybilności z testową nazwą ani strukturą `MyCompany`. Nie ładuje starych entrypointów, nie migruje dawnych ustawień i nie korzysta z `mycompany-data`.

## Zacznij od indeksów

Przed odczytem kodu:

1. przeczytaj [`AGENTS.md`](AGENTS.md);
2. otwórz [`docs/INDEX.md`](docs/INDEX.md);
3. wybierz indeks warstwy odpowiadającej zadaniu;
4. czytaj wyłącznie wskazaną część repozytorium i jej bezpośrednie zależności.

Nie skanuj całego repozytorium, jeżeli indeks wskazuje konkretny entrypoint, moduł, loader, test lub dokument.

## Dokumentacja

- [Indeks dokumentacji i obszarów](docs/INDEX.md)
- [Struktura repozytorium](docs/REPOSITORY-LAYOUT.md)
- [Aktualny stan projektu](docs/PROJECT-STATE.md)
- [Router instrukcji](AGENTS.md)
- [Reguły projektu](docs/agent/11-Agent-SIRK-Portal.md)
- [Prompt startowy nowej rozmowy](docs/agent/Prompt-Start-SIRK-Portal-Conversation.md)

## Warstwy projektu

```text
backend Node/MeshCentral       -> server/
adapter natywnego MeshCentral  -> public/native/
frontend współdzielony         -> public/shared/
renderery modułów              -> public/modules/
panel administracyjny          -> web/admin/
widok panelu                   -> views/SIRK-Portal.handlebars
narzędzia instalacyjne         -> tools/install/
```

Szczegółowe mapy znajdują się w lokalnych plikach `INDEX.md` poszczególnych warstw.

## Moduły funkcjonalne

- Automation;
- Commands;
- Approvals;
- Device Transfers.

Backend modułów znajduje się w `server/modules/`, a pojedyncze renderery frontendowe w `public/modules/`.

## Natywny kontrakt UI MeshCentral

Plugin nie posiada własnej palety kolorów ani niezależnego motywu. `MeshThemeAdapter` przypisuje komponentom istniejące klasy aktywnego interfejsu MeshCentral:

- Classic: `style10`, `style10s`, `style3x`, `style3sel` oraz natywne kontrolki formularzy;
- Modern: klasy Bootstrap używane przez MeshCentral, między innymi `btn-*`, `nav-link`, `list-group-item`, `card`, `form-control`, `form-select` i `table`.

Dotyczy to Approval Center, Commands, My Scripts, Move Requests, Quick, wyników, formularzy, dialogów i panelu administracyjnego. Klasy są ponownie synchronizowane po renderach asynchronicznych oraz zmianie motywu.

CSS pluginu definiuje wyłącznie elementy funkcjonalne, których MeshCentral nie zapewnia: układ trzech kolumn, geometrię Edit/Multi, pozycję panelu Quick, przewijanie i responsywność. Powierzchnie, przyciski, listy, zaznaczenia, karty, formularze, tabele i statusy pozostają własnością MeshCentral.

Renderowanie modułów zachowuje istniejący DOM do czasu zakończenia pobierania danych. Szybkie kliknięcia są łączone i kolejkowane, dzięki czemu Approval Center, Commands, My Scripts oraz Move Requests nie przechodzą przez pusty stan pomiędzy renderami.

Pierwsza i druga kolumna Approval Center, Commands oraz My Scripts używają jednego kontraktu hover i selected opartego na natywnych zmiennych bieżącego motywu MeshCentral. Wiersze nie zmieniają geometrii po najechaniu ani kliknięciu.

Renderer drzewa dopuszcza tylko jedną akcję o danym `key` w pojedynczym wierszu, dlatego Favorite nie może zostać zdublowany przez nakładające się warstwy Commands i współdzielonego Edit. Aktywna gwiazdka korzysta z natywnej klasy `text-warning`, tak jak aktywny klucz poświadczeń.

Przyciski Edit i Multi-device pozostają jednocześnie widoczne, gdy użytkownik ma odpowiednie uprawnienia. Aktywny może być tylko jeden tryb; kliknięcie drugiego przełącza bezpośrednio z Edit na Multi lub z Multi na Edit.

Quick zachowuje stałą geometrię podczas hover i active. Panel, toolbar, kolumna Output oraz elementy list nie dziedziczą transformacji powiększających z motywów MeshCentral. Po ukryciu Output grid jest rzeczywiście dwukolumnowy, bez pustego trzeciego tracku, a zawartość zaczyna się bezpośrednio pod toolbarem.

Stan ukrycia Output jest synchronizowany pomiędzy renderem Quick i kontrolerem attention. Gdy ukryty Output otrzyma nowy końcowy wynik, przycisk otrzymuje czerwony stan z natywnych tokenów Bootstrap MeshCentral. Otwarcie Output natychmiast zeruje attention, a komunikaty ładowania, wysłania i odświeżenia listy pozostają neutralne. Toolbar ma dolny odstęp przed rozpoczęciem pionowych separatorów kolumn.

## Entry pointy i loadery

Kanoniczne entrypointy MeshCentral:

```text
SIRKPortal.js
SIRKPortalAdmin.js
```

Identyfikator `SIRKPortal` celowo nie zawiera myślnika. MeshCentral wykorzystuje `shortName` jako nazwę właściwości w generowanym JavaScript głównego interfejsu, dlatego musi to być poprawny identyfikator JavaScript.

`SIRKPortalAdmin.js` deleguje implementację panelu do `admin.js`.

Łańcuch backendu:

```text
SIRKPortal.js
  -> plugin-main.js
    -> server/core/runtime.js
      -> server/modules/*
```

Mapę assetów natywnego interfejsu utrzymuje `admin.js`.

## Dane trwałe

Jedyny katalog danych runtime:

```text
meshcentral-data/sirk-platform-data
```

Plugin nie odczytuje, nie kopiuje i nie migruje `meshcentral-data/mycompany-data`.

## Instalacja z Git

Uruchom jako Administrator:

```powershell
.\tools\install\Install-SIRK-Portal-FromGit_RUN.ps1
```

Źródłowa implementacja instalatora:

```text
tools/install/Install-SIRK-Portal-FromGit.ps1
```

Repozytorium źródłowe:

```text
https://github.com/Eris92/MC-SIRK
```

Instalator umieszcza plugin w:

```text
meshcentral-data/plugins/SIRKPortal
```

## Testy

```bash
npm test
```

Walidator struktury blokuje niebezpieczny identyfikator z myślnikiem, stare entrypointy i widoki `MyCompany`, backend poza `server/`, płaskie assety aplikacyjne w `public/`, `public/shared-ui/`, podwójne renderery i niekanoniczne ścieżki loaderów. Test natywnego motywu blokuje ponowne dodanie prywatnych palet, powierzchni i stanów aktywnych niezależnych od MeshCentral.
