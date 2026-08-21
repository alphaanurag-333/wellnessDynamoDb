# User APK API — Complete Endpoints

Mobile app (APK) API reference. Base URL:

```
http://localhost:5000/api
```

Production: use your deployed host + `/api`.

---

## Conventions

| Topic | Rule |
|-------|------|
| Auth header | `Authorization: Bearer <accessToken>` on protected routes |
| Content type | `application/json` (unless multipart file upload) |
| Success | `{ "status": true, ... }` |
| Error | `{ "status": false, "message": "..." }` + HTTP 4xx/5xx |
| Pagination | `?page=1&limit=20` (public misc defaults `limit=50`, max `200`) |
| Search | `?search=...` where listed |

### Auth levels

| Label | Meaning |
|-------|---------|
| **Public** | No token |
| **User** | Valid user JWT (`protectUser`) |
| **Heal** | User + Heal subscription tier |
| **NoEagle** | Also blocked for Eagle-only clients |

### Content visibility (`platform`)

Admin Configs can toggle **WEB** / **APP** / **LIVE** per item. For catalog content:

| Query | Effect |
|-------|--------|
| `?platform=app` | Only items with `appVisible=true` (and `status=active`) |
| `?platform=web` | Only items with `webVisible=true` |
| omit `platform` | No channel filter (both surfaces may appear) |

**APK should pass `platform=app`** on all content list calls below that support it.

> Body field `platform` on steps/sleep/heart-rate **sync** means device OS (`android` / `ios`), not web/app visibility.

---

## 1. Auth & profile — `/api/user/auth`

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/user/auth/register/otp/send` | Public | Send registration OTP |
| POST | `/api/user/auth/register` | Public | Register (OTP + profile; optional photo) |
| POST | `/api/user/auth/login` | Public | Login by identifier |
| POST | `/api/user/auth/login/password` | Public | Password login |
| POST | `/api/user/auth/otp/send` | Public | Send login OTP |
| POST | `/api/user/auth/otp/verify` | Public | Verify login OTP → tokens |
| POST | `/api/user/auth/refresh-token` | Public | Refresh access token |
| POST | `/api/user/auth/delete/otp/send` | Public | Account-delete OTP |
| POST | `/api/user/auth/delete` | Public | Delete account (phone + OTP) |
| GET | `/api/user/auth/me` | User | Current profile |
| PATCH | `/api/user/auth/me` | User | Update profile (+ optional image) |
| POST | `/api/user/auth/profile/phone/otp/send` | User | Change-phone OTP |
| POST | `/api/user/auth/profile/phone/otp/verify` | User | Confirm phone change |
| POST | `/api/user/auth/profile/whatsapp/otp/send` | User | Change-WhatsApp OTP |
| POST | `/api/user/auth/profile/whatsapp/otp/verify` | User | Confirm WhatsApp |

**Password login example**

```bash
curl -s -X POST "$BASE/api/user/auth/login/password" \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","phoneCountryCode":"+91","password":"your-password"}'
```

Use returned `accessToken` as Bearer for User routes.

---

## 2. Public app config — `/api/public`

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/public/app-config` | Public | App config |
| GET | `/api/public/config` | Public | Alias of app-config |

---

## 3. Public content catalogs — `/api/public/misc`

All list endpoints return **active** items only. Pass **`platform=app`** where supported.

### 3.1 Platform-filtered content (WEB / APP toggles)

| Method | Path | Query params | `platform` |
|--------|------|--------------|------------|
| GET | `/api/public/misc/faqs` | `page`, `limit` | **yes** |
| GET | `/api/public/misc/real-people-testimonials` | `page`, `limit`, `healthConcernId` | **yes** |
| GET | `/api/public/misc/video-testimonials` | `page`, `limit` | **yes** |
| GET | `/api/public/misc/health-recipes` | `page`, `limit`, `type`, `category`, `search` | **yes** |
| GET | `/api/public/misc/yoga` | `page`, `limit`, `type`, `category`, `search` | **yes** |
| GET | `/api/public/misc/blog-posts` | `page`, `limit`, `search` | **yes** |
| GET | `/api/public/misc/transformations` | `page`, `limit`, `search` | **yes** |
| GET | `/api/public/misc/wellness-coaches` | `page`, `limit`, `search` | **yes** |
| GET | `/api/public/misc/assistant-wellness-coaches` | `page`, `limit`, `search` | **yes** |
| GET | `/api/public/misc/leadership-notes` | `page`, `limit`, `search` | **yes** |
| GET | `/api/public/misc/wellness-team-notes` | `page`, `limit`, `search` | **yes** |

