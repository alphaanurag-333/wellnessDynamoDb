# Public API

Base path: `/api`  
**Authentication:** none

Full APK-oriented guide (public + authenticated user): **[user-app-api.md](./user-app-api.md)**

---

## Health

| Method | Path |
|--------|------|
| `GET` | `/health` |

---

## App config

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/public/app-config` | `routes/publicRoutes/publicAppConfigRoutes.js` |
| `GET` | `/public/config` | same (alias) |

---

## Misc (`/public/misc`)

Source: `routes/userRoutes/miscRoutes.js`

Many list endpoints accept `?platform=app|web` so Admin Web/App visibility toggles apply. Prefer `platform=app` from the mobile app.

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/public/misc/banners` | `page`, `limit`, `bannerType` / `type`, `platform` — see [banner-feature.md](./banner-feature.md) |
| `GET` | `/public/misc/faqs` | `platform` |
| `GET` | `/public/misc/config-dropdowns` | |
| `GET` | `/public/misc/config-dropdowns/:slug` | |
| `GET` | `/public/misc/pages/:slug` | |
| `GET` | `/public/misc/client-testimonials` | `platform` |
| `GET` | `/public/misc/program-testimonials` | |
| `GET` | `/public/misc/real-people-testimonials` | `platform` |
| `GET` | `/public/misc/video-testimonials` | `platform` |
| `GET` | `/public/misc/cofounder-message` | |
| `GET` | `/public/misc/health-concerns` | |
| `GET` | `/public/misc/health-disorders` | |
| `GET` | `/public/misc/health-tools` | |
| `GET` | `/public/misc/health-recipes` | `type`, `category`, `search`, `platform` |
| `GET` | `/public/misc/yoga` | `search`, `platform` |
| `GET` | `/public/misc/transformations` | `search`, `platform` |
| `GET` | `/public/misc/wellness-coaches` | `platform` |
| `GET` | `/public/misc/assistant-wellness-coaches` | `platform` |
| `GET` | `/public/misc/leadership-notes` | `platform` |
| `GET` | `/public/misc/wellness-team-notes` | `platform` |
| `GET` | `/public/misc/birthday-posts` | |
| `GET` | `/public/misc/monthly-champions` | |
| `GET` | `/public/misc/test-catalog` | |
| `GET` | `/public/misc/diet-plan-catalog` | |
| `GET` | `/public/misc/wellness-prescription-catalog` | |
| `GET` | `/public/misc/physical-exercises` | |
| `GET` | `/public/misc/mental-wellbeing` | |
| `GET` | `/public/misc/supplements` | |
| `POST` | `/public/misc/contact-inquiries` | Contact form |
| `GET` | `/public/misc/referral/validate` | Validate referral code |
