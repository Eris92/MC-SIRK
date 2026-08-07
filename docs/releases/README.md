# Release notes

Aktualny release:

- [`1.8.20`](1.8.20.md) — pre-handoff cleanup, konsolidacja właścicieli runtime/UI, atomic render, wspólny Collapse, uproszczenie Quick i finalna walidacja.

Pozostałe historyczne release notes znajdują się w tym katalogu jako osobne pliki `X.Y.Z.md`.

Przy zmianie `config.json` / `package.json`:

1. dodaj plik release notes dla nowej wersji;
2. aktualizuj `docs/PROJECT-STATE.md`, jeżeli zmienia się architektura lub stan projektu;
3. aktualizuj root `changelog.md` i `version-history.json`, jeżeli wersja jest publikowana przez repozytorium;
4. uruchom pełne `npm test`.

Nie rekonstruuj brakujących historycznych wersji na podstawie przypuszczeń.
