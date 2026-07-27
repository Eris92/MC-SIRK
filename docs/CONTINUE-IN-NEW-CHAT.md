# Kontynuacja SIRK Portal w nowym czacie

Ten dokument jest punktem startowym do kontynuowania projektu w nowym czacie Codex.

## Prompt do nowego czatu

```text
Kontynuuj projekt SIRK Portal z aktualnego lokalnego stanu.

Pracuj zawsze z dwoma repozytoriami:

- C:\Users\Kris\Documents\SIRK-Portal
  Kod aplikacji. Obowiązkowa gałąź robocza: develop.

- C:\Users\Kris\Documents\SIRK-Portal_Build
  Instrukcje Codex, indeks repozytorium i pamięć projektu.

Najpierw przeczytaj:

1. SIRK-Portal\AGENTS.md
2. SIRK-Portal\docs\INDEX.md
3. SIRK-Portal\docs\PROJECT-STATE.md
4. SIRK-Portal_Build\docs\memory\PROJECT_MEMORY.md
5. SIRK-Portal_Build\docs\memory\HANDOFF.md

Następnie przeczytaj tylko indeks warstwy związanej z bieżącym zadaniem.
Nie skanuj całego repozytorium, jeśli indeks zawiera potrzebne mapowanie.

Nie wykonuj ponownie promptów bootstrap.
Nie przywracaj MyCompany, aliasów, shimów ani kompatybilności wstecznej.
Nie zapisuj kodu aplikacji w SIRK-Portal_Build.
Nie zapisuj indeksu ani pamięci projektu w SIRK-Portal.

Aktualny stan aplikacji:

- wersja: 1.8.36-dev.26;
- bazowy commit kodu: 83b871b67eb82add33a1912771ebbb70924b099c;
- commit dokumentacji handoff: 2f8b6b312767e3133af59218c64a679747c54b4f;
- develop jest gałęzią roboczą;
- stable -> main, beta -> beta, dev -> develop.

Przed zmianą potwierdź aktywną gałąź, status Git i rzeczywisty łańcuch
ładowania zmienianego pliku. Zachowaj istniejące zmiany użytkownika.

Po zmianie kodu uruchom test celowany oraz npm test. Sprawdź diff i spójność
wersji w package.json, config.json, README.md, changelog.md oraz
version-history.json.

Zmiany aplikacji commituj w SIRK-Portal. Indeks i pamięć aktualizuj oraz
commituj osobno w SIRK-Portal_Build. Nie publikuj do beta ani main bez
osobnego polecenia użytkownika.

Zacznij od najnowszego zgłoszenia użytkownika i zweryfikuj je na podstawie
aktualnego UI, requestu sieciowego, odpowiedzi API i kodu runtime. Nie uznawaj
wcześniejszych poprawek za potwierdzone, jeśli nie zostały sprawdzone w
zainstalowanym środowisku.
```

## Stan wymagający dalszej weryfikacji

W środowisku użytkownika nadal należy sprawdzić:

- zapis i ponowny odczyt przełącznika Commands;
- ukrywanie wyłączonych modułów w lewym menu i Settings;
- wysokość `.sirk-device-tabs.sirk-device-tabs-standalone`;
- natychmiastową widoczność nowej wersji po publikacji;
- połączenia Desktop, Terminal i Files na rzeczywistym urządzeniu.

Każdy punkt należy rozpocząć od aktualnego zrzutu ekranu, danych z Network
oraz odpowiedzi właściwego endpointu. Test kontraktowy nie zastępuje testu
wdrożonego interfejsu.

## Najważniejsze granice projektu

- produkt: `SIRK Management Platform`;
- identyfikator pluginu: `SIRKPortal`;
- nazwa UI: `SIRK Platform`;
- dane runtime: `sirk-platform-data`;
- entrypoint: `SIRKPortal.js`;
- nowe UI ma być niezależne od starego interfejsu MeshCentral;
- urządzenia, Desktop, Terminal, Files, Commands, Software, Registry i
  Intel AMT mogą korzystać z sesji i agenta MeshCentral;
- pozostałe funkcje mają własny runtime i API SIRK Platform.

## Dokumenty źródłowe

- `AGENTS.md` — reguły pracy i polityka gałęzi;
- `docs/INDEX.md` — router indeksów;
- `docs/PROJECT-STATE.md` — potwierdzony stan aplikacji;
- `SIRK-Portal_Build/docs/memory/PROJECT_MEMORY.md` — pamięć projektu;
- `SIRK-Portal_Build/docs/memory/HANDOFF.md` — aktywny handoff.
