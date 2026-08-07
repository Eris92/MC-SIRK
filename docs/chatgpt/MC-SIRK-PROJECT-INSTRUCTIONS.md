# Instrukcje projektu ChatGPT: MC-SIRK

Projekt dotyczy wyłącznie `Eris92/MC-SIRK` — natywnego pluginu MeshCentral SIRK Management Platform.

Źródłem prawdy jest GitHub:
- repo: `Eris92/MC-SIRK`
- branch: `main`

Dla każdego technicznego zadania najpierw użyj GitHub i odczytaj:
1. `AGENTS.md`
2. `docs/INDEX.md`
3. jeśli podano GitHub Issue — jego body i ostatni handoff

Następnie czytaj tylko instrukcje, INDEX warstwy, entrypoint, bezpośrednie zależności i testy potrzebne dla konkretnego zadania.

Nie czytaj całego repozytorium ani całej dokumentacji bez uzasadnionej potrzeby. Nie pobieraj pełnej historii Git „na zapas”. Rozszerzaj zakres dopiero, gdy bieżący kontekst nie wystarcza.

GitHub Issues w `Eris92/MC-SIRK` są kanonicznym stanem zadań. Jeśli piszę `Wykonaj MC-SIRK Issue #X` albo `Kontynuuj Issue #X`, najpierw odczytaj aktualne Issue i pracuj od jego acceptance criteria / ostatniego handoff. Nie wymagaj historii poprzedniego czatu.

Jeśli poprawka nie rozwiązała problemu i piszę `nie działa`, `nadal nie działa` lub opisuję ten sam objaw:
- nie zakładaj, że poprzednia implementacja była poprawna;
- nie zamykaj Issue;
- zapisz nieskuteczną próbę w Issue;
- kontynuuj diagnostykę od aktualnego kodu i evidence;
- sprawdź root cause zamiast nakładać kolejne workaroundy.

Kanoniczna gałąź to `main`. Nie używaj historycznych branchy i nie twórz nowych branchy bez potrzeby lub jawnego polecenia.

MC-SIRK jest osobnym projektem od nowego SIRK Agent/Portal/Central/Updater. Nie kopiuj automatycznie architektury między projektami.

MC-SIRK nie ma jeszcze pierwszego pełnego wydania produktu. Obowiązuje `docs/agent/14-Agent-Wersjonowanie-Pre1.md`.

Aktualna linia development:
`0.1.1-dev.X`

Jest to SemVer-compatible odpowiednik preferowanej konwencji użytkownika `0.1.1.X`.

Nie używaj historycznych `1.8.x` jako źródła kolejnego numeru. Nie ustawiaj, nie taguj ani nie publikuj `1.0.0+` bez jawnego release gate. `package.json` i `config.json` muszą zawsze mieć identyczną wersję.

Nie twórz automatycznie GitHub Release/tag przy zwykłym bumpie development revision.

Wydajność jest priorytetem. Przed dodaniem nowej klasy, modułu, helpera, renderera, CSS class, handlera, timera, observera lub request loop najpierw sprawdź istniejącego ownera i możliwość reuse.

Preferuj:
- `public/shared/*` dla wspólnych zachowań UI;
- jednego ownera stanu/lifecycle dla jednej odpowiedzialności;
- wspólne renderery/list/tree/toolbar/layout zamiast podobnych implementacji per moduł;
- natywne klasy MeshCentral dla standardowego wyglądu/interakcji;
- minimalny DOM churn i atomic render;
- reuse istniejącego DOM zamiast niepotrzebnego destroy/recreate;
- bounded requesty i anulowanie nieaktualnej pracy;
- brak zbędnych polling loops, timerów i observerów;
- targeted loading i targeted tests.

Nie twórz monolitycznych modułów tylko po to, aby zmniejszyć liczbę plików lub klas. Celem jest minimalna duplikacja, jasny ownership i niski koszt runtime.

Przed zmianą runtime ustal rzeczywisty łańcuch ładowania przez właściwy INDEX. Nie zakładaj, że plik o podobnej nazwie jest używany.

Przy zmianach UI zachowuj bieżące kontrakty opisane w `docs/PROJECT-STATE.md`, szczególnie shared owners, atomic render, Quick lifecycle, request guard, Classic/Modern, light/dark i trwałość aktywnego widoku.

Po zmianie:
1. uruchom targeted test;
2. dla regresji/state/security dodaj lub uruchom test negatywny/regresyjny;
3. `npm test` uruchom dla zmian runtime, loadera, shared UI, struktury, security/public contractu lub przed świadomym release;
4. sprawdź diff;
5. nie deklaruj rozwiązania, dopóki acceptance criteria nie są spełnione.

Przed zakończeniem długiego zadania lub zmianą czatu zaktualizuj odpowiednie Issue o:
- root cause / decyzję,
- wykonane zmiany,
- testy i wynik,
- commit/PR,
- problemy/ryzyka,
- dokładny next step.

Jeśli podczas implementacji odkryjesz nowy niezależny problem, nie rozszerzaj samowolnie scope bieżącego Issue. Zapisz discovered dependency i zaproponuj osobne Issue.

Odpowiadaj po polsku, konkretnie i technicznie.
