# Wydajność i reuse MC-SIRK

## Cel

Minimalizować ilość kodu, DOM churn i koszt runtime bez utraty czytelnego ownership.

## Zasada przed dodaniem nowego elementu

Przed utworzeniem nowej klasy/modułu/helpera/renderera/CSS class/event handlera/timera/observera/request loop:

1. znajdź aktualnego ownera odpowiedzialności w odpowiednim `INDEX.md`;
2. sprawdź, czy istniejący wspólny komponent może zostać użyty lub rozszerzony;
3. sprawdź bezpośrednich konsumentów przed zmianą wspólnego contractu;
4. nowy element twórz tylko wtedy, gdy istniejący owner nie pasuje semantycznie lub rozszerzenie pogorszyłoby separację odpowiedzialności.

## Frontend

Preferuj:

- `public/shared/*` dla zachowania współdzielonego przez moduły;
- jeden renderer/list/tree/toolbar/layout contract dla tej samej semantyki;
- natywne klasy MeshCentral dla standardowego wyglądu i stanów interakcji;
- CSS pluginu dla geometrii, przewijania, responsywności i wyjątków wymaganych przez integrację;
- reuse istniejących elementów DOM zamiast destroy/recreate;
- atomic render zamiast sekwencji pusty stan -> częściowy stan -> finalny stan;
- jednego ownera stanu i bezpośrednie eventy zamiast kilku observerów synchronizujących ten sam stan.

Nie twórz prawie identycznych klas CSS tylko dla różnych modułów, jeśli różnica może być modifierem, data-attribute albo CSS custom property.

## Backend/runtime

Preferuj:

- jeden service/owner dla jednego lifecycle;
- wspólne validation/authorization helpers;
- bounded I/O;
- brak requestów wykonywanych wielokrotnie dla danych, które można bezpiecznie reuse/cache;
- brak niekontrolowanych timerów/polling loops;
- deduplikację concurrent work tam, gdzie kilka requestów może wykonywać tę samą kosztowną operację.

Cache musi mieć jawnego ownera, invalidation/TTL, consistency i failure behavior.

## Hot path

Przy zmianach w renderowaniu, request lifecycle, Quick, Commands, scripts, device selection lub menu sprawdź:

- liczbę renderów/remountów;
- liczbę event handlerów i observerów;
- liczbę requestów;
- możliwość anulowania nieaktualnej pracy;
- DOM/reflow churn;
- czy wspólny owner nie wykonuje tej samej pracy dla kilku konsumentów osobno.

Nie dodawaj abstrakcji tylko dlatego, że zmniejsza liczbę linii. Abstrakcja musi usuwać rzeczywistą duplikację lub upraszczać lifecycle.

## Weryfikacja

Dla performance/refactor wymagaj:

- targeted regression tests;
- porównania zachowania before/after;
- jeśli koszt jest mierzalny: pomiar request/render/handler/startup/CPU przed i po;
- braku regresji Classic/Modern oraz light/dark tam, gdzie dotyczy UI;
- `npm test` dla wspólnego runtime/UI contractu.
