# Test index

Wybierz test na podstawie zmienianego kontraktu. Nie czytaj wszystkich testów przed ustaleniem obszaru.

| Obszar | Test |
|---|---|
| security | `security.test.js` |
| lokalizacja skryptów | `script-localization.test.js` |
| folder permissions | `folder-access.test.js` |
| SMSAPI, zewnętrzny endpoint i workflow kont AD | `sms-ad-workflows.test.js` |
| My Scripts canonical bundled source i brak persistent shadowing | `myscripts-source-ownership.test.js` |
| MeshCentral-visible wersja, reload cache backendu i verified installer/runtime activation proof | `plugin-update-runtime.test.js` |
| SMTP Relay, multiline body i ograniczone załączniki | `smtp-relay-workflow.test.js` |
| wspólny wygląd wierszy Approval, Commands, My Scripts i Quick | `shared-list-quick-style.test.js` |
| bezpośrednia struktura pierwszej kolumny Commands i My Scripts | `shared-catalog-direct-columns.test.js` |
| lekkie wcięcie kolejnych poziomów folderów i skryptów | `tree-indent.test.js` |
| parametr pliku, upload CSR, podpis Enterprise CA i pobranie certyfikatu | `csr-signing.test.js` |
| integracja CA, profil `SirkSystemCredential: CA` i podpisany plik RDP (Windows: `windows-ca-rdp-smoke.ps1`) | `ca-integration.test.js` |

Po teście celowanym uruchom `npm test`, jeżeli zmiana wpływa na wiele warstw albo wspólny kontrakt.

AI tooling nie jest częścią testów runtime MeshCentral; do jego izolowanej weryfikacji uruchom `node scripts/ai/test-tools.mjs`. Dla obowiązkowego `npm test` użyj cichego wrappera: `node scripts/ai/quiet-run.mjs -- node scripts/run-tests.js` (zachowuje exit code).
