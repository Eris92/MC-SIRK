# AGENTS.md - router instrukcji MC-SIRK

## Cel i scope

`Eris92/MC-SIRK` jest source of truth dla MC-SIRK / SIRK Management Platform jako natywnego pluginu MeshCentral. Kanoniczna gałąź: `main`.

Nazwy kanoniczne:
- repo: `MC-SIRK`;
- plugin: `SIRKPortal`;
- produkt: `SIRK Management Platform`;
- entrypoint: `SIRKPortal.js`;
- runtime data: `meshcentral-data/sirk-platform-data`;
- stan projektu: `docs/PROJECT-STATE.md`.

MC-SIRK jest odrębny od wielorepozytoryjnego SIRK Agent/Portal/Central/Updater.

## Zasada nadrzedna

Optimize for the shortest evidence-based path to a correct implementation, not exhaustive investigation.

Agent zachowuje autonomie: sam implementuje, testuje i konczy zadanie. Zakres rozszerza tylko wtedy, gdy konkretne evidence pokazuje, ze aktualny scope nie wystarcza dla correctness, security albo acceptance criteria.

## Start - minimalny kontekst

Dla kazdego zadania:
1. przeczytaj ten plik raz;
2. przeczytaj `docs/INDEX.md` raz;
3. jezeli podano Issue, przeczytaj Issue przed kodem i nie pobieraj go ponownie bez evidence zmiany;
4. wybierz dokladnie jeden indeks warstwy;
5. odczytaj entrypoint/ownera, bezposrednie zaleznosci i targeted tests;
6. rozszerz zakres tylko po konkretnym braku evidence.

Routing warstw:
- backend, storage, API, integracje, permissions: `server/INDEX.md`;
- native UI MeshCentral, shared UI, renderery: `public/INDEX.md`;
- panel administracyjny: `web/INDEX.md`;
- walidatory/build/struktura: `scripts/INDEX.md`;
- test/regresja: `test/INDEX.md`.

Nie czytaj automatycznie wszystkich `docs/agent/*`, calego repo, historii Git ani pelnych testow.

Domyslny first pass:
- task/Issue;
- `AGENTS.md` + `docs/INDEX.md`;
- 1 indeks warstwy;
- do 5 plikow implementacji/testow.

## FAST_PATH - domyslny tryb

Bugfix, mala funkcja, UI fix, configuration change, targeted refactor i proste Issue realizuj domyslnie przez FAST_PATH:

1. task/Issue;
2. dwa routery + jeden indeks warstwy;
3. maksymalnie 3 targeted searches;
4. minimalna implementacja w ownerze i bezposrednich zaleznosciach;
5. targeted validation, zwykle maksymalnie 2 komendy;
6. kontrola finalnego diffu;
7. jeden commit/push po zakonczeniu lokalnej iteracji.

Guardrails dla malego zadania:
- odczyty instrukcji/indexow: <= 3 poza samym Issue;
- targeted code searches: <= 3;
- Web Search: 0 domyslnie;
- clone/checkout: maksymalnie 1 na repo i tylko gdy lokalny checkout jest potrzebny;
- targeted test/build commands: zwykle <= 2;
- ponowny odczyt tego samego niezmienionego zasobu: 0;
- cross-repo inspection: 0, chyba ze task lub evidence wskazuje rzeczywisty contract/dependency;
- documentation update: tylko gdy istniejaca dokumentacja stalaby sie bledna albo acceptance criteria tego wymagaja.

To sa guardrails, nie twarde limity. Mozesz je przekroczyc tylko z konkretnym powodem zwiazanym z correctness, security, acceptance criteria albo potwierdzona zaleznoscia. Po rozwiazaniu blockera wroc do FAST_PATH.

## Context reuse i narzedzia

Informacja uzyskana podczas zadania pozostaje evidence. Nie wykonuj ponownie tego samego odczytu/search/fetch/clone/check bez dowodu, ze wynik mogl sie zmienic.

W szczegolnosci nie powtarzaj:
- `AGENTS.md`, `docs/INDEX.md`, indeksu warstwy ani tego samego Issue;
- wyszukiwania tego samego symbolu/patternu w tym samym scope;
- clone/checkout tego samego repo;
- tej samej dokumentacji zewnetrznej;
- walidacji, ktora juz potwierdzila niezmieniony zakres.

Web Search uzywaj tylko gdy potrzebna jest aktualna dokumentacja zewnetrzna, informacji nie ma w repo, trzeba potwierdzic zachowanie zewnetrznego API/systemu albo uzytkownik jawnie wymaga researchu. Nie uzywaj Web do informacji dostepnych juz w repo.

## Moduly instrukcji - tylko gdy dotycza zadania

