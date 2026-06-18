# Database Schema Audit — Issues Report

**Audit date:** 2026-06-18  
**Resolution date:** 2026-06-18 — all **High** severity issues + media naming (#8, #11, #30) addressed in code, migrations, and docs  
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

**Deploy note:** Run `node migration/migrateAll.js` from `Backend/` for schema upgrades. See `Backend/migration/README.md` for migrations `01`–`04`.

---

## Media & naming resolutions (2026-06-18)

| # | Issue | Resolution |
|---|---|---|
| 8 | `profile_image` on testimonials | `profileImage` in DynamoDB; `mediaFieldAliases.js` dual-read; migration `04-media-field-camelcase` |
| 11 | `video_specification` on HealthRecipe | `videoSpecification`; same dual-read + migration |
| 30 | Testimonial schema overlap | Shared `profileImage` attribute across `ClientTestimonials` / `VideoTestimonials` |

---

## Executive summary

The application uses **21 DynamoDB tables** in a **multi-table** layout migrated from Mongoose (comments and `_id` aliases remain). The schema is **functionally coherent** but suffers from:

1. ~~**20+ GSIs defined in DDL but not used**~~ — **Fixed:** list endpoints Query GSIs via `dynamoList.js`.
2. **Inconsistent attribute naming** (camelCase vs snake_case; `password` vs `passwordHash`) — Medium; media fields standardized (`profileImage`, `videoSpecification`).
3. ~~**Broken coach push notification path**~~ — **Fixed:** `fcmId` on coach tables + Query-based harvest.
4. ~~**Admin composite primary key**~~ — **Fixed** in DDL + model (legacy fallback for existing rows).
5. **Documentation drift** — docs refreshed 2026-06-18 to match code and migrations.

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
| 5 | **`Admin.PhoneIndex` defined, never queried** | `createAdminTable.js` (removed) | **Medium** | ✅ **Resolved** — GSI removed from DDL; migration `03-admin-drop-phone-index` |
| 6 | **`WellnessCoach.SpecializationIdIndex` unused** | `createWellnessCoachTables.js:52-58`; no Query in `wellnessCoachModel.js` | **Medium** | Use for admin “coaches by specialization” if needed; else remove |
| 7 | **Password field naming inconsistent** | `User` uses `passwordHash` (`userModel.js:146`); `Admin`, `WellnessCoach`, `AssistantWellnessCoach` use `password` (`adminModel.js:53`, `wellnessCoachModel.js:69`, `assistantWellnessCoachModel.js:71`) | **Medium** | Rename all to `passwordHash`; update `toPublicProfile.js` to strip one field name |
| 8 | **Profile image attribute naming inconsistent** | Testimonial models | **Medium** | ✅ **Resolved** — `profileImage` (dual-read `profile_image` during transition) |
| 9 | **`AppConfig` uses snake_case** while most tables use camelCase | `appConfigModel.js:31-63` (`app_name`, `payment_gateways`, `app_footer_text`, etc.) | **Medium** | Migrate to camelCase (`appName`, `paymentGateways`, …) with API compatibility layer during transition |
| 10 | **`fcm_id` snake_case** on User; coaches now have `fcmId` | `userModel.js`; coach models | **Medium** | Coaches ✅ `fcmId`; User still stores `fcm_id` — rename pending (Phase C3) |
| 11 | **`video_specification` snake_case** on HealthRecipe | `healthRecipeModel.js` | **Low** | ✅ **Resolved** — `videoSpecification` |
| 12 | **GSI naming inconsistent** — `StatusIndex` vs `StatusCreatedAtIndex` | `createFaqTable.js:18`, `createCouponTable.js:18` vs `createBannerTable.js:17` and 15 other tables | **Low** | Standardize on `StatusCreatedAtIndex` everywhere |
| 13 | **Dual OTP storage models** — registration uses `RegistrationOtp` table; login uses `otp`/`otpExpire` on identity records | `registrationOtpModel.js`; `authController.js:108,219,379` (user); `wellnessCoachController/authController.js:176-179`; `assistantWellnessCoachController/authController.js:100-103` | **Medium** | Document as intentional split, or unify login OTP into TTL table with `lookupKey` pattern |
| 14 | **Email/phone uniqueness only per table** — same email can exist on User and WellnessCoach | Per-table `EmailIndex` only; e.g. `userController/authController.js:66`, `wellnessCoachController/authController.js:102` check within single table | **Medium** | Product decision: allow or add cross-table uniqueness checks at registration |
| 15 | **`HealthRecipe.healthConcernId` not validated** against `HealthConcern` on create | `healthRecipeController.js:89-108` requires non-empty id but no `getHealthConcernById`; unlike `userController/authController.js` | **Medium** | Call `getHealthConcernById` before Put (same as user registration) |
| 16 | **No referential cleanup on delete** — deleting coach/concern/user leaves orphan FKs | No cascade logic in any model delete function | **Medium** | Add validation on delete or async cleanup jobs |
| 17 | **In-memory pagination after full Scan** — every `list*` loads all items then slices | `dynamoList.js` | **High** | ✅ **Resolved** — `ExclusiveStartKey` iteration with skip/limit on Query |
| 18 | **Legacy `_id` alias added at read time** (not in DynamoDB) | `withLegacyId()` in most models, e.g. `userModel.js:64-67` | **Low** | Deprecate `_id` in API responses; document as API-only alias |
| 19 | **Dead MongoDB utility** — `assertObjectId` uses mongoose; not in package.json; never imported | `Backend/utils/assertObjectId.js:1-10`; zero imports in repo | **Low** | Delete file; IDs are UUIDs not ObjectIds |
| 20 | **Mongoose migration comment in DDL** | `createFaqTable.js:17` | **Low** | Remove stale comment |
| 21 | **`SECURITY.md` overstated payment gateway exposure** | `docs/database/SECURITY.md` | **Low** | ✅ **Resolved** — public matrix documents credential stripping |
| 23 | **`StaticPage.StatusUpdatedAtIndex` unused** | `staticPageModel.js` | **Medium** | ✅ **Resolved** — `listPages` queries `StatusUpdatedAtIndex` |
| 24 | **`Notification` GSIs unused** | `notificationModel.js` | **Medium** | ✅ **Resolved** — `AudienceSentAtIndex` / `StatusSentAtIndex` |
| 22 | **`DATABASE_ARCHITECTURE.md` duplicate model path** | Git / Windows path casing | **Low** | Single path in repo; avoid duplicate casing |
| 25 | **`CouponCodeIndex` only used for duplicate check**, no public coupon validation endpoint | `couponModel.js:42-54`; routes only under `/api/admin/coupons` | **Low** | Keep index if admin duplicate check is sufficient; add public endpoint only if product requires |
| 26 | **PII handling inconsistent across identity tables** | `toPublicProfile` strips secrets but returns full PII to authenticated callers; coach/user parallel schemas differ (`password` vs `passwordHash`) | **Medium** | Align schemas and document per-role field exposure |
| 27 | **Login OTP stored in plaintext** on User/Coach records | `userModel.js:165-166`; coach `otp` fields | **Medium** | Acceptable for short-lived OTP; prefer TTL table or hash if threat model requires |
| 28 | **`BatchWrite` delete for OTP has no unprocessed retry** | `registrationOtpModel.js:79-85` | **Low** | Retry loop for `UnprocessedItems` |
| 29 | **Conceptual overlap: `HealthConcern` vs `HealthDisorder`** — both health catalogs, no FK between them | Separate tables and public list endpoints | **Low** | Keep separate if product distinguishes “concerns” vs “disorders”; document domain split |
| 30 | **Similar testimonial schemas** — `ClientTestimonials` vs `VideoTestimonials` | Separate tables | **Low** | ✅ **Resolved** — shared `profileImage` naming |
| 31 | **`CelebrationBanners` vs `Banner`** — both image+title marketing | Different `type`/date fields on celebration | **Low** | Keep separate tables; access patterns differ (`type` filter) |
| 32 | **Timestamps consistently ISO 8601 strings** — good | All models use `new Date().toISOString()` | — | **No action** — maintain in standard |
| 33 | **`ttl` on RegistrationOtp is Number; `otpExpire` is String** — intentional dual representation | `registrationOtpModel.js:22-35` | — | **No action** — document both fields |
| 34 | **Docs claim 21 tables / multi-table** — matches code | `DATABASE_ARCHITECTURE.md`, `docs/database/*` | — | **Accurate** |
| 35 | **No Session/Booking/Mood/Appointment entities** in code or docs inventory | Full repo search | — | **N/A** — not applicable to this app today |

---

## Documentation vs code mismatches

| Document | Claim | Code reality | Status |
|---|---|---|---|
| `docs/database/SECURITY.md` | Public app config payment gateway exposure | `publicAppConfigController.js` strips credentials; docs updated | ✅ Aligned |
| `docs/database/INDEXES.md` | GSI usage | ~30 GSIs active in list/lookup code; `SpecializationIdIndex` still unused | Accurate |
| `Backend/docs/user_auth.md` | Registration OTP in `RegistrationOtp` table | Matches `registrationOtpModel.js` | Accurate |
| `DATABASE_ARCHITECTURE.md` | Coach FCM harvest | `fcmAudience.js` Queries `StatusCreatedAtIndex`; coaches store `fcmId` | ✅ Aligned |

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

| Item | Location | Notes |
|---|---|---|
| `assertObjectId` (mongoose) | `Backend/utils/assertObjectId.js` | Never imported — delete candidate (#19) |
| `Backend/script/migrate.js` | Fully commented out | Superseded by `Backend/migration/` |

---

## Access patterns — resolved (2026-06-18)

| Access pattern | Implementation |
|---|---|
| List active FAQs, banners, recipes, testimonials, etc. | Query `StatusCreatedAtIndex` / `StatusIndex` via `dynamoList.js` |
| List recipes by `healthConcernId` | `HealthRecipe.HealthConcernCreatedAtIndex` |
| List transformations by `userId` | `Transformation.UserIdCreatedAtIndex` |
| List notifications by `audienceType` / `status` | `AudienceSentAtIndex` / `StatusSentAtIndex` |
| List celebration banners by `type` | `TypeCreatedAtIndex` |
| List users/coaches by `status` (admin) | `StatusCreatedAtIndex` |
| List static pages (admin) | `StaticPage.StatusUpdatedAtIndex` |
| FCM token harvest | Query `StatusCreatedAtIndex` + `fcmId` / `fcm_id` filter |
| Text search on name/email/phone | `FilterExpression` on status Query results (subset only) |

**Remaining gap:** full-text search across large partitions still needs OpenSearch or similar if product requires it.

---

## Severity counts

| Severity | Total | Resolved |
|---|---|---|
| High | 5 | 5 |
| Medium | 14 | 5 (#5, #8, #23, #24; #10 coaches only) |
| Low | 12 | 3 (#11, #21, #30) |

---

## Next step

High-severity fixes and media attribute standardization are implemented. Run `node migration/migrateAll.js` on each environment. Remaining **Medium/Low** items (password naming, AppConfig camelCase, User `fcm_id`, OTP unification, FK cleanup) are tracked in **`STANDARD_DB_STRUCTURE.md`** Phase C–E.
