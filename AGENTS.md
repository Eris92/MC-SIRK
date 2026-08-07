# AGENTS.md — router instrukcji MC-SIRK

## Cel

To repozytorium jest jedynym źródłem kodu, instrukcji agentów, indeksów technicznych i GitHub Issues dla projektu MC-SIRK / SIRK Management Platform jako natywnego pluginu MeshCentral.

Kanoniczna gałąź: `main`.

Nie zakładaj istnienia `develop`, `beta` ani innej linii roboczej. Nowe zadania rozpoczynaj od aktualnego `main`, chyba że użytkownik jawnie poleci inaczej.

## Język

- Komunikuj się z użytkownikiem po polsku.
- Kod i standardową nomenklaturę techniczną zapisuj zgodnie z konwencją projektu.

## Obowiązkowy start — index first

Nie skanuj całego repozytorium na początku zadania.

1. Potwierdź repo `Eris92/MC-SIRK`, branch `main` i bieżący stan Git.
2. Przeczytaj ten plik.
3. Przeczytaj `docs/INDEX.md`.
4. Jeśli zadanie pochodzi z GitHub Issue, przeczytaj Issue jako aktualny task packet.
5. Otwórz dokładnie jeden indeks warstwy związanej z zadaniem:
   - backend/API/storage/integracje: `server/INDEX.md`;
   - native UI/shared UI/renderery: `public/INDEX.md`;
   - panel administracyjny: `web/INDEX.md`;
   - build/walidatory: `scripts/INDEX.md`;
   - testy/regresje: `test/INDEX.md`.
6. Czytaj tylko wskazany entrypoint, jego bezpośrednie zależności i targeted tests.
7. Rozszerz zakres dopiero, gdy indeks lub bezpośrednia analiza nie wystarcza.

Nie pobieraj całego drzewa, całej historii Git, wszystkich docs ani wszystkich testów „na zapas”.

## Moduły instrukcji

Zawsze stosuj:

- `docs/agent/00-Agent-Core.md`
- `docs/agent/01-Agent-Tryby.md`
- `docs/agent/03-Agent-Jakosc-Bezpieczenstwo.md`
- `docs/agent/12-Agent-Wydajnosc-Reuse.md`
- `docs/agent/13-Agent-Kontekst-Issues.md`
- `docs/agent/14-Agent-Wersjonowanie-Pre1.md`

Dobieraj tylko potrzebne moduły:

| Zakres | Moduł |
|---|---|
| automatyzacja, wersjonowanie, skrypty | `docs/agent/02-Agent-Automation.md` |
| testy i weryfikacja | `docs/agent/04-Agent-Testy-Weryfikacja.md` |
| Git, commit, push, release | `docs/agent/05-Agent-Git-Release.md` |
| dokumentacja i stan | `docs/agent/06-Agent-Dokumentacja-Stanu.md` |
| konfiguracja i sekrety | `docs/agent/07-Agent-Konfiguracja-Sekrety.md` |
| zależności | `docs/agent/08-Agent-Zaleznosci-Aktualizacje.md` |
| logi i diagnostyka | `docs/agent/09-Agent-Logi-Diagnostyka.md` |
| plugin MeshCentral | `docs/agent/10-Agent-MeshCentral-Plugin.md` |
| każda zmiana runtime MC-SIRK | `docs/agent/11-Agent-SIRK-Portal.md` |
| PowerShell | `docs/agent/20-Agent-PowerShell.md` |
| JavaScript | `docs/agent/21-Agent-JavaScript.md` |
| Python | `docs/agent/22-Agent-Python.md` |
| Windows | `docs/agent/30-Agent-Windows.md` |
| Linux | `docs/agent/31-Agent-Linux.md` |
| Infrastructure/CI/CD | `docs/agent/40-Agent-Infrastructure.md` |
| Security | `docs/agent/41-Agent-Security.md` |

## Kanoniczne nazwy i granice

- repozytorium: `MC-SIRK`;
- techniczna nazwa pluginu: `SIRKPortal`;
- produkt: `SIRK Management Platform`;
- skrót: `SIRK Platform`;
- entrypoint pluginu: `SIRKPortal.js`;
- dane runtime: `meshcentral-data/sirk-platform-data`;
- owner stanu projektu: `docs/PROJECT-STATE.md`.

MC-SIRK jest odrębnym projektem od wielorepozytoryjnego SIRK Agent/Portal/Central/Updater. Architektury nie kopiuj automatycznie między projektami. Oba projekty pozostają jednak przed pierwszym pełnym wydaniem i `1.0.0` jest w MC-SIRK zablokowane zgodnie z lokalną polityką `docs/agent/14-Agent-Wersjonowanie-Pre1.md`.

Nie przywracaj historycznych aliasów, shimów, `MyCompany`, starych loaderów ani `mycompany-data`, chyba że użytkownik jawnie zleci audyt historyczny.

