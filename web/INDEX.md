# Admin panel index

Panel administracyjny jest odrębną warstwą natywnego interfejsu MeshCentral.

## Entry pointy

```text
admin.js
views/SIRK-Portal.handlebars
web/admin/admin.js
web/admin/admin.css
web/admin/admin-layout.js
```

## Funkcje panelu

| Obszar | Plik |
|---|---|
| layout i nawigacja | `admin-layout.js` |

Przed zmianą assetu potwierdź jego mapowanie w root `admin.js`. Nie przenoś kodu panelu do `public/`.
