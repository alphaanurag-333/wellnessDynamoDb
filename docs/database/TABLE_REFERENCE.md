# Table Reference

Quick schema reference for all 21 DynamoDB tables. For narrative context and API mapping, see [DATABASE_ARCHITECTURE.md](../../DATABASE_ARCHITECTURE.md).

**DDL scripts:** `Backend/tables/create*.js` · **Models:** `Backend/models/*.js`

---

## Global defaults

| Setting | Value |
|---|---|
| Billing mode | `PAY_PER_REQUEST` (on-demand) |
| LSI | None |
| Streams | Not specified in code — needs confirmation |
| Key attribute type | `S` (String) for all keys |

---

## Identity tables

### `User`

| | |
|---|---|
| **PK** | `id` |
| **SK** | — |
| **GSIs** | `EmailIndex`, `PhoneKeyIndex`, `StatusCreatedAtIndex` |
| **TTL** | — |
| **Model** | `userModel.js` |

| Attribute | Required | Description |
|---|---|---|
| `id` | ✓ | UUID |
| `name`, `email`, `phone`, `phoneCountryCode`, `phoneKey` | ✓ | `phoneKey` = `{cc}#{phone}` |
| `passwordHash` | | bcrypt |
| `whatsappSameAsMobile`, `whatsappCountryCode`, `whatsappPhone` | | |
| `dob`, `gender` | | ISO date; enum gender |
| `country`, `state`, `city` | | |
| `primaryHealthConcern` | | → `HealthConcern.id` |
| `termsAccepted`, `termsAcceptedAt` | | |
| `profileImage` | | S3 key |
| `fcm_id` | | Push token |
| `status` | ✓ | `active` \| `inactive` \| `blocked` |
| `otp`, `otpExpire`, `resetPasswordToken`, `resetPasswordExpire` | | |
| `createdAt`, `updatedAt` | ✓ | ISO 8601 |

---

### `Admin`

| | |
|---|---|
| **PK** | `id` |
| **SK** | — |
| **GSIs** | `EmailIndex` |
| **Model** | `adminModel.js` |

| Attribute | Description |
|---|---|
| `name`, `email`, `password` | `password` = bcrypt hash |
| `phone`, `profileImage`, `status` | |
| `resetPasswordToken`, `resetPasswordExpire` | |
| `updatedAt` | |

---

### `WellnessCoach`

| | |
|---|---|
| **PK** | `id` |
| **SK** | — |
| **GSIs** | `EmailIndex`, `PhoneKeyIndex`, `StatusCreatedAtIndex`, `SpecializationIdIndex` |
| **Model** | `wellnessCoachModel.js` |

| Attribute | Description |
|---|---|
| `name`, `email`, `phone`, `phoneCountryCode`, `phoneKey` | |
| `profileImage`, `bio` | S3 key |
| `specializationId` | → `Specialization.id` |
| `country`, `state`, `city` | |
| `password` | bcrypt |
| `fcmId` | Push token (set via profile update) |
| `status` | `active` \| `inactive` |
| `approvalStatus` | `pending` \| `approved` \| `rejected` |
| `otp`, `otpExpire` | |
| `createdAt`, `updatedAt` | |

---

### `AssistantWellnessCoach`

| | |
|---|---|
| **PK** | `id` |
| **SK** | — |
| **GSIs** | `WellnessCoachIndex`, `EmailIndex`, `PhoneKeyIndex`, `StatusCreatedAtIndex` |
| **Model** | `assistantWellnessCoachModel.js` |

| Attribute | Description |
|---|---|
| `wellnessCoachId` | ✓ → `WellnessCoach.id` |
| `name`, `email`, `phone`, `phoneCountryCode`, `phoneKey` | |
| `profileImage`, `designation` | |
| `password`, `status`, `otp`, `otpExpire` | |
| `fcmId` | Push token (set via profile update) |
| `createdAt`, `updatedAt` | |

---

### `RegistrationOtp`

| | |
|---|---|
| **PK** | `lookupKey` |
| **SK** | — |
| **GSIs** | — |
| **TTL** | `ttl` (enabled) |
| **Model** | `registrationOtpModel.js` |

| Attribute | Description |
|---|---|
| `lookupKey` | `email:{addr}` or `phone:{phoneKey}` |
| `otp`, `otpExpire` | |
| `ttl` | Unix seconds |
| `createdAt`, `updatedAt` | |

---

## Platform tables

### `AppConfig`

| | |
|---|---|
| **PK** | `id` (fixed: `app-config`) |
| **Model** | `appConfigModel.js` |

Singleton business settings: `app_name`, `app_email`, `app_mobile`, logos, address, social links, tax fields, `payment_methods` (L), `payment_gateways` (L), marketing stats, `createdAt`, `updatedAt`.

