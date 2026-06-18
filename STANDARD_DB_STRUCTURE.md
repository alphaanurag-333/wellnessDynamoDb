# Standardized DynamoDB Structure

Target schema and conventions resolving issues in **`ISSUES_REPORT.md`**. Every table, key, and index below is justified by an **existing access pattern** in `Backend/models/` and controllers — no speculative entities.

**Entities not in this codebase (ignored):** Session, Booking, Mood/Health Logs, Appointments.

---

## Summary of design decisions

| Decision | Choice | Justification (from code) |
|---|---|---|
| **Table layout** | **Multi-table** (21 tables) | One `TABLE` constant per model; independent CRUD lifecycles; FK strings + app-level joins (`populateWellnessCoach`) — not single-table |
| **Naming convention** | **camelCase** for all DynamoDB attributes | Align User/Coach majority; remaining outliers: `app_name`, `fcm_id` (User), `password` (Admin/Coach). Testimonial `profileImage` and recipe `videoSpecification` ✅ migrated |
| **Primary keys** | `id` (UUID string) for all entity tables except `RegistrationOtp` (`lookupKey`) and `AppConfig` (fixed `id`) | Matches all current `GetItem`/`PutItem` patterns |
| **Admin PK** | **Single hash key `id` only** | Removes `getAdminKeyById` Query workaround (ISSUES #3) |
| **Timestamps** | ISO 8601 **String** (`createdAt`, `updatedAt`, `sentAt`, `otpExpire`) | Consistent across all models today |
| **Status listing** | **Query GSI** `StatusCreatedAtIndex` (unified name) | Replaces Scan in all `list*` with `status` filter (ISSUES #1, #4, #17) |
| **Billing mode** | `PAY_PER_REQUEST` | Already used in all `create*.js` scripts |
| **TTL** | `RegistrationOtp.ttl` (Number, Unix seconds) only | Only table with TTL in DDL today |
| **Denormalization** | Minimal — keep FK ids; optional read-time embed only | Matches `assistantWellnessCoachModel.populateWellnessCoach` |
| **OTP** | Keep **two stores**: `RegistrationOtp` (pre-register) + short-lived fields on identity rows (login/delete) | Both patterns actively used in auth controllers (document, don’t merge without product sign-off) |

---

## Naming conventions

### Attribute rules

| Rule | Example |
|---|---|
| camelCase for new/renamed attributes | `profileImage`, `fcmId`, `appName` |
| Foreign keys: `{entity}Id` | `wellnessCoachId`, `healthConcernId`, `userId`, `specializationId` |
| Lookup keys: descriptive compound | `phoneKey` = `{phoneCountryCode}#{phone}` (keep — used in GSI) |
| Normalized search keys | `titleKey` (lowercase title), `couponCode` (uppercase) |
| Booleans | `termsAccepted`, `whatsappSameAsMobile` |
| Credentials | **`passwordHash`** on all identity tables (not `password`) |
| Media | S3 object key strings: `profileImage`, `thumbnail`, `video` |
| API legacy | `_id` deprecated in JSON responses (not stored in DynamoDB) |

### Index naming

| Pattern | Name | Keys |
|---|---|---|
| Unique lookup | `{Field}Index` | `EmailIndex`, `PhoneKeyIndex`, `SlugIndex`, `CouponCodeIndex`, `TitleKeyIndex` |
| Status list | `StatusCreatedAtIndex` | `status` (HASH) + `createdAt` (RANGE) |
| Parent-child list | `{Parent}Index` | `WellnessCoachIndex`: `wellnessCoachId` + `createdAt` |
| Domain-specific list | Descriptive | `HealthConcernCreatedAtIndex`, `UserIdCreatedAtIndex`, `AudienceSentAtIndex`, `TypeCreatedAtIndex` |
| Static pages by status | `StatusUpdatedAtIndex` | `status` + `updatedAt` |

Rename existing `Faq.StatusIndex` and `Coupon.StatusIndex` → `StatusCreatedAtIndex` for consistency (ISSUES #12).

---

## Final table schemas

> **Billing:** `PAY_PER_REQUEST` on all tables  
> **LSI:** None  
> **Streams:** Not specified in code — needs confirmation  
> **Projection:** `ALL` on all GSIs (unchanged)

---

### Identity domain

#### `User`

| | |
|---|---|
| **PK** | `id` (S) |
| **SK** | — |
| **TTL** | — |

**GSIs (justified by access patterns):**

| GSI | Keys | Query |
|---|---|---|
| `EmailIndex` | `email` | Login, duplicate email (`getUserByEmail`) |
| `PhoneKeyIndex` | `phoneKey` | Login, duplicate phone (`getUserByPhone`) |
| `StatusCreatedAtIndex` | `status`, `createdAt` | Admin `listUsers` with status filter (replaces Scan) |

**Attributes:** `name`, `email`, `passwordHash`, `phoneCountryCode`, `phone`, `phoneKey`, `whatsappSameAsMobile`, `whatsappCountryCode`, `whatsappPhone`, `dob`, `gender`, `country`, `state`, `city`, `primaryHealthConcern`, `termsAccepted`, `termsAcceptedAt`, `profileImage`, `fcmId`, `status`, `otp`, `otpExpire`, `resetPasswordToken`, `resetPasswordExpire`, `createdAt`, `updatedAt`

*Resolves ISSUES #7, #10, #8 (rename from `fcm_id`).*

---

#### `Admin`

| | |
|---|---|
| **PK** | `id` (S) only — **remove `createdAt` sort key** |
| **TTL** | — |

**GSIs:**

| GSI | Keys | Query |
|---|---|---|
| `EmailIndex` | `email` | `getAdminByEmail`, login |

**Remove:** `PhoneIndex` (unused — ISSUES #5)

**Attributes:** `name`, `email`, `passwordHash`, `phone`, `profileImage`, `status`, `resetPasswordToken`, `resetPasswordExpire`, `createdAt`, `updatedAt`

*Resolves ISSUES #3, #7.*

---

#### `WellnessCoach`

| | |
|---|---|
| **PK** | `id` (S) |

**GSIs:**

| GSI | Keys | Query |
|---|---|---|
| `EmailIndex` | `email` | Login, register duplicate check |
| `PhoneKeyIndex` | `phoneKey` | Login, duplicate phone |
| `StatusCreatedAtIndex` | `status`, `createdAt` | Admin list coaches |
| `SpecializationIdIndex` | `specializationId`, `createdAt` | Admin filter coaches by specialization (if UI uses `specializationId` search — already in Scan filter `wellnessCoachModel.js:250`) |

**Attributes:** add **`fcmId`** for coach push audience (`fcmAudience.js` — ISSUES #2); rename `password` → `passwordHash`; `name`, `email`, `phoneCountryCode`, `phone`, `phoneKey`, `profileImage`, `bio`, `specializationId`, `country`, `state`, `city`, `status`, `approvalStatus`, `otp`, `otpExpire`, `createdAt`, `updatedAt`

---

#### `AssistantWellnessCoach`

| | |
|---|---|
| **PK** | `id` (S) |

**GSIs:**

| GSI | Keys | Query |
|---|---|---|
| `WellnessCoachIndex` | `wellnessCoachId`, `createdAt` | `listAssistantsByWellnessCoachId`, `countAssistantsByWellnessCoachId` |
| `EmailIndex` | `email` | Login, duplicate check |
| `PhoneKeyIndex` | `phoneKey` | Login |
| `StatusCreatedAtIndex` | `status`, `createdAt` | Admin list all assistants with status filter |

**Attributes:** add **`fcmId`**; `passwordHash`; `wellnessCoachId`, `name`, `email`, `phoneCountryCode`, `phone`, `phoneKey`, `profileImage`, `designation`, `status`, `otp`, `otpExpire`, `createdAt`, `updatedAt`

---

#### `RegistrationOtp`

| | |
|---|---|
| **PK** | `lookupKey` (S) — `email:{email}` or `phone:{phoneKey}` |
| **TTL** | `ttl` (N) |

**Attributes:** `otp`, `otpExpire` (S), `createdAt`, `updatedAt`

*No change to structure — ISSUES #13 accepted as dual OTP design.*

---

### Platform domain

#### `AppConfig`

| | |
|---|---|
| **PK** | `id` = `"app-config"` |

**GSIs:** None (singleton Get by PK)

**Attributes (camelCase target):** `appName`, `appEmail`, `appMobile`, `appDetail`, `adminLogo`, `userLogo`, `favicon`, `address`, `latitude`, `longitude`, `facebook`, `twitter`, `instagram`, `linkedin`, `appDetails`, `appFooterText`, `improvedUser`, `successRate`, `averageRating`, `happyClients`, `taxType`, `taxValue`, `consultancyAmount`, `paymentMethods` (L), `paymentGateways` (L), `createdAt`, `updatedAt`

*Resolves ISSUES #9. Public API continues stripping gateway secrets via `toPublicClientAppConfig`.*

---

#### `Coupon`

| PK `id` | GSIs: `StatusCreatedAtIndex` (rename from `StatusIndex`), `CouponCodeIndex` |
|---|---|
| Attributes | `title`, `status`, `couponCode`, `discountType`, `value` (N), `createdAt`, `updatedAt` |

---

#### `Notification`

| PK `id` | GSIs: `StatusSentAtIndex`, `AudienceSentAtIndex` |
|---|---|
| Attributes | `audienceType`, `message`, `image`, `status`, `sentAt`, `createdAt`, `updatedAt` |

*Wire `listNotifications` to GSIs (ISSUES #24).*

---

#### `StaticPage`

| PK `id` | GSIs: `SlugIndex`, `StatusUpdatedAtIndex` |
|---|---|
| Attributes | `title`, `slug`, `content`, `status`, `createdAt`, `updatedAt` |

---

### Marketing & CMS domain

Shared content shape: `id`, `title`/`name`, media fields, `status`, `createdAt`, `updatedAt`.

| Table | PK | GSIs | Distinct fields |
|---|---|---|---|
| `Faq` | `id` | `StatusCreatedAtIndex` | `question`, `answer` |
| `Banner` | `id` | `StatusCreatedAtIndex` | `title`, `image` |
| `CelebrationBanners` | `id` | `TypeCreatedAtIndex`, `StatusCreatedAtIndex` | `title`, `image`, `type`, `startDate`, `endDate` |
| `ClientTestimonials` | `id` | `StatusCreatedAtIndex` | `name`, `rating`, `description`, **`profileImage`** |
| `VideoTestimonials` | `id` | `StatusCreatedAtIndex` | `name`, **`profileImage`**, `ytLink`, `video`, `type` |
| `Transformation` | `id` | `StatusCreatedAtIndex`, `UserIdCreatedAtIndex` | `timeTaken`, `achievements`, `oldImage`, `newImage`, `description`, `userId?` |

*Testimonial tables use `StatusCreatedAtIndex` (DDL + migration `02`). `profileImage` standardized via migration `04` and `mediaFieldAliases.js`.*

---

### Health content domain

| Table | PK | GSIs | FK |
|---|---|---|---|
| `HealthConcern` | `id` | `StatusCreatedAtIndex` | — |
| `HealthDisorder` | `id` | `StatusCreatedAtIndex` | — |
| `HealthTool` | `id` | `StatusCreatedAtIndex` | — |
| `HealthRecipe` | `id` | `StatusCreatedAtIndex`, `HealthConcernCreatedAtIndex` | `healthConcernId` |
| `Yoga` | `id` | `StatusCreatedAtIndex` | — |
| `Specialization` | `id` | `TitleKeyIndex`, `StatusCreatedAtIndex` | — |

**HealthRecipe** uses `videoSpecification` (migration `04`; dual-read legacy `video_specification` during transition).

Validate `healthConcernId` on create/update (ISSUES #15).

---

## Access pattern mapping

Every query maps to **exactly one** table/index.

| ID | Application function | DynamoDB operation | Table / Index |
|---|---|---|---|
| AP-01 | `getUserById` | Get | `User` PK |
| AP-02 | `getUserByEmail` | Query | `User.EmailIndex` |
| AP-03 | `getUserByPhone` | Query | `User.PhoneKeyIndex` |
| AP-04 | `listUsers(status)` | Query | `User.StatusCreatedAtIndex` |
| AP-05 | `listUsers(search)` | Query + Filter | `User.StatusCreatedAtIndex` + `contains` Filter*, or Scan if no status |
| AP-06 | `getAdminByEmail` | Query | `Admin.EmailIndex` |
| AP-07 | `getAdminById` | Get | `Admin` PK |
| AP-08 | `getWellnessCoachByEmail/Phone` | Query | `WellnessCoach.EmailIndex` / `PhoneKeyIndex` |
| AP-09 | `listWellnessCoaches(status)` | Query | `WellnessCoach.StatusCreatedAtIndex` |
| AP-10 | `listWellnessCoaches(specializationId)` | Query | `WellnessCoach.SpecializationIdIndex` |
| AP-11 | `listAssistantsByWellnessCoachId` | Query | `AssistantWellnessCoach.WellnessCoachIndex` |
| AP-12 | `countAssistantsByWellnessCoachId` | Query COUNT | `AssistantWellnessCoach.WellnessCoachIndex` |
| AP-13 | `getPageBySlug` | Query | `StaticPage.SlugIndex` |
| AP-14 | `getCouponByCode` | Query | `Coupon.CouponCodeIndex` |
| AP-15 | `getSpecializationByTitleKey` | Query | `Specialization.TitleKeyIndex` |
| AP-16 | `save/findRegistrationOtp` | Put / Get | `RegistrationOtp` PK |
| AP-17 | `getAppConfig` | Get | `AppConfig` PK `app-config` |
| AP-18 | `listFaqs/Banners/Yoga/…(status)` | Query | `{Table}.StatusCreatedAtIndex` |
| AP-19 | `listHealthRecipes(healthConcernId)` | Query | `HealthRecipe.HealthConcernCreatedAtIndex` |
| AP-20 | `listTransformations(userId)` | Query | `Transformation.UserIdCreatedAtIndex` |
| AP-21 | `listCelebrationBanners(type)` | Query | `CelebrationBanners.TypeCreatedAtIndex` |
| AP-22 | `listNotifications(audienceType)` | Query | `Notification.AudienceSentAtIndex` |
| AP-23 | `listPages` (admin) | Query | `StaticPage.StatusUpdatedAtIndex` |
| AP-24 | `collectFcmTokens(users)` | Query/Scan† | `User` — prefer GSI `StatusCreatedAtIndex` + filter `attribute_exists(fcmId)` |
| AP-25 | `collectFcmTokens(coaches)` | Query/Scan† | `WellnessCoach` + `AssistantWellnessCoach` after `fcmId` added |
| AP-26 | All `get*ById` | Get | Respective table PK |

\*Text search (`contains`) cannot use GSI hash key — apply FilterExpression on Query result or secondary search service.

†After `fcmId` exists on coach tables; use status Query then filter tokens in app or sparse GSI pattern (Open Question).

---

## Entity relationship diagram (standardized)

```mermaid
erDiagram
    User ||--o| HealthConcern : "primaryHealthConcern"
    WellnessCoach }o--|| Specialization : "specializationId"
    AssistantWellnessCoach }o--|| WellnessCoach : "wellnessCoachId"
    HealthRecipe }o--|| HealthConcern : "healthConcernId"
    Transformation }o--o| User : "userId"

    User {
        string id PK
        string email GSI
        string phoneKey GSI
        string primaryHealthConcern FK
        string fcmId
        string passwordHash
    }

    Admin {
        string id PK
        string email GSI
        string passwordHash
    }

    WellnessCoach {
        string id PK
        string specializationId FK
        string email GSI
        string phoneKey GSI
        string fcmId
    }

    AssistantWellnessCoach {
        string id PK
        string wellnessCoachId FK
        string email GSI
    }

    RegistrationOtp {
        string lookupKey PK
        number ttl
    }

    AppConfig {
        string id PK
    }

    HealthConcern {
        string id PK
    }

    HealthRecipe {
        string id PK
        string healthConcernId FK
    }

    Specialization {
        string id PK
        string titleKey GSI
    }

    Transformation {
        string id PK
        string userId FK
    }
```

**Standalone tables (no FKs):** `Faq`, `Coupon`, `Notification`, `StaticPage`, `Banner`, `CelebrationBanners`, `ClientTestimonials`, `VideoTestimonials`, `HealthDisorder`, `HealthTool`, `Yoga`.

---

## Relationship modeling (no duplication)

| Relationship | Pattern | Rationale |
|---|---|---|
| Coach → Specialization | FK `specializationId` + Get at validate/register | Single source of truth for title |
| Assistant → Coach | FK `wellnessCoachId` + `WellnessCoachIndex` | Efficient list; slim coach embed at read time only |
| Recipe → Concern | FK `healthConcernId` + `HealthConcernCreatedAtIndex` | List recipes per concern without duplicating concern title |
| User → Concern | FK `primaryHealthConcern` + populate in API | Profile shows concern details via Get |
| Transformation → User | Optional FK `userId` + `UserIdCreatedAtIndex` | Link success story to user without duplicating user profile |

**Not modeled:** many-to-many (user ↔ coach assignment), bookings, sessions, mood logs — no code access patterns exist.

---

## Migration plan

Ordered by **risk** and **impact**. Each step traces to ISSUES_REPORT IDs.

### Phase A — High impact, low schema risk (code-only)

| Priority | Change | Files | Issues | Status |
|---|---|---|---|---|
| A1 | Replace Scan with Query on `StatusCreatedAtIndex` for all `list*(status)` | All `*Model.js` `list*` + `dynamoList.js` | #1, #4, #17 | ✅ Done |
| A2 | Query `HealthConcernCreatedAtIndex` when `healthConcernId` param set | `healthRecipeModel.js` | #1 | ✅ Done |
| A3 | Query `UserIdCreatedAtIndex` when `userId` param set | `transformationModel.js` | #1 | ✅ Done |
| A4 | Query `AudienceSentAtIndex` / `TypeCreatedAtIndex` for notifications / celebration | `notificationModel.js`, `celebrationBanners.js` | #24 | ✅ Done |
| A5 | Add `getHealthConcernById` check on recipe create/update | `healthRecipeController.js` | #15 | Pending |
| A6 | Add `fcmId` to coach/assistant models + profile update endpoints; fix `fcmAudience.js` | Coach models, auth controllers, `fcmAudience.js` | #2, #10 | ✅ Done |
| A7 | Implement DynamoDB cursor pagination (`ExclusiveStartKey`) on Query lists | `dynamoList.js` | #17 | ✅ Done |

### Phase B — Schema changes (requires table update / migration)

| Priority | Change | Action | Issues |
|---|---|---|---|
| B1 | **Admin:** drop `createdAt` sort key; migrate to `id`-only PK | `createAdminTable.js`, `adminModel.js`, migration `01` | #3 | ✅ Done (DDL + model + data migration) |
| B2 | **Rename GSIs** `StatusIndex` → `StatusCreatedAtIndex` on Faq, Coupon | Create new GSI, backfill, delete old | #12 | Pending |
| B3 | **Add GSIs** to `ClientTestimonials`, `VideoTestimonials` | `StatusCreatedAtIndex` in create script + migration `02` | #1 | ✅ Done |
| B4 | **Remove** `Admin.PhoneIndex` if product confirms no phone login | Update `createAdminTable.js` + migration `03` | #5 | ✅ Done |
| B5 | **Media attribute camelCase** on testimonials + HealthRecipe | `mediaFieldAliases.js` + migration `04` | #8, #11 | ✅ Done |

### Phase C — Attribute renames (breaking API / dual-read period)

| Priority | Change | Strategy | Issues |
|---|---|---|---|
| C1 | `password` → `passwordHash` on Admin, Coach, Assistant | Dual-read both fields during migration; write new name only | #7 |
| C2 | `profile_image` → `profileImage` on testimonials | `mediaFieldAliases.js` dual-read; migration `04` | #8 | ✅ Done |
| C3 | `fcm_id` → `fcmId` on User | Same dual-read pattern | #10 |
| C4 | AppConfig snake_case → camelCase | Mapper layer in model; accept old keys on PATCH | #9 |
| C5 | `video_specification` → `videoSpecification` | `mediaFieldAliases.js` + migration `04` | #11 | ✅ Done |

### Phase D — Cleanup & docs

| Priority | Change | Issues |
|---|---|---|
| D1 | Delete `assertObjectId.js` | #19 |
| D2 | Deprecate `_id` in API responses (major version bump) | #18 |
| D3 | Update `docs/database/SECURITY.md` for payment gateway handling | #21 | ✅ Done |
| D4 | Refresh `DATABASE_ARCHITECTURE.md` and `docs/database/*` after migrations | — | ✅ Done (2026-06-18) |
| D5 | Delete or implement `SpecializationIdIndex` usage in admin coach list | #6 |

### Phase E — Optional / product-dependent

| Item | Depends on |
|---|---|
| Cross-table email uniqueness (User vs Coach) | Product policy (#14) |
| Unify login OTP into `RegistrationOtp` table | Security/product (#13) |
| Cascade delete / FK enforcement | Admin delete workflows (#16) |
| OpenSearch for `contains` search on admin lists | Search requirements |

---

## Open questions

| # | Question | Why unresolved |
|---|---|---|
| OQ-1 | Should the same email be allowed on `User` and `WellnessCoach`? | Code only enforces uniqueness per table |
| OQ-2 | Should login OTP move to `RegistrationOtp` (TTL) for all roles? | Both patterns work today; migration affects auth flows |
| OQ-3 | Is `WellnessCoach.SpecializationIdIndex` needed in admin UI? | Scan already filters `specializationId` in memory — GSI helps only at scale |
| OQ-4 | Sparse GSI for `fcmId` on User/Coach vs Scan active users? | Cost/latency tradeoff for notification send |
| OQ-5 | Merge `HealthConcern` and `HealthDisorder` into one taxonomy table? | Separate public endpoints today — product domain decision |
| OQ-6 | DynamoDB Streams / PITR enabled in AWS console? | Not in repository code |
| OQ-7 | Public coupon validation endpoint needed? | `CouponCodeIndex` only used for admin duplicate check today |
| OQ-8 | `Admin` composite key — was multi-version history intentional? | No code creates multiple rows per `id` |

---

## Traceability matrix (issues → standard)

| Issue # | Resolution in this document |
|---|---|
| 1, 4, 17 | Access pattern mapping AP-04, AP-09, AP-18; Migration A1, A7 |
| 2 | `fcmId` on coaches; AP-25; Migration A6 |
| 3 | Admin single PK; Migration B1 |
| 5 | Remove PhoneIndex; Migration B4 |
| 6 | SpecializationIdIndex AP-10; Open Question OQ-3 |
| 7–11 | Naming conventions; Migration C1–C5 |
| 12 | StatusCreatedAtIndex rename; Migration B2 |
| 13 | Open Question OQ-2 |
| 14 | Open Question OQ-1 |
| 15 | Migration A5 |
| 16 | Migration Phase E |
| 18–19 | Migration D1–D2 |
| 21 | Migration D3 |
| 23–24 | AP-21–AP-23; Migration A1, A4 |

---

*Companion documents: [ISSUES_REPORT.md](./ISSUES_REPORT.md), [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md), [docs/database/README.md](./docs/database/README.md)*
