# User API (authenticated)

Base path: `/api`  
**Authentication:** Bearer user `accessToken` unless noted

Complete APK guide (public + auth + Heal): **[user-app-api.md](./user-app-api.md)**  
Quick curls: [QUICKSTART.md](./QUICKSTART.md)

---

## Auth (`/user/auth`)

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/user/auth/register/otp/send` | Public |
| `POST` | `/user/auth/register` | Public |
| `POST` | `/user/auth/login` | Public |
| `POST` | `/user/auth/login/password` | Public |
| `POST` | `/user/auth/otp/send` | Public |
| `POST` | `/user/auth/otp/verify` | Public |
| `POST` | `/user/auth/refresh-token` | Public |
| `POST` | `/user/auth/delete/otp/send` | Public |
| `POST` | `/user/auth/delete` | Public |
| `GET` | `/user/auth/me` | JWT |
| `PATCH` | `/user/auth/me` | JWT |
| `POST` | `/user/auth/profile/phone/otp/send` | JWT |
| `POST` | `/user/auth/profile/phone/otp/verify` | JWT |
| `POST` | `/user/auth/profile/whatsapp/otp/send` | JWT |
| `POST` | `/user/auth/profile/whatsapp/otp/verify` | JWT |

Source: `routes/userRoutes/authRoutes.js`

---

## Notifications

| Method | Path |
|--------|------|
| `GET` | `/user/notifications` |
| `GET` | `/user/notifications/unread-count` |
| `POST` | `/user/notifications/read-all` |
| `GET` | `/user/notifications/:id` |
| `PATCH` | `/user/notifications/:id/read` |

---

## Reminders

| Method | Path |
|--------|------|
| `GET` | `/user/reminders` |
| `POST` | `/user/reminders` |
| `PUT` | `/user/reminders/:id` |
| `PATCH` | `/user/reminders/:id/toggle` |
| `DELETE` | `/user/reminders/:id` |

---

## Water tracking

| Method | Path |
|--------|------|
| `GET` | `/user/water-tracking` |
| `PATCH` | `/user/water-tracking/goal` |
| `POST` | `/user/water-tracking/increment` |
| `POST` | `/user/water-tracking/decrement` |
| `PUT` | `/user/water-tracking/day` |

---

## Steps tracking

| Method | Path |
|--------|------|
| `GET` | `/user/steps-tracking` |
| `POST` | `/user/steps-tracking/sync` |
| `PATCH` | `/user/steps-tracking/goal` |
| `PUT` | `/user/steps-tracking/day` |

---

## Sleep tracking

| Method | Path |
|--------|------|
| `GET` | `/user/sleep-tracking` |
| `POST` | `/user/sleep-tracking/sync` |

---

## Heart rate tracking

| Method | Path |
|--------|------|
| `GET` | `/user/heart-rate-tracking` |
| `POST` | `/user/heart-rate-tracking/sync` |

---

## Consultancy payment

| Method | Path |
|--------|------|
| `GET` | `/user/consultancy-payment/checkout-preview` |
| `POST` | `/user/consultancy-payment/orders` |
| `POST` | `/user/consultancy-payment/verify` |
| `GET` | `/user/consultancy-payment/transactions` |
| `GET` | `/user/consultancy-payment/transactions/:id` |
| `GET` | `/user/consultancy-payment/transactions/:id/invoice` |

---

## Subscription payment

| Method | Path |
|--------|------|
| `GET` | `/user/subscription-payment/checkout-preview` |
| `POST` | `/user/subscription-payment/orders` |
| `POST` | `/user/subscription-payment/verify` |
| `GET` | `/user/subscription-payment/transactions` |
| `GET` | `/user/subscription-payment/transactions/:id` |

---

## Energy exchange

| Method | Path |
|--------|------|
| `GET` | `/user/energy-exchange/program` |
| `GET` | `/user/energy-exchange/plans` |
| `POST` | `/user/energy-exchange/preview` |
| `POST` | `/user/energy-exchange/order` |
| `POST` | `/user/energy-exchange/verify` |
| `GET` | `/user/energy-exchange/subscriptions` |

---

## Coach-triggered program

| Method | Path |
|--------|------|
| `GET` | `/user/program` |
| `POST` | `/user/program/preview` |
| `POST` | `/user/program/order` |
| `POST` | `/user/program/verify` |

See [program-payment.md](../domain/program-payment.md).

---

## Birthday posts

| Method | Path |
|--------|------|
| `GET` | `/user/birthday-posts` |
| `GET` | `/user/birthday-posts/:id` |
| `GET` | `/user/birthday-posts/:postId/comments` |
| `POST` | `/user/birthday-posts/:postId/comments` |
| `DELETE` | `/user/birthday-posts/:postId/comments/:id` |

---

## Monthly champions

| Method | Path |
|--------|------|
| `GET` | `/user/monthly-champions` |
| `GET` | `/user/monthly-champions/mine` |
| `GET` | `/user/monthly-champions/standing` |
| `GET` | `/user/monthly-champions/:id` |
| `GET` | `/user/monthly-champions/:postId/comments` |
| `POST` | `/user/monthly-champions/:postId/comments` |
| `DELETE` | `/user/monthly-champions/:postId/comments/:id` |

---

## Client testimonials

| Method | Path |
|--------|------|
| `GET` | `/user/client-testimonials` |
| `GET` | `/user/client-testimonials/me` |
| `GET` | `/user/client-testimonials/:id` |
| `POST` | `/user/client-testimonials` |
| `PATCH` | `/user/client-testimonials/:id` |
| `DELETE` | `/user/client-testimonials/:id` |

---

## Real people testimonials

| Method | Path |
|--------|------|
| `GET` | `/user/real-people-testimonials` |
| `GET` | `/user/real-people-testimonials/:id` |

---

## Paid onboarding (Heal)

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

---

## Onboarding meetings (Heal)

| Method | Path |
|--------|------|
| `GET` | `/user/onboarding-meetings` |
| `POST` | `/user/onboarding-meetings/:meetingId/book` |
| `POST` | `/user/onboarding-meetings/:meetingId/request-time` |

---

## Commitment letter (Heal)

| Method | Path |
|--------|------|
| `GET` | `/user/commitment-letter/template` |
| `GET` | `/user/commitment-letter` |
| `POST` | `/user/commitment-letter` |
| `PATCH` | `/user/commitment-letter` |

---

## Heal consultancy tracks

| Method | Path |
|--------|------|
| `GET` | `/user/heal-consultancy-tracks` |
| `POST` | `/user/heal-consultancy-tracks` |
| `PATCH` | `/user/heal-consultancy-tracks/:trackId/select-period` |

---

## Assignments & catalogs (Heal)

| Method | Path |
|--------|------|
| `GET` | `/user/diet-plans/assigned` |
| `GET` | `/user/diet-plans/assigned/:id` |
| `GET` | `/user/physical-exercises/assigned` |
| `GET` | `/user/mental-wellbeing/assigned` |
| `GET` | `/user/wellness-yoga/assigned` |
| `GET` | `/user/wellness-prescriptions` |
| `GET` | `/user/coach-insight` |
| `GET` | `/user/protocol-settings` |
| `GET` | `/user/prakruti-assessment` |

---

## Launch assessment (Heal)

| Method | Path |
|--------|------|
| `GET` | `/user/launch-assessment/scores` |
| `GET` | `/user/launch-assessment/by-date` |
| `GET` | `/user/launch-assessment/:assessmentId` |

---

## Supplements (Heal)

| Method | Path |
|--------|------|
| `GET` | `/user/supplements/recommendations` |
| `POST` | `/user/supplements/recommendations/:id/request-delivery` |
| `POST` | `/user/supplements/recommendations/:id/bill` |
| `GET` | `/user/supplements/dosages` |
| `POST` | `/user/supplements/dosages/:dosageId/log` |

---

## Meal tracking (Heal)

| Method | Path |
|--------|------|
| `GET` | `/user/meal-tracking` |
| `GET` | `/user/meal-tracking/:logId` |
| `POST` | `/user/meal-tracking` |
| `PUT` | `/user/meal-tracking/:logId` |
| `DELETE` | `/user/meal-tracking/:logId` |

---

## Daily reflection (Heal)

| Method | Path |
|--------|------|
| `GET` | `/user/daily-reflection` |
| `POST` | `/user/daily-reflection` |
| `GET` | `/user/daily-reflection/score` |
| `GET` | `/user/daily-reflection/analytics` |
| `GET` | `/user/daily-reflection/history` |
| `PATCH` | `/user/daily-reflection/plugged-headphones` |

---

## Health progress (Heal)

| Method | Path |
|--------|------|
| `GET` | `/user/health-progress/settings` |
| `POST` | `/user/health-progress/weight` |
| `GET` | `/user/health-progress/weight` |
| `POST` | `/user/health-progress/glucose` |
| `GET` | `/user/health-progress/glucose` |
| `POST` | `/user/health-progress/blood-pressure` |
| `GET` | `/user/health-progress/blood-pressure` |
| `POST` | `/user/health-progress/menstrual-cycle` |
| `GET` | `/user/health-progress/menstrual-cycle` |
| `POST` | `/user/health-progress/condition-comparison` |
| `GET` | `/user/health-progress/condition-comparison` |

---

## Metabolic metrics (Heal)

| Method | Path |
|--------|------|
| `GET` | `/user/metabolic-metrics/profile` |
| `GET` | `/user/metabolic-metrics/dashboard` |
| `GET` | `/user/metabolic-metrics/history` |
| `GET` | `/user/metabolic-metrics/history/:metricType` |
| `POST` | `/user/metabolic-metrics` |
| `POST` | `/user/metabolic-metrics/:metricType` |

---

## Internal parameters (Heal)

| Method | Path |
|--------|------|
| `GET` | `/user/internal-parameters/recommended` |
| `GET` | `/user/internal-parameters/reports` |
| `POST` | `/user/internal-parameters/reports` |
| `DELETE` | `/user/internal-parameters/reports/:id` |

---

Public content (banners, FAQ, recipes, etc.) lives under `/public/*` — see [public.md](./public.md) and [user-app-api.md](./user-app-api.md).
