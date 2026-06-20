# Wellness Coach API

Base path: `/api`

**Authentication:** Bearer `coachToken` from `POST /coach/auth/login`

## assistants

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/coach/assistants` | `routes\wellnessCoachRoutes\coachAssistantRoutes.js` |
| `POST` | `/coach/assistants` | `routes\wellnessCoachRoutes\coachAssistantRoutes.js` |
| `DELETE` | `/coach/assistants/:id` | `routes\wellnessCoachRoutes\coachAssistantRoutes.js` |
| `GET` | `/coach/assistants/:id` | `routes\wellnessCoachRoutes\coachAssistantRoutes.js` |
| `PATCH` | `/coach/assistants/:id` | `routes\wellnessCoachRoutes\coachAssistantRoutes.js` |
| `GET` | `/coach/assistants/count` | `routes\wellnessCoachRoutes\coachAssistantRoutes.js` |

## auth

| Method | Path | Source |
|--------|------|--------|
| `POST` | `/coach/auth/login` | `routes\wellnessCoachRoutes\coachAuthRoutes.js` |
| `GET` | `/coach/auth/me` | `routes\wellnessCoachRoutes\coachAuthRoutes.js` |
| `PATCH` | `/coach/auth/me` | `routes\wellnessCoachRoutes\coachAuthRoutes.js` |
| `PATCH` | `/coach/auth/me/password` | `routes\wellnessCoachRoutes\coachAuthRoutes.js` |
| `POST` | `/coach/auth/otp/send` | `routes\wellnessCoachRoutes\coachAuthRoutes.js` |
| `POST` | `/coach/auth/otp/verify` | `routes\wellnessCoachRoutes\coachAuthRoutes.js` |
| `POST` | `/coach/auth/refresh-token` | `routes\wellnessCoachRoutes\coachAuthRoutes.js` |
| `POST` | `/coach/auth/register` | `routes\wellnessCoachRoutes\coachAuthRoutes.js` |

## consultancy

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/coach/consultancy/enrolled-users` | `routes\wellnessCoachRoutes\coachConsultancyRoutes.js` |
| `GET` | `/coach/consultancy/transactions` | `routes\wellnessCoachRoutes\coachConsultancyRoutes.js` |
| `GET` | `/coach/consultancy/transactions/:id` | `routes\wellnessCoachRoutes\coachConsultancyRoutes.js` |
| `GET` | `/coach/consultancy/transactions/:id/invoice` | `routes\wellnessCoachRoutes\coachConsultancyRoutes.js` |

## heal-users

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/coach/heal-users` | `routes\wellnessCoachRoutes\coachHealUserRoutes.js` |
| `POST` | `/coach/heal-users/:id/reassign` | `routes\wellnessCoachRoutes\coachHealUserRoutes.js` |
| `GET` | `/coach/heal-users/:id/water-tracking` | `routes\wellnessCoachRoutes\coachHealUserRoutes.js` |

## specializations

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/coach/specializations` | `routes\wellnessCoachRoutes\coachSpecializationRoutes.js` |

