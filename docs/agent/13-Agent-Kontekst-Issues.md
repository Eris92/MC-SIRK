# Kontekst i GitHub Issues MC-SIRK

## Cel

GitHub Issue ma być samodzielnym task packetem. Nowy czat lub agent powinien móc rozpocząć albo kontynuować pracę na podstawie numeru Issue bez odtwarzania historii rozmowy.

## Start zadania

1. Przeczytaj root `AGENTS.md`.
2. Przeczytaj `docs/INDEX.md`.
3. Jeśli podano Issue, przeczytaj body i ostatnie komentarze/handoff.
4. Wybierz tylko jedną właściwą warstwę przez INDEX.
5. Odczytaj entrypoint, bezpośrednie zależności i targeted tests.
6. Rozszerz zakres dopiero, gdy bieżący kontekst jest niewystarczający.

## Bounded first pass

Pierwszy pass powinien zwykle obejmować:

- `AGENTS.md`;
- `docs/INDEX.md`;
- jedno Issue;
- jeden właściwy INDEX warstwy;
- kilka bezpośrednich plików implementacji/testów.

Nie czytaj całego `public/`, `server/`, `test/` ani wszystkich docs tylko po to, by „poznać projekt”.

## Issue jako stan pracy

W Issue przechowuj:

- Goal i acceptance criteria;
- potwierdzony root cause lub decyzję;
- wykonane próby, szczególnie nieskuteczne;
- zmienione pliki/contracty;
- commit/PR, jeśli istnieje;
- wykonane testy i wyniki;
- nierozwiązane ryzyka/blockery;
- dokładny next step.

Nie zapisuj tam sekretów, credentials, tokenów ani realnych danych klientów.

## Gdy poprawka nie działa

Nie zamykaj Issue i nie zakładaj, że poprzednia implementacja była poprawna.

Zapisz:

- obserwowany objaw po zmianie;
- co zostało już sprawdzone;
- dlaczego acceptance criteria nadal nie są spełnione;
- następną hipotezę lub krok diagnostyczny.

## Scope

Jedno Issue powinno prowadzić do jednego logicznego, testowalnego rezultatu.

Nowy niezależny problem odkryty przy okazji:

- nie rozszerza automatycznie scope;
- może zostać zapisany jako discovered dependency;
- powinien dostać osobne Issue, jeśli ma własny rezultat i testy.

Nie dziel sztucznie jednego atomic contractu, jeśli wymaga wspólnej zmiany kilku bezpośrednich elementów.

## Handoff przed zmianą czatu

Przed zakończeniem długiej sesji zapisz w Issue krótkie podsumowanie:

```text
Status:
Root cause / decision:
Changed:
Tests:
Still failing / risks:
Next step:
Commit / PR:
```

Nowy czat powinien móc zacząć od:

```text
Kontynuuj MC-SIRK Issue #XX.
Odczytaj aktualny Issue i repo main, a następnie kontynuuj od ostatniego handoff.
```

## Zamknięcie

Issue można uznać za rozwiązane dopiero, gdy acceptance criteria są spełnione i wykonano wymagane targeted/full tests.
