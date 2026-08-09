# Jednorazowe wdrożenie Automation-first workflow

Przeanalizuj bieżące repozytorium i wdroż Automation-first workflow.

To jest zadanie jednorazowe. Nie wykonuj go automatycznie przy każdym kolejnym zadaniu.

## Cel

Powtarzalne, deterministyczne operacje mają być wykonywane przez Skills i parametryzowane skrypty PowerShell zamiast przez ponowną analizę całego repozytorium.

Nie usuwaj ani nie nadpisuj istniejących instrukcji, działających skryptów, Skills ani funkcji.

## Najpierw rozpoznaj repozytorium

1. Znajdź właściwy `AGENTS.md`.
2. Sprawdź `.agents/skills`.
3. Sprawdź istniejące katalogi skryptów, w tym `tools`, `scripts` i `tools/codex`.
4. Sprawdź technologie używane w repozytorium.
5. Sprawdź istniejące komendy build, test, lint, version i publish.
6. Nie wykonuj pełnego skanowania plików, których nie potrzebujesz.
7. Nie twórz automatyzacji niezwiązanych z technologią projektu.

## Struktura

Domyślnie użyj:

```text
.agents/
└── skills/
    └── <skill-name>/
        ├── SKILL.md
        └── scripts/
            └── <Verb-Noun>.ps1
```

Dla skryptów współdzielonych przez wiele Skills można użyć:

```text
tools/
└── codex/
    └── <Verb-Noun>.ps1
```

Jeżeli repozytorium posiada własną poprawną strukturę, zachowaj ją.

## Aktualizacja AGENTS.md

Nie nadpisuj istniejącego pliku.

Dodaj albo uzupełnij zwięzłą sekcję `Automation-first workflow`, zawierającą co najmniej:

1. Najpierw użyj istniejącego Skill lub skryptu.
2. Nie analizuj całego repozytorium dla prostych operacji.
3. Nie duplikuj istniejącej automatyzacji.
4. Twórz nową automatyzację po wykonaniu zadania, gdy procedura jest cykliczna lub została użyta ponownie.
5. Wszystkie wartości zależne od środowiska przekazuj jako parametry.
6. Nie zapisuj sekretów w kodzie.
7. Operacje zmieniające stan powinny obsługiwać `-WhatIf`, gdy jest to praktyczne.
8. Skrypt ma samodzielnie zweryfikować rezultat.
9. Codex ma interpretować kod wyjścia.
10. Nie poprawiaj przy okazji niezwiązanych plików.

Jeżeli projekt korzysta z osobnego modułu instrukcji Automation, dodaj do `AGENTS.md` tylko wskazanie, kiedy należy go przeczytać.

## Standard Skill

Każdy `SKILL.md` ma zawierać front matter:

```yaml
---
name: <skill-name>
description: <zwięzły opis wskazujący, kiedy Skill powinien i kiedy nie powinien zostać użyty>
---
```

oraz:

- kiedy używać,
- kiedy nie używać,
- ścieżkę i polecenie uruchomienia,
- parametry,
- format wyniku,
- kody wyjścia,
- ograniczenia bezpieczeństwa,
- przykłady.

## Standard PowerShell

Każdy nowy skrypt ma:

- używać `[CmdletBinding()]`,
- mieć jawny `param()`,
- działać w PowerShell 7,
- jeżeli praktyczne, działać również w Windows PowerShell 5.1,
- walidować wejście,
- używać `$ErrorActionPreference = 'Stop'`,
- nie ukrywać błędów,
- działać idempotentnie, gdy jest to możliwe,
- poprawnie obsługiwać ścieżki ze spacjami,
- używać `-LiteralPath`, gdy wildcard nie jest potrzebny,
- zawierać comment-based help,
- zwracać jeden wynik JSON albo obiekt,
- zwracać jednoznaczny kod wyjścia,
- niezależnie weryfikować stan po operacji,
- obsługiwać `SupportsShouldProcess`, gdy zmienia stan.

