# Account legacy deprecation (Phase 8)

## Feature flags

| Flag | Cutover value | Meaning |
|------|---------------|---------|
| `ACCOUNT_DUAL_READ` | `true` (default) then eventually N/A | Prefer Account, fall back to legacy |
| `ACCOUNT_DUAL_WRITE` | `true` during dual-write; `false` after cutover | Mirror staff writes into Account |
| `ACCOUNT_AUTH_ENABLED` | `true` at auth cutover | Legacy protectors delegate to Account |
| `ACCOUNT_LEGACY_SHIMS` | `false` after FE traffic moved | Stop mounting `/api/admin\|coach\|assistant` (wire in routes when ready) |

## Cutover checklist

1. Run `node migration/migrateAll.js --only=34-account-consolidation` (dry-run first with `--dry-run`).
2. Run `node migration/migrateAll.js --only=35-account-role-seeds`.
3. Enable `ACCOUNT_DUAL_WRITE=true`, verify new staff appear in Account.
4. Enable `ACCOUNT_AUTH_ENABLED=true`, smoke `/api/account/auth/login` + switch-role + heal-users.
5. Soft-launch `/updatedadmin` against Account auth.
6. After traffic moves: set `ACCOUNT_DUAL_WRITE=false`.
7. Keep legacy tables read-only for N days; then archive/delete Admin, WellnessCoach, AssistantWellnessCoach.
8. Optional: redirect `/admin`, `/coach`, `/assistant` FE routes → `/updatedadmin`.

## Do not delete in the same release as auth cutover

Legacy tables remain until reconciliation is green for at least 7 days.
