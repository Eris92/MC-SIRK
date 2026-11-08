# Issue #458 — weryfikacja w sandboxie

## Baza i zakres

- Weryfikacja: 2026-11-08, Node.js v22.23.4, Linux, bez dostępu do sieci.
- Czysty checkout przed testami: `ai/issue-458`; HEAD, lokalne `main` i
  `origin/main` wskazują `b62989abfb87138cd3c63534e464189dfec79a46`.
- Ta baza nie zawiera merge #456/#457. Lokalny workflow ma `test` oraz
  `windows-interactive-shell-smoke`, ale nie ma `security-review`.
  Wbrew historycznemu opisowi Issue już uruchamia `scripts/ai/test-tools.mjs`.
- Nie można potwierdzić aktualnego zdalnego `main` ani spełnienia zależności
  od #456. Raport dotyczy wyłącznie dostępnej lokalnej bazy.

## Odtworzenie i przyczyna

`node scripts/ai/test-tools.mjs` — exit 1:

```text
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
2 !== 0
at .../scripts/ai/test-tools.mjs:18:9
```

Tymczasowa kopia diagnostyczna w `/tmp` zachowała katalog root oryginału
i wypisała wynik `located` bezpośrednio przed niezmienioną asercją:

```text
error: Error: spawnSync /home/kris/.local/opt/node-v22.23.4-linux-x64/bin/node EPERM
code: 'EPERM'
status: 2
signal: null
stdout: ''
stderr: ''
```

To błąd uruchomienia procesu potomnego zgłoszony przez sandbox, a nie dowód
niepoprawnego wyniku wyszukiwania fixture. Test pokazuje tylko pusty stderr,
więc pierwotny komunikat asercji nie ujawnia `located.error`.
Niezależna minimalna reprodukcja, bez locatora i fixture:

```bash
node --input-type=module - <<'JS'
import {spawnSync} from 'node:child_process';
const r=spawnSync(process.execPath,['-e','process.exit(0)'],{encoding:'utf8',timeout:12000});
console.log(JSON.stringify({error:r.error?.code,status:r.status,signal:r.signal,stdout:r.stdout,stderr:r.stderr}));
process.exitCode=r.error || r.status !== 0 ? 1 : 0;
JS
```

Exit 1, dokładny stdout:

```json
{"error":"EPERM","status":0,"signal":null,"stdout":"","stderr":""}
```

Sam status nie wystarcza do oceny wykonania w tym środowisku: nawet minimalna
reprodukcja ze statusem 0 zawiera błąd uruchomienia. Zgodnie z alternatywą
acceptance criteria dla ograniczenia sandboxa nie zmieniono kodu, fixture
ani asercji. Nie dodano testu obchodzącego ograniczenia środowiska.
Nie ustalono przyczyny historycznego uruchomienia pracownika #456 poza tym
sandboxem.

## Pozostałe wykonane testy

- `npm test` — exit 1. Początek: `Final repository layout validation: OK`;
  dalsze kontrole wypisywały `OK`, następnie:

  ```text
  Error: listen EPERM: operation not permitted 127.0.0.1
      at Server.setupListenHandle [as _listen2] (node:net:1919:21)
  ```

- `node scripts/ai/quiet-run.mjs -- npm test` — exit 1,
  `FAIL npm exit=1`; oba surowe logi puste.
- `node scripts/ai/quiet-run.mjs -- node scripts/run-tests.js` — exit 1,
  `FAIL node exit=1`; oba surowe logi puste.

Puste logi wrappera nie oznaczają sukcesu. Bezpośredni `npm test` dostarczył
powyższy błąd ograniczenia nasłuchu. Nie potwierdzono pełnego przejścia testów.

## Handoff dla kontrolera / review

Jedyna zmiana: `scripts/ai/issue-458-verification.md`. Bez zmian runtime,
wersji, testów i polityki bezpieczeństwa. Nie wykonano commit/push/gh,
nie utworzono PR ani nie zapisano komentarza w Issue.

Kontroler powinien najpierw zapewnić bazę po merge #456, następnie uruchomić
`node scripts/ai/test-tools.mjs` i `npm test` poza ograniczeniami tego sandboxa.
W draft PR powiązanym przez `Refs #458` oraz w Issue należy przekazać ten
raport. Checki `test`, `windows-interactive-shell-smoke`, `security-review`
i niezależna ocena managera pozostają niezweryfikowane; bez merge i bez
zamykania Issue na podstawie tego raportu.
