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

Operacje AD są objęte Approval. `ChangePasswordAtLogon` jest domyślnie włączone i można je odznaczyć. Lista resetu nie publikuje numerów telefonów i nie wykonuje zapytań Jira/AD przy każdym znaku Search; filtrowanie odbywa się lokalnie po jednorazowym załadowaniu dopasowanej listy. Reset pobiera `mobile` ponownie bezpośrednio z AD przed wysłaniem SMS.

Wysyłka SMS jawnie ustawia po stronie SMSAPI `encoding=utf-8`. Ścieżka PowerShell używana przez operacje AD dodatkowo ustawia `application/x-www-form-urlencoded; charset=UTF-8`, aby Windows PowerShell 5.1 zakodował formularz w UTF-8 zamiast domyślnego kodowania. Dzięki temu polskie znaki są zachowane zarówno w zwykłym `Send SMS`, jak i w wiadomościach create/reset AD.

Login i UPN są przydzielane kolejno jako `i.nazwisko`, `im.nazwisko`, `imi.nazwisko` itd. Po wykorzystaniu prefiksów skrypt dodaje sufiks liczbowy. `sAMAccountName` pozostaje w limicie 20 znaków, a unikalność jest sprawdzana dla loginu i UPN.

Treść SMS po utworzeniu konta nie publikuje loginu ani UPN i ma postać:

```text
Konto w domenie <domena>, zostało utworzone. Tymczasowe hasło:

<hasło>
```

Treść SMS po resecie hasła również nie publikuje loginu:

```text
Hasło w domenie <domena>, zostało zmienione. Tymczasowe hasło:

<hasło>
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
