# API Reference

Auto-generated route catalog. Regenerate after route changes:

```bash
node scripts/buildApiCatalog.js
```

## Modules

| Module | Doc | Postman |
|--------|-----|---------|
| Quick start | [QUICKSTART.md](./QUICKSTART.md) | — |
| Admin | [admin.md](./admin.md) | [Wellness-Admin-API.postman_collection.json](../../postman/Wellness-Admin-API.postman_collection.json) |
| User | [user.md](./user.md) | [Wellness-User-API.postman_collection.json](../../postman/Wellness-User-API.postman_collection.json) |
| Coach | [coach.md](./coach.md) | [Wellness-Coach-API.postman_collection.json](../../postman/Wellness-Coach-API.postman_collection.json) |
| Assistant | [assistant.md](./assistant.md) | [Wellness-Assistant-API.postman_collection.json](../../postman/Wellness-Assistant-API.postman_collection.json) |
| Public | [public.md](./public.md) | [Wellness-Public-API.postman_collection.json](../../postman/Wellness-Public-API.postman_collection.json) |

## Common conventions

- JSON request/response unless file upload (multipart/form-data).
- Success responses typically: `{ status: true, message, ...data }`.
- Errors: `{ status: false, message }` with HTTP 4xx/5xx.
- Pagination query params: `page`, `limit` (where supported).
- List search: `search` query param (where supported).

## Domain guides

- [Referral & assignment](../domain/referral-assignment.md)
- [Consultancy payment flow](../domain/consultancy-payment.md)
