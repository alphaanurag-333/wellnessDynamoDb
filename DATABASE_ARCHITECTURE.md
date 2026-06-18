# Database Architecture Document

**Wellness DynamoDB Application**  
Generated from codebase analysis — all schemas, indexes, and access patterns are derived strictly from `Backend/tables/*.js`, `Backend/models/*.js`, controllers, and routes.

### Related documents

| Document | Description |
|---|---|
| [ISSUES_REPORT.md](ISSUES_REPORT.md) | Schema audit — issues, severity, recommendations |
| [STANDARD_DB_STRUCTURE.md](STANDARD_DB_STRUCTURE.md) | Target schema, naming conventions, migration plan |
| [docs/database/README.md](docs/database/README.md) | Documentation index |
| [docs/database/RELATIONSHIPS.md](docs/database/RELATIONSHIPS.md) | Entity relationships & ER diagrams |
| [docs/database/ACCESS_PATTERNS.md](docs/database/ACCESS_PATTERNS.md) | Query/Scan catalog by table |
| [docs/database/TABLE_REFERENCE.md](docs/database/TABLE_REFERENCE.md) | Quick schema cards |
| [docs/database/INDEXES.md](docs/database/INDEXES.md) | GSI reference & usage status |
| [docs/database/SECURITY.md](docs/database/SECURITY.md) | PII, health data, encryption |
| [docs/database/OPERATIONS.md](docs/database/OPERATIONS.md) | Conditionals, batch, retry |

---

## Overview

This application is a **Node.js + Express** wellness platform backed by **Amazon DynamoDB** (AWS SDK v3: `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`). Data access is organized as **one model file per table** under `Backend/models/`, with table DDL scripts under `Backend/tables/`.

### Design paradigm: **Multi-table**

The codebase uses **multi-table design** — **21 separate DynamoDB tables**, each mapping roughly one-to-one to a domain entity (User, WellnessCoach, HealthRecipe, etc.). There is no shared partition key, no entity-type discriminator, and no item collection spanning entity types within a single table.

**Reasoning from access patterns:**

| Observation | Implication |
|---|---|
| Each model hard-codes a single `TABLE` constant | Entity isolation at the storage layer |
| Primary keys are overwhelmingly `id` (UUID string) per entity | Independent lifecycle and CRUD per entity |
| Cross-entity links use **foreign-key-style string attributes** (`wellnessCoachId`, `healthConcernId`, `specializationId`, `userId`) | Relationships resolved at application layer via `GetItem`, not adjacency lists |
| `assistantWellnessCoachModel.populateWellnessCoach()` performs separate reads to `WellnessCoach` and `Specialization` | Classic multi-table join emulation |
| GSIs are entity-specific (e.g. `WellnessCoachIndex` on assistants) | Indexes scoped per table, not a universal access pattern |

This is **not** single-table design. The GSIs named `StatusCreatedAtIndex` across many tables are **parallel per-entity indexes**, not a unified access pattern on one table.

### Table inventory (21 tables)

| # | Table | Entity |
|---|---|---|
| 1 | `User` | End-user accounts |
| 2 | `Admin` | Platform administrators |
| 3 | `WellnessCoach` | Wellness coaches |
| 4 | `AssistantWellnessCoach` | Coach assistants |
| 5 | `RegistrationOtp` | Registration OTP store (TTL) |
| 6 | `AppConfig` | Singleton app/business configuration |
| 7 | `Faq` | FAQ entries |
| 8 | `Coupon` | Discount coupons |
| 9 | `Notification` | Push notification records |
| 10 | `StaticPage` | CMS static pages |
| 11 | `Transformation` | Before/after transformation stories |
| 12 | `Banner` | Homepage banners |
| 13 | `CelebrationBanners` | Birthday/championship banners |
| 14 | `ClientTestimonials` | Text testimonials |
| 15 | `VideoTestimonials` | Video testimonials |
| 16 | `HealthConcern` | Health concern categories |
| 17 | `HealthDisorder` | Health disorder catalog |
| 18 | `HealthTool` | Health tool catalog |
| 19 | `HealthRecipe` | Health recipes (linked to concerns) |
| 20 | `Yoga` | Yoga content |
| 21 | `Specialization` | Coach specialization catalog |

**Infrastructure artifacts:**

- **Table creation:** `Backend/tables/create*.js` (one script per table or table group)
- **Migration:** `Backend/script/migrate.js` — **fully commented out**; region-to-region copy utility, not active
- **Seed data:** Not specified in code — needs confirmation
- **IaC (CloudFormation/CDK/serverless):** Not present in repository

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| HTTP framework | Express (`Backend/server.js`, base path `/api`) |
| DynamoDB client | `@aws-sdk/client-dynamodb` v3 |
| Document abstraction | `@aws-sdk/lib-dynamodb` (`DynamoDBDocumentClient`) |
| DB config | `Backend/config/db.js` — region from `AWS_REGION` (default `ap-south-1`), optional static credentials |
| ID generation | `uuid` v4 (`uuidv4()`) |
| Password hashing | `bcryptjs` (`Backend/utils/password.js`, 10 salt rounds) |
| Media storage | AWS S3 (object keys stored in DynamoDB; URLs resolved at read time) |
| Push notifications | Firebase Cloud Messaging (`Backend/utils/fcmAudience.js`) |