---

### `Coupon`

| PK `id` | GSIs: `StatusIndex`, `CouponCodeIndex` |
|---|---|
| Attributes | `title`, `status`, `couponCode`, `discountType`, `value`, timestamps |

---

### `Notification`

| PK `id` | GSIs: `StatusSentAtIndex`, `AudienceSentAtIndex` |
|---|---|
| Attributes | `audienceType`, `message`, `image`, `status`, `sentAt`, timestamps |

---

### `StaticPage`

| PK `id` | GSIs: `SlugIndex`, `StatusUpdatedAtIndex` |
|---|---|
| Attributes | `title`, `slug`, `content`, `status`, timestamps |

---

## Marketing & CMS tables

### `Faq`

PK `id` · GSI `StatusIndex` · `question`, `answer`, `status`, timestamps

### `Banner`

PK `id` · GSI `StatusCreatedAtIndex` · `title`, `image`, `status`, timestamps

### `CelebrationBanners`

PK `id` · GSIs `TypeCreatedAtIndex`, `StatusCreatedAtIndex` · `title`, `image`, `type` (`birthday`|`championship`), `status`, `startDate`, `endDate`, timestamps

### `ClientTestimonials`

PK `id` only · `name`, `rating`, `description`, `profileImage`, `status`, timestamps

### `VideoTestimonials`

PK `id` only · `name`, `profileImage`, `ytLink`, `video`, `type` (`link`|`video`), `status`, timestamps

### `Transformation`

PK `id` · GSIs `StatusCreatedAtIndex`, `UserIdCreatedAtIndex` · `timeTaken`, `achievements`, `oldImage`, `newImage`, `description`, `status`, `userId` (optional), timestamps

---

## Health content tables

### `HealthConcern`

PK `id` · GSI `StatusCreatedAtIndex` · `title`, `description`, `icon`, `status`, timestamps

### `HealthDisorder`

PK `id` · GSI `StatusCreatedAtIndex` · `title`, `description`, `symptoms` (L), `type` (`acute`|`chronic`), `status`, timestamps

### `HealthTool`

PK `id` · GSI `StatusCreatedAtIndex` · `title`, `description`, `icon`, `status`, timestamps

### `HealthRecipe`

PK `id` · GSIs `StatusCreatedAtIndex`, `HealthConcernCreatedAtIndex` · `healthConcernId`, `title`, `description`, `thumbnail`, `type`, `ytLink`, `video`, `videoSpecification` (L), `status`, timestamps

### `Yoga`

PK `id` · GSI `StatusCreatedAtIndex` · `title`, `description`, `thumbnail`, `type`, `ytLink`, `video`, `status`, timestamps

### `Specialization`

PK `id` · GSIs `TitleKeyIndex`, `StatusCreatedAtIndex` · `title`, `titleKey`, `description`, `status`, timestamps

---

## Table → model → create script

| Table | Model file | Create script |
|---|---|---|
| User | `userModel.js` | `createUserTable.js` |
| Admin | `adminModel.js` | `createAdminTable.js` |
| WellnessCoach | `wellnessCoachModel.js` | `createWellnessCoachTables.js` |
| AssistantWellnessCoach | `assistantWellnessCoachModel.js` | `createWellnessCoachTables.js` |
| RegistrationOtp | `registrationOtpModel.js` | `createRegistrationOtpTable.js` |
| AppConfig | `appConfigModel.js` | `createAppConfigTable.js` |
| Faq | `faqModel.js` | `createFaqTable.js` |
| Coupon | `couponModel.js` | `createCouponTable.js` |
| Notification | `notificationModel.js` | `createNotificationTable.js` |
| StaticPage | `staticPageModel.js` | `createStaticPageTable.js` |
| Transformation | `transformationModel.js` | `createTransformationTable.js` |
| Banner | `bannerModel.js` | `createBannerTable.js` |
| CelebrationBanners | `celebrationBanners.js` | `createCelebrationBannersTables.js` |
| ClientTestimonials | `clientTestimonials.js` | `createClientTestimonialsTables.js` |
| VideoTestimonials | `videoTestimonials.js` | `createVideoTestimonialsTable.js` |
| HealthConcern | `healthConcernModel.js` | `createHealthConcernTable.js` |
| HealthDisorder | `healthDisorderModel.js` | `createHealthDisorder.js` |
| HealthTool | `healthToolModel.js` | `createHealthTool.js` |
| HealthRecipe | `healthRecipeModel.js` | `createHealthRecipeTable.js` |
| Yoga | `yogaModel.js` | `createYogaTable.js` |
| Specialization | `specializationModel.js` | `createSpecializationTable.js` |