**Example — recipes for APK**

```bash
curl -s "$BASE/api/public/misc/health-recipes?page=1&limit=20&platform=app"
```

**Example — transformations for APK**

```bash
curl -s "$BASE/api/public/misc/transformations?page=1&limit=20&platform=app"
```

### 3.2 Other public misc (no WEB/APP channel filter)

| Method | Path | Query / notes |
|--------|------|----------------|
| GET | `/api/public/misc/banners` | `page`, `limit`, `type` / `bannerType` (default `main`) |
| GET | `/api/public/misc/config-dropdowns` | All active dropdowns |
| GET | `/api/public/misc/config-dropdowns/:slug` | One dropdown |
| GET | `/api/public/misc/pages/:slug` | Static CMS page |
| GET | `/api/public/misc/client-testimonials` | `page`, `limit` |
| GET | `/api/public/misc/program-testimonials` | `page`, `limit`, `type` |
| GET | `/api/public/misc/cofounder-message` | — |
| GET | `/api/public/misc/health-concerns` | `page`, `limit`, `search` |
| GET | `/api/public/misc/health-disorders` | `page`, `limit`, `type`, `search` |
| GET | `/api/public/misc/health-tools` | `page`, `limit`, `search` |
| GET | `/api/public/misc/blog-config` | — |
| GET | `/api/public/misc/blog-media` | `page`, `limit`, `search` |
| GET | `/api/public/misc/birthday-posts` | `page`, `limit`, `postDate` (YYYY-MM-DD) |
| GET | `/api/public/misc/monthly-champions` | `monthYear` |
| GET | `/api/public/misc/test-catalog` | `page`, `limit`, `search`, `category` |
| GET | `/api/public/misc/diet-plan-catalog` | — |
| GET | `/api/public/misc/wellness-prescription-catalog` | `page`, `limit`, `search`, `category` |
| GET | `/api/public/misc/physical-exercises` | `page`, `limit`, `search`, `type` |
| GET | `/api/public/misc/mental-wellbeing` | `page`, `limit`, `search`, `type` |
| GET | `/api/public/misc/supplements` | — |
| GET | `/api/public/misc/referral/validate` | `referralCode` / `referral_code` / `ref` |
| POST | `/api/public/misc/contact-inquiries` | Body: inquiry fields |

---

## 4. Authenticated content twin

| Method | Path | Auth | Params |
|--------|------|------|--------|
| GET | `/api/user/real-people-testimonials` | User | `page`, `limit`, `healthConcernId`, `platform` (**defaults to `app`**) |
| GET | `/api/user/real-people-testimonials/:id` | User | — |

---

## 5. Payments & programs

### Consultancy (PWC) — `/api/user/consultancy-payment` (User)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/checkout-preview` | Pricing preview |
| POST | `/orders` | Create Razorpay order |
| POST | `/verify` | Verify payment |
| GET | `/transactions` | My transactions |
| GET | `/transactions/:id` | Transaction detail |
| GET | `/transactions/:id/invoice` | Invoice |

### Heal subscription — `/api/user/subscription-payment` (User)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/checkout-preview` | Preview |
| POST | `/orders` | Create order |
| POST | `/verify` | Verify |
| GET | `/transactions` | List |
| GET | `/transactions/:id` | Detail |

### Energy exchange — `/api/user/energy-exchange` (User)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/program` | Assigned EE program |
| GET | `/plans` | Plans |
| POST | `/preview` | Order preview |
| POST | `/order` | Create order |
| POST | `/verify` | Verify |
| GET | `/subscriptions` | My EE subscriptions |

### Coach-triggered program — `/api/user/program` (User)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Pending coach checkout / program |
| POST | `/preview` | Preview |
| POST | `/order` | Order |
| POST | `/verify` | Verify |

See also: [program-payment.md](../domain/program-payment.md), [consultancy-payment.md](../domain/consultancy-payment.md).

---