## Kandydaci na podstawowe automatyzacje

Utwórz tylko te Skills i skrypty, które są rzeczywiście przydatne w bieżącym repozytorium i nie mają już odpowiednika.

### Odczyt logów

Przykład:

```text
read-log
Get-LogTail.ps1
```

Wymagania:

- parametry `Path`, `Lines`, opcjonalnie `Encoding`, `Follow`, `Match`, `ErrorOnly`,
- nie ładuj całego dużego pliku do pamięci,
- nie modyfikuj logu,
- zwróć ścieżkę i liczbę odczytanych linii.

### Restart i weryfikacja usługi Windows

Twórz tylko dla projektu zarządzającego usługami Windows.

Przykład:

```text
restart-windows-service
Restart-VerifiedService.ps1
```

Wymagania:

- parametry `ServiceName`, `TimeoutSeconds`, opcjonalnie `StartupDelaySeconds`,
- `SupportsShouldProcess`,
- weryfikacja stanu po restarcie,
- sukces dopiero po potwierdzeniu stanu.

### Sprawdzanie wersji projektu

Twórz, gdy wersja występuje w kilku plikach albo istnieje ustalony kontrakt wersjonowania.

Przykład:

```text
check-project-version
Test-ProjectVersion.ps1
```

### Podnoszenie wersji

Twórz, gdy projekt posiada powtarzalny mechanizm wersjonowania.

Przykład:

```text
update-project-version
Update-ProjectVersion.ps1
```

Nie formatuj całych plików bez potrzeby. Zakończone i zweryfikowane zmiany w zakresie zadania commituj i wypychaj automatycznie zgodnie z projektowym workflow branch/PR.

### Publikacja Git

Twórz dla repozytorium Git, jeżeli użytkownik rzeczywiście wykonuje tę procedurę cyklicznie.

Przykład:

```text
git-publish
Publish-GitChanges.ps1
```

Wymagania:

- `git status --short`,
- usunięcie lokalnych plików testowych sekretów dokładnie według `07-Agent-Konfiguracja-Sekrety.md`, jeżeli ten moduł jest używany w projekcie,
- `git diff --check`,
- jawna lista plików albo świadoma decyzja o zakresie,
- automatyczny commit i push po pozytywnej walidacji zakresu,
- brak force push,
- sprawdzanie `$LASTEXITCODE`.

### Walidacja projektu

Rozważ jeden skrypt uruchamiający istniejące, potwierdzone komendy:

```text
test-project
Invoke-ProjectValidation.ps1
```

Nie wymyślaj nowych testów, jeżeli projekt posiada własne komendy. Skrypt ma wywoływać ustalony build, lint i targeted tests.

## Weryfikacja wdrożenia

Po utworzeniu lub zmianie plików:

1. Sprawdź składnię wszystkich skryptów parserem PowerShell.
2. Uruchom bezpieczne testy lub `-WhatIf`.
3. Sprawdź najważniejsze błędy wejścia.
4. Sprawdź, czy każdy Skill wskazuje istniejący skrypt.
5. Sprawdź poprawność przykładów.
6. Nie restartuj prawdziwych usług.
7. Nie wykonuj `git push` w jednorazowym dry-runie bootstrapu; po zakończeniu właściwego zadania zastosuj stałą regułę automatycznego commit i push.
8. Nie zmieniaj produkcyjnej konfiguracji.
9. Sprawdź `git diff`, aby potwierdzić zakres zmian.

## Wynik

Na końcu podaj:

- listę zmienionych plików,
- listę utworzonych Skills,
- listę utworzonych skryptów,
- wyniki testów składni,
- wykonane bezpieczne testy,
- przykładowe polecenia użycia,
- elementy pominięte jako niepasujące do technologii projektu.

Nie ograniczaj się do opisu. Wprowadź uzasadnione zmiany bezpośrednio w repozytorium, ale nie wykonuj operacji produkcyjnych ani destrukcyjnych.
