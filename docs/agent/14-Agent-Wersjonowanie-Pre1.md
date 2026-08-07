# Wersjonowanie MC-SIRK przed 1.0.0

## Zasada

MC-SIRK nie osiągnął jeszcze pierwszego kompletnego wydania produktu.

Do czasu jawnej decyzji użytkownika o gotowości produktu:

- bieżąca wersja musi pozostać `< 1.0.0`;
- `1.0.0` jest zarezerwowane dla pierwszego świadomie zaakceptowanego, kompletnego i stabilnego produktu;
- agent, CI ani skrypt nie może sam promować wersji do `1.0.0` lub wyższej;
- liczba commitów, rozmiar refactoru ani czas developmentu nie jest powodem do zwiększenia major/minor.

## Konwencja development

Preferowana konwencja użytkownika:

```text
0.1.1.X
```

Repo używa npm/Node, więc źródła wymagające poprawnego SemVer reprezentują tę samą rewizję jako:

```text
0.1.1-dev.X
```

Przykłady:

```text
0.1.1.1      -> 0.1.1-dev.1
0.1.1.2      -> 0.1.1-dev.2
0.1.1.42     -> 0.1.1-dev.42
```

`package.json` i pluginowy `config.json` muszą zawsze mieć identyczną, SemVer-compatible wersję.

## Historyczne numery 1.8.x

Wcześniejsze `1.8.x` były wewnętrzną numeracją intensywnego developmentu i nie oznaczają pierwszego product release.

- nie używaj `1.8.x` jako źródła kolejnego numeru;
- nie traktuj historycznych tagów/release notes jako dowodu gotowości produktu;
- historia Git i stare dokumenty mogą pozostać jako evidence rozwoju, ale aktualne metadata/version history mają używać linii pre-1.0;
- nie przywracaj numeracji `1.8.x` bez jawnej decyzji użytkownika.

## Bump

Przy zwykłej iteracji zwiększaj tylko rewizję development:

```text
0.1.1-dev.1
0.1.1-dev.2
0.1.1-dev.3
...
```

Bump nie jest automatycznie wymagany dla samej dokumentacji. Jeśli zadanie obejmuje wersję/release artifact, zsynchronizuj wszystkie aktywne źródła wersji w jednej zmianie.

## Release gate 1.0.0

`1.0.0` może zostać użyte dopiero po jawnej decyzji użytkownika i potwierdzeniu co najmniej:

- pełnej funkcjonalności wymaganej dla pierwszego produktu;
- stabilnego działania na wspieranym MeshCentral;
- real MeshCentral smoke/acceptance tests;
- pełnego test suite i krytycznych regression tests;
- gotowej instalacji, aktualizacji oraz rollback/recovery;
- zamknięcia blockerów bezpieczeństwa;
- akceptowalnej wydajności hot path/UI;
- gotowej dokumentacji operacyjnej/release;
- świadomej decyzji użytkownika: `release MC-SIRK 1.0.0`.

Brak znanych blockerów nie jest sam w sobie zgodą na `1.0.0`.

## GitHub Releases i tagi

Do czasu pierwszego świadomego wydania produktu:

- nie twórz nowych tagów/GitHub Releases automatycznie;
- nie publikuj release tylko dlatego, że zwiększono development revision;
- jeśli potrzebny jest artefakt testowy, preferuj CI artifact albo inną formę development artifact zgodną z bieżącym workflow;
- tworzenie prerelease/tagu wymaga jawnego polecenia użytkownika.

## Handoff

Jeśli Issue zmienia wersję, zapisz:

- poprzednią i nową wersję;
- powód bumpu;
- aktywne źródła wersji;
- wynik testów;
- potwierdzenie, że wersja pozostaje `< 1.0.0`, chyba że użytkownik jawnie otworzył release gate 1.0.0.
