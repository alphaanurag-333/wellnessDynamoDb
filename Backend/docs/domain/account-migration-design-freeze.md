# Account migration — design freeze defaults

Resolved product defaults for open questions (v1). Change only with an explicit product decision.

| Question | Default |
|----------|---------|
| Email merge across legacy staff tables | Same email → **one Account** with multiple memberships. Conflicting different people → manual resolve list before prod backfill; script reports and skips unsafe merges unless `--force-merge-email`. |
| Default active role on login | Prefer `defaultRoleKey` if eligible; else first eligible membership in order: `admin`, `wellness_coach`, `assistant_wellness_coach`, `trainee`, `support`. Client may pass `activeRole`. |
| Trainee / Support as User assignees | **No** in v1. Only `wellness_coach` and `assistant_wellness_coach` remain valid `assignedCoachType` values. |
| Admin CMS location | Inside `updatedadmin` (`/access`, `/configs`) with admin-gated nav. |
| Coach self-register | Still public; creates Account with `wellness_coach` membership (`approvalStatus: pending`). |
| Password reset | One email → one Account; single password for all memberships. |
| Old portal URL retention | Keep shims until `updatedadmin` is primary; redirect after soft-launch (default **90 days** post cutover). |

Feature flags:

- `ACCOUNT_AUTH_ENABLED` — staff auth via Account + `/api/account` (default off until cutover).
- `ACCOUNT_DUAL_WRITE` — write Account on staff create/update (default on once Phase 4 ships).
- `ACCOUNT_DUAL_READ` — resolver prefers Account, falls back to legacy (default on once Phase 2 ships).
- `ACCOUNT_LEGACY_SHIMS` — mount `/api/admin|coach|assistant` compatibility (default on until Phase 8).
