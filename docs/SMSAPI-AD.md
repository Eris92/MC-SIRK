# SMSAPI, Voice SMS i konta Active Directory

## Konfiguracja

W panelu `Settings -> Integrations` skonfiguruj:

- `Active Directory`: domenę, login techniczny, hasło, sufiks UPN oraz listę `Users locations` w formie nazwa + pełny DN OU;
- `SMS / Voice SMS (SMSAPI.pl)`: URL `https://api.smsapi.pl`, opcjonalnego nadawcę, lektora i token SMSAPI;
- opcjonalny `External send API token` o długości co najmniej 32 znaków, niezależny od tokenu SMSAPI.

Przykładowe lokalizacje użytkowników:

```text
New            OU=_NewUsers,OU=Business,DC=domena,DC=local
Testowe konta  OU=Test,OU=Business,DC=domena,DC=local
```

Sekrety są write-only, trafiają do szyfrowanego magazynu pluginu i nie są zwracane do przeglądarki. Po konfiguracji przypisz profile systemowe `AD` i/lub `SMSAPI` do właściwych skryptów przez akcję Credentials.

## Dostępne skrypty

- `SMS/Send SMS.ps1` — SMS do jednego lub wielu numerów;
- `SMS/Send Voice SMS.ps1` — Voice SMS/TTS do jednego lub wielu numerów;
- `Active Directory/Reset user password and SMS.ps1` — wybór użytkownika z neutralnej listy AD, 12-znakowe hasło, reset, odblokowanie i SMS na atrybut `mobile`;
- `Active Directory/Create user and SMS.ps1` — utworzenie konta w dozwolonym OU oraz wysłanie UPN i hasła na podany numer.

Operacje są objęte Approval. `ChangePasswordAtLogon` jest domyślnie włączone i można je odznaczyć. Lista użytkowników nie publikuje numerów telefonów; reset pobiera `mobile` ponownie bezpośrednio z AD.

Login i UPN są przydzielane kolejno jako `i.nazwisko`, `im.nazwisko`, `imi.nazwisko` itd. Po wykorzystaniu prefiksów skrypt dodaje sufiks liczbowy. `sAMAccountName` pozostaje w limicie 20 znaków, a unikalność jest sprawdzana dla loginu i UPN.

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
