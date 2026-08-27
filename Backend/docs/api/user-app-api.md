# User App (APK) API — Complete Reference

Base URL (local): `http://localhost:5000/api`  
All paths below are under `/api`.

This document covers every endpoint the **mobile app** needs:

1. **Public** content (no login) — home, FAQ, recipes, yoga, coaches, etc.
2. **User auth** — register / login / profile
3. **Authenticated user** APIs — tracking, payments, Heal features, etc.

Related: [QUICKSTART.md](./QUICKSTART.md) · [user.md](./user.md) · [public.md](./public.md) · Postman `Wellness-User-API` / `Wellness-User-Flow-API`

---

## Conventions

| Topic | Rule |
|--------|------|
| Auth header | `Authorization: Bearer <accessToken>` |
| Success | `{ "status": true, ... }` (sometimes `ok: true` on `/health`) |
| Error | `{ "status": false, "message": "..." }` + HTTP 4xx/5xx |
| Pagination | `?page=1&limit=20` where listed |
| Search | `?search=term` where listed |
| Platform filter | `?platform=app` or `?platform=web` on many public content lists (respects Admin Web/App visibility toggles) |
| Uploads | `multipart/form-data` when a file field is noted |

### Auth levels

| Tag | Meaning |
|-----|---------|
| **Public** | No token |
| **JWT** | Valid user `accessToken` (`protectUser`) |
| **Heal** | Paid / Heal-tier user (`requireHealTier`) |
| **NoEagle** | Eagle clients blocked (`forbidEagleClient`) |

---

## 0. Health check

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/health` | Public |

---

## 1. Public content (no login)

### 1.1 App config

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/public/app-config` | Site / app settings (ratings, social stats, footer, etc.) |
| `GET` | `/public/config` | Alias of `/public/app-config` |

### 1.2 Misc catalog (`/public/misc`)

All **Public**. Use `?platform=app` from the APK so Admin Web/App toggles apply where supported.

| Method | Path | Query / notes |
|--------|------|----------------|
| `GET` | `/public/misc/banners` | `page`, `limit`, `bannerType` / `type` (default `main`) |
| `GET` | `/public/misc/faqs` | `page`, `limit`, **`platform`** |
| `GET` | `/public/misc/config-dropdowns` | Lists all active dropdowns |
| `GET` | `/public/misc/config-dropdowns/:slug` | One list by slug |
| `GET` | `/public/misc/pages/:slug` | Static / legal / about pages |
| `GET` | `/public/misc/client-testimonials` | `page`, `limit`, **`platform`** |
| `GET` | `/public/misc/program-testimonials` | `page`, `limit` |
| `GET` | `/public/misc/real-people-testimonials` | `page`, `limit`, **`platform`** |
| `GET` | `/public/misc/video-testimonials` | `page`, `limit`, **`platform`** (Voice of Healing) |
| `GET` | `/public/misc/cofounder-message` | — |
| `GET` | `/public/misc/health-concerns` | — |
| `GET` | `/public/misc/health-disorders` | — |
| `GET` | `/public/misc/health-tools` | — |
| `GET` | `/public/misc/health-recipes` | `page`, `limit`, `type`, `category`, `search`, **`platform`** |
| `GET` | `/public/misc/yoga` | `page`, `limit`, `search`, **`platform`** |
| `GET` | `/public/misc/transformations` | `page`, `limit`, `search`, **`platform`** |
| `GET` | `/public/misc/wellness-coaches` | `page`, `limit`, **`platform`** |
| `GET` | `/public/misc/assistant-wellness-coaches` | `page`, `limit`, **`platform`** |
| `GET` | `/public/misc/leadership-notes` | `page`, `limit`, **`platform`** |
| `GET` | `/public/misc/wellness-team-notes` | `page`, `limit`, **`platform`** |
| `GET` | `/public/misc/birthday-posts` | Public birthday feed |
| `GET` | `/public/misc/monthly-champions` | Public champions list |
| `GET` | `/public/misc/test-catalog` | Active lab tests |
| `GET` | `/public/misc/diet-plan-catalog` | Active diet plans |
| `GET` | `/public/misc/wellness-prescription-catalog` | Active RX catalog |
| `GET` | `/public/misc/physical-exercises` | Library items |
| `GET` | `/public/misc/mental-wellbeing` | Library items |
| `GET` | `/public/misc/supplements` | Catalog |
| `POST` | `/public/misc/contact-inquiries` | Contact form body |
| `GET` | `/public/misc/referral/validate` | `?code=` or referral query — validate referral |

**APK tip:** Prefer `platform=app` on FAQs, recipes, yoga, transformations, testimonials, coaches, and leadership/team notes.

---

