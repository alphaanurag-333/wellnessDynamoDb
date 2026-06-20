# Assistant Coach API

Base path: `/api`

**Authentication:** Bearer `assistantToken` from `POST /assistant/auth/login`

## auth

| Method | Path | Source |
|--------|------|--------|
| `POST` | `/assistant/auth/login` | `routes\assistantWellnessCoachRoutes\assistantAuthRoutes.js` |
| `GET` | `/assistant/auth/me` | `routes\assistantWellnessCoachRoutes\assistantAuthRoutes.js` |
| `PATCH` | `/assistant/auth/me` | `routes\assistantWellnessCoachRoutes\assistantAuthRoutes.js` |
| `PATCH` | `/assistant/auth/me/password` | `routes\assistantWellnessCoachRoutes\assistantAuthRoutes.js` |
| `POST` | `/assistant/auth/otp/send` | `routes\assistantWellnessCoachRoutes\assistantAuthRoutes.js` |
| `POST` | `/assistant/auth/otp/verify` | `routes\assistantWellnessCoachRoutes\assistantAuthRoutes.js` |
| `POST` | `/assistant/auth/refresh-token` | `routes\assistantWellnessCoachRoutes\assistantAuthRoutes.js` |

## consultancy

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/assistant/consultancy/enrolled-users` | `routes\assistantWellnessCoachRoutes\assistantConsultancyRoutes.js` |
| `GET` | `/assistant/consultancy/transactions` | `routes\assistantWellnessCoachRoutes\assistantConsultancyRoutes.js` |
| `GET` | `/assistant/consultancy/transactions/:id` | `routes\assistantWellnessCoachRoutes\assistantConsultancyRoutes.js` |
| `GET` | `/assistant/consultancy/transactions/:id/invoice` | `routes\assistantWellnessCoachRoutes\assistantConsultancyRoutes.js` |

## heal-users

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/assistant/heal-users` | `routes\assistantWellnessCoachRoutes\assistantHealUserRoutes.js` |
| `GET` | `/assistant/heal-users/:id/water-tracking` | `routes\assistantWellnessCoachRoutes\assistantHealUserRoutes.js` |

