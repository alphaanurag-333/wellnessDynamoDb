# Database Documentation Index

Supplementary DynamoDB documentation for the Wellness application. All content is derived from `Backend/tables/`, `Backend/models/`, controllers, and routes.

## Documents

| Document | Description |
|---|---|
| [DATABASE_ARCHITECTURE.md](../../DATABASE_ARCHITECTURE.md) | Master document — overview, tech stack, full table designs, scaling, recommendations |
| [RELATIONSHIPS.md](./RELATIONSHIPS.md) | Entity relationships, foreign keys, cardinality, join patterns, ER diagrams |
| [ACCESS_PATTERNS.md](./ACCESS_PATTERNS.md) | Every Query/Scan/Get/Put/Update/Delete/BatchWrite mapped to tables and indexes |
| [TABLE_REFERENCE.md](./TABLE_REFERENCE.md) | Quick-reference schema card for all 21 tables |
| [INDEXES.md](./INDEXES.md) | GSI/LSI catalog, projections, and application usage status |
| [SECURITY.md](./SECURITY.md) | PII, health data, credentials, encryption, and access-control notes |
| [OPERATIONS.md](./OPERATIONS.md) | Conditional writes, batch operations, transactions, retry behavior |

## Related backend docs

| Document | Location |
|---|---|
| User authentication flows | `Backend/docs/user_auth.md` |
| Wellness coach setup | `Backend/docs/wellness-coaches.md` |
| User API cURL examples | `Backend/docs/user_curl.md` |

## Quick facts

- **Tables:** 21 (multi-table design)
- **Billing:** On-demand (`PAY_PER_REQUEST`) on all tables
- **Region default:** `ap-south-1` (`Backend/config/index.js`)
- **API base path:** `/api`
- **Table DDL scripts:** `Backend/tables/create*.js`
