# User Referral & Coach Assignment

This document describes the Seek → Heal conversion assignment logic, DynamoDB schema additions, and edge-case assumptions for the Wellness platform.

## User tiers

| Tier | Registration | Coach assignment |
|------|--------------|------------------|
| **Seek** (free) | Self-register via existing OTP flow; no referral required | None |
| **Heal** (paid) | Only via upgrade/conversion (`convertSeekToHeal`) | Required unless pending admin |

Seek self-registration is unchanged: new users default to `userTier: "seek"` with no coach fields.

## Role hierarchy & referral codes

Every **Wellness Coach**, **Assistant Wellness Coach**, and **Heal user** receives a platform-unique `referralCode` at creation/conversion time.

Lookup is O(1) via the **`ReferralCode`** registry table (PK = normalized uppercase code):

| Field | Purpose |
|-------|---------|
| `referralCode` | Partition key; unique platform-wide |
| `entityType` | `wellness_coach` \| `assistant_wellness_coach` \| `user` |
| `entityId` | ID of the owning record |
| `ownerCoachId` | Owning Wellness Coach for peer-referral resolution |

Coach and assistant records also store `referralCode` denormalized on their own tables for display.

## User assignment fields (Heal only)

| Field | Mutable | Purpose |
|-------|---------|---------|
| `userTier` | Once (seek → heal) | `seek` or `heal` |
| `referralCode` | Set at conversion | This user's shareable code |
| `referredByUserId` | **Immutable** after conversion | Peer referrer user id (null for coach/assistant codes) |
| `referredByCode` | **Immutable** | Code used at conversion |
| `referredByEntityType` | **Immutable** | `wellness_coach` \| `assistant_wellness_coach` \| `user` |
| `referredByEntityId` | **Immutable** | Coach, assistant, or user id that referred them |
| `assignedCoachId` | Yes (reassignment) | Direct assignee (coach or assistant id) |
| `assignedCoachType` | Yes | `wellness_coach` \| `assistant_wellness_coach` |
| `parentCoachId` | Yes | Owning Wellness Coach (denormalized at write time) |
| `assignmentStatus` | Yes | `assigned` \| `pending_admin` |
| `convertedAt` | **Immutable** | ISO timestamp of upgrade |

### GSIs

| Table | Index | Keys | Use |
|-------|-------|------|-----|
| `User` | `ParentCoachIndex` | `parentCoachId` + `createdAt` | All Heal users under a coach (direct + via assistants) |
| `ReferralCode` | (table PK) | `referralCode` | Resolve code → entity in O(1) |

Paid users resolve to their owning coach via **`parentCoachId`** on the user item — no recursive chain walks at read time.

## Conversion rules (Seek → Heal)

Implemented in `models/userConversionModel.js` → `convertSeekToHeal(userId, { referralCode })`.

### 1. Wellness Coach referral code

- Assign directly to that coach.
- `assignedCoachType = wellness_coach`
- `parentCoachId = assignedCoachId`

### 2. Assistant Wellness Coach referral code

- Assign to the assistant.
- `assignedCoachType = assistant_wellness_coach`
- `parentCoachId = assistant.wellnessCoachId` (rollup for reporting)

### 3. Heal user peer referral code

- **Not** assigned to the referring paid user.
- Assigned to the referring user's **`parentCoachId`** (owning Wellness Coach), read at conversion time.
- Works for any peer-referral depth because each Heal user stores their resolved `parentCoachId` when they convert — no chain traversal.

### 4. No referral code

- `assignmentStatus = pending_admin`
- No coach fields set until Admin assigns via `assignPendingHealUser`.

## Reassignment

`models/userAssignmentModel.js`:

- **`reassignHealUser`** — change `assignedCoachId`, `assignedCoachType`, `parentCoachId`; `referredBy*` stays unchanged.
- **`assignPendingHealUser`** — first-time assignment for pending-admin users.
- When a Heal user is reassigned, `ReferralCode.ownerCoachId` is updated so **future** peer referrals use the new coach.

Coaches may reassign only within their hierarchy (`actingCoachId` validation).

## Validation

`validateHealUserAssignment` / `assertHealUserAssignment` in `models/userAssignmentLogic.js`:

- Seek users: no assignment requirements.
- Heal + `pending_admin`: no coach fields.
- Heal + `assigned`: requires `assignedCoachId`, `assignedCoachType`, `parentCoachId`; direct coach assignment requires `parentCoachId === assignedCoachId`.

## Edge cases (assumptions)

### Referred users after referrer reassignment

**Assumption:** Users referred before a Heal user's reassignment **stay** with the coach assigned at their own conversion time. Only **new** peer referrals after reassignment use the updated `ReferralCode.ownerCoachId` / referrer `parentCoachId`.

### Deactivated assistant

**Assumption:** Users assigned to a deactivated assistant **are not auto-moved**. Admin must manually reassign.

### Coach vs assistant assignment mixing

**Assumption:** Conversion via a coach's or assistant's referral code sets assignment accordingly. Moving a user between direct coach and assistant assignment is allowed only through explicit Admin/coach **reassignment** — not via referral code reuse.

## API integration (not wired yet)

Call `convertSeekToHeal` from your paid-upgrade endpoint after payment succeeds. Wire `reassignHealUser` / `assignPendingHealUser` to Admin and coach dashboard endpoints as needed.

## Migration

Run from `Backend/`:

```bash
node migration/migrateAll.js --only=05-user-referral-assignment
```

This creates the `ReferralCode` table, adds `ParentCoachIndex` on `User`, backfills `userTier=seek` on existing users, and generates referral codes for existing coaches and assistants.

## Tests

```bash
node --test tests/userAssignmentLogic.test.js
```

Covers all four conversion paths, chained peer referral (2+ levels), validation, and reassignment patch shape.
