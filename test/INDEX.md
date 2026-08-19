# Test index

Wybierz test na podstawie zmienianego kontraktu. Nie czytaj wszystkich testów przed ustaleniem obszaru.

| Obszar | Test |
|---|---|
| security | `security.test.js` |
| lokalizacja skryptów | `script-localization.test.js` |
| folder permissions | `folder-access.test.js` |
| SMSAPI, zewnętrzny endpoint i workflow kont AD | `sms-ad-workflows.test.js` |
| MeshCentral-visible wersja pluginu i reload cache backendu po zmianie wersji | `plugin-update-runtime.test.js` |
| SMTP Relay, multiline body i ograniczone załączniki | `smtp-relay-workflow.test.js` |
| wspólny wygląd wierszy Approval, Commands, My Scripts i Quick | `shared-list-quick-style.test.js` |
| bezpośrednia struktura pierwszej kolumny Commands i My Scripts | `shared-catalog-direct-columns.test.js` |
| lekkie wcięcie kolejnych poziomów folderów i skryptów | `tree-indent.test.js` |

Po teście celowanym uruchom `npm test`, jeżeli zmiana wpływa na wiele warstw albo wspólny kontrakt.
