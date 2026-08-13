# Account legacy deprecation (Phase 8)

## Staff auth cutover (done)

Legacy staff auth controllers/routes were removed. Canonical auth is only:

- `POST/GET/PATCH /api/account/auth/*`

Portal FE wrappers (`adminAuth.js`, `coachAuth.js`, `assistantAuth.js`) call Account auth and keep response aliases (`admin` / `coach` / `assistant`).

Coach permission map (non-auth): `GET /api/coach/me/permissions`.

## Feature flags

| Flag | Cutover value | Meaning |
|------|---------------|---------|
| `ACCOUNT_DUAL_READ` | `true` (default) then eventually N/A | Prefer Account, fall back to legacy tables in protect* |
| `ACCOUNT_DUAL_WRITE` | `true` during dual-write; `false` after cutover | Mirror staff writes into Account |
| `ACCOUNT_AUTH_ENABLED` | `true` preferred | Legacy protectors always go through Account |
| `ACCOUNT_LEGACY_SHIMS` | `false` after FE feature traffic moved | Stop mounting `/api/admin\|coach\|assistant` **feature** routers (not auth — auth already removed) |

## Cutover checklist

1. Run `node migration/migrateAll.js --only=34-account-consolidation` (dry-run first with `--dry-run`).
2. Run `node migration/migrateAll.js --only=35-account-role-seeds`.
3. Enable `ACCOUNT_DUAL_WRITE=true`, verify new staff appear in Account.
4. Smoke `/api/account/auth/login` + switch-role + heal-users.
5. Soft-launch `/updatedadmin` against Account auth.
6. After traffic moves: set `ACCOUNT_DUAL_WRITE=false`.
7. Keep legacy tables read-only for N days; then archive/delete Admin, WellnessCoach, AssistantWellnessCoach.
8. Optional: redirect `/admin`, `/coach`, `/assistant` FE routes → `/updatedadmin`.

## Do not delete yet

Admin / WellnessCoach / AssistantWellnessCoach **models and feature routes** remain until reconciliation is green (CRUD, assignments, dual-read fallback). Only **auth** entrypoints were removed.