**DynamoDB client options** (`Backend/config/db.js`):

```javascript
marshallOptions: {
  removeUndefinedValues: true,
  convertEmptyValues: false,
}
```

Startup verifies connectivity via `ListTablesCommand` unless `DYNAMODB_SKIP_VERIFY=true`.

---

## Table Designs

> **Global defaults (all tables unless noted):**  
> - **Billing mode:** `PAY_PER_REQUEST` (on-demand)  
> - **LSI:** None defined  
> - **DynamoDB Streams:** Not specified in code — needs confirmation  
> - **Attribute types in key schema:** All keys are type `S` (String)

---

### 1. `User`

| Property | Value |
|---|---|
| **Partition key** | `id` (S) |
| **Sort key** | — |
| **TTL** | Not configured |
| **Entity** | Registered wellness app end-users |

**Attributes** (from `userModel.js`):

| Attribute | Type (inferred) | Notes |
|---|---|---|
| `id` | S | UUID PK |
| `name` | S | |
| `email` | S | Normalized lowercase; GSI key |
| `passwordHash` | S | bcrypt hash; stripped from public responses |
| `phoneCountryCode` | S | Default `+91` |
| `phone` | S | |
| `phoneKey` | S | `{countryCode}#{phone}`; GSI key |
| `whatsappSameAsMobile` | BOOL | |
| `whatsappCountryCode` | S | |
| `whatsappPhone` | S | |
| `dob` | S | ISO 8601 |
| `gender` | S | `male`, `female`, `other`, `boy`, `girl`, `guess` |
| `country`, `state`, `city` | S | |
| `primaryHealthConcern` | S | HealthConcern `id` reference |
| `termsAccepted` | BOOL | |
| `termsAcceptedAt` | S | ISO 8601 |
| `profileImage` | S | S3 object key |
| `fcm_id` | S | FCM device token |
| `status` | S | `active`, `inactive`, `blocked` |
| `otp`, `otpExpire` | S | Login/delete OTP (on user record) |
| `resetPasswordToken`, `resetPasswordExpire` | S | |
| `createdAt`, `updatedAt` | S | ISO 8601 |

