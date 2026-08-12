# Indeks repozytorium MC-SIRK

Ten plik jest drugim i ostatnim obowiązkowym routerem po root `AGENTS.md`.

## Wybierz jedna warstwe

| Zadanie | Najpierw przeczytaj |
|---|---|
| backend, storage, API, integracje, permissions | `server/INDEX.md` |
| native UI MeshCentral, shared UI, renderery | `public/INDEX.md` |
| panel administracyjny | `web/INDEX.md` |
| walidatory/build/struktura | `scripts/INDEX.md` |
| test/regresja | `test/INDEX.md` |

Po wyborze warstwy czytaj tylko wskazany entrypoint/owner, bezposrednie zaleznosci i targeted tests.

## Dokumenty opcjonalne

Otwieraj tylko, gdy task ich wymaga:

| Potrzeba | Dokument |
|---|---|
| layout/loader architektury | `docs/REPOSITORY-LAYOUT.md` |
| biezacy stan/ograniczenia | `docs/PROJECT-STATE.md` |
| release/development notes | `docs/releases/README.md` |
| runtime/plugin MeshCentral | `docs/agent/10-Agent-MeshCentral-Plugin.md`, `docs/agent/11-Agent-SIRK-Portal.md` |
| performance/reuse | `docs/agent/12-Agent-Wydajnosc-Reuse.md` |
| Issue/handoff | `docs/agent/13-Agent-Kontekst-Issues.md` |
| version/release | `docs/agent/14-Agent-Wersjonowanie-Pre1.md` |
| trwale decyzje | `docs/memory/PROJECT_MEMORY.md` lub najwezszy wskazany plik memory |

Nie otwieraj dokumentu tylko dlatego, ze znajduje sie w `docs/`.

## Regula eskalacji

1. task/Issue;
2. `AGENTS.md` + ten indeks;
3. jeden INDEX warstwy;
4. entrypoint/owner;
5. bezposrednie dependencies/tests;
6. dopiero po braku evidence rozszerz search o jeden poziom.

Pelny scan repo jest wyjatkiem dla rename, security audit, public API/contract albo potwierdzonego braku mapowania.

## Context/output

Nie czytaj ponownie niezmienionych plikow w tej samej sesji. Zawężaj `rg`, diff, logi, test output i API/JSON do danych potrzebnych dla aktualnej hipotezy. Duze tool outputs sa kosztem kontekstu tak samo jak duze dokumenty.