## Wersjonowanie — twarda reguła

MC-SIRK nie ma jeszcze pierwszego product release.

- aktualna linia development: `0.1.1-dev.X`;
- odpowiada ona preferowanej konwencji użytkownika `0.1.1.X`;
- `package.json` i `config.json` muszą mieć identyczną wersję;
- historyczne `1.8.x` są wewnętrznymi snapshotami developmentu i nie są źródłem kolejnego numeru;
- nie twórz nowych `1.x`, `2.x`, `3.x` ani `1.0.0` bez jawnego otwarcia release gate przez użytkownika;
- nie twórz automatycznie tagu/GitHub Release przy zwykłym bumpie development revision.

## GitHub Issues jako stan zadania

Issues w `Eris92/MC-SIRK` są kanonicznym backlogiem i task packetami.

Przy pracy z Issue:

- wykonuj acceptance criteria, a nie historię poprzedniego czatu;
- zapisuj w Issue istotny handoff: root cause/decision, zmienione pliki, commit/PR, testy, nierozwiązane problemy i dokładny next step;
- jeśli poprawka nie działa, nie zamykaj Issue; zapisz nieudaną próbę i kontynuuj diagnostykę;
- niezależny problem odkryty podczas pracy nie powinien bez potrzeby rozszerzać scope — zaproponuj osobne Issue;
- nowy czat ma móc kontynuować zadanie po samym numerze Issue.

## Wydajność i reuse

MC-SIRK ma być szybki i mały.

Przed dodaniem nowej klasy/modułu/helpera/renderera/CSS class/event handlera/timera/observera/request loop sprawdź, czy istniejący owner może zostać użyty lub rozszerzony.

Preferuj:

- jeden owner stanu dla jednej odpowiedzialności;
- współdzielone `public/shared/*` zamiast prawie identycznych implementacji per moduł;
- wspólny renderer/toolbar/layout/list contract tam, gdzie semantyka jest ta sama;
- CSS pluginu głównie dla geometrii, a natywne klasy MeshCentral dla standardowego wyglądu/interakcji;
- minimalny DOM churn, brak zbędnego remount/reinit;
- bounded requesty, brak niekontrolowanego polling i timeoutów;
- targeted loading i targeted tests.

Nie twórz monolitów tylko po to, aby zmniejszyć liczbę plików lub klas. Celem jest minimalna duplikacja przy jasnym ownership i niskim koszcie runtime.

## Obowiązkowa kontrola runtime

Przed zmianą runtime:

1. znajdź rzeczywisty entrypoint/loader przez właściwy `INDEX.md`;
2. potwierdź mapę assetu, route albo `require()`;
3. odczytaj bieżący owner implementacji;
4. odczytaj tylko bezpośrednich konsumentów potrzebnych do zmiany;
5. po zmianie sprawdź diff, targeted test i źródła wersji.

Nie zakładaj, że plik o podobnej nazwie jest używany przez runtime.

## Kontrakty runtime/UI

Jeśli aktualny kod ich używa, zachowaj:

- brak długich timeoutów jako podstawowego mechanizmu gotowości;
- wyłączone elementy menu niewidoczne przed zastosowaniem permissions;
- właściwy widok pokazywany jednokrotnie;
- ciężkie/aktywne widoki nie są bez potrzeby niszczone i inicjalizowane ponownie;
- iframe aktywnej sesji hosta pozostaje podłączony do DOM, gdy dany moduł używa iframe;
- aktywny host i podzakładka są przechowywane osobno;
- PL/EN i light/dark synchronizują się bez zbędnego reloadu workspace;
- shared state ma jednego właściciela, a observery są fallbackiem, nie podstawowym mechanizmem synchronizacji.

Jeśli bieżąca architektura nie używa już któregoś mechanizmu, nie implementuj go ponownie z powodu starej instrukcji — potwierdź kod i zaktualizuj dokumentację.

## Weryfikacja

Po zmianie kodu:

1. uruchom targeted test dla zmienionej funkcji;
2. dla security/state/lifecycle dodaj test negatywny lub regresyjny;
3. uruchom `npm test`, gdy zmiana dotyczy runtime, loadera, wspólnego UI, struktury lub publicznego contractu;
4. sprawdź `package.json`, `config.json`, `README.md`, `changelog.md` i `version-history.json`, jeśli zmiana obejmuje release/version;
5. sprawdź diff i zakres zmienionych plików;
6. nie deklaruj rozwiązania Issue bez spełnienia acceptance criteria.

Zmiana wyłącznie dokumentacji nie wymaga bumpu wersji, chyba że użytkownik jawnie go zleci.

## Prompty jednorazowe

- `docs/agent/Prompt-Bootstrap-Automation.md`
- `docs/agent/Prompt-Bootstrap-MeshCentral-Architecture.md`

Nie stosuj ich automatycznie przy każdym zadaniu.
