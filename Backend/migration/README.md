# DynamoDB migrations

Schema migrations for changes introduced in the **ISSUES_REPORT** high-severity fixes.  
DDL scripts in `tables/create*.js` reflect the **target** schema; these scripts upgrade **existing** AWS tables.

## Layout

```
migration/
  backup/                    # JSON exports (gitignored)
  lib/
    helpers.js               # Scan, backup, drop, create, batch restore
    tableSchemas.js          # Canonical table definitions (latest GSIs)
    sanitizeRestoreItem.js   # Strip null GSI keys, media camelCase, etc.
  migrations/                # One script per incremental change
  migrateAll.js              # Run incremental migrations in order
  rebuildAllTables.js        # Full backup → drop → recreate → restore
```

## Full table rebuild (recommended for stale indexes)

Use this when production tables still have **legacy GSIs** (e.g. `Admin.PhoneIndex`) or you want every table recreated from `lib/tableSchemas.js` in one pass.

From `Backend/` with AWS credentials configured:

```bash
# Step 1 — backup only (safe; no destructive changes)
npm run rebuild:tables -- --backup-only

# Step 2 — drop all tables, recreate with latest indexes, restore data
npm run rebuild:tables -- --confirm

# Or reuse an existing backup folder
npm run rebuild:tables -- --confirm --from-backup=full-rebuild-2026-06-20T12-00-00-000Z
```

**What it does**

1. Scans every app table into `migration/backup/full-rebuild-<timestamp>/`
2. Drops all tables (removes unwanted legacy indexes)
3. Creates tables from `lib/tableSchemas.js` (matches `tables/create*.js`)
4. Restores items with sanitization:
   - Omits `null`/empty **GSI hash keys** (sparse indexes)
   - Normalizes media fields (`profileImage`, `videoSpecification`)
   - Removes deprecated `AppConfig.payment_methods`
   - Backfills `User.userTier` when missing

**Safety**

- Without `--confirm`, only backup runs (or uses `--from-backup` without dropping).
- Stop the API server before `--confirm` on production.
- Set `DYNAMODB_SKIP_VERIFY=true` for migration-only runs without `ListTables` at startup.

## Incremental migrations

| ID | Script | Tables | Type |
|---|---|---|---|
| `01-admin-single-key` | `migrations/01-admin-single-key.js` | `Admin` | Recreate table: PK `id` only; drops `PhoneIndex` |
| `02-testimonials-status-gsi` | `migrations/02-testimonials-status-gsi.js` | `ClientTestimonials`, `VideoTestimonials` | Add `StatusCreatedAtIndex` GSI |
| `03-admin-drop-phone-index` | `migrations/03-admin-drop-phone-index.js` | `Admin` | Drop `PhoneIndex` if still present |
| `04-media-field-camelcase` | `migrations/04-media-field-camelcase.js` | `ClientTestimonials`, `VideoTestimonials`, `HealthRecipe` | `profile_image` → `profileImage`, `video_specification` → `videoSpecification` |
| `05-user-referral-assignment` | `migrations/05-user-referral-assignment.js` | `User`, `ReferralCode`, coaches | Referral registry, `ParentCoachIndex`, tier backfill |
| `06-appconfig-drop-payment-methods` | `migrations/06-appconfig-drop-payment-methods.js` | `AppConfig` | Remove deprecated `payment_methods` attribute |
| `07-user-parent-coach-sparse-index` | `migrations/07-user-parent-coach-sparse-index.js` | `User` | Remove null `parentCoachId` from existing items |
| `08-consultancy-transaction-sparse-index` | `migrations/08-consultancy-transaction-sparse-index.js` | `ConsultancyTransaction` | Remove null sparse GSI keys |

Application code uses `Backend/utils/mediaFieldAliases.js` to dual-read legacy attribute names until all items are migrated.

## Usage (incremental)

```bash
# Run all migrations (skips steps already applied)
npm run migrate

# Run one migration
npm run migrate -- --only=07-user-parent-coach-sparse-index
```

## Backups

Incremental migrations write `{TableName}-{ISO-timestamp}.json` under `migration/backup/`.

Full rebuild writes a folder:

```
migration/backup/full-rebuild-<timestamp>/
  manifest.json
  Admin.json
  User.json
  ...
```

Restore manually with `PutItem` if needed.

## Requirements

- AWS credentials with `dynamodb:Scan`, `DescribeTable`, `UpdateTable`, `DeleteTable`, `CreateTable`, `BatchWriteItem`
- `DYNAMODB_SKIP_VERIFY=true` optional for migration-only runs without `ListTables` at startup
