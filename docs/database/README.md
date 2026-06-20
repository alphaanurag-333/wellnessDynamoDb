# Database Documentation Index

Supplementary DynamoDB documentation for the Wellness application. All content is derived from `Backend/tables/`, `Backend/models/`, controllers, and routes.

## Documents

| Document | Description |
|---|---|
| [ISSUES_REPORT.md](../../ISSUES_REPORT.md) | Schema audit — mismatches, unused indexes, naming issues (Phase 1) |
| [STANDARD_DB_STRUCTURE.md](../../STANDARD_DB_STRUCTURE.md) | Target standardized schema and migration plan (Phase 2) |
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
| API reference index | `Backend/docs/README.md` |
| API quick start | `Backend/docs/api/QUICKSTART.md` |
| Referral & assignment (domain) | `Backend/docs/domain/referral-assignment.md` |
| Consultancy payment (domain) | `Backend/docs/domain/consultancy-payment.md` |
| Postman collections | `Backend/postman/README.md` |

## Quick facts

- **Tables:** 21 (multi-table design)
- **Billing:** On-demand (`PAY_PER_REQUEST`) on all tables
- **Region default:** `ap-south-1` (`Backend/config/index.js`)
- **API base path:** `/api`
- **Table DDL scripts:** `Backend/tables/create*.js`
- **Schema migrations:** `Backend/migration/` (backups in `migration/backup/`) — run `node migration/migrateAll.js` from `Backend/`
- **List query utility:** `Backend/utils/dynamoList.js`
- **Media field aliases:** `Backend/utils/mediaFieldAliases.js` — dual-read legacy snake_case media attrs during transition
