# SIRK Management Platform — aktualny stan projektu

Stan dokumentacji: 2026-07-27
Bieżąca wersja: `1.8.36-dev.26`
Bieżący commit: `83b871b67eb82add33a1912771ebbb70924b099c`
Gałąź robocza: `develop`

## Punkt startowy dla nowego czatu

Projekt korzysta z dwóch lokalnych repozytoriów:

```text
C:\Users\Kris\Documents\SIRK-Portal
C:\Users\Kris\Documents\SIRK-Portal_Build
```

- `SIRK-Portal` zawiera kod aplikacji;
- `SIRK-Portal_Build` zawiera instrukcje Codex, indeks i pamięć projektu;
- kod aplikacji nie może trafiać do repozytorium Build;
- pamięć i indeks nie mogą trafiać do repozytorium aplikacji.

Nowy czat należy rozpocząć od:

```text
AGENTS.md
docs/INDEX.md
public/INDEX.md, server/INDEX.md albo innego indeksu właściwej warstwy
```

Następnie należy korzystać z indeksu i pamięci w `SIRK-Portal_Build`. Nie wolno ponownie wykonywać promptów bootstrap.

## Gałęzie i publikacja

Stan potwierdzony 2026-07-27:

```text
develop        83b871b67eb82add33a1912771ebbb70924b099c
origin/develop 83b871b67eb82add33a1912771ebbb70924b099c
origin/main    83b871b67eb82add33a1912771ebbb70924b099c
```

`develop` pozostaje obowiązkową gałęzią roboczą. Kanały aktualizacji:

```text
stable -> main
beta   -> beta
dev    -> develop
```

Nie publikować do `beta` ani `main` bez osobnego polecenia użytkownika.

## Architektura

Kanoniczny łańcuch runtime:

```text
SIRKPortal.js
  -> plugin-main-standalone.js
    -> plugin-main.js
      -> server/core/runtime-portal.js
        -> server/core/runtime.js
          -> server/modules/*
```

Warstwy:

```text
server/         backend, API, storage i integracje
public/portal/  niezależny Portal, login, Settings i workspace
public/native/  adapter MeshCentral i sesje urządzeń
public/shared/  wspólny runtime oraz komponenty UI
public/modules/ renderery modułów
web/admin/      panel administracyjny
```

Runtime używa danych w `sirk-platform-data`. Nie ma fallbacków, aliasów ani migracji `MyCompany`.

## Bieżący zakres nowego UI

Portal posiada:

- niezależny shell, login, nawigację i API;
- Overview z informacją o urządzeniach, akceptacjach, integracjach i stanie aktualizacji;
- widoki urządzeń oraz zakładki Desktop, Terminal, Commands, Files, Registry, Software i Intel AMT;
- Approvals, Automation, Monitoring, Assets, Management, Reports, Security i Settings;
- ustawienia widoczności modułów;
- osobny moduł Commands;
- sekcje Permissions przypisane do modułów;
- system aktualizacji, backupów, historii, kanałów i restartu usługi.

## Ostatnie zmiany

W wersjach `1.8.36-dev.15`–`1.8.36-dev.26`:

- dodano stan aktualizacji do Overview;
- uporządkowano trzykolumnowe Settings;
- dodano trwały zapis widoczności pozycji Portalu;
- ukryto wyłączone widoki w lewym menu i drugiej kolumnie Settings;
- przeniesiono Commands do osobnego modułu i dodano jego przełącznik w `Settings -> Moduły`;
- przeniesiono Permissions do poszczególnych modułów;
- wymuszono odczyty aktualizacji bez cache;
- zabezpieczono aktualizator przed zapętlaniem po błędzie;
- ograniczono wysokość `.sirk-device-tabs.sirk-device-tabs-standalone` do `44px`.

## Kontrakt sesji urządzeń

- iframe aktywnej sesji hosta pozostaje stale podłączony do DOM;
- przełączanie widoków nie zmienia `src` i nie przenosi iframe;
- aktywny host i podzakładka są zapisywane oddzielnie;
- Desktop, Terminal i Files nie mogą zostać zerwane przez przejście do innego widoku;
- PL/EN oraz motyw synchronizują się bez przeładowania workspace.

## Stan weryfikacji

Potwierdzone:

- `npm test` przechodzi dla commita `83b871b`;
- wersje w `package.json`, `config.json`, `README.md`, `changelog.md` i `version-history.json` są zsynchronizowane;
- `develop`, `origin/develop` i `origin/main` są zgodne.

Do weryfikacji w środowisku użytkownika:

- zapis i ponowny odczyt przełącznika Commands;
- ukrywanie wyłączonych modułów po zapisaniu Settings;
- wysokość paska `sirk-device-tabs-standalone`;
- natychmiastowa widoczność nowej wersji po publikacji;
- rzeczywiste połączenia Desktop, Terminal i Files po aktualizacji.

Nie uznawać tych punktów za rozwiązane wyłącznie na podstawie testów kontraktowych. W kolejnym czacie zaczynać od aktualnego zrzutu ekranu, żądania sieciowego i odpowiedzi API.

## Weryfikacja po zmianach

Po zmianie runtime lub UI:

```powershell
npm test
```

Następnie sprawdzić diff, spójność wersji, właściwy endpoint i rzeczywiste zachowanie w przeglądarce. Zmiany kodu publikować osobno od zmian indeksu i pamięci.
