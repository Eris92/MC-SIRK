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

Dla `server/` skaner odrzuca nowe linie z `eval(`, `new Function(`,
każdą referencją `child_process` oraz wywołaniami exec/spawn/fork.
Zwykłe `/x/.exec(s)` i `re.exec(line)` przechodzą. `.exec` jest wykrywane
na odbiornikach cp, childProcess, child_process, processOwner oraz nazwach
wiązanych przez proste require/import child_process; pozostałe metody procesu
są wykrywane także na innych odbiornikach. Wywołania bez odbiornika są blokowane.

Wyjątek dla prymitywu wymaga komentarza w tej samej linii:
`// security-review-allow: uzasadnienie walidacji i przeglądu`.
Niepuste uzasadnienie emituje NOTICE z plikiem, numerem linii i powodem.
Puste uzasadnienie nie daje wyjątku. Sekretów nie można wyłączyć tym markerem.
Marker pozostaje w diffie do oceny przez reviewera; nie zastępuje wymaganej
zgody właściciela związanej z SHA.

Lokalna baza to HEAD; CI używa merge base HEAD i `SECURITY_REVIEW_BASE`
(SHA base PR), dzięki czemu zmiany wyłącznie na main nie należą do diffu PR.
Kontrola uwzględnia również lokalne zmiany śledzone i nowe pliki.
To kontrola tekstowa, nie parser JS ani analiza przepływu danych: aliasy,
wiązania wieloliniowe, obliczane właściwości i obfuskacja wymagają przeglądu
człowieka. Nazwy odbiorników są zbierane konserwatywnie dla całego server/;
możliwe są kolizje nazw i fałszywe alarmy, również w komentarzach i literałach.
Brak bazy lub błąd Git powoduje niepowodzenie kontroli.

Job uruchamia pełne `npm test`, obejmujące `test/security.test.js` i wszystkie
regresje `.test.js`. `npm audit --omit=dev --audit-level=high` nie ma zastosowania:
package.json nie deklaruje zależności runtime, repo nie ma lockfile. Job nie
potrzebuje instalowania pakietów ani dostępu do registry.