## 2. Auth & profile (`/user/auth`)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/user/auth/register/otp/send` | Public | Start registration OTP |
| `POST` | `/user/auth/register` | Public | Register (+ optional profile image multipart) |
| `POST` | `/user/auth/login` | Public | Login (legacy / OTP flow entry) |
| `POST` | `/user/auth/login/password` | Public | Phone + password |
| `POST` | `/user/auth/otp/send` | Public | Login OTP send |
| `POST` | `/user/auth/otp/verify` | Public | Login OTP verify → tokens |
| `POST` | `/user/auth/refresh-token` | Public | Refresh access token |
| `POST` | `/user/auth/delete/otp/send` | Public | Delete-account OTP |
| `POST` | `/user/auth/delete` | Public | Delete account with OTP |
| `GET` | `/user/auth/me` | JWT | Current profile |
| `PATCH` | `/user/auth/me` | JWT | Update profile (+ optional image) |
| `POST` | `/user/auth/profile/phone/otp/send` | JWT | Change phone OTP |
| `POST` | `/user/auth/profile/phone/otp/verify` | JWT | Confirm phone change |
| `POST` | `/user/auth/profile/whatsapp/otp/send` | JWT | Change WhatsApp OTP |
| `POST` | `/user/auth/profile/whatsapp/otp/verify` | JWT | Confirm WhatsApp change |

**Typical login**

```http
POST /api/user/auth/login/password
Content-Type: application/json

{
  "phone": "9876543210",
  "phoneCountryCode": "+91",
  "password": "••••••••"
}
```

Use returned `accessToken` as `Authorization: Bearer …` on JWT routes.

---

## 3. Notifications

Base: `/user/notifications` · **JWT**

| Method | Path |
|--------|------|
| `GET` | `/user/notifications` |
| `GET` | `/user/notifications/unread-count` |
| `POST` | `/user/notifications/read-all` |
| `GET` | `/user/notifications/:id` |
| `PATCH` | `/user/notifications/:id/read` |

---

## 4. Reminders

Base: `/user/reminders` · **JWT**

| Method | Path |
|--------|------|
| `GET` | `/user/reminders` |
| `POST` | `/user/reminders` |
| `PUT` | `/user/reminders/:id` |
| `PATCH` | `/user/reminders/:id/toggle` |
| `DELETE` | `/user/reminders/:id` |

---

## 5. Tracking (water / steps / sleep / heart rate)

### Water · `/user/water-tracking` · **JWT**

| Method | Path |
|--------|------|
| `GET` | `/user/water-tracking` |
| `PATCH` | `/user/water-tracking/goal` |
| `POST` | `/user/water-tracking/increment` |
| `POST` | `/user/water-tracking/decrement` |
| `PUT` | `/user/water-tracking/day` |

### Steps · `/user/steps-tracking` · **JWT**

| Method | Path |
|--------|------|
| `GET` | `/user/steps-tracking` |
| `POST` | `/user/steps-tracking/sync` |
| `PATCH` | `/user/steps-tracking/goal` |
| `PUT` | `/user/steps-tracking/day` |

### Sleep · `/user/sleep-tracking` · **JWT**

| Method | Path |
|--------|------|
| `GET` | `/user/sleep-tracking` |
| `POST` | `/user/sleep-tracking/sync` |

### Heart rate · `/user/heart-rate-tracking` · **JWT**

| Method | Path |
|--------|------|
| `GET` | `/user/heart-rate-tracking` |
| `POST` | `/user/heart-rate-tracking/sync` |

---

## 6. Payments & programs

### Consultancy · `/user/consultancy-payment` · **JWT**

| Method | Path |
|--------|------|
| `GET` | `/user/consultancy-payment/checkout-preview` |
| `POST` | `/user/consultancy-payment/orders` |
| `POST` | `/user/consultancy-payment/verify` |
| `GET` | `/user/consultancy-payment/transactions` |
| `GET` | `/user/consultancy-payment/transactions/:id` |
| `GET` | `/user/consultancy-payment/transactions/:id/invoice` |

See also [consultancy-payment.md](../domain/consultancy-payment.md).

### App subscription · `/user/subscription-payment` · **JWT**

| Method | Path |
|--------|------|
| `GET` | `/user/subscription-payment/checkout-preview` |
| `POST` | `/user/subscription-payment/orders` |
| `POST` | `/user/subscription-payment/verify` |
| `GET` | `/user/subscription-payment/transactions` |
| `GET` | `/user/subscription-payment/transactions/:id` |

### Energy exchange · `/user/energy-exchange` · **JWT**

