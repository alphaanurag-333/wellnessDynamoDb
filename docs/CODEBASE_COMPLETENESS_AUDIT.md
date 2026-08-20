# Wellness Dynamo — Codebase Completeness Audit

**Date:** 20 Aug 2026  
**Scope:** `Admin/`, `Backend/`, `Frontend/` (public marketing site)  
**Purpose:** What is live, what is still static/demo, what is missing, and what blocks production.

---

## 1. Executive summary

| Area | Status | Notes |
|------|--------|--------|
| Staff auth, roles, teams, referrals | **Mostly live** | Account-based auth + permission catalog |
| User convert / assign / Heal onboarding APIs | **Live** | Admin UI mostly wired; some profile actions still soft |
| Dashboard & revenue | **Partial** | Live stats exist; many cards fall back to fake numbers |
| Client profile sections | **Mixed** | Food/BMS/IP/Health Progress live for UUID users; Gut Reset fully fake |
| Configs / Feature flags | **Partial** | Dropdowns live; several toggles only toast; flags UI unreachable |
| Payments (Backend) | **Partial** | Client verify works; **no Razorpay webhook**; mock path in non-prod |
| OTP / SMS / WhatsApp / Zoom | **Blocked for prod** | OTP logged only; WA/Zoom mock when credentials missing |
| Frontend package | **Marketing site only** | No mobile user app in this repo |
| Mobile / user app | **Not in repo** | User flows live under Backend `/api/user/*` only |

---

## 2. What is already working (do not rebuild)

- Staff login, OTP step (delivery incomplete — see blockers), refresh, View As, permission matrix  
- Teams CRUD, Access Control (super-admin), referral codes & assignment  
- Convert Seek ↔ Heal / Maintenance, coach assign/reassign  
- Paid-onboarding APIs + Admin LAUNCH / Prakriti / meetings (API-backed)  
- Users list (search/filter/pagination), Pending tasks API, Calendar, SOP, My Content (API)  
- Config dropdowns (Dynamo + seed), many CMS content sections  
- Consultancy / subscription / Energy Exchange / program payment verify flows (client-side)  
- Public marketing site: banners, testimonials, coaches, contact, legal CMS pages when API is up  

Details of completed work: [`FUNCTIONALITY_DONE.md`](./FUNCTIONALITY_DONE.md) (note: §11 Pending Tasks “static” claim is **outdated** — API + Admin page exist; only notes use `localStorage`).

---

## 3. Static / demo data still driving UI

### 3.1 Admin — high impact

| Item | Where | Risk |
|------|--------|------|
| Fake users `/users/1`…`17` | `UserDetailPage.jsx`, `usersData.js`, `userDetailData.js` | Demo profiles look real |
| Dashboard fallbacks | `dashboardData.js`, `AdminDashboard.jsx` | Fake tier/leaderboard/stale counts when stats missing |
| Support “Quick insights” | Always from `SUPPORT_QUICK_INSIGHTS` | Never live |
| Revenue mock (~₹39.9L) | `revenueAnalytics.js` | Silent fake revenue if API fails |
| Program progress modal seeds | `programProgressData.js` | Fake names/progress |
| Gut Reset | `gutResetData.js` + `GutResetSection.jsx` | Entire section local-only |
| Food / BMS / IP / Health Progress demos | `*Data.js` + sections when id is numeric | Mock charts/meals/reports |
| Feature flags list | `featureFlagsData.js` | Local toggles only |
| Commitment letter seed | `commitmentLettersData.js` + localStorage | Can show Figma/demo letters |
| Website footer links | `websiteLinksConfigData.js` | Hardcoded URLs |

### 3.2 Backend — hardcoded rules / seeds

| Item | Where |
|------|--------|
| AppConfig default prices / FY discounts | `appConfigModel.js` |
| Concern → program regex matching | `adminHealConversionService.js` |
| Counselling overdue = 14 days | `pendingTasksService.js` |
| Dashboard FY month fixed to April | `adminDashboardStatsService.js` (ignores app-config) |
| Config dropdown option seeds in code | `configDropdownModel.js` |
| Default staff temp password `Admin@12345` | `accountAdminController.js`, seed scripts |
| Mock payments / Zoom / WhatsApp | `paymentGateway.js`, `zoom.js`, `whatsapp.js` |

### 3.3 Frontend (marketing)

| Item | Where |
|------|--------|
| Hero / services / contact placeholders | `siteContent.js` |
| Program landing copy + WhatsApp CTA | `programPages.js` |
| Empty Android/iOS store URLs | `MOBILE_APP` in `siteContent.js` |
| Hardcoded API host (ignores `.env`) | `Frontend/src/api.js` |
| Calculators client-only | BMI/BMR/body-fat components |

---

## 4. Missing / incomplete features

### P0 — looks finished but is not

1. **Gut Reset** — trigger only updates local history + toast; no backend.  
2. **Configs page App/Web/Live chips** — local state + toast; no persist API.  
3. **Feature Flags UI** — toast-only; **not in config catalog** → route effectively unreachable.  
4. **Revenue / Support dashboard cards** — can display mock data without clear “offline/demo” banner.  
5. **OTP delivery** — `Backend/utils/otp.js` TODO: production only logs OTP.

