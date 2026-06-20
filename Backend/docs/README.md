# Wellness Backend Documentation

## API reference (start here)

| Resource | Description |
|----------|-------------|
| [API index](./api/README.md) | Module overview, conventions, Postman links |
| [Quick start & auth examples](./api/QUICKSTART.md) | cURL flows for Admin, User, Coach, Assistant |
| [Admin API](./api/admin.md) | All `/api/admin/*` routes |
| [User API](./api/user.md) | Mobile user `/api/user/*` routes |
| [Coach API](./api/coach.md) | Wellness coach portal `/api/coach/*` |
| [Assistant API](./api/assistant.md) | Assistant coach portal `/api/assistant/*` |
| [Public API](./api/public.md) | Unauthenticated app config & content |
| [Route catalog (JSON)](./api/catalog.json) | Machine-readable list — regenerate with `node scripts/buildApiCatalog.js` |

## Postman

Import everything from [`../postman/`](../postman/README.md):

- `Wellness-Admin-API.postman_collection.json`
- `Wellness-User-API.postman_collection.json`
- `Wellness-Coach-API.postman_collection.json`
- `Wellness-Assistant-API.postman_collection.json`
- `Wellness-Public-API.postman_collection.json`
- `Wellness-API.postman_environment.json`

## Domain guides (business logic)

| Guide | Description |
|-------|-------------|
| [Referral & coach assignment](./domain/referral-assignment.md) | Seek/Heal tiers, referral codes, reassignment rules |
| [Consultancy payment](./domain/consultancy-payment.md) | Checkout, pricing, Zoom/WhatsApp, visibility rules |

## Database & operations

See repo root and [`../../docs/database/README.md`](../../docs/database/README.md) for DynamoDB schema, indexes, and migrations.

| Document | Location |
|----------|----------|
| Master architecture | [`../../DATABASE_ARCHITECTURE.md`](../../DATABASE_ARCHITECTURE.md) |
| Standard structure | [`../../STANDARD_DB_STRUCTURE.md`](../../STANDARD_DB_STRUCTURE.md) |
| Schema audit | [`../../ISSUES_REPORT.md`](../../ISSUES_REPORT.md) |
| Migrations | [`../migration/README.md`](../migration/README.md) |

## Regenerate API docs

After adding or changing routes:

```bash
cd Backend
node scripts/buildApiCatalog.js
```

This updates `docs/api/*.md`, `docs/api/catalog.json`, and Postman collections (except the hand-maintained User collection).
