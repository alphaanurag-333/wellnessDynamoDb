# API Reference

## Modules

| Module | Doc | Postman |
|--------|-----|---------|
| Quick start | [QUICKSTART.md](./QUICKSTART.md) | — |
| **User App (APK) — complete** | **[user-app-api.md](./user-app-api.md)** | [Wellness-User-API](../../postman/Wellness-User-API.postman_collection.json) · [User Flow](../../postman/Wellness-User-Flow-API.postman_collection.json) |
| User (authenticated catalog) | [user.md](./user.md) | same |
| Public | [public.md](./public.md) | [Wellness-Public-API](../../postman/Wellness-Public-API.postman_collection.json) |
| Admin | [admin.md](./admin.md) | [Wellness-Admin-API](../../postman/Wellness-Admin-API.postman_collection.json) |
| Coach | [coach.md](./coach.md) | [Wellness-Coach-API](../../postman/Wellness-Coach-API.postman_collection.json) |
| Assistant | [assistant.md](./assistant.md) | [Wellness-Assistant-API](../../postman/Wellness-Assistant-API.postman_collection.json) |

## Common conventions

- JSON request/response unless file upload (multipart/form-data).
- Success responses typically: `{ status: true, message, ...data }`.
- Errors: `{ status: false, message }` with HTTP 4xx/5xx.
- Pagination query params: `page`, `limit` (where supported).
- List search: `search` query param (where supported).
- Content visibility: `platform=app` or `platform=web` on many `/public/misc/*` lists.

## Domain guides

- [Referral & assignment](../domain/referral-assignment.md)
- [Consultancy payment flow](../domain/consultancy-payment.md)
- [Birthday notifications & posts](./birthday-feature.md)
- [Banner management](./banner-feature.md)
- [Daily reflection score](./daily-reflection-feature.md)
- [Monthly champions](./monthly-champions-feature.md)
- [Client testimonials (user reviews)](./client-testimonials-user-feature.md)
- [User meal tracking](./user-meal-tracking.md)
