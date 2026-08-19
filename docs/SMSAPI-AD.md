# SMSAPI, Voice SMS i konta Active Directory

## Konfiguracja

W panelu `Settings -> Integrations` skonfiguruj:

- `Active Directory`: domenę, login techniczny, hasło, sufiks UPN oraz listę `Users locations` w formie nazwa + pełny DN OU;
- `Jira`: połączenie używane przez współdzielony cache użytkowników; reset hasła korzysta z tej samej listy użytkowników co Jira i mapuje ją do AD po UPN;
- `SMS / Voice SMS (SMSAPI.pl)`: URL `https://api.smsapi.pl`, opcjonalnego nadawcę, lektora i token SMSAPI;
- opcjonalny `External send API token` o długości co najmniej 32 znaków, niezależny od tokenu SMSAPI.

Przykładowe lokalizacje użytkowników:

```text
New            OU=_NewUsers,OU=Business,DC=domena,DC=local
Testowe konta  OU=Test,OU=Business,DC=domena,DC=local
```

Sekrety są write-only, trafiają do szyfrowanego magazynu pluginu i nie są zwracane do przeglądarki. Po konfiguracji przypisz profile systemowe do właściwych skryptów przez akcję Credentials. `Reset user password and SMS.ps1` wymaga `AD` i `SMSAPI`; Jira jest używana wyłącznie przez współdzielonego server-side ownera cache użytkowników i nie wymaga osobnego przypisania credentialu Jira do skryptu resetu. Konto tworzone w AD wymaga `AD` i `SMSAPI`.

## Dostępne skrypty

- `SMS/Send SMS.ps1` — SMS do jednego lub wielu numerów;
- `SMS/Send Voice SMS.ps1` — Voice SMS/TTS do jednego lub wielu numerów;
- `Active Directory/Reset user password and SMS.ps1` — wyszukiwalny wybór z istniejącego cache użytkowników Jira, case-insensitive dopasowanie `Jira emailAddress -> AD UserPrincipalName`, 12-znakowe hasło, reset, odblokowanie i SMS na atrybut `mobile`;
- `Active Directory/Create user and SMS.ps1` — utworzenie konta w dozwolonym OU oraz wysłanie tymczasowego hasła na podany numer.

Operacje AD są objęte Approval. `ChangePasswordAtLogon` jest domyślnie włączone i można je odznaczyć. Lista resetu nie publikuje numerów telefonów. Po odczycie współdzielonego cache Jira backend przekazuje do AD tylko znormalizowane adresy e-mail/UPN. Selector używa bezpośredniego `System.DirectoryServices` bridge z ograniczonymi filtrami LDAP w paczkach i nie importuje modułu PowerShell `ActiveDirectory` ani domyślnego dysku `AD:`. Machine output jest jednym UTF-8 JSON envelope; surowy Windows PowerShell CLIXML/stderr nie jest publikowany w dialogu. Search filtruje lokalnie już załadowaną listę i nie wykonuje zapytania Jira/AD przy każdym znaku. Reset pobiera `mobile` ponownie bezpośrednio z AD przed wysłaniem SMS.

Wysyłka SMS jawnie ustawia po stronie SMSAPI `encoding=utf-8`. Ścieżka PowerShell używana przez operacje AD koduje wartości formularza przez `.NET Uri.EscapeDataString()` przed wywołaniem HTTP, więc do `Invoke-RestMethod` trafia już ASCII-safe percent-encoded body reprezentujący bajty UTF-8; zachowany jest również `application/x-www-form-urlencoded; charset=UTF-8`.

Po powtarzającym się realnym mojibake w dostarczonych wiadomościach create/reset, same komunikaty kont AD są celowo zapisane jako polski tekst bez znaków diakrytycznych. Dzięki temu cała dynamiczna treść tych dwóch SMS-ów pozostaje ASCII (`domena`, interpunkcja i generowane hasło również są ASCII), niezależnie od dalszego kodowania transportowego. Nie zmienia to polskich etykiet UI ani ogólnej obsługi UTF-8 w zwykłym `Send SMS`.

Login i UPN są przydzielane kolejno jako `i.nazwisko`, `im.nazwisko`, `imi.nazwisko` itd. Po wykorzystaniu prefiksów skrypt dodaje sufiks liczbowy. `sAMAccountName` pozostaje w limicie 20 znaków, a unikalność jest sprawdzana dla loginu i UPN.

Treść SMS po utworzeniu konta nie publikuje loginu ani UPN i ma postać:

```text
Konto w domenie <domena>, zostalo utworzone. Tymczasowe haslo:

<haslo>
```

Treść SMS po resecie hasła również nie publikuje loginu:

```text
Haslo w domenie <domena>, zostalo zmienione. Tymczasowe haslo:

<haslo>
```

`<domena>` pochodzi z `MYSCRIPTS_AD_DOMAIN` skonfigurowanego w integracji Active Directory.

## Wywołanie zewnętrzne

Endpoint:

```text
POST https://meshcentral.example/sirk-sms/v1/send
Authorization: Bearer <EXTERNAL_SEND_API_TOKEN>
Content-Type: application/json
```

SMS multi:

```json
{
  "type": "sms",
  "to": ["48500100200", "48500100300"],
  "message": "Treść wiadomości"
}
```

Voice SMS:

```json
{
  "type": "vms",
  "to": "48500100200",
  "message": "Treść czytana przez lektora",
  "lector": "ewa"
}
```

Obsługiwani lektorzy: `agnieszka`, `ewa`, `jacek`, `jan`, `maja`. Endpoint zwraca `202` po przyjęciu wysyłki, maskuje numery w odpowiedzi i ma limit 30 żądań na minutę dla adresu IP. Token zewnętrzny nie jest tokenem SMSAPI i należy go przechowywać w systemie wywołującym jako sekret.

Dokumentacja dostawcy: [SMSAPI.pl API](https://www.smsapi.pl/docs/).
