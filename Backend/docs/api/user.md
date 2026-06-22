# User API

Base path: `/api`

**Authentication:** Bearer `accessToken` from user auth endpoints

## auth

| Method | Path | Source |
|--------|------|--------|
| `POST` | `/user/auth/delete` | `routes\userRoutes\authRoutes.js` |
| `POST` | `/user/auth/delete/otp/send` | `routes\userRoutes\authRoutes.js` |
| `POST` | `/user/auth/login` | `routes\userRoutes\authRoutes.js` |
| `POST` | `/user/auth/login/password` | `routes\userRoutes\authRoutes.js` |
| `GET` | `/user/auth/me` | `routes\userRoutes\authRoutes.js` |
| `PATCH` | `/user/auth/me` | `routes\userRoutes\authRoutes.js` |
| `POST` | `/user/auth/otp/send` | `routes\userRoutes\authRoutes.js` |
| `POST` | `/user/auth/otp/verify` | `routes\userRoutes\authRoutes.js` |
| `POST` | `/user/auth/refresh-token` | `routes\userRoutes\authRoutes.js` |
| `POST` | `/user/auth/register` | `routes\userRoutes\authRoutes.js` |
| `POST` | `/user/auth/register/otp/send` | `routes\userRoutes\authRoutes.js` |

## consultancy-payment

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/user/consultancy-payment/checkout-preview` | `routes\userRoutes\consultancyPaymentRoutes.js` |
| `POST` | `/user/consultancy-payment/orders` | `routes\userRoutes\consultancyPaymentRoutes.js` |
| `GET` | `/user/consultancy-payment/transactions` | `routes\userRoutes\consultancyPaymentRoutes.js` |
| `GET` | `/user/consultancy-payment/transactions/:id` | `routes\userRoutes\consultancyPaymentRoutes.js` |
| `GET` | `/user/consultancy-payment/transactions/:id/invoice` | `routes\userRoutes\consultancyPaymentRoutes.js` |
| `POST` | `/user/consultancy-payment/verify` | `routes\userRoutes\consultancyPaymentRoutes.js` |

## water-tracking

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/user/water-tracking` | `routes\userRoutes\waterTrackingRoutes.js` |
| `PUT` | `/user/water-tracking/day` | `routes\userRoutes\waterTrackingRoutes.js` |
| `POST` | `/user/water-tracking/decrement` | `routes\userRoutes\waterTrackingRoutes.js` |
| `PATCH` | `/user/water-tracking/goal` | `routes\userRoutes\waterTrackingRoutes.js` |
| `POST` | `/user/water-tracking/increment` | `routes\userRoutes\waterTrackingRoutes.js` |

## steps-tracking

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/user/steps-tracking` | `routes\userRoutes\stepsTrackingRoutes.js` |
| `POST` | `/user/steps-tracking/sync` | `routes\userRoutes\stepsTrackingRoutes.js` |
| `PATCH` | `/user/steps-tracking/goal` | `routes\userRoutes\stepsTrackingRoutes.js` |
| `PUT` | `/user/steps-tracking/day` | `routes\userRoutes\stepsTrackingRoutes.js` |

## Admin / coach / assistant — client steps history

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/admin/users/:id/steps-tracking` | `routes\adminRoutes\adminUserRoutes.js` |
| `GET` | `/coach/heal-users/:id/steps-tracking` | `routes\wellnessCoachRoutes\coachHealUserRoutes.js` |
| `GET` | `/assistant/heal-users/:id/steps-tracking` | `routes\assistantWellnessCoachRoutes\assistantHealUserRoutes.js` |

See `docs/steps-tracking-native-formats.md` for Health Connect / HealthKit mapping.

