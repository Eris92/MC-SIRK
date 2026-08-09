# Git and release workflow

## Zasada nadrzędna

Operacje Git wykonuj świadomie na bieżącym repozytorium i aktualnej gałęzi. Nie zakładaj czystego working tree.

Dla MC-SIRK każda operacja wersji/tag/release musi dodatkowo stosować `docs/agent/14-Agent-Wersjonowanie-Pre1.md`.

## Przed zmianą Git

1. Ustal root repozytorium.
2. Sprawdź aktywną gałąź i status.
3. Rozróżnij zmiany użytkownika od zmian wykonanych w bieżącym zadaniu.
4. Nie usuwaj, nie cofaj i nie nadpisuj istniejących zmian użytkownika.

## Aktualizacja repozytorium

Przed `pull`, rebase, merge, zmianą gałęzi lub inną operacją pobierającą nowy stan:

1. wykonaj procedurę usuwania lokalnych plików z poświadczeniami testowymi z modułu `07-Agent-Konfiguracja-Sekrety.md`,
2. sprawdź ponownie status,
3. zatrzymaj się, jeżeli lokalne zmiany mogłyby zostać nadpisane,
4. wykonaj tylko metodę aktualizacji zgodną z projektem,
5. po aktualizacji ponownie sprawdź status i podstawową walidację projektu.

Automatyczne usunięcie dotyczy wyłącznie literalnych ścieżek z projektowej allowlisty plików testowych. Brak allowlisty nie upoważnia do wyszukiwania i kasowania plików po nazwie.

## Staging i commit

- Dodawaj tylko pliki należące do uzgodnionego zakresu.
- Przed stagingiem sprawdź diff i `git diff --check`.
- Nie używaj szerokiego `git add .`, jeżeli w repozytorium istnieją niepowiązane zmiany.
- Nie commituj sekretów, logów, dumpów, artefaktów tymczasowych ani lokalnej konfiguracji.
- Zakończone i zweryfikowane zmiany należące do bieżącego zadania commituj automatycznie; nie czekaj na osobne polecenie użytkownika.
- Komunikat commita ma opisywać rzeczywistą zmianę.

## Push

- Po udanym commicie wypchnij zmianę automatycznie zgodnie z projektowym workflow branch/PR; nie czekaj na osobne polecenie użytkownika.
- Nie używaj force push ani `--no-verify` bez jednoznacznego polecenia i uzasadnienia.
- Przed push sprawdź aktywną gałąź, remote, zakres commitów, wynik wymaganych testów oraz spójność wersji we wszystkich plikach metadanych objętych zmianą.
- Dla pluginu MeshCentral zawierającego jednocześnie `package.json` i pluginowy `config.json` nie wypychaj zmiany wersji, jeżeli wartości pola `version` nie są identyczne w obu plikach.
- Po push potwierdź docelową gałąź i rezultat polecenia.

## Release

MC-SIRK nie ma jeszcze pierwszego pełnego product release.

Przed jakimkolwiek tagiem/GitHub Release:

1. przeczytaj `docs/agent/14-Agent-Wersjonowanie-Pre1.md`;
2. potwierdź źródło wersji i regułę jej zmiany;
3. sprawdź spójność wersji we wszystkich wymaganych plikach;
4. uruchom wymagane testy;
5. sprawdź development/release notes;
6. nie twórz taga ani publikacji bez jawnego polecenia użytkownika;
7. nie używaj `1.0.0+` bez jawnego otwarcia release gate;
8. po publikacji zweryfikuj rzeczywisty artefakt albo wpis release.

Zwykły bump `0.1.1-dev.X` nie oznacza zgody na utworzenie taga/GitHub Release.

## Wersja pluginu MeshCentral

Przy zmianie wersji pluginu:

1. ustal root konkretnego pluginu i nie pomyl jego `config.json` z głównym `config.json` MeshCentral,
2. odczytaj bieżące pole `version` z pluginowych `package.json` i `config.json`,
3. dla MC-SIRK stosuj linię `0.1.1-dev.X`, odpowiadającą preferowanej konwencji `0.1.1.X`,
4. nie kontynuuj historycznej numeracji `1.8.x`,
5. jeżeli oba pliki istnieją, zmień `version` w obu w ramach tej samej zmiany,
6. zaktualizuj `version-history.json`, `changelog.md` i bieżący development draft, jeśli zakres obejmuje bump,
7. przed stagingiem, commitem, tagiem i push ponownie odczytaj oba źródła i potwierdź identyczną wersję,
8. zatrzymaj publikację przy rozbieżności albo niejednoznacznym źródle wersji.

Nie podnoś wersji automatycznie przy każdym zwykłym pushu. Dokumentacja-only zwykle nie wymaga bumpu.

## Konflikty

Nie rozwiązuj konfliktów mechanicznie przez wybór jednej strony. Ustal znaczenie obu zmian. Jeżeli konflikt obejmuje nieznane zmiany użytkownika lub decyzję biznesową, zatrzymaj się i poproś o kierunek.

## Zakazy

Bez jawnego polecenia nie używaj `reset --hard`, `clean`, usuwania branchy, przepisywania historii, kasowania tagów ani omijania hooków.
