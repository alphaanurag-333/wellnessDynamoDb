# DynamoDB migrations

Schema migrations for changes introduced in the **ISSUES_REPORT** high-severity fixes.  
DDL scripts in `tables/create*.js` reflect the **target** schema; these scripts upgrade **existing** AWS tables.

## Layout

```
migration/
  backup/              # JSON exports (gitignored)
  lib/helpers.js       # Scan, backup, GSI helpers
  migrations/          # One script per change
  migrateAll.js        # Run everything in order
```

## Migrations

| ID | Script | Tables | Type |
|---|---|---|---|
| `01-admin-single-key` | `migrations/01-admin-single-key.js` | `Admin` | Recreate table: PK `id` only; drops `PhoneIndex` |
| `02-testimonials-status-gsi` | `migrations/02-testimonials-status-gsi.js` | `ClientTestimonials`, `VideoTestimonials` | Add `StatusCreatedAtIndex` GSI |
| `03-admin-drop-phone-index` | `migrations/03-admin-drop-phone-index.js` | `Admin` | Drop `PhoneIndex` if still present |
| `04-media-field-camelcase` | `migrations/04-media-field-camelcase.js` | `ClientTestimonials`, `VideoTestimonials`, `HealthRecipe` | `profile_image` → `profileImage`, `video_specification` → `videoSpecification` |

Application code uses `Backend/utils/mediaFieldAliases.js` to dual-read legacy attribute names until all items are migrated.

Other tables (User, Banner, Faq, etc.) already had the GSIs used by `dynamoList.js` — **no migration required**, only the application code change.

## Usage

From `Backend/` with AWS credentials configured:

```bash
# Run all migrations (skips steps already applied)
node migration/migrateAll.js

# Run one migration
node migration/migrateAll.js --only=02-testimonials-status-gsi
```

## Backups

Each destructive or GSI change writes a timestamped JSON file under `migration/backup/`:

```
{TableName}-{ISO-timestamp}.json
```

Restore manually with `PutItem` if needed. **Admin** migration also recreates the table automatically after backup.

## Requirements

- AWS credentials with `dynamodb:Scan`, `DescribeTable`, `UpdateTable`, `DeleteTable`, `CreateTable`, `PutItem`
- `DYNAMODB_SKIP_VERIFY=true` optional for migration-only runs without `ListTables` at startup