## 6. Paid onboarding — `/api/user/paid-onboarding`

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/state` | User | Onboarding state |
| POST | `/profile` | User | Submit profile (+ file) |
| POST | `/body-measurements` | User | Body metrics (+ weight pic) |
| POST | `/progress-photos` | User | Upload progress photos |
| GET | `/progress-photos` | User | List (`page`, `limit`) |
| GET | `/medical-questions` | User | Medical questions |
| POST | `/medical-conditions` | User | Submit answers |
| POST | `/skip-step` | User | Skip step |
| POST | `/launch/complete` | Heal + NoEagle | Complete launch |

---

## 7. Tracking & body metrics

### Water — `/api/user/water-tracking` (User)

| Method | Path | Params |
|--------|------|--------|
| GET | `/` | `days`, `date` |
| PATCH | `/goal` | Body: goal |
| POST | `/increment` | — |
| POST | `/decrement` | — |
| PUT | `/day` | Body: day value |

### Steps — `/api/user/steps-tracking` (User)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | Current tracking |
| POST | `/sync` | Body: **`platform`** (`android`/`ios`), `source`, `records` |
| PATCH | `/goal` | Body: goal |
| PUT | `/day` | Body: day |

### Sleep — `/api/user/sleep-tracking` (User)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | — |
| POST | `/sync` | Body: **`platform`** required |

### Heart rate — `/api/user/heart-rate-tracking` (User)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | — |
| POST | `/sync` | Body: **`platform`** required |

### Meal — `/api/user/meal-tracking` (Heal + NoEagle)

| Method | Path | Params |
|--------|------|--------|
| GET | `/` | `date`, `days` |
| GET | `/:logId` | — |
| POST | `/` | Body + optional photo |
| PUT | `/:logId` | Body |
| DELETE | `/:logId` | — |

### Metabolic metrics — `/api/user/metabolic-metrics` (Heal + NoEagle)

| Method | Path |
|--------|------|
| GET | `/profile` |
| GET | `/dashboard` |
| GET | `/history` (`historyLimit`) |
| GET | `/history/:metricType` |
| POST | `/` or `/:metricType` |

### Health progress — `/api/user/health-progress` (Heal + NoEagle)

| Method | Path |
|--------|------|
| GET | `/settings` |
| POST/GET | `/weight` |
| POST/GET | `/glucose` |
| POST/GET | `/blood-pressure` |
| POST/GET | `/menstrual-cycle` |
| POST/GET | `/condition-comparison` |

---

## 8. Engagement

### Notifications — `/api/user/notifications` (User)

| Method | Path | Params |
|--------|------|--------|
| GET | `/` | `unread=true` optional |
| GET | `/unread-count` | — |
| POST | `/read-all` | — |
| GET | `/:id` | — |
| PATCH | `/:id/read` | — |

### Reminders — `/api/user/reminders` (User)

| Method | Path |
|--------|------|
| GET | `/` |
| POST | `/` |
| PUT | `/:id` |
| PATCH | `/:id/toggle` |
| DELETE | `/:id` |

### Birthday posts — `/api/user/birthday-posts` (User)

| Method | Path | Params |
|--------|------|--------|
| GET | `/` | `postDate` |
| GET | `/:id` | — |
| GET/POST | `/:postId/comments` | — |
| DELETE | `/:postId/comments/:id` | — |

### Monthly champions — `/api/user/monthly-champions` (User)

| Method | Path | Params |
|--------|------|--------|
| GET | `/` | `monthYear` |
| GET | `/mine` | — |
| GET | `/standing` | — |
| GET | `/:id` | — |
| GET/POST | `/:postId/comments` | — |
| DELETE | `/:postId/comments/:id` | — |

### Client testimonials (user-authored) — `/api/user/client-testimonials` (User)

| Method | Path |
|--------|------|
| GET | `/` |
| GET | `/me` |
| GET | `/:id` |
| POST | `/` |
| PATCH | `/:id` |
| DELETE | `/:id` |

### Daily reflection — `/api/user/daily-reflection` (Heal + NoEagle)

| Method | Path |
|--------|------|
| GET/POST | `/` |
| GET | `/score` |
| GET | `/analytics` |
| GET | `/history` |
| PATCH | `/plugged-headphones` |

---

## 9. Heal care content (assigned / clinical)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/user/diet-plans/assigned` | Heal+NoEagle | Assigned diets |
| GET | `/api/user/diet-plans/assigned/:id` | Heal+NoEagle | One diet |
| GET | `/api/user/physical-exercises/assigned` | Heal+NoEagle | Assigned PE |
| GET | `/api/user/mental-wellbeing/assigned` | Heal+NoEagle | Assigned MW |
| GET | `/api/user/wellness-yoga/assigned` | Heal+NoEagle | Assigned yoga |
| GET | `/api/user/wellness-prescriptions` | Heal+NoEagle | Prescriptions |
| GET | `/api/user/supplements/recommendations` | Heal | Coach supplements |
| POST | `/api/user/supplements/recommendations/:id/request-delivery` | Heal | Request delivery |
| POST | `/api/user/supplements/recommendations/:id/bill` | Heal | Upload bill |
| GET | `/api/user/supplements/dosages` | Heal | Dosages |
| POST | `/api/user/supplements/dosages/:dosageId/log` | Heal | Toggle dose log |
| GET | `/api/user/internal-parameters/recommended` | Heal | Recommended tests |
| GET/POST | `/api/user/internal-parameters/reports` | Heal | Lab reports (+ file) |
| DELETE | `/api/user/internal-parameters/reports/:id` | Heal | Delete report |
| GET | `/api/user/commitment-letter/template` | Heal+NoEagle | Template |
| GET/POST/PATCH | `/api/user/commitment-letter` | Heal+NoEagle | Get / submit / resubmit |
| GET | `/api/user/launch-assessment/scores` | Heal+NoEagle | Scores |
| GET | `/api/user/launch-assessment/by-date` | Heal+NoEagle | `?date=` |
| GET | `/api/user/launch-assessment/:assessmentId` | Heal+NoEagle | By id |
| GET | `/api/user/prakruti-assessment` | Heal+NoEagle | Prakruti result |
| GET | `/api/user/heal-consultancy-tracks` | Heal | Tracks (`status`) |
| POST | `/api/user/heal-consultancy-tracks` | Heal | Create track |
| PATCH | `/api/user/heal-consultancy-tracks/:trackId/select-period` | Heal | Select period |
| GET | `/api/user/onboarding-meetings` | Heal+NoEagle | Meetings |
| POST | `/api/user/onboarding-meetings/:meetingId/book` | Heal+NoEagle | Book |
| POST | `/api/user/onboarding-meetings/:meetingId/request-time` | Heal+NoEagle | Request time |
| GET | `/api/user/coach-insight` | Heal+NoEagle | Coach insight |
| GET | `/api/user/protocol-settings` | User | Protocol settings |