| Method | Path |
|--------|------|
| `GET` | `/user/energy-exchange/program` |
| `GET` | `/user/energy-exchange/plans` |
| `POST` | `/user/energy-exchange/preview` |
| `POST` | `/user/energy-exchange/order` |
| `POST` | `/user/energy-exchange/verify` |
| `GET` | `/user/energy-exchange/subscriptions` |

### Coach-triggered App Program · `/user/program` · **JWT**

| Method | Path |
|--------|------|
| `GET` | `/user/program` |
| `POST` | `/user/program/preview` |
| `POST` | `/user/program/order` |
| `POST` | `/user/program/verify` |

Flow: `GET` → `preview` → `order` → Cashfree → `verify`.  
Guide: [program-payment.md](../domain/program-payment.md).

---

## 7. Community & social (authenticated)

### Birthday posts · `/user/birthday-posts` · **JWT**

| Method | Path |
|--------|------|
| `GET` | `/user/birthday-posts` |
| `GET` | `/user/birthday-posts/:id` |
| `GET` | `/user/birthday-posts/:postId/comments` |
| `POST` | `/user/birthday-posts/:postId/comments` |
| `PATCH` | `/user/birthday-posts/:postId/comments/:id` |
| `DELETE` | `/user/birthday-posts/:postId/comments/:id` |

### Monthly champions · `/user/monthly-champions` · **JWT**

| Method | Path |
|--------|------|
| `GET` | `/user/monthly-champions` |
| `GET` | `/user/monthly-champions/mine` |
| `GET` | `/user/monthly-champions/standing` |
| `GET` | `/user/monthly-champions/:id` |
| `GET` | `/user/monthly-champions/:postId/comments` |
| `POST` | `/user/monthly-champions/:postId/comments` |
| `PATCH` | `/user/monthly-champions/:postId/comments/:id` |
| `DELETE` | `/user/monthly-champions/:postId/comments/:id` |

Guide: [monthly-champions-feature.md](./monthly-champions-feature.md).

### Client testimonials (user reviews) · `/user/client-testimonials` · **JWT**

| Method | Path |
|--------|------|
| `GET` | `/user/client-testimonials` |
| `GET` | `/user/client-testimonials/me` |
| `GET` | `/user/client-testimonials/:id` |
| `POST` | `/user/client-testimonials` |
| `PATCH` | `/user/client-testimonials/:id` |
| `DELETE` | `/user/client-testimonials/:id` |

### Real people · `/user/real-people-testimonials` · **JWT**

| Method | Path |
|--------|------|
| `GET` | `/user/real-people-testimonials` |
| `GET` | `/user/real-people-testimonials/:id` |

---

## 8. Heal onboarding & meetings

### Paid onboarding · `/user/paid-onboarding` · **JWT + Heal + NoEagle**

| Method | Path |
|--------|------|
| `GET` | `/user/paid-onboarding/state` |
| `POST` | `/user/paid-onboarding/profile` |
| `POST` | `/user/paid-onboarding/body-measurements` |
| `POST` | `/user/paid-onboarding/progress-photos` |
| `GET` | `/user/paid-onboarding/progress-photos` |
| `GET` | `/user/paid-onboarding/medical-questions` |
| `POST` | `/user/paid-onboarding/medical-conditions` |
| `POST` | `/user/paid-onboarding/skip-step` |
| `POST` | `/user/paid-onboarding/launch/complete` |

### Onboarding meetings · `/user/onboarding-meetings` · **JWT + Heal + NoEagle**

| Method | Path |
|--------|------|
| `GET` | `/user/onboarding-meetings` |
| `POST` | `/user/onboarding-meetings/:meetingId/book` |
| `POST` | `/user/onboarding-meetings/:meetingId/request-time` |

### Commitment letter · `/user/commitment-letter` · **JWT + Heal + NoEagle**

| Method | Path |
|--------|------|
| `GET` | `/user/commitment-letter/template` |
| `GET` | `/user/commitment-letter` |
| `POST` | `/user/commitment-letter` |
| `PATCH` | `/user/commitment-letter` |

### Heal consultancy tracks · `/user/heal-consultancy-tracks` · **JWT + Heal**

| Method | Path |
|--------|------|
| `GET` | `/user/heal-consultancy-tracks` |
| `POST` | `/user/heal-consultancy-tracks` |
| `PATCH` | `/user/heal-consultancy-tracks/:trackId/select-period` |

---

