# User Referral & Coach Assignment

Business rules for Seek → Heal conversion, referral codes, and coach assignment.

## User tiers

| Tier | Registration | Coach assignment |
|------|--------------|------------------|
| **Seek** (free) | Self-register via OTP; no referral required | None |
| **Heal** (paid) | Upgrade via `convertSeekToHeal` or consultancy payment | Required unless pending admin |

## Referral codes

Every **Wellness Coach**, **Assistant Wellness Coach**, and **Heal user** gets a unique `referralCode` stored in the **`ReferralCode`** registry table.

| Field | Purpose |
|-------|---------|
| `referralCode` | Partition key |
| `entityType` | `wellness_coach` \| `assistant_wellness_coach` \| `user` |
| `entityId` | Owning record id |
| `ownerCoachId` | Wellness coach for peer-referral resolution |

## User assignment fields (Heal)

| Field | Mutable | Purpose |
|-------|---------|---------|
| `assignedCoachId` | Yes | Direct assignee (coach or assistant) |
| `assignedCoachType` | Yes | `wellness_coach` \| `assistant_wellness_coach` |
| `parentCoachId` | Yes | Owning wellness coach |
| `assignmentStatus` | Yes | `assigned` \| `pending_admin` |
| `referredBy*` | **Immutable** | Referral history at conversion |

## Conversion rules (Seek → Heal)

| Referral type | Assignment |
|---------------|------------|
| Wellness coach code | Direct to coach |
| Assistant code | To assistant; `parentCoachId` = assistant's coach |
| Heal user (peer) code | To referrer's `parentCoachId` coach |
| No code | `pending_admin` until admin assigns |

## Reassignment

- **Admin:** `POST /api/admin/users/:id/reassign-coach`
- **Coach:** `POST /api/coach/heal-users/:id/reassign` (within own team)
- `referredBy*` fields never change on reassignment

## Related APIs

| Portal | Endpoints |
|--------|-----------|
| Admin | `POST /admin/users/:id/convert-to-heal`, `assign-coach`, `reassign-coach` |
| Coach | `GET /coach/heal-users`, `POST /coach/heal-users/:id/reassign` |
| Assistant | `GET /assistant/heal-users` |
| User | Consultancy payment auto-converts Seek → Heal on successful payment |

See [API reference](../api/README.md) for full route tables.

## Implementation

- `models/userConversionModel.js` — `convertSeekToHeal`
- `models/userAssignmentModel.js` — `reassignHealUser`, `assignPendingHealUser`
- `models/userAssignmentLogic.js` — validation & patch builders

## Tests

```bash
node --test tests/userAssignmentLogic.test.js
```