**Sample item:**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "passwordHash": "$2a$10$...",
  "phoneCountryCode": "+91",
  "phone": "9876543210",
  "phoneKey": "+91#9876543210",
  "whatsappSameAsMobile": true,
  "whatsappCountryCode": "+91",
  "whatsappPhone": "9876543210",
  "dob": "1990-05-15T00:00:00.000Z",
  "gender": "female",
  "country": "India",
  "state": "Maharashtra",
  "city": "Mumbai",
  "primaryHealthConcern": "hc-uuid-here",
  "termsAccepted": true,
  "termsAcceptedAt": "2026-01-10T08:00:00.000Z",
  "profileImage": "user/photo.jpg",
  "fcm_id": "fcm-token-abc",
  "status": "active",
  "createdAt": "2026-01-10T08:00:00.000Z",
  "updatedAt": "2026-01-10T08:00:00.000Z"
}
```

**API endpoints:**

| Method | Path | Operations |
|---|---|---|
| POST | `/api/user/auth/register/otp/send` | Read/write `RegistrationOtp`; read `User` (duplicate check) |
| POST | `/api/user/auth/register` | Write `User`; read `HealthConcern`; write/delete `RegistrationOtp` |
| POST | `/api/user/auth/login`, `/login/password`, `/otp/*` | Read/update `User` |
| POST | `/api/user/auth/refresh-token` | Read `User` (via JWT middleware) |
| POST | `/api/user/auth/delete/*` | Read/update/delete `User` |
| GET/PATCH | `/api/user/auth/me` | Read/update `User` |
| GET/POST/PATCH/DELETE | `/api/admin/users/*` | Admin CRUD on `User` |
| — | `middleware/auth.js` `protectUser` | Read `User` by id |

---

### 2. `Admin`

| Property | Value |
|---|---|
| **Partition key** | `id` (S) |
| **Sort key** | — |
| **TTL** | Not configured |
| **Entity** | Platform admin accounts |

> **Note:** DDL uses single hash key `id`. `adminModel.js` falls back to Query for legacy composite-key rows (`id` + `createdAt`) during migration.

**Attributes** (from `adminModel.js`):

| Attribute | Type | Notes |
|---|---|---|
| `id` | S | UUID |
| `createdAt` | S | Sort key; ISO 8601 |
| `name` | S | |
| `email` | S | GSI key |
| `password` | S | bcrypt hash (field name `password`, not `passwordHash`) |
| `phone` | S | Optional |
| `profileImage` | S | S3 key |
| `resetPasswordToken`, `resetPasswordExpire` | S | |
| `status` | S | |
| `updatedAt` | S | |

**Sample item:**

```json
{
  "id": "admin-uuid",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "name": "Super Admin",
  "email": "admin@wellness.com",
  "password": "$2a$10$...",
  "phone": "+919876543210",
  "profileImage": "admin/photo.jpg",
  "status": "active",
  "resetPasswordToken": null,
  "resetPasswordExpire": null,
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

**API endpoints:**

| Method | Path | Operations |
|---|---|---|
| POST | `/api/admin/auth/register`, `/login`, `/refresh-token` | Write/read `Admin` |
| GET/PATCH | `/api/admin/auth/me` | Read/update `Admin` |
| PATCH | `/api/admin/auth/me/password` | Update `Admin` |
| — | `middleware/auth.js` `protectAdmin` | Read `Admin` |

---

### 3. `WellnessCoach`

| Property | Value |
|---|---|
| **Partition key** | `id` (S) |
| **Sort key** | — |
| **Entity** | Wellness coaches |

**Attributes** (from `wellnessCoachModel.js`):

| Attribute | Type | Notes |
|---|---|---|
| `id` | S | UUID PK |
| `name`, `email` | S | |
| `phoneCountryCode`, `phone`, `phoneKey` | S | |
| `profileImage` | S | S3 key |
| `bio` | S | |
| `specializationId` | S | → `Specialization.id` |
| `country`, `state`, `city` | S | |
| `password` | S | bcrypt hash |
| `status` | S | `active`, `inactive` |
| `approvalStatus` | S | `pending`, `approved`, `rejected` |
| `otp`, `otpExpire` | S | Login OTP |
| `createdAt`, `updatedAt` | S | |

**Sample item:**

```json
{
  "id": "coach-uuid",
  "name": "Dr. Wellness",
  "email": "coach@example.com",
  "phoneCountryCode": "+91",
  "phone": "9123456789",
  "phoneKey": "+91#9123456789",
  "specializationId": "spec-uuid",
  "status": "active",
  "approvalStatus": "approved",
  "createdAt": "2026-02-01T00:00:00.000Z",
  "updatedAt": "2026-02-01T00:00:00.000Z"
}
```

**API endpoints:**

| Method | Path | Operations |
|---|---|---|
| POST | `/api/coach/auth/register`, `/login`, `/otp/*` | Write/read `WellnessCoach`; read `Specialization` |
| GET/PATCH | `/api/coach/auth/me` | Read/update `WellnessCoach` |
| GET/POST/PATCH/DELETE | `/api/admin/wellness-coaches/*` | Admin CRUD |
| GET | `/api/coach/specializations` | Read `Specialization` (not coach table) |
| — | `protectWellnessCoach` | Read `WellnessCoach` |
| — | `assistantWellnessCoachModel` populate | Read `WellnessCoach` by id |
| — | `fcmAudience.js` | Query `StatusCreatedAtIndex` for FCM tokens |

---

### 4. `AssistantWellnessCoach`

| Property | Value |
|---|---|
| **Partition key** | `id` (S) |
| **Sort key** | — |
| **Entity** | Assistants belonging to a wellness coach |

**Attributes** (from `assistantWellnessCoachModel.js`):

| Attribute | Type | Notes |
|---|---|---|
| `id` | S | UUID |
| `wellnessCoachId` | S | → `WellnessCoach.id`; GSI PK |
| `name`, `email` | S | |
| `phoneCountryCode`, `phone`, `phoneKey` | S | |
| `profileImage` | S | |
| `designation` | S | |
| `password` | S | bcrypt |
| `status` | S | `active`, `inactive` |
| `otp`, `otpExpire` | S | |
| `createdAt`, `updatedAt` | S | |

**API endpoints:**

| Method | Path | Operations |
|---|---|---|
| POST | `/api/assistant/auth/login`, `/otp/*` | Read/update `AssistantWellnessCoach` |
| GET/PATCH | `/api/assistant/auth/me` | Read/update |
| GET/POST/PATCH/DELETE | `/api/coach/assistants/*` | Coach-scoped CRUD |
| GET/POST/PATCH/DELETE | `/api/admin/wellness-coaches/:coachId/assistants/*` | Admin CRUD |
| GET | `/api/admin/wellness-coaches/assistants` | List all assistants |
| — | `protectAssistantWellnessCoach` | Read by id |
| — | `fcmAudience.js` | Query `StatusCreatedAtIndex` for FCM tokens |

---

### 5. `RegistrationOtp`

| Property | Value |
|---|---|
| **Partition key** | `lookupKey` (S) |
| **Sort key** | — |
| **TTL** | **Enabled** — attribute `ttl` (Unix epoch seconds) |
| **Entity** | Short-lived registration OTP (email and/or phone lookups) |

**Attributes:**

| Attribute | Type | Notes |
|---|---|---|
| `lookupKey` | S | `email:{normalizedEmail}` or `phone:{phoneKey}` |
| `otp` | S | |
| `otpExpire` | S | ISO 8601 |
| `ttl` | N | DynamoDB TTL attribute |
| `createdAt`, `updatedAt` | S | |

**Sample item:**

```json
{
  "lookupKey": "email:jane@example.com",
  "otp": "482910",
  "otpExpire": "2026-06-18T10:15:00.000Z",
  "ttl": 1750236900,
  "createdAt": "2026-06-18T10:05:00.000Z",
  "updatedAt": "2026-06-18T10:05:00.000Z"
}
```

**API endpoints:** Used indirectly via `registrationOtpStore.js` during `POST /api/user/auth/register/otp/send` and `POST /api/user/auth/register`.

---

### 6. `AppConfig`

| Property | Value |
|---|---|
| **Partition key** | `id` (S) — fixed value `"app-config"` |
| **Sort key** | — |
| **Entity** | Singleton application/business configuration (one row per environment) |

**Attributes** (from `appConfigModel.js`):

| Attribute | Type | Notes |
|---|---|---|
| `id` | S | Always `"app-config"` |
| `app_name`, `app_email`, `app_mobile`, `app_detail` | S | |
| `admin_logo`, `user_logo`, `favicon` | S | S3 keys |
| `address`, `latitude`, `longitude` | S | |
| `facebook`, `twitter`, `instagram`, `linkedin` | S | |
| `app_details`, `app_footer_text` | S | |
| `improved_user`, `success_rate`, `average_rating`, `happy_clients` | S | Marketing stats |
| `tax_type`, `tax_value`, `consultancy_amount` | S | |
| `payment_methods` | L | `[{ type, isActive }]` |
| `payment_gateways` | L | Array; may contain gateway credentials |
| `createdAt`, `updatedAt` | S | |

**API endpoints:**

| Method | Path | Operations |
|---|---|---|
| GET | `/api/public/app-config`, `/api/public/config` | Read `AppConfig` |
| GET/POST/PATCH | `/api/admin/app-config` | Read/create/update `AppConfig` |

---

### 7. `Faq`

| PK | `id` (S) | Attributes: `question`, `answer`, `status`, `createdAt`, `updatedAt` |

**API:** `GET/POST/PATCH/DELETE /api/admin/faq/*`; public `GET /api/public/misc/faqs` (active only).

---

### 8. `Coupon`

| PK | `id` (S) | Attributes: `title`, `status`, `couponCode`, `discountType` (`percentage`/`fixed`), `value` (N), `createdAt`, `updatedAt` |

**API:** `GET/POST/PATCH/DELETE /api/admin/coupons/*`

---

### 9. `Notification`

| PK | `id` (S) | Attributes: `audienceType` (`users`/`coaches`), `message`, `image`, `status`, `sentAt`, `createdAt`, `updatedAt` |

**API:** `GET/POST/PATCH/DELETE /api/admin/notifications/*`; create/resend triggers FCM scans on `User`, `WellnessCoach`, `AssistantWellnessCoach`.

---

### 10. `StaticPage`

| PK | `id` (S) | Attributes: `title`, `slug`, `content`, `status`, `createdAt`, `updatedAt` |

**API:** Admin `/api/admin/misc/pages/*`; public `GET /api/public/misc/pages/:slug`.

---

### 11. `Transformation`

| PK | `id` (S) | Attributes: `timeTaken` (N), `achievements`, `oldImage`, `newImage`, `description`, `status`, `userId` (optional → `User.id`), `createdAt`, `updatedAt` |

**API:** Admin `/api/admin/transformations/*`; public `GET /api/public/misc/transformations`.

---

### 12. `Banner`

| PK | `id` (S) | Attributes: `title`, `image`, `status`, `createdAt`, `updatedAt` |

**API:** Admin `/api/admin/banners/*`; public `GET /api/public/misc/banners`.

---

### 13. `CelebrationBanners`

| PK | `id` (S) | Attributes: `title`, `image`, `type` (`birthday`/`championship`), `status`, `startDate`, `endDate`, `createdAt`, `updatedAt` |

**API:** Admin `/api/admin/celebration-banners/*`; public `GET /api/public/misc/celebration-banners`.

---

### 14. `ClientTestimonials`

| PK | `id` (S) | Attributes: `name`, `rating` (N), `description`, `profile_image`, `status`, `createdAt`, `updatedAt` |

**API:** Admin `/api/admin/client-testimonials/*`; public `GET /api/public/misc/client-testimonials`.

---

### 15. `VideoTestimonials`

| PK | `id` (S) | Attributes: `name`, `profile_image`, `ytLink`, `video`, `type` (`link`/`video`), `status`, `createdAt`, `updatedAt` |

**API:** Admin `/api/admin/video-testimonials/*`; public `GET /api/public/misc/video-testimonials`.

---

### 16. `HealthConcern`

| PK | `id` (S) | Attributes: `title`, `description`, `icon`, `status`, `createdAt`, `updatedAt` |

**API:** Admin `/api/admin/health-concerns/*`; public list; referenced by `User.primaryHealthConcern` and `HealthRecipe.healthConcernId`.

---

### 17. `HealthDisorder`

| PK | `id` (S) | Attributes: `title`, `description`, `symptoms` (L of S), `type` (`acute`/`chronic`), `status`, `createdAt`, `updatedAt` |

**API:** Admin `/api/admin/health-disorders/*`; public `GET /api/public/misc/health-disorders`.

---

### 18. `HealthTool`

| PK | `id` (S) | Attributes: `title`, `description`, `icon`, `status`, `createdAt`, `updatedAt` |

**API:** Admin `/api/admin/health-tools/*`; public list.

---

### 19. `HealthRecipe`

| PK | `id` (S) | Attributes: `healthConcernId`, `title`, `description`, `thumbnail`, `type` (`ytlink`/`video`), `ytLink`, `video`, `video_specification` (L), `status`, `createdAt`, `updatedAt` |

**API:** Admin `/api/admin/health-recipes/*`; public list.

---

### 20. `Yoga`

| PK | `id` (S) | Attributes: `title`, `description`, `thumbnail`, `type` (`ytlink`/`video`), `ytLink`, `video`, `status`, `createdAt`, `updatedAt` |

**API:** Admin `/api/admin/yoga/*`; public `GET /api/public/misc/yoga`.

---

### 21. `Specialization`

| PK | `id` (S) | Attributes: `title`, `titleKey` (lowercase title), `description`, `status`, `createdAt`, `updatedAt` |

**API:** Admin `/api/admin/specializations/*`; coach `GET /api/coach/specializations`; validation reads during coach registration.

---

## Indexes (GSI / LSI)

### LSI

**None** — no table defines a Local Secondary Index.

### GSI summary

All GSIs use **`ProjectionType: ALL`** unless noted.

| Table | Index | Partition key | Sort key | Used in application code? |
|---|---|---|---|---|
| `User` | `EmailIndex` | `email` | — | **Yes** — login, duplicate check |
| `User` | `PhoneKeyIndex` | `phoneKey` | — | **Yes** — login, duplicate check |
| `User` | `StatusCreatedAtIndex` | `status` | `createdAt` | **Yes** — `listUsers`, FCM harvest |
| `Admin` | `EmailIndex` | `email` | — | **Yes** — login |
| `Admin` | `PhoneIndex` | `phone` | — | **No** |
| `WellnessCoach` | `EmailIndex` | `email` | — | **Yes** |
| `WellnessCoach` | `PhoneKeyIndex` | `phoneKey` | — | **Yes** |
| `WellnessCoach` | `StatusCreatedAtIndex` | `status` | `createdAt` | **No** |
| `WellnessCoach` | `SpecializationIdIndex` | `specializationId` | `createdAt` | **No** |
| `AssistantWellnessCoach` | `WellnessCoachIndex` | `wellnessCoachId` | `createdAt` | **Yes** — list/count by coach |
| `AssistantWellnessCoach` | `EmailIndex` | `email` | — | **Yes** |
| `AssistantWellnessCoach` | `PhoneKeyIndex` | `phoneKey` | — | **Yes** |
| `AssistantWellnessCoach` | `StatusCreatedAtIndex` | `status` | `createdAt` | **No** |
| `Faq` | `StatusIndex` | `status` | `createdAt` | **No** |
| `Coupon` | `StatusIndex` | `status` | `createdAt` | **No** |
| `Coupon` | `CouponCodeIndex` | `couponCode` | — | **Yes** — uniqueness check |
| `Notification` | `StatusSentAtIndex` | `status` | `sentAt` | **No** |
| `Notification` | `AudienceSentAtIndex` | `audienceType` | `sentAt` | **No** |
| `StaticPage` | `SlugIndex` | `slug` | — | **Yes** — public page lookup |
| `StaticPage` | `StatusUpdatedAtIndex` | `status` | `updatedAt` | **No** |
| `Transformation` | `StatusCreatedAtIndex` | `status` | `createdAt` | **No** |
| `Transformation` | `UserIdCreatedAtIndex` | `userId` | `createdAt` | **No** |
| `Banner` | `StatusCreatedAtIndex` | `status` | `createdAt` | **No** |
| `CelebrationBanners` | `TypeCreatedAtIndex` | `type` | `createdAt` | **No** |
| `CelebrationBanners` | `StatusCreatedAtIndex` | `status` | `createdAt` | **No** |
| `HealthConcern` | `StatusCreatedAtIndex` | `status` | `createdAt` | **No** |
| `HealthDisorder` | `StatusCreatedAtIndex` | `status` | `createdAt` | **No** |
| `HealthTool` | `StatusCreatedAtIndex` | `status` | `createdAt` | **No** |
| `HealthRecipe` | `StatusCreatedAtIndex` | `status` | `createdAt` | **No** |
| `HealthRecipe` | `HealthConcernCreatedAtIndex` | `healthConcernId` | `createdAt` | **No** |
| `Yoga` | `StatusCreatedAtIndex` | `status` | `createdAt` | **No** |
| `Specialization` | `TitleKeyIndex` | `titleKey` | — | **Yes** — duplicate title check |
| `Specialization` | `StatusCreatedAtIndex` | `status` | `createdAt` | **No** |

---

## Access Patterns

### Legend

| Op | DynamoDB API |
|---|---|
| Get | `GetItem` |
| Put | `PutItem` |
| Update | `UpdateItem` |
| Delete | `DeleteItem` |
| Query | `Query` |
| Scan | `Scan` |
| BatchWrite | `BatchWriteItem` |

### Authentication & identity

| # | Pattern | Table / Index | Operation | Why this index |
|---|---|---|---|---|
| AP-01 | Get user by JWT subject | `User` PK | Get | Direct id lookup after auth |
| AP-02 | Login user by email | `User` / `EmailIndex` | Query | Unique email lookup |
| AP-03 | Login user by phone | `User` / `PhoneKeyIndex` | Query | Composite phone key uniqueness |
| AP-04 | Admin login by email | `Admin` / `EmailIndex` | Query | |
| AP-05 | Resolve admin composite key | `Admin` PK | Query on `id` | Table has sort key `createdAt`; latest row selected |
| AP-06 | Coach login by email/phone | `WellnessCoach` / `EmailIndex`, `PhoneKeyIndex` | Query | |
| AP-07 | Assistant login by email/phone | `AssistantWellnessCoach` / `EmailIndex`, `PhoneKeyIndex` | Query | |
| AP-08 | Registration OTP save | `RegistrationOtp` PK | Put (×1–2 keys) | Separate items per email/phone lookup |
| AP-09 | Registration OTP verify | `RegistrationOtp` PK | Get | |
| AP-10 | Registration OTP cleanup | `RegistrationOtp` | BatchWrite Delete | Deletes email + phone keys |
| AP-11 | Registration OTP expiry | `RegistrationOtp` | TTL on `ttl` | AWS auto-deletes expired items |

### Admin list / search (paginated)

| # | Pattern | Table | Operation | Notes |
|---|---|---|---|---|
| AP-12 | List users (filter status, search name/email/phone) | `User` | **Query** `StatusCreatedAtIndex` + FilterExpression | Via `dynamoList.js` |
| AP-13 | List wellness coaches | `WellnessCoach` | **Query** `StatusCreatedAtIndex` | |
| AP-14 | Count all coaches | `WellnessCoach` | **Query COUNT** on `StatusCreatedAtIndex` | |
| AP-15 | List assistants (all or by coach) | `AssistantWellnessCoach` | **Query** `StatusCreatedAtIndex` or `WellnessCoachIndex` | `WellnessCoachIndex` when `wellnessCoachId` provided |
| AP-16 | Count assistants per coach | `AssistantWellnessCoach` / `WellnessCoachIndex` | Query `Select: COUNT` | Efficient parent-child pattern |
| AP-17 | List FAQs, coupons, notifications, banners, etc. | Respective tables | **Query** on status/domain GSIs | Via `dynamoList.js` |

### Content CRUD (typical pattern)

| # | Pattern | Operation | Condition |
|---|---|---|---|
| AP-18 | Create entity | Put | `attribute_not_exists(id)` |
| AP-19 | Get by id | Get | PK `id` |
| AP-20 | Update entity | Update | `attribute_exists(id)` |
| AP-21 | Delete entity | Delete | `attribute_exists(id)` |

### Lookup by alternate key

| # | Pattern | Table / Index | Operation |
|---|---|---|---|
| AP-22 | Static page by slug | `StaticPage` / `SlugIndex` | Query |
| AP-23 | Coupon by code | `Coupon` / `CouponCodeIndex` | Query |
| AP-24 | Specialization by title | `Specialization` / `TitleKeyIndex` | Query |
| AP-25 | App config (singleton) | `AppConfig` PK `id=app-config` | Get |

### Public read (active content)

| # | Pattern | Tables | Operation |
|---|---|---|---|
| AP-26 | Public active lists (banners, FAQs, health content, etc.) | Content tables | Query `Status*Index` with `status=active` |

### Push notifications (FCM)

| # | Pattern | Tables | Operation |
|---|---|---|---|
| AP-27 | Collect FCM tokens for `users` audience | `User` | Query `StatusCreatedAtIndex` + `fcm_id`/`fcmId` filter |
| AP-28 | Collect FCM tokens for `coaches` audience | `WellnessCoach`, `AssistantWellnessCoach` | Query `StatusCreatedAtIndex` + `fcmId` filter |

### Cross-table reads (application-level joins)

| # | Pattern | Tables | Operation |
|---|---|---|---|
| AP-29 | Validate user health concern on register/update | `HealthConcern` | Get by id |
| AP-30 | Validate coach specialization | `Specialization` | Get by id |
| AP-31 | Populate assistant with coach + specialization title | `WellnessCoach`, `Specialization` | Get by id (with in-memory cache per request) |

### Batch / transaction

| # | Pattern | Details |
|---|---|---|
| AP-32 | BatchWrite | **Only** `RegistrationOtp` delete (up to 2 keys) |
| AP-33 | TransactWrite | **Not used** in application code |

### Retry / backoff

| Layer | Behavior |
|---|---|
| Application | **No custom retry/backoff** around DynamoDB calls |
| AWS SDK v3 | Default `@smithy/middleware-retry` (dependency of `@aws-sdk/client-dynamodb`) — standard SDK exponential backoff |
| BatchWrite unprocessed items | **Not handled** in `registrationOtpModel.deleteRegistrationOtp` — no retry loop for `UnprocessedItems` |

### Conditional writes summary

| Condition | Usage |
|---|---|
| `attribute_not_exists(id)` | All `create*` Put operations |
| `attribute_exists(id)` | Most Update/Delete operations |
| `attribute_exists(id) AND attribute_exists(createdAt)` | `Admin` Update/Delete only |

---

## Entity Relationships

Relationships are modeled via **string foreign-key attributes** and **application-level reads** — no DynamoDB transactions enforce referential integrity.

```mermaid
erDiagram
    User ||--o| HealthConcern : "primaryHealthConcern"
    WellnessCoach }o--|| Specialization : "specializationId"
    AssistantWellnessCoach }o--|| WellnessCoach : "wellnessCoachId"
    HealthRecipe }o--|| HealthConcern : "healthConcernId"
    Transformation }o--o| User : "userId (optional)"

    User {
        string id PK
        string email
        string phoneKey
        string primaryHealthConcern FK
        string status
    }

    Admin {
        string id PK
        string createdAt SK
        string email
    }

    WellnessCoach {
        string id PK
        string specializationId FK
        string email
        string phoneKey
    }

    AssistantWellnessCoach {
        string id PK
        string wellnessCoachId FK
        string email
    }

    Specialization {
        string id PK
        string titleKey
    }

    HealthConcern {
        string id PK
        string title
    }

    HealthRecipe {
        string id PK
        string healthConcernId FK
    }

    Transformation {
        string id PK
        string userId FK
    }

    RegistrationOtp {
        string lookupKey PK
        number ttl
    }

    AppConfig {
        string id PK
    }
```

### Relationship details

| Relationship | Cardinality | Modeling approach |
|---|---|---|
| Coach → Specialization | Many-to-one | `WellnessCoach.specializationId` stores `Specialization.id`; validated via `getSpecializationById()` |
| Assistant → Coach | Many-to-one | `AssistantWellnessCoach.wellnessCoachId`; listed via `WellnessCoachIndex` GSI |
| Recipe → Health concern | Many-to-one | `HealthRecipe.healthConcernId` |
| User → Health concern | Many-to-one (profile) | `User.primaryHealthConcern` stores concern id |
| Transformation → User | Many-to-one (optional) | `Transformation.userId` optional attribute |
| Coach ↔ Assistant | One-to-many | Parent id on child; **no** denormalized coach data on assistant items (populated at read time) |

**Denormalization:** Minimal. Assistant API responses embed a slim `wellnessCoach` object built at runtime, not stored in DynamoDB.

---

## Data Security & Compliance Notes

### PII and sensitive fields

| Table | Field | Classification | Protection in code |
|---|---|---|---|
| `User` | `name`, `email`, `phone`, `whatsappPhone`, `dob`, `gender`, `country`, `state`, `city` | **PII** | Stripped from responses only for `passwordHash`, `otp`, tokens via `toPublicProfile()`; other PII returned to authenticated user/admin |
| `User` | `primaryHealthConcern` | **Health-related preference** | Reference id only; concern title not stored on user |
| `User` | `passwordHash` | Credential | bcrypt; removed from API responses |
| `User` | `otp`, `resetPasswordToken`, `fcm_id` | Sensitive | Removed from public profile responses |
| `Admin`, `WellnessCoach`, `AssistantWellnessCoach` | `email`, `phone`, `name` | **PII** | Password fields stripped via `toPublicProfile()` |
| `RegistrationOtp` | `otp` | **Sensitive** | Short-lived; TTL auto-delete |
| `AppConfig` | `app_email`, `app_mobile`, `address` | **PII / business contact** | Public endpoint exposes config (see `publicAppConfigController`) |
| `AppConfig` | `payment_gateways` | **Credentials / PCI-adjacent** | Stored in DynamoDB; exposure depends on public vs admin API filtering |
| `HealthDisorder` | `symptoms`, `description` | **Health information (catalog)** | Public read for active items |
| `Transformation` | `oldImage`, `newImage`, `description` | **Health/wellness imagery & narrative** | Public read for active items |
| `Transformation` | `userId` | Links story to user | Optional; may imply user health journey |

### Encryption

| Layer | Status |
|---|---|
| DynamoDB encryption at rest (AWS managed) | Not specified in code — needs confirmation (AWS default for new tables) |
| Application-level field encryption | **Not implemented** |
| Password storage | bcrypt hashing (`Backend/utils/password.js`) |
| In-transit | HTTPS assumed at deployment — not configured in application code |

### Access control

| Mechanism | Scope |
|---|---|
| JWT middleware (`protectAdmin`, `protectUser`, `protectWellnessCoach`, `protectAssistantWellnessCoach`) | Role-based API access; loads account from DynamoDB on each request |
| Account status checks | `blocked` / `inactive` rejected with 403 |
| Public routes | `/api/public/*` — unauthenticated read for app config and misc content |
| IAM / DynamoDB fine-grained access | Not specified in code — application uses shared AWS credentials |

### Compliance considerations

- User health **preference** (`primaryHealthConcern`) and wellness **content** exist, but no HIPAA-specific controls (audit logging, BAA, PHI segmentation) appear in code.
- OTP may be exposed in API responses when `EXPOSE_OTP_IN_RESPONSE=true` (dev convenience flag in `config/index.js`).

---

## Scaling & Performance Considerations

### Current strengths

1. **On-demand billing** — all tables use `PAY_PER_REQUEST`; no capacity planning in code.
2. **Targeted GSIs** for auth lookups (email, phone) and coach→assistant listing avoid scans for hot paths.
3. **TTL on `RegistrationOtp`** — automatic cleanup without delete traffic.
4. **UUID partition keys** — even key distribution for single-item access.

### Performance risks

| Issue | Affected tables | Impact |
|---|---|---|
| **`contains()` FilterExpression on Query** | Admin search on list endpoints | Filter applied after index key — acceptable at current scale |
| **No BatchGet** for populate patterns | Assistant listing with coach embed | N+1 GetItem pattern when populating coaches |
| **`WellnessCoach.SpecializationIdIndex` unused** | WellnessCoach | Could optimize specialization-filtered coach lists |
| **Legacy Admin composite rows** | Admin | Fallback Query until data migrated to single-key PK |

### SDK retry behavior

The AWS SDK applies default retry with exponential backoff for throttling and transient errors. The application does not add idempotency tokens or circuit breakers.

---

## Open Questions / Recommendations

### Needs confirmation (not in code)

1. **DynamoDB Streams** — enabled on any table?
2. **Point-in-time recovery (PITR)** and **encryption** settings on production tables
3. **Seed / bootstrap data** scripts for Admin or AppConfig
4. **Whether unused GSIs** were created for planned features or legacy Mongoose migration
5. **IAM policies** restricting DynamoDB access per environment
6. **Whether `payment_gateways` credentials** are filtered before public `AppConfig` response

### Recommendations (remaining)

1. **Migrate legacy Admin items** to single-key PK and drop composite-key fallback in `adminModel.js`.
2. **Use `WellnessCoach.SpecializationIdIndex`** if admin UI filters coaches by specialization at scale.
3. **Add BatchGetItem** in `populateWellnessCoaches()` for bulk assistant listings.
4. **Rename Faq/Coupon `StatusIndex`** → `StatusCreatedAtIndex` for naming consistency (optional).
5. **Medium-priority naming migrations** — see `STANDARD_DB_STRUCTURE.md` Phase C (`passwordHash`, `profileImage`, AppConfig camelCase).
6. **Implement BatchWrite retry** for `deleteRegistrationOtp` unprocessed items.
7. **Consider GSI projection review** — `ALL` projections on every GSI maximize flexibility but increase storage; narrow projections if access patterns stabilize.
8. **Add DynamoDB health metrics / alarms** — not present in application code.
9. **Field-level encryption** for `payment_gateways` and other secrets in `AppConfig` if retained in DynamoDB.
10. **Document IaC** — table scripts are manual `node Backend/tables/create*.js`; consider CloudFormation/CDK for reproducible environments.

---

## Appendix: Table creation scripts

| Script | Table(s) |
|---|---|
| `createUserTable.js` | User |
| `createAdminTable.js` | Admin |
| `createWellnessCoachTables.js` | WellnessCoach, AssistantWellnessCoach |
| `createRegistrationOtpTable.js` | RegistrationOtp |
| `createAppConfigTable.js` | AppConfig |
| `createFaqTable.js` | Faq |
| `createCouponTable.js` | Coupon |
| `createNotificationTable.js` | Notification |
| `createStaticPageTable.js` | StaticPage |
| `createTransformationTable.js` | Transformation |
| `createBannerTable.js` | Banner |
| `createCelebrationBannersTables.js` | CelebrationBanners |
| `createClientTestimonialsTables.js` | ClientTestimonials |
| `createVideoTestimonialsTable.js` | VideoTestimonials |
| `createHealthConcernTable.js` | HealthConcern |
| `createHealthDisorder.js` | HealthDisorder |
| `createHealthTool.js` | HealthTool |
| `createHealthRecipeTable.js` | HealthRecipe |
| `createYogaTable.js` | Yoga |
| `createSpecializationTable.js` | Specialization |

---

*Document generated from repository state. API base path: `/api`. Default AWS region: `ap-south-1`.*
