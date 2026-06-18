# Access Patterns

Complete catalog of DynamoDB operations as implemented in `Backend/models/` and `Backend/utils/fcmAudience.js`. Each pattern maps to the table/index the code actually uses.

**See also:** [INDEXES.md](./INDEXES.md) · [RELATIONSHIPS.md](./RELATIONSHIPS.md) · [OPERATIONS.md](./OPERATIONS.md)

---

## Operation legend

| Symbol | AWS API |
|---|---|
| **Get** | `GetItem` |
| **Put** | `PutItem` |
| **Update** | `UpdateItem` |
| **Delete** | `DeleteItem` |
| **Query** | `Query` |
| **Scan** | `Scan` |
| **BatchWrite** | `BatchWriteItem` |

---

## By table

### `User`

| ID | Pattern | Op | Key / Index | Model function | Triggered by |
|---|---|---|---|---|---|
| U-01 | Create user | Put | PK `id` | `createUser` | Register, admin create |
| U-02 | Get by id | Get | PK `id` | `getUserById` | Auth middleware, profile |
| U-03 | Get by email | Query | `EmailIndex` | `getUserByEmail` | Login, duplicate check |
| U-04 | Get by phone | Query | `PhoneKeyIndex` | `getUserByPhone` | Login, duplicate check |
| U-05 | Update user | Update | PK `id` | `updateUser` | Profile, OTP fields, admin |
| U-06 | Delete user | Delete | PK `id` | `deleteUser` | Admin, account deletion |
| U-07 | List users (paginated) | Scan | Base table + FilterExpression | `listUsers` | Admin user list |
| U-08 | FCM token harvest | Scan | Base + `status=active` filter | `fcmAudience.scanActiveFcmTokens` | Notification send |

> **Note:** `StatusCreatedAtIndex` is **not** used; U-07 scans the full table.

---

### `Admin`

| ID | Pattern | Op | Key / Index | Model function |
|---|---|---|---|---|
| A-01 | Create admin | Put | PK `id` + SK `createdAt` | `createAdmin` |
| A-02 | Resolve key by id | Query | Base table `id = :id` | `getAdminKeyById` |
| A-03 | Get by id | Get | Composite key | `getAdminById` |
| A-04 | Get by email | Query | `EmailIndex` | `getAdminByEmail` |
| A-05 | Update admin | Update | Composite key | `updateAdmin` |
| A-06 | Delete admin | Delete | Composite key | `deleteAdmin` |

> `PhoneIndex` is defined but **never queried**.

---

### `WellnessCoach`

| ID | Pattern | Op | Key / Index | Model function |
|---|---|---|---|---|
| WC-01 | Create coach | Put | PK `id` | `createWellnessCoach` |
| WC-02 | Get by id (public) | Get | PK `id` | `getWellnessCoachById` |
| WC-03 | Get by id (full record) | Get | PK `id` | `getWellnessCoachRecordById` |
| WC-04 | Get by email | Query | `EmailIndex` | `getWellnessCoachByEmail` |
| WC-05 | Get by phone | Query | `PhoneKeyIndex` | `getWellnessCoachByPhone` |
| WC-06 | Update coach | Update | PK `id` | `updateWellnessCoach` |
| WC-07 | Delete coach | Delete | PK `id` | `deleteWellnessCoach` |
| WC-08 | List coaches | Scan | Base + filters | `listWellnessCoaches` |
| WC-09 | Count all coaches | Scan | `Select: COUNT` | `countAllWellnessCoaches` |
| WC-10 | FCM token harvest | Scan | Base + active filter | `fcmAudience` |

---

### `AssistantWellnessCoach`

| ID | Pattern | Op | Key / Index | Model function |
|---|---|---|---|---|
| AWC-01 | Create assistant | Put | PK `id` | `createAssistantWellnessCoach` |
| AWC-02 | Get by id | Get | PK `id` | `getAssistantWellnessCoachById` |
| AWC-03 | Get by email | Query | `EmailIndex` | `getAssistantByEmail` |
| AWC-04 | Get by phone | Query | `PhoneKeyIndex` | `getAssistantByPhone` |
| AWC-05 | List by coach | Query | `WellnessCoachIndex` | `listAssistantsByWellnessCoachId` |
| AWC-06 | Count by coach | Query | `WellnessCoachIndex` COUNT | `countAssistantsByWellnessCoachId` |
| AWC-07 | List all assistants | Scan | Base + filters | `listAssistantWellnessCoaches` |
| AWC-08 | Update / Delete | Update / Delete | PK `id` | `update*` / `delete*` |
| AWC-09 | FCM token harvest | Scan | Base + active filter | `fcmAudience` |

---

### `RegistrationOtp`

| ID | Pattern | Op | Key | Model function |
|---|---|---|---|---|
| OTP-01 | Save OTP (email + phone keys) | Put × N | PK `lookupKey` | `saveRegistrationOtp` |
| OTP-02 | Find OTP | Get | PK `lookupKey` | `findRegistrationOtp` |
| OTP-03 | Delete OTP keys | BatchWrite Delete | PK `lookupKey` | `deleteRegistrationOtp` |
| OTP-04 | TTL expiry | AWS TTL | Attribute `ttl` | Automatic |

---

### `AppConfig`