---

## 10. Health check

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/api/health` | Public | `{ "ok": true }` |

---

## Platform filtering cheat sheet (APK)

Always use **`?platform=app`** for:

```
GET /api/public/misc/faqs
GET /api/public/misc/real-people-testimonials
GET /api/public/misc/video-testimonials
GET /api/public/misc/health-recipes
GET /api/public/misc/yoga
GET /api/public/misc/blog-posts
GET /api/public/misc/transformations
GET /api/public/misc/wellness-coaches
GET /api/public/misc/assistant-wellness-coaches
GET /api/public/misc/leadership-notes
GET /api/public/misc/wellness-team-notes
GET /api/user/real-people-testimonials   # defaults to app if omitted
```

Admin toggles live under Configs (e.g. Transformations, Recipes, Yoga, Real People, Voice, Leadership, Wellness Team). **LIVE** = `status=active|inactive`. **WEB/APP** = `webVisible` / `appVisible`.

---

## Out of scope for APK

Do **not** call from the user app:

- `/api/admin/*`
- `/api/account/*`
- `/api/coach/*`
- `/api/assistant/*`

---

## Related docs & Postman

| Resource | Path |
|----------|------|
| Quick start | [QUICKSTART.md](./QUICKSTART.md) |
| User (partial / legacy) | [user.md](./user.md) |
| Public (partial) | [public.md](./public.md) |
| Postman User | `Backend/postman/Wellness-User-Flow-API.postman_collection.json` |
| Feature: birthday | [birthday-feature.md](./birthday-feature.md) |
| Feature: daily reflection | [daily-reflection-feature.md](./daily-reflection-feature.md) |
| Feature: monthly champions | [monthly-champions-feature.md](./monthly-champions-feature.md) |
| Feature: client testimonials | [client-testimonials-user-feature.md](./client-testimonials-user-feature.md) |
| Meal tracking | [user-meal-tracking.md](./user-meal-tracking.md) |
