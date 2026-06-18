# Database Schema Audit — Issues Report

**Audit date:** 2026-06-18  
**Resolution date:** 2026-06-18 — all **High** severity issues addressed in code + docs  
**Scope:** `Backend/tables/`, `Backend/models/`, `Backend/utils/fcmAudience.js`, controllers, routes, `DATABASE_ARCHITECTURE.md`, `docs/database/*`, `Backend/docs/*`  
**Method:** Cross-check DDL scripts, model access patterns, API usage, and existing documentation.

---

## High-severity resolutions (2026-06-18)

| # | Issue | Resolution |
|---|---|---|
| 1 | List endpoints Scan entire tables | All `list*` functions use `Backend/utils/dynamoList.js` → Query on `StatusCreatedAtIndex` / domain GSIs |
| 2 | Coach FCM push never delivers | `fcmId` added to `WellnessCoach` / `AssistantWellnessCoach` models + profile updates; `fcmAudience.js` queries `StatusCreatedAtIndex` |
| 3 | Admin composite PK | `createAdminTable.js` → single hash key `id`; `adminModel.js` uses `GetItem` with legacy composite fallback |
| 4 | 20 GSIs unused | List queries wired to GSIs (see [INDEXES.md](docs/database/INDEXES.md)) |
| 17 | In-memory pagination after full Scan | `dynamoList.paginateDynamo` uses `ExclusiveStartKey` skip/limit iteration on Query |

**Deploy note:** Run `node migration/migrateAll.js` from `Backend/` for schema upgrades (`Admin` PK, testimonial GSIs). Backups land in `migration/backup/`.

---

## Executive summary

The application uses **21 DynamoDB tables** in a **multi-table** layout migrated from Mongoose (comments and `_id` aliases remain). The schema is **functionally coherent** but suffers from:

1. ~~**20+ GSIs defined in DDL but not used**~~ — **Fixed:** list endpoints Query GSIs via `dynamoList.js`.
2. **Inconsistent attribute naming** (camelCase vs snake_case; `password` vs `passwordHash`; `profileImage` vs `profile_image`) — Medium; unchanged in this pass.
3. ~~**Broken coach push notification path**~~ — **Fixed:** `fcmId` on coach tables + Query-based harvest.
4. ~~**Admin composite primary key**~~ — **Fixed** in DDL + model (legacy fallback for existing rows).
5. **Documentation drift** — docs updated to match code.

No duplicate DynamoDB tables storing the same entity were found. Overlap is **conceptual** (e.g. `HealthConcern` vs `HealthDisorder`, testimonial tables) not redundant storage of identical rows.

**Not in codebase:** Session, Booking, Mood logs, Appointments — none exist in models or table scripts.

---

## Issues table