| ID | Pattern | Op | Key | Model function |
|---|---|---|---|---|
| CFG-01 | Create singleton | Put | `id = app-config` | `createAppConfig` |
| CFG-02 | Get config | Get | `id = app-config` | `getAppConfig` |
| CFG-03 | Update config | Update | `id = app-config` | `updateAppConfig` |

---

### Content tables (shared CRUD pattern)

Tables: `Faq`, `Coupon`, `Notification`, `StaticPage`, `Transformation`, `Banner`, `CelebrationBanners`, `ClientTestimonials`, `VideoTestimonials`, `HealthConcern`, `HealthDisorder`, `HealthTool`, `HealthRecipe`, `Yoga`, `Specialization`

| ID | Pattern | Op | Typical key |
|---|---|---|---|
| C-01 | Create | Put | PK `id`, `attribute_not_exists(id)` |
| C-02 | Get by id | Get | PK `id` |
| C-03 | Update | Update | PK `id`, `attribute_exists(id)` |
| C-04 | Delete | Delete | PK `id`, `attribute_exists(id)` |
| C-05 | List (admin/public) | Scan | Full table + FilterExpression + in-memory pagination |

#### Content-specific Query patterns

| Table | ID | Pattern | Op | Index |
|---|---|---|---|---|
| `StaticPage` | SP-01 | Get by slug | Query | `SlugIndex` |
| `StaticPage` | SP-02 | List all pages | Scan | Base table |
| `Coupon` | CP-01 | Get by coupon code | Query | `CouponCodeIndex` |
| `Specialization` | SPEC-01 | Get by title key | Query | `TitleKeyIndex` |

---

## By access type

### Point reads (GetItem)

All entities with UUID PK; `AppConfig` uses fixed id; `RegistrationOtp` uses `lookupKey`.

### Alternate-key queries (Query on GSI)

| Index | Tables | Purpose |
|---|---|---|
| `EmailIndex` | User, Admin, WellnessCoach, AssistantWellnessCoach | Login, duplicate detection |
| `PhoneKeyIndex` | User, WellnessCoach, AssistantWellnessCoach | Phone login |
| `WellnessCoachIndex` | AssistantWellnessCoach | List/count assistants per coach |
| `SlugIndex` | StaticPage | Public page by URL slug |
| `CouponCodeIndex` | Coupon | Uniqueness + lookup by code |
| `TitleKeyIndex` | Specialization | Uniqueness + lookup by title |

### Full scans

Used for **all paginated list endpoints** on content tables and for User/Coach admin lists, even when status-sort GSIs exist. See [INDEXES.md](./INDEXES.md) for unused indexes.

### Batch operations

| Table | Operation | Code location |
|---|---|---|
| `RegistrationOtp` | BatchWrite Delete (1–2 keys) | `registrationOtpModel.deleteRegistrationOtp` |

### Transactions

**None** — `TransactWriteCommand` is not used anywhere in the Backend.

---

## API endpoint → access pattern map

### Public (`/api/public/*`)

| Endpoint | Tables | Primary pattern |
|---|---|---|
| `GET /public/app-config` | AppConfig | Get |
| `GET /public/misc/banners` | Banner | Scan + status filter |
| `GET /public/misc/faqs` | Faq | Scan + status filter |
| `GET /public/misc/pages/:slug` | StaticPage | Query SlugIndex |
| `GET /public/misc/client-testimonials` | ClientTestimonials | Scan |
| `GET /public/misc/video-testimonials` | VideoTestimonials | Scan |
| `GET /public/misc/health-concerns` | HealthConcern | Scan |
| `GET /public/misc/health-disorders` | HealthDisorder | Scan |
| `GET /public/misc/health-tools` | HealthTool | Scan |
| `GET /public/misc/health-recipes` | HealthRecipe | Scan |
| `GET /public/misc/yoga` | Yoga | Scan |
| `GET /public/misc/transformations` | Transformation | Scan |
| `GET /public/misc/celebration-banners` | CelebrationBanners | Scan |

### User auth (`/api/user/auth/*`)

| Endpoint | Tables |
|---|---|
| Register OTP | RegistrationOtp Put; User Query (duplicate) |
| Register | User Put; HealthConcern Get; RegistrationOtp Get/Delete |
| Login / OTP | User Query (email or phone); User Update (OTP fields) |
| Me | User Get / Update |

### Coach / assistant auth

Same identity patterns on `WellnessCoach` and `AssistantWellnessCoach` respectively; coach register also reads `Specialization`.

### Admin (`/api/admin/*`)

Standard CRUD Scan/Get/Put/Update/Delete per resource table. Notifications additionally Scan User + Coach tables for FCM.

---

## Anti-patterns observed (for optimization)

| Current code | Better index (already exists) |
|---|---|
| `listUsers({ status })` → Scan | `User.StatusCreatedAtIndex` |
| `listHealthRecipes({ healthConcernId })` → Scan | `HealthRecipe.HealthConcernCreatedAtIndex` |
| `listTransformations({ userId })` → Scan | `Transformation.UserIdCreatedAtIndex` |
| `listFaqs/Banners/...({ status })` → Scan | Respective `StatusIndex` / `StatusCreatedAtIndex` |
| `listNotifications({ audienceType })` → Scan | `Notification.AudienceSentAtIndex` |
