# MC-SIRK project memory

Ten plik przechowuje wyłącznie trwałe decyzje architektoniczne i fakty potrzebne pomiędzy zadaniami.

Nie zapisuj tu historii pojedynczego zadania — stan zadania, próby i handoff należą do GitHub Issue.

## Trwałe zasady

- Repozytorium: `Eris92/MC-SIRK`.
- Kanoniczna gałąź: `main`.
- Produkt: `SIRK Management Platform`, natywny plugin MeshCentral.
- Techniczna nazwa pluginu: `SIRKPortal`.
- Główny entrypoint: `SIRKPortal.js`.
- Dane runtime: `meshcentral-data/sirk-platform-data`.
- `docs/PROJECT-STATE.md` opisuje aktualny zweryfikowany stan architektury.
- GitHub Issues w tym repo są kanonicznymi task packetami i stanem aktywnych zadań.
- Agenci mają działać index-first i minimalizować ilość odczytywanego kontekstu.
- Preferowany jest reuse istniejących ownerów/shared UI zamiast duplikacji kodu, klas CSS, handlerów i observerów.
- MC-SIRK jest osobnym projektem od nowego wielorepozytoryjnego SIRK Agent/Portal/Central/Updater; nie przenosi automatycznie jego polityki wersjonowania.

## Aktualizacja

Dodawaj wpis tylko wtedy, gdy decyzja ma pozostać prawdziwa po zamknięciu bieżącego Issue.
