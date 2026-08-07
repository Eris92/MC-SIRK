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
- `docs/PROJECT-STATE.md` opisuje aktualny stan architektury.
- GitHub Issues w tym repo są kanonicznymi task packetami i stanem aktywnych zadań.
- Agenci mają działać index-first i minimalizować ilość odczytywanego kontekstu.
- Preferowany jest reuse istniejących ownerów/shared UI zamiast duplikacji kodu, klas CSS, handlerów i observerów.
- MC-SIRK jest osobnym projektem od wielorepozytoryjnego SIRK Agent/Portal/Central/Updater; architektury nie należy kopiować automatycznie między projektami.
- MC-SIRK nie ma jeszcze pierwszego pełnego product release.
- Aktualna linia development to `0.1.1-dev.X`, będąca SemVer-compatible odpowiednikiem preferowanej konwencji `0.1.1.X`.
- `1.0.0` jest zarezerwowane dla pierwszego świadomie zaakceptowanego kompletnego produktu i wymaga jawnego release gate.
- Historyczne `1.8.x` są wewnętrznymi snapshotami developmentu i nie są źródłem kolejnej numeracji.

## Aktualizacja

Dodawaj wpis tylko wtedy, gdy decyzja ma pozostać prawdziwa po zamknięciu bieżącego Issue.
