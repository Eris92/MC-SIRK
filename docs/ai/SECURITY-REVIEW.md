# Security review CI — Issue #456

Workflow: `.github/workflows/test.yml`, job/check `security-review`.
Issue: https://github.com/Eris92/MC-SIRK/issues/456

Job działa dla każdego `pull_request`, także z forka, na dokładnym SHA head.
Checkout nie zapisuje credentials; job ma tylko `contents: read`.
SHA base pochodzi z eventu i jest dostępne dzięki pełnej historii checkout.
`workflow_dispatch` sprawdza sekrety i regresje, porównując kod z bieżącym SHA.
Istniejące joby zachowują swoje warunki i kroki; checkout również nie zapisuje credentials.

`node scripts/security-review.js` skanuje pliki śledzone oraz nieignorowane nowe
pliki poza `test/`. Wykrywa wzorce tokenów GitHub, kluczy prywatnych, AWS access
key ID i długich literalnych przypisań credentials; raportuje ścieżkę i numer
linii bez wartości sekretu. Nie skanuje historii Git ani plików ignorowanych.
Fixture sekretów wolno umieszczać tylko w `test/`.

Dla `server/` skaner odrzuca nowe linie z `eval`, konstruktorem `Function`,
`child_process` lub wywołaniami exec/spawn/fork, także w istniejących ownerach.
Lokalna baza to HEAD; CI używa `SECURITY_REVIEW_BASE` (SHA base PR).
Nie ma automatycznego wyjątku dla deklarowanej walidacji wejścia. To konserwatywna
kontrola tekstowa, nie parser JS ani analiza przepływu danych: aliasy, składnia
wieloliniowa i inne formy obfuskacji wymagają przeglądu człowieka; możliwe są też
fałszywe alarmy. Brak bazy lub błąd Git powoduje niepowodzenie kontroli.

Job uruchamia pełne `npm test`, obejmujące `test/security.test.js` i wszystkie
regresje `.test.js`. `npm audit --omit=dev --audit-level=high` nie ma zastosowania:
package.json nie deklaruje zależności runtime, repo nie ma lockfile. Job nie
potrzebuje instalowania pakietów ani dostępu do registry.

## Lokalny handoff dla kontrolera

Zmiany: workflow, `scripts/security-review.js`, `test/security-review.test.js`,
ten dokument. Bez zmian runtime i wersji pluginu. Gałąź: `ai/issue-456`.

Wykonane polecenia i rzeczywiste wyniki:

- `node test/security-review.test.js` — exit 0:
  `Security review regression tests: OK (secrets, tracked/untracked execution, redaction, fail-closed base, PR contract)`.
  Fixture w tymczasowym repo potwierdzają odmowę dla tokenu i private key poza
  testami, plików śledzonych i nowych, nowych prymitywów wykonania oraz zmian
  istniejącego ownera. Testy nie tworzą commitów.
- `node scripts/security-review.js` — exit 0: `Security static review: OK`.
- `node scripts/validate-repository-layout.js` — exit 0; m.in.
  `Final repository layout validation: OK`, `Single maintained workflow validation: OK`.
- `git diff --check` — exit 0, brak wyjścia.
- `node scripts/ai/quiet-run.mjs -- node scripts/run-tests.js` — exit 1:
  `FAIL node exit=1`; logi tego uruchomienia puste. Bez uznawania tego za sukces.
- `npm test` — exit 1; walidatory i poprzedzające testy (w tym nowe regresje)
  przeszły, następnie `Error: listen EPERM: operation not permitted 127.0.0.1`.
- `node test/security.test.js` — exit 1 z tym samym `listen EPERM`:
  sandbox nie pozwala na wymagany lokalny listener.
- `node scripts/ai/test-tools.mjs` — exit 1:
  `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: 2 !== 0`
  w linii 18 (wynik locatora w fixture). Nie zmieniano tych narzędzi.

Windows smoke nie uruchomiono: środowisko Linux bez `pwsh` i Windows Shell.
Status checka na GitHub, zgodność z aktualnym zdalnym main oraz pełny sukces
jobów test/Windows pozostają do potwierdzenia przez zaufane CI. Brak sieci;
nie utworzono commita, PR ani komentarza Issue zgodnie z instrukcją wykonawczą.
Kontroler powinien utworzyć draft PR z linkiem `Refs #456` i przenieść ten handoff
do PR i Issue. Nie scalać: wymagane są QA/security review managera oraz zgoda
właściciela związana z dokładnym SHA. Sam zielony skaner nie zastępuje tej zgody.