| Zakres | Modul |
|---|---|
| tryb wykonania / zlozone zadanie | `docs/agent/01-Agent-Tryby.md` |
| automation/skrypty | `docs/agent/02-Agent-Automation.md` |
| security/risky change | `docs/agent/03-Agent-Jakosc-Bezpieczenstwo.md` |
| testy | `docs/agent/04-Agent-Testy-Weryfikacja.md` |
| Git/commit/push/release | `docs/agent/05-Agent-Git-Release.md` |
| dokumentacja/stany | `docs/agent/06-Agent-Dokumentacja-Stanu.md` |
| config/secrets | `docs/agent/07-Agent-Konfiguracja-Sekrety.md` |
| dependencies | `docs/agent/08-Agent-Zaleznosci-Aktualizacje.md` |
| logi/diagnostyka | `docs/agent/09-Agent-Logi-Diagnostyka.md` |
| plugin MeshCentral | `docs/agent/10-Agent-MeshCentral-Plugin.md` |
| runtime MC-SIRK | `docs/agent/11-Agent-SIRK-Portal.md` |
| performance/reuse/refactor | `docs/agent/12-Agent-Wydajnosc-Reuse.md` |
| Issue/handoff | `docs/agent/13-Agent-Kontekst-Issues.md` |
| version/release | `docs/agent/14-Agent-Wersjonowanie-Pre1.md` |
| PowerShell/JavaScript/Python | `docs/agent/20-Agent-PowerShell.md`, `21-Agent-JavaScript.md`, `22-Agent-Python.md` |
| Windows/Linux | `docs/agent/30-Agent-Windows.md`, `31-Agent-Linux.md` |
| Infrastructure/Security | `docs/agent/40-Agent-Infrastructure.md`, `41-Agent-Security.md` |

`docs/agent/00-Agent-Core.md` jest dokumentem referencyjnym; nie trzeba go ponownie czytac, jezeli ten router i `docs/INDEX.md` wystarczaja.

## Context/output budget

Tool output pozostaje w aktywnym kontekscie. Minimalizuj go tak samo jak liczbe odczytywanych plikow.

Preferuj:
- `rg`/search z waskim patternem i katalogiem;
- range reads zamiast pelnych duzych plikow;
- `git diff --stat` przed pelnym diffem;
- `git diff -- <targeted paths>` zamiast calego repo;
- filtrowane API/JSON z tylko potrzebnymi polami;
- targeted test i krotki failure excerpt;
- jeden odczyt niezmienionego pliku na sesje.

Nie wykonuj bez potrzeby:
- `cat` duzych plikow;
- pelnych dumpow logow/JSON;
- pelnego `git log` lub historii Issue;
- ponownego odczytu niezmienionych instrukcji;
- full test suite przed targeted tests;
- szerokiego recursive search, jesli indeks wskazuje scope.

Gdy output jest duzy, najpierw zawez go po nazwie, statusie, bledzie, symbolu albo sciezce. Zachowuj tylko evidence potrzebne do decyzji i handoffu.

## Testing

Preferuj: changed component -> targeted tests -> targeted lint/typecheck/build.

Full `npm test` albo pelny build wykonuj tylko gdy zmiana dotyka shared runtime/dependency/public contract/loader/security, targeted validation nie daje wystarczajacego confidence, acceptance criteria tego wymagaja albo istnieje realne ryzyko regresji cross-component.

Nie rerunuj testu dla niezmienionego zakresu tylko po to, aby ponownie potwierdzic ten sam wynik.

## Dokumentacja

Nie aktualizuj dokumentacji mechanicznie przy kazdym fixie. Aktualizacja jest wymagana tylko gdy zmienia sie public behavior, architecture/contract, konfiguracja/procedura opisana w docs, istniejaca dokumentacja staje sie bledna albo Issue/acceptance criteria tego wymagaja.

## UI completeness

Jesli feature ma byc dostepny dla operatora/uzytkownika, implementacja nie jest kompletna dopoki odpowiednia akcja, widok, menu, formularz albo stan UI nie jest podlaczony do istniejacego workflow. Sam backend/service bez wymaganego entrypointu UI nie spelnia feature acceptance.

Dla backend-only taska nie dodawaj UI bez evidence, ze jest wymagane.

## Issues i handoff

Issue jest biezacym task packetem, nie archiwum calej sesji. Przechowuj krotko:
- Goal / acceptance;
- root cause / decision;
- changed files/contract;
- commit/PR;
- tests/result;
- blocker/risk;
- exact next step.

Nie kopiuj calych logow ani kolejnych pelnych podsumowan. Preferuj jeden aktualny `CURRENT STATE` zamiast rosnacej historii handoffow. Git/PR zachowuja historie techniczna.

## Runtime i reuse

Przed dodaniem klasy/modulu/helpera/renderera/CSS/event handlera/timera/observera/request loop sprawdz istniejacego ownera w odpowiednim indeksie i preferuj reuse. Nie tworz monolitu tylko dla mniejszej liczby plikow.

Dla runtime najpierw potwierdz realny loader/route/require, potem ownera i bezposrednich konsumentow. Nie przywracaj historycznych aliasow, shimow, `MyCompany`, starych loaderow ani `mycompany-data`, chyba ze uzytkownik zleci audyt historyczny.

## Git, wersja i weryfikacja

Zmiany techniczne przeznaczone do integracji/testu uzywaja linii `0.1.1-dev.X`; `package.json` i `config.json` musza byc zgodne. Kazda nowa zmiana techniczna przeznaczona do testow uzytkownika musi zwiekszyc rewizje development, aby zainstalowana wersja byla jednoznacznie rozpoznawalna; nie pozostawiaj tej samej rewizji po kolejnym runtime fixie. `1.0.0` pozostaje zablokowane bez jawnej decyzji uzytkownika. Sama dokumentacja nie wymaga bumpu.

Po zmianie wykonaj najmniejsza adekwatna weryfikacje: syntax/targeted test/direct result + kontrole diffu. Zakonczone, zweryfikowane zmiany commituj i pushuj zgodnie z projektem. Nie uzywaj force push, nie publikuj tagu/GitHub Release i nie oslabiaj zabezpieczen bez jawnego polecenia.
