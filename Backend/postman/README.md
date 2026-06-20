# Wellness User API — Postman

## Import

1. Open Postman → **Import**
2. Add:
   - `Wellness-User-API.postman_collection.json`
   - `Wellness-User-Local.postman_environment.json` (optional)
3. Select environment **Wellness User — Local**
4. Start backend: `npm start` (default `http://localhost:5000`)

## Variables

| Variable | Purpose |
|----------|---------|
| `baseUrl` | API root, e.g. `http://localhost:5000/api` |
| `accessToken` | Auto-set after login/register |
| `refreshToken` | Auto-set after login/register |
| `userEmail`, `userPhone`, `userPassword` | Test credentials |
| `userOtp` | Auto-set from `debugOtp` in dev when `EXPOSE_OTP_IN_RESPONSE=true` |
| `todayDate` | `YYYY-MM-DD` for water tracking |
| `primaryHealthConcernId` | Health concern UUID for registration |

## Suggested test flow

1. **Send Registration OTP** → copy OTP (or use auto-saved `debugOtp`)
2. **Register** or **Login with Password**
3. **Get My Profile** (uses saved `accessToken`)
4. **Water Tracking** folder — goal, increment, get summary

## Collection folders

- **Auth** — register, login, profile, delete account
- **Water Tracking** — mobile hydration APIs
- **Public (App)** — banners, FAQs, app config (no auth)
