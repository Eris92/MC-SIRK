# Documentation and state records

## Cel

Dokumentacja opisuje potwierdzony stan, sposob uzycia i istotne decyzje. Nie zastepuje weryfikacji.

## Zasada

Nie aktualizuj dokumentacji mechanicznie przy kazdym fixie ani tylko dlatego, ze zmienil sie kod wewnetrzny.

Aktualizacja dokumentacji jest wymagana tylko wtedy, gdy co najmniej jeden z ponizszych warunkow jest prawdziwy:

- zmienia sie public behavior lub user/operator workflow;
- zmienia sie architecture, public/internal contract istotny dla innych komponentow albo ownership;
- zmienia sie instalacja, konfiguracja, build/test/release/deployment procedure opisana w docs;
- istniejaca dokumentacja stalaby sie bledna lub mylaca;
- Issue/acceptance criteria jawnie wymagaja aktualizacji dokumentacji.

Internal bugfix, targeted refactor albo implementacyjna zmiana bez wplywu na opisany kontrakt nie wymaga docs update.

## Indeksy

Nowa dokumentacja musi byc osiagalna z `docs/INDEX.md` albo z lokalnego `INDEX.md` wlasciwej warstwy.

Aktualizuj indeks warstwy tylko wtedy, gdy zmienia sie struktura, entrypoint, ownership, loader albo routing potrzebny do odnalezienia kodu. Nie aktualizuj indeksu dla zwyklej zmiany wewnatrz istniejacego ownera.

`docs/REPOSITORY-LAYOUT.md` aktualizuj tylko po zmianie architektury/layoutu. `docs/PROJECT-STATE.md` aktualizuj tylko wtedy, gdy rzeczywiscie zmienil sie stan projektu, ograniczenie albo capability istotne dla operatora/developera.

Nie duplikuj pelnej tresci miedzy indeksami. Indeks ma kierowac do najmniejszego potrzebnego zakresu, a nie zawierac kopie calego repozytorium.

## Potwierdzony stan

Dla informacji zależnych od srodowiska zapisuj zrodlo, wersje, date i status `verified`, `unverified`, `obsolete` albo `unknown`, gdy ma to znaczenie. Nie przedstawiaj przypuszczen jako faktow.

## Sekrety

Nie zapisuj hasel, tokenow, kluczy, cookies, danych sesji ani pelnych connection strings. Przyklady uzywaja placeholderow.

## Kontrola jakosci

Po rzeczywistej zmianie dokumentacji sprawdz tylko zmieniony zakres: linki i nazwy plikow, sciezki i komendy, wersje oraz zgodnosc z aktualnym layoutem/behavior. Nie uruchamiaj szerokiej walidacji docs, jezeli targeted check wystarcza.
