# Indeks repozytorium MC-SIRK

Ten plik jest drugim krokiem po root `AGENTS.md`. Służy do wyboru najmniejszego zakresu odczytu.

## Indeksy warstw

| Zadanie | Najpierw przeczytaj |
|---|---|
| backend, storage, API, integracje, permissions | `server/INDEX.md` |
| natywny UI MeshCentral, shared UI, renderery | `public/INDEX.md` |
| panel administracyjny | `web/INDEX.md` |
| walidatory, build, kontrola struktury | `scripts/INDEX.md` |
| wybór testu lub analiza regresji | `test/INDEX.md` |
| architektura katalogów i loaderów | `docs/REPOSITORY-LAYOUT.md` |
| bieżący stan i ograniczenia | `docs/PROJECT-STATE.md` |
| release/development notes | `docs/releases/README.md` |
| SMSAPI, Voice SMS i operacje kont Active Directory | `docs/SMSAPI-AD.md` |
| SMTP Relay, treść e-mail i bezpieczne załączniki | `docs/SMTP-RELAY.md` |
| wersja, bump, tag, release | `docs/agent/14-Agent-Wersjonowanie-Pre1.md` |
| reguły runtime/pluginu | `docs/agent/10-Agent-MeshCentral-Plugin.md`, `docs/agent/11-Agent-SIRK-Portal.md` |
| wydajność, reuse, duplikacja | `docs/agent/12-Agent-Wydajnosc-Reuse.md` |
| GitHub Issue / kontynuacja nowego czatu | `docs/agent/13-Agent-Kontekst-Issues.md` |
| trwałe decyzje projektu | `docs/memory/PROJECT_MEMORY.md` |

## Reguła selektywnego odczytu

1. Wybierz dokładnie jeden indeks główny odpowiadający zadaniu.
2. Jeśli zadanie pochodzi z Issue, przeczytaj Issue przed kodem.
3. Odczytaj wskazany entrypoint lub owner.
4. Przejdź tylko po bezpośrednich importach, mapach assetów, route'ach i testach związanych z tym elementem.
5. Nie czytaj równolegle backendu, frontendu, panelu admina i wszystkich testów, jeśli zadanie dotyczy jednej warstwy.
6. Pełne wyszukiwanie repozytorium jest wyjątkiem dla rename, audytu bezpieczeństwa, zmiany publicznego API albo potwierdzonego braku mapowania w indeksach.

## Dokumenty kanoniczne

- router instrukcji: `AGENTS.md`;
- nazwy i struktura: `docs/REPOSITORY-LAYOUT.md`;
- bieżący stan architektury: `docs/PROJECT-STATE.md`;
- polityka pre-1.0: `docs/agent/14-Agent-Wersjonowanie-Pre1.md`;
- trwała pamięć decyzji: `docs/memory/PROJECT_MEMORY.md`;
- development/release notes: `docs/releases/`;
- task state: GitHub Issues w `Eris92/MC-SIRK`.

Dokument nieujęty w tym indeksie nie powinien być czytany automatycznie tylko dlatego, że znajduje się w `docs/`.
