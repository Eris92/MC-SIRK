# SIRK Management Platform 0.1.1-dev.40

**Status:** development pre-1.0 — brak pierwszego pełnego wydania produktu  
**Repozytorium:** `MC-SIRK`  
**Techniczny identyfikator pluginu MeshCentral:** `SIRKPortal`  
**Nazwa wyświetlana:** `SIRK Management Platform`  
**Nazwa skrócona:** `SIRK Platform`

SIRK Management Platform jest pluginem działającym w natywnym interfejsie MeshCentral. Zawiera backend, panel administracyjny, My Scripts, Commands, Approval Center, Device Transfers, integracje i mechanizmy wykonywania poleceń na urządzeniach.

Repozytorium nie utrzymuje kompatybilności z testową strukturą `MyCompany` ani historycznymi warstwami naprawczymi runtime/DOM.

## Wersjonowanie

Projekt nie osiągnął jeszcze `1.0.0`.

Preferowana konwencja development to `0.1.1.X`. Ponieważ npm wymaga poprawnego SemVer, repo reprezentuje tę samą rewizję jako `0.1.1-dev.X`, np. `0.1.1.42 -> 0.1.1-dev.42`.

Historyczne numery `1.8.x` były wewnętrzną numeracją developmentu i nie są podstawą kolejnych wersji. Pierwszy świadomie zaakceptowany kompletny produkt jest zarezerwowany dla `1.0.0`.

Szczegóły: [`docs/agent/14-Agent-Wersjonowanie-Pre1.md`](docs/agent/14-Agent-Wersjonowanie-Pre1.md).

## Dokumentacja kanoniczna

Zacznij od:

1. [`AGENTS.md`](AGENTS.md)
2. [`docs/INDEX.md`](docs/INDEX.md)
3. indeksu właściwej warstwy

Najważniejsze dokumenty:

- [Aktualny stan projektu](docs/PROJECT-STATE.md)
- [Struktura repozytorium](docs/REPOSITORY-LAYOUT.md)
- [Frontend index](public/INDEX.md)
- [Backend index](server/INDEX.md)
- [Admin index](web/INDEX.md)
- [Test index](test/INDEX.md)
- [Release/development notes](docs/releases/README.md)

## Instalacja / aktualizacja

Plugin jest instalowany jako natywny plugin MeshCentral. Aktywna gałąź development to `main`; `config.json` wskazuje bieżącą wersję oraz źródła aktualizacji.

Nie twórz ani nie używaj historycznych branchy `develop`/`beta` jako źródła instalacji.
