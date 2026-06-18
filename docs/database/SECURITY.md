# Data Security & Compliance

PII, health-related data, credentials, and access-control behavior as implemented in code.

**See also:** [RELATIONSHIPS.md](./RELATIONSHIPS.md) · [TABLE_REFERENCE.md](./TABLE_REFERENCE.md) · `Backend/utils/toPublicProfile.js`

---

## Data classification

### Tier 1 — Credentials & secrets

| Table | Field | Storage | API exposure |
|---|---|---|---|
| `User` | `passwordHash` | bcrypt (`Backend/utils/password.js`) | Stripped by `toPublicProfile()` |
| `Admin`, `WellnessCoach`, `AssistantWellnessCoach` | `password` | bcrypt | Stripped by `toPublicProfile()` |
| `User`, coaches | `otp`, `resetPasswordToken` | Plain string on record | Stripped from public profile |
| `RegistrationOtp` | `otp` | Plain string | Internal only; TTL auto-delete |
| `AppConfig` | `payment_gateways` | JSON array in DynamoDB | Depends on public vs admin API filtering — **review `publicAppConfigController`** |

### Tier 2 — PII (personally identifiable information)

| Table | Fields |
|---|---|
| `User` | `name`, `email`, `phone`, `whatsappPhone`, `dob`, `gender`, `country`, `state`, `city`, `profileImage` |
| `Admin` | `name`, `email`, `phone`, `profileImage` |
| `WellnessCoach` | `name`, `email`, `phone`, `profileImage`, `bio`, location fields |
| `AssistantWellnessCoach` | `name`, `email`, `phone`, `profileImage`, `designation` |
| `AppConfig` | `app_email`, `app_mobile`, `address` |
| `ClientTestimonials`, `VideoTestimonials` | `name`, `profile_image` |

### Tier 3 — Health & wellness data

| Table | Fields | Notes |
|---|---|---|
| `User` | `primaryHealthConcern` | Reference id to health catalog — preference, not clinical record |
| `HealthDisorder` | `title`, `description`, `symptoms` | Educational catalog content |
| `HealthConcern`, `HealthTool`, `HealthRecipe`, `Yoga` | Content fields | Wellness education, not user-specific clinical data |
| `Transformation` | `description`, `achievements`, `oldImage`, `newImage`, `userId` | Progress stories; may imply health journey when linked to user |

### Tier 4 — Device / session adjacent

| Table | Field | Notes |
|---|---|---|
| `User`, coaches | `fcm_id` / `fcmId` | Firebase Cloud Messaging token — queried on `StatusCreatedAtIndex` for push broadcasts |

---

## Protection mechanisms in code

### Response sanitization

`Backend/utils/toPublicProfile.js` removes from API responses:

- `password` / `passwordHash`
- `otp`, `otpExpire`
- `resetPasswordToken`, `resetPasswordExpire`

Applied via `toPublicUser`, `toPublicAdmin`, `toPublicWellnessCoach`, `toPublicAssistant`, etc.

### Password handling

```javascript
// Backend/utils/password.js
bcrypt.hash(plain, 10)   // SALT_ROUNDS = 10
bcrypt.compare(plain, hash)
```

Used in user, admin, coach, and assistant auth/register flows.

### OTP handling

| Store | Mechanism |
|---|---|
| Registration | `RegistrationOtp` table + DynamoDB TTL on `ttl` |
| Login (user/coach/assistant) | `otp` / `otpExpire` on user/coach record |
| Dev leak risk | `EXPOSE_OTP_IN_RESPONSE=true` returns OTP in API response |

### Access control (application layer)

| Middleware | Role | DB read |
|---|---|---|
| `protectAdmin` | `admin` | `Admin` by JWT `sub` |
| `protectUser` | `user` | `User` by id |
| `protectWellnessCoach` | `wellness_coach` | `WellnessCoach` |
| `protectAssistantWellnessCoach` | `assistant_wellness_coach` | `AssistantWellnessCoach` |

Account `status` checks: `blocked` and `inactive` → HTTP 403.

**No row-level security in DynamoDB** — all tables accessed with shared application IAM credentials.

### Media (S3)

Profile images and content media stored as **S3 object keys** in DynamoDB; public URLs built via `resolvePublicUrl()` — bucket policy determines actual exposure.

---

## Encryption

| Layer | Status in code |
|---|---|
| DynamoDB encryption at rest | Not specified — needs confirmation (AWS default) |
| Client-side / field-level encryption | **Not implemented** |
| TLS in transit | Deployment concern — not configured in Express app |
| `payment_gateways` secrets | Stored as plain attributes in `AppConfig` item |

---

## Compliance considerations

| Topic | Current state |
|---|---|
| HIPAA / PHI | No HIPAA-specific controls documented; user health data is limited to preference id + public wellness content |
| GDPR right to erasure | `deleteUser` exists; cross-table cleanup (transformations, etc.) not automated |
| Audit logging | No DynamoDB Streams consumers or audit trail in code |
| Data residency | Default region `ap-south-1` via env |
| Consent | `User.termsAccepted`, `termsAcceptedAt` captured on registration |

---

## Public API exposure matrix

| Endpoint | Sensitive fields potentially returned |
|---|---|
| `GET /api/public/app-config` | Business contact, payment methods; gateway **credentials stripped** — `publicAppConfigController.js` returns only `{ provider, isActive }` per gateway |
| `GET /api/public/misc/*` | Marketing/health **catalog** content only |
| `GET /api/user/auth/me` | Full user profile minus password/OTP (PII returned to owner) |
| Admin `GET /api/admin/users` | Full user records for admins |

---

## Security recommendations

1. **Keep `toPublicClientAppConfig` in sync** — any new sensitive `AppConfig` fields must be excluded from `publicAppConfigController.js`.
2. **Never enable `EXPOSE_OTP_IN_RESPONSE`** in production.
3. **Consider KMS or Secrets Manager** for payment gateway credentials instead of `AppConfig` DynamoDB attributes.
4. **Implement cascade or anonymization** on user delete for `Transformation.userId` references.
5. **Add IAM least-privilege** per environment — not visible in application repo.
6. **Enable PITR** on production tables — not specified in code.
