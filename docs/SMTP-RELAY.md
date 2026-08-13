# SMTP Relay

## Konfiguracja

W `Settings -> Integrations -> SMTP Relay` ustaw:

- serwer i port SMTP;
- domyślnego nadawcę;
- opcjonalne TLS/SSL;
- katalog serwera, z którego wolno dodawać załączniki;
- maksymalny łączny rozmiar załączników od 1 do 100 MB.

Integracja odpowiada wewnętrznemu relayowi bez uwierzytelnienia: `UseDefaultCredentials = false`, brak loginu i hasła. Po zapisaniu przypisz profil `SMTP Relay` do skryptu przez akcję Credentials.

## Wysyłanie

Skrypt `Mail/Send Relay Mail.ps1` obsługuje:

- opcjonalne nadpisanie nadawcy;
- wielu odbiorców To, CC i BCC rozdzielonych przecinkiem, średnikiem albo nową linią;
- temat;
- wielowierszową treść tekstową lub HTML;
- załączniki podane po jednej ścieżce w wierszu.

Ścieżka załącznika może być względna wobec skonfigurowanego katalogu albo pełna, ale po rozwiązaniu nadal musi znajdować się wewnątrz tego katalogu. Skrypt odrzuca brakujące pliki, katalogi, wyjście poza dozwolony root i przekroczenie łącznego limitu rozmiaru.

Wynik pokazuje wyłącznie liczbę odbiorców i załączników. Nie kopiuje treści wiadomości, adresów ani ścieżek plików do outputu. Wysyłka wymaga Approval.
