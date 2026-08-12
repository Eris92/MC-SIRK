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

## Start - minimalny kontekst

Dla każdego zadania:
1. przeczytaj ten plik;
2. przeczytaj `docs/INDEX.md`;
3. jeżeli podano Issue, przeczytaj Issue przed kodem;
4. wybierz dokładnie jeden indeks warstwy;
5. odczytaj entrypoint/ownera, bezpośrednie zależności i targeted tests;
6. rozszerz zakres tylko po konkretnym braku evidence.

Nie czytaj automatycznie wszystkich `docs/agent/*`, całego repo, historii Git ani pełnych testów.

Domyślny first pass:
- task/Issue;
- `AGENTS.md` + `docs/INDEX.md`;
- 1 indeks warstwy;
- do 5 plików implementacji/testów.

## Moduły instrukcji - tylko gdy dotyczą zadania

| Zakres | Moduł |
|---|---|
| tryb wykonania / złożone zadanie | `docs/agent/01-Agent-Tryby.md` |
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

`docs/agent/00-Agent-Core.md` jest dokumentem referencyjnym; nie trzeba go ponownie czytać, jeżeli ten router i `docs/INDEX.md` wystarczają.

## Context/output budget

Tool output pozostaje w aktywnym kontekście. Minimalizuj go tak samo jak liczbę odczytywanych plików.

Preferuj:
- `rg`/search z wąskim patternem i katalogiem;
- range reads zamiast pełnych dużych plików;
- `git diff --stat` przed pełnym diffem;
- `git diff -- <targeted paths>` zamiast całego repo;
- filtrowane API/JSON z tylko potrzebnymi polami;
- targeted test i krótki failure excerpt;
- jeden odczyt niezmienionego pliku na sesję.

Nie wykonuj bez potrzeby:
- `cat` dużych plików;
- pełnych dumpów logów/JSON;
- pełnego `git log` lub historii Issue;
- ponownego odczytu niezmienionych instrukcji;
- full test suite przed targeted tests;
- szerokiego recursive search, jeśli indeks wskazuje scope.

Gdy output jest duży, najpierw zawęź go po nazwie, statusie, błędzie, symbolu albo ścieżce. Zachowuj tylko evidence potrzebne do decyzji i handoffu.

## Issues i handoff

Issue jest bieżącym task packetem, nie archiwum całej sesji. Przechowuj krótko:
- Goal / acceptance;
- root cause / decision;
- changed files/contract;
- commit/PR;
- tests/result;
- blocker/risk;
- exact next step.

Nie kopiuj całych logów ani kolejnych pełnych podsumowań. Preferuj jeden aktualny `CURRENT STATE` zamiast rosnącej historii handoffów. Git/PR zachowują historię techniczną.

## Runtime i reuse

Przed dodaniem klasy/modułu/helpera/renderera/CSS/event handlera/timera/observera/request loop sprawdź istniejącego ownera w odpowiednim indeksie i preferuj reuse. Nie twórz monolitu tylko dla mniejszej liczby plików.

Dla runtime najpierw potwierdź realny loader/route/require, potem ownera i bezpośrednich konsumentów. Nie przywracaj historycznych aliasów, shimów, `MyCompany`, starych loaderów ani `mycompany-data`, chyba że użytkownik zleci audyt historyczny.

## Git, wersja i weryfikacja

Zmiany techniczne przeznaczone do integracji/testu używają linii `0.1.1-dev.X`; `package.json` i `config.json` muszą być zgodne. `1.0.0` pozostaje zablokowane bez jawnej decyzji użytkownika. Sama dokumentacja nie wymaga bumpu.

Po zmianie wykonaj najmniejszą adekwatną weryfikację: syntax/targeted test/direct result + kontrola diffu. Full `npm test` tylko dla shared runtime/loader/public contract/security albo gdy targeted test nie wystarcza.

Zakończone, zweryfikowane zmiany commituj i pushuj zgodnie z projektem. Nie używaj force push, nie publikuj tagu/GitHub Release i nie osłabiaj zabezpieczeń bez jawnego polecenia.