## 9. Heal content & assignments

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/user/diet-plans/assigned` | JWT + Heal + NoEagle |
| `GET` | `/user/diet-plans/assigned/:id` | JWT + Heal + NoEagle |
| `GET` | `/user/physical-exercises/assigned` | JWT + Heal + NoEagle |
| `GET` | `/user/mental-wellbeing/assigned` | JWT + Heal + NoEagle |
| `GET` | `/user/wellness-yoga/assigned` | JWT + Heal + NoEagle |
| `GET` | `/user/wellness-prescriptions` | JWT + Heal + NoEagle |
| `GET` | `/user/coach-insight` | JWT + Heal + NoEagle |
| `GET` | `/user/protocol-settings` | JWT |
| `GET` | `/user/prakruti-assessment` | JWT + Heal + NoEagle |

### Launch assessment · `/user/launch-assessment` · **JWT + Heal + NoEagle**

| Method | Path |
|--------|------|
| `GET` | `/user/launch-assessment/scores` |
| `GET` | `/user/launch-assessment/by-date` |
| `GET` | `/user/launch-assessment/:assessmentId` |

### Supplements · `/user/supplements` · **JWT + Heal**

| Method | Path |
|--------|------|
| `GET` | `/user/supplements/recommendations` |
| `POST` | `/user/supplements/recommendations/:id/request-delivery` |
| `POST` | `/user/supplements/recommendations/:id/bill` |
| `GET` | `/user/supplements/dosages` |
| `POST` | `/user/supplements/dosages/:dosageId/log` |

---

## 10. Meal tracking

Base: `/user/meal-tracking` · **JWT + Heal + NoEagle**  
(Optional meal photo multipart on create/update.)

| Method | Path |
|--------|------|
| `GET` | `/user/meal-tracking` |
| `GET` | `/user/meal-tracking/:logId` |
| `POST` | `/user/meal-tracking` |
| `PUT` | `/user/meal-tracking/:logId` |
| `DELETE` | `/user/meal-tracking/:logId` |

Guide: [user-meal-tracking.md](./user-meal-tracking.md).

---

## 11. Daily reflection (DRF)

Base: `/user/daily-reflection` · **JWT + Heal + NoEagle**

| Method | Path |
|--------|------|
| `GET` | `/user/daily-reflection` |
| `POST` | `/user/daily-reflection` |
| `GET` | `/user/daily-reflection/score` |
| `GET` | `/user/daily-reflection/analytics` |
| `GET` | `/user/daily-reflection/history` |
| `PATCH` | `/user/daily-reflection/plugged-headphones` |

Guide: [daily-reflection-feature.md](./daily-reflection-feature.md).

---

## 12. Health progress & labs

### Health progress · `/user/health-progress` · **JWT + Heal + NoEagle**

| Method | Path |
|--------|------|
| `GET` | `/user/health-progress/settings` |
| `POST` / `GET` | `/user/health-progress/weight` |
| `POST` / `GET` | `/user/health-progress/glucose` |
| `POST` / `GET` | `/user/health-progress/blood-pressure` |
| `POST` / `GET` | `/user/health-progress/menstrual-cycle` |
| `POST` / `GET` | `/user/health-progress/condition-comparison` |

### Metabolic metrics · `/user/metabolic-metrics` · **JWT + Heal + NoEagle**

| Method | Path |
|--------|------|
| `GET` | `/user/metabolic-metrics/profile` |
| `GET` | `/user/metabolic-metrics/dashboard` |
| `GET` | `/user/metabolic-metrics/history` |
| `GET` | `/user/metabolic-metrics/history/:metricType` |
| `POST` | `/user/metabolic-metrics` |
| `POST` | `/user/metabolic-metrics/:metricType` |

### Internal parameters (labs) · `/user/internal-parameters` · **JWT + Heal**

| Method | Path |
|--------|------|
| `GET` | `/user/internal-parameters/recommended` |
| `GET` | `/user/internal-parameters/reports` |
| `POST` | `/user/internal-parameters/reports` |
| `DELETE` | `/user/internal-parameters/reports/:id` |

---

## Suggested APK integration order

1. `GET /public/app-config` + `GET /public/misc/*?platform=app` for home / content
2. Auth: register or `login/password` / OTP → store `accessToken`
3. `GET /user/auth/me`
4. Notifications + reminders
5. Tracking (water / steps / sleep / HR)
6. Payments as needed (consultancy → subscription → energy exchange → program)
7. After Heal unlock: paid onboarding → assignments → meal / DRF / health progress

---

## Source map

| Area | Route files |
|------|-------------|
| Mount | `routes/index.js` |
| Public misc | `routes/userRoutes/miscRoutes.js` |
| App config | `routes/publicRoutes/publicAppConfigRoutes.js` |
| User APIs | `routes/userRoutes/*.js` |
| Controllers | `controllers/userController/*`, `controllers/publicController/*` |

Regenerate raw route tables after large route changes by scanning `routes/userRoutes` (or extend the catalog scripts under `Backend/scripts/` if present).