### P1 — partial wiring

6. **Website links config** (`web-fs-links`) — editor without `persistToAppConfig`; labeled Coming soon.  
7. **Admin Heal convert without coach** — tier upgrades but program + Energy Exchange skipped until `parentCoachId` set.  
8. **Razorpay webhooks** — signature helper exists; **no HTTP webhook route** mounted.  
9. **Paid consultancy** — can succeed without Zoom link / WhatsApp notify (logged only).  
10. **Commitment letters** — API + localStorage/Figma seed fallback.  
11. **Generic config panel** — “coming soon” for unmatched config ids.  
12. **Frontend download funnel** — store links empty unless app-config provides them.

### P2 — cleanup / polish

13. Orphan data: `myContentData.js`, unused `DAILY_METRICS`, unused `CAL_DEMO_TODAY`.  
14. Empty `.catch(() => {})` / soft-fail loaders hide errors (Food, Launch, At-a-Glance, meal AI status).  
15. Duplicate migration number `44-*` (`44-user-protocol-setting.js` and `44-onboarding-meetings.js`).  
16. Account flags: `ACCOUNT_AUTH_ENABLED` / `ACCOUNT_DUAL_WRITE` defaults vs docs mismatch.  
17. No mobile client app in this monorepo (only Backend user APIs + Admin + marketing site).

---

## 5. Blockers (production / security)

| # | Blocker | Location | Impact |
|---|---------|----------|--------|
| B1 | **Open CORS** (`cors()` with defaults) | `Backend/server.js` | Any origin can call API |
| B2 | **OTP not sent** in production | `Backend/utils/otp.js` | Staff/user login OTP broken without SMS/email |
| B3 | **Staff OTP exposable** when `EXPOSE_OTP_IN_RESPONSE=true` (no prod guard) | `account/.../authController.js` | OTP leak risk |
| B4 | **Admin API default localhost** if `VITE_API_URL` unset | `Admin/src/api.js` | Deployed Admin hits wrong host |
| B5 | **Frontend API hardcoded** to staging host | `Frontend/src/api.js` | Env ignored; wrong environment |
| B6 | **No payment webhook** | Routes | Missed/failed client verifies leave paid state inconsistent |
| B7 | **Mock payments** when gateway missing (non-prod) | `paymentGateway.js` | Accidental mock in staging if misconfigured |
| B8 | Default seed passwords (`Admin@12345`) | Seeds / account create | Weak defaults if reused |
| B9 | Fake dashboard/revenue without banner | Admin dashboard | Business decisions on wrong numbers |
| B10 | Numeric mock user IDs in Admin | `UserDetailPage` | Demo data mistaken for real clients |

---

## 6. Recommended fix order

### Sprint A — Stop lying to operators
1. Banner or hard-fail when dashboard/revenue fall back to mocks (no silent ₹ totals).  
2. Remove or gate numeric mock user IDs behind `import.meta.env.DEV` only.  
3. Gut Reset: either hide section or wire real API; remove “Triggered to app” toast-only path.  
4. Configs chips / Feature Flags: wire to AppConfig **or** remove from UI.

### Sprint B — Production plumbing
5. SMS/email OTP provider; forbid OTP in API responses in production.  
6. Restrict CORS to known Admin/Frontend origins.  
7. Require `VITE_API_URL` in Admin/Frontend builds (fail build if missing).  
8. Add Razorpay webhook route + idempotent fulfill path.  
9. Surface Zoom/WhatsApp failures after payment (or retry queue).

### Sprint C — Product completeness
10. Admin convert: require coach **or** auto-queue entitlements on assign.  
11. Align revenue FY with `appConfig.fy_start_month`.  
12. Replace concern→program regex with catalog `recommendedCatalogProgramId` only.  
13. Persist website links via App Config; publish store URLs for download CTAs.  
14. Update `FUNCTIONALITY_DONE.md` gaps (§7, §11) to match current API reality.

---

## 7. Surface map (where to look)

```
Admin/src/data/*              ← most static seeds & fallbacks
Admin/src/components/AdminDashboard.jsx
Admin/src/components/clientProfile/GutResetSection.jsx
Admin/src/pages/ConfigsPage.jsx, ConfigDetailPage.jsx
Admin/src/api.js              ← API base URL
Backend/utils/otp.js          ← SMS TODO
Backend/utils/paymentGateway.js
Backend/server.js             ← CORS
Backend/services/adminHealConversionService.js
Frontend/src/api.js           ← hardcoded staging URL
Frontend/src/site/data/*      ← marketing static copy
docs/FUNCTIONALITY_DONE.md    ← older gap list (partially stale)
```

---

## 8. Out of scope / not found in this repo

- Native iOS/Android or React Native user app  
- In-Frontend checkout / onboarding (by design — marketing site only)  
- Admin `TODO`/`FIXME` comments (almost none; gaps are behavioral, not annotated)

---

*Generated from a read-only review of Admin, Backend, and Frontend. Re-run after major config/payment/OTP work.*