| # | Issue | Location | Severity | Recommendation |
|---|---|---|---|---|
| 1 | **List endpoints Scan entire tables** despite status-sort GSIs existing in DDL | `Backend/models/*` `list*` (via `dynamoList.js`) | **High** | ✅ **Resolved** — Query on `StatusCreatedAtIndex` / domain GSIs |
| 2 | **Coach FCM push never delivers** | `fcmAudience.js`, coach models, profile controllers | **High** | ✅ **Resolved** — `fcmId` persisted; Query harvest on `StatusCreatedAtIndex` |
| 3 | **Admin table uses composite PK (`id` + `createdAt`)** | `createAdminTable.js`, `adminModel.js` | **High** | ✅ **Resolved** — single-key PK in DDL; legacy fallback in model |
| 4 | **20 GSIs created but unused in application code** | DDL + models | **High** | ✅ **Resolved** — list queries wired (1 inactive: `SpecializationIdIndex`) |
| 5 | **`Admin.PhoneIndex` defined, never queried** | `Backend/tables/createAdminTable.js:27-32`; no `IndexName: "PhoneIndex"` in `adminModel.js` | **Medium** | Remove GSI or implement `getAdminByPhone` if product requires it |
| 6 | **`WellnessCoach.SpecializationIdIndex` unused** | `createWellnessCoachTables.js:52-58`; no Query in `wellnessCoachModel.js` | **Medium** | Use for admin “coaches by specialization” if needed; else remove |
| 7 | **Password field naming inconsistent** | `User` uses `passwordHash` (`userModel.js:146`); `Admin`, `WellnessCoach`, `AssistantWellnessCoach` use `password` (`adminModel.js:53`, `wellnessCoachModel.js:69`, `assistantWellnessCoachModel.js:71`) | **Medium** | Rename all to `passwordHash`; update `toPublicProfile.js` to strip one field name |
| 8 | **Profile image attribute naming inconsistent** | `profileImage` on User/Admin/Coach (`userModel.js:162`); `profile_image` on `ClientTestimonials`, `VideoTestimonials` (`clientTestimonials.js:56`, `videoTestimonials.js:54`) | **Medium** | Standardize to `profileImage` (camelCase) across tables and API |
| 9 | **`AppConfig` uses snake_case** while most tables use camelCase | `appConfigModel.js:31-63` (`app_name`, `payment_gateways`, `app_footer_text`, etc.) | **Medium** | Migrate to camelCase (`appName`, `paymentGateways`, …) with API compatibility layer during transition |
| 10 | **`fcm_id` snake_case** on User only | `userModel.js:163`; coaches lack field entirely | **Medium** | Rename to `fcmId`; add to coach tables if push to coaches is required (issue #2) |
| 11 | **`video_specification` snake_case** on HealthRecipe | `healthRecipeModel.js:82`; blocked from camelCase convention | **Low** | Rename to `videoSpecification` |
| 12 | **GSI naming inconsistent** — `StatusIndex` vs `StatusCreatedAtIndex` | `createFaqTable.js:18`, `createCouponTable.js:18` vs `createBannerTable.js:17` and 15 other tables | **Low** | Standardize on `StatusCreatedAtIndex` everywhere |
| 13 | **Dual OTP storage models** — registration uses `RegistrationOtp` table; login uses `otp`/`otpExpire` on identity records | `registrationOtpModel.js`; `authController.js:108,219,379` (user); `wellnessCoachController/authController.js:176-179`; `assistantWellnessCoachController/authController.js:100-103` | **Medium** | Document as intentional split, or unify login OTP into TTL table with `lookupKey` pattern |
| 14 | **Email/phone uniqueness only per table** — same email can exist on User and WellnessCoach | Per-table `EmailIndex` only; e.g. `userController/authController.js:66`, `wellnessCoachController/authController.js:102` check within single table | **Medium** | Product decision: allow or add cross-table uniqueness checks at registration |
| 15 | **`HealthRecipe.healthConcernId` not validated** against `HealthConcern` on create | `healthRecipeController.js:89-108` requires non-empty id but no `getHealthConcernById`; unlike `userController/authController.js` | **Medium** | Call `getHealthConcernById` before Put (same as user registration) |
| 16 | **No referential cleanup on delete** — deleting coach/concern/user leaves orphan FKs | No cascade logic in any model delete function | **Medium** | Add validation on delete or async cleanup jobs |
| 17 | **In-memory pagination after full Scan** — every `list*` loads all items then slices | `dynamoList.js` | **High** | ✅ **Resolved** — `ExclusiveStartKey` iteration with skip/limit on Query |
| 18 | **Legacy `_id` alias added at read time** (not in DynamoDB) | `withLegacyId()` in most models, e.g. `userModel.js:64-67` | **Low** | Deprecate `_id` in API responses; document as API-only alias |
| 19 | **Dead MongoDB utility** — `assertObjectId` uses mongoose; not in package.json; never imported | `Backend/utils/assertObjectId.js:1-10`; zero imports in repo | **Low** | Delete file; IDs are UUIDs not ObjectIds |
| 20 | **Mongoose migration comment in DDL** | `createFaqTable.js:17` | **Low** | Remove stale comment |
| 21 | **`docs/database/SECURITY.md` states public AppConfig may expose `payment_gateways` credentials** — code strips them | `docs/database/SECURITY.md` (public exposure matrix); actual: `publicAppConfigController.js:15-17` maps to `{ provider, isActive }` only | **Low** | Update SECURITY.md to match `toPublicClientAppConfig` |
| 22 | **`DATABASE_ARCHITECTURE.md` duplicate model path** — `Backend\models\appConfigModel.js` and `Backend/models/appConfigModel.js` listed in git as separate | Git status / Windows path normalization | **Low** | Single path in repo; avoid duplicate casing |
| 23 | **`StaticPage.StatusUpdatedAtIndex` unused** — list uses Scan, sorts by `updatedAt` in memory | `staticPageModel.js:47-60`; `createStaticPageTable.js:22-28` | **Medium** | Query `StatusUpdatedAtIndex` for admin page list |
| 24 | **`Notification` GSIs unused** — filter by `audienceType`/`status` via Scan | `notificationModel.js:112-155`; `createNotificationTable.js:16-31` | **Medium** | Query `AudienceSentAtIndex` / `StatusSentAtIndex` |
| 25 | **`CouponCodeIndex` only used for duplicate check**, no public coupon validation endpoint | `couponModel.js:42-54`; routes only under `/api/admin/coupons` | **Low** | Keep index if admin duplicate check is sufficient; add public endpoint only if product requires |
| 26 | **PII handling inconsistent across identity tables** | `toPublicProfile` strips secrets but returns full PII to authenticated callers; coach/user parallel schemas differ (`password` vs `passwordHash`) | **Medium** | Align schemas and document per-role field exposure |
| 27 | **Login OTP stored in plaintext** on User/Coach records | `userModel.js:165-166`; coach `otp` fields | **Medium** | Acceptable for short-lived OTP; prefer TTL table or hash if threat model requires |
| 28 | **`BatchWrite` delete for OTP has no unprocessed retry** | `registrationOtpModel.js:79-85` | **Low** | Retry loop for `UnprocessedItems` |
| 29 | **Conceptual overlap: `HealthConcern` vs `HealthDisorder`** — both health catalogs, no FK between them | Separate tables and public list endpoints | **Low** | Keep separate if product distinguishes “concerns” vs “disorders”; document domain split |
| 30 | **Similar testimonial schemas** — `ClientTestimonials` vs `VideoTestimonials` | Separate tables, overlapping `name`/`profile_image`/`status` | **Low** | Acceptable multi-table split by media type; optional shared attribute naming standardization |
| 31 | **`CelebrationBanners` vs `Banner`** — both image+title marketing | Different `type`/date fields on celebration | **Low** | Keep separate tables; access patterns differ (`type` filter) |
| 32 | **Timestamps consistently ISO 8601 strings** — good | All models use `new Date().toISOString()` | — | **No action** — maintain in standard |
| 33 | **`ttl` on RegistrationOtp is Number; `otpExpire` is String** — intentional dual representation | `registrationOtpModel.js:22-35` | — | **No action** — document both fields |
| 34 | **Docs claim 21 tables / multi-table** — matches code | `DATABASE_ARCHITECTURE.md`, `docs/database/*` | — | **Accurate** |
| 35 | **No Session/Booking/Mood/Appointment entities** in code or docs inventory | Full repo search | — | **N/A** — not applicable to this app today |

---

## Documentation vs code mismatches

| Document | Claim | Code reality | Severity |
|---|---|---|---|
| `docs/database/SECURITY.md` | Public app config may expose `payment_gateways` credentials | `publicAppConfigController.js:15-17` strips credentials; returns `provider` + `isActive` only | Low |
| `docs/database/INDEXES.md` | 20 inactive GSIs | Confirmed — no `IndexName` in corresponding list functions | Accurate (issue, not doc bug) |
| `Backend/docs/user_auth.md` | Registration OTP in `RegistrationOtp` table | Matches `registrationOtpModel.js` | Accurate |
| `DATABASE_ARCHITECTURE.md` | Coach FCM via scan | Code scans coach tables but coaches lack `fcm_id` — doc implies field exists on those tables | Medium — doc should note field gap |

---

## Redundant / overlapping data (not duplicate tables)

| Overlap | Tables | Assessment |
|---|---|---|
| Health taxonomy | `HealthConcern`, `HealthDisorder` | Different attributes (`symptoms`, `type` on disorder); separate public APIs — **not duplicate tables** |
| Social proof | `ClientTestimonials`, `VideoTestimonials`, `Transformation` | Different content shapes and APIs — **intentional separation** |
| Marketing images | `Banner`, `CelebrationBanners` | Celebration has `type`, `startDate`, `endDate` — **justified split** |
| OTP | `RegistrationOtp` + inline `otp` on identity rows | **Redundant pattern** across flows (issue #13) |

---

## Orphaned / dead code

| Item | Location |
|---|---|
| `assertObjectId` (mongoose) | `Backend/utils/assertObjectId.js` — never imported |
| `Backend/script/migrate.js` | Fully commented out |
| `Admin.PhoneIndex` | DDL only |
| Coach `fcm_id` scan | `fcmAudience.js` — scans tables with no matching attribute |

---

## Missing keys / indexes for actual access patterns

| Access pattern (from controllers) | Current implementation | Missing / underused |
|---|---|---|
| List active FAQs, banners, recipes, etc. | Scan + `status` filter | `StatusCreatedAtIndex` / `StatusIndex` Query |
| List recipes by `healthConcernId` | Scan + filter (`miscController.js:161-168`) | `HealthConcernCreatedAtIndex` Query |
| List transformations by `userId` | Scan + filter | `UserIdCreatedAtIndex` Query |
| List notifications by `audienceType` | Scan + filter | `AudienceSentAtIndex` Query |
| List celebration banners by `type` | Scan + filter | `TypeCreatedAtIndex` Query |
| List users/coaches by `status` (admin) | Scan | `StatusCreatedAtIndex` Query |
| Text search on name/email/phone | Scan + `contains` | No GSI possible — needs OpenSearch or scan subset after status Query |

---

## Severity counts

| Severity | Count | Resolved (High) |
|---|---|---|
| High | 5 | 5 |
| Medium | 14 | — |
| Low | 12 | — |

---

## Next step

High-severity fixes are implemented. Remaining **Medium/Low** items (naming conventions, OTP unification, FK cleanup) are tracked in **`STANDARD_DB_STRUCTURE.md`** Phase C–E.
