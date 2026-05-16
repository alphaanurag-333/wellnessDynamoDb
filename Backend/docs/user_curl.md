# User / public API — curl examples

All routes are mounted under **`/api`** (see `server.js`). Default port is **5000** unless `PORT` is set in `.env`.

## User-facing route groups

| Prefix | File | Purpose |
|--------|------|---------|
| `/api/user/auth/...` | `routes/userRoutes/authRoutes.js` | Register, login, OTP, refresh, profile (`GET /me`) |
| `/api/public/...` | `routes/publicRoutes/publicAppConfigRoutes.js` | Public app config |
| `/api/public/misc/...` | `routes/userRoutes/miscRoutes.js` | Active content lists (no auth) |

- **Auth (POST + protected GET):** see **[user_auth.md](./user_auth.md)** for full curl examples (`/user/auth/register`, `/otp/send`, `/otp/verify`, `/me`, etc.).
- **Misc (GET only):** this document. Responses use `{ status: true, ... }` plus **`pagination`** where the list model returns it.
- Only **active** records are returned on misc routes (`status: "active"`).

Static media paths (e.g. `/uploads/yoga/...`) are served from the API host root, e.g. `http://localhost:5000/uploads/...`.

---

## Query parameters (misc)

| Endpoint | `page` | `limit` | `search` | Other |
|----------|--------|---------|----------|--------|
| `/banners` | yes | yes (default 50, max 200) | no | — |
| `/faqs` | yes | yes | no | — |
| `/pages/:slug` | no | no | no | slug in path |
| `/client-testimonials` | yes | yes | no | — |
| `/video-testimonials` | yes | yes | no | — |
| `/health-concerns` | yes | yes | yes | — |
| `/health-disorders` | yes | yes | yes | **`type`** (`acute` or `chronic`) |
| `/health-tools` | yes | yes | yes | — |
| `/health-recipes` | yes | yes | yes | **`healthConcernId`**, **`type`** (`ytlink` or `video`) |
| `/yoga` | yes | yes | yes | **`type`** (`ytlink` or `video`) |
| `/transformations` | yes | yes | yes | — |
| `/celebration-banners` | yes | yes | yes | **`type`** (`birthday` or `championship`) |

---

## Route index — misc (`GET`)

| Path | Handler | Response key (besides `status`, `pagination`) |
|------|---------|-----------------------------------------------|
| `/api/public/misc/banners` | `getActiveBanners` | `banners` |
| `/api/public/misc/faqs` | `getActiveFaqs` | `faqs` |
| `/api/public/misc/pages/:slug` | `getStaticPageBySlug` | `page` |
| `/api/public/misc/client-testimonials` | `getActiveClientTestimonials` | `clientTestimonials` |
| `/api/public/misc/video-testimonials` | `getActiveVideoTestimonials` | `videoTestimonials` |
| `/api/public/misc/health-concerns` | `getActiveHealthConcerns` | `healthConcerns` |
| `/api/public/misc/health-disorders` | `getActiveHealthDisorders` | `healthDisorders` |
| `/api/public/misc/health-tools` | `getActiveHealthTools` | `healthTools` |
| `/api/public/misc/health-recipes` | `getActiveHealthRecipes` | `healthRecipes` |
| `/api/public/misc/yoga` | `getActiveYoga` | `yoga` |
| `/api/public/misc/transformations` | `getActiveTransformations` | `transformations` |
| `/api/public/misc/celebration-banners` | `getActiveCelebrationBanners` | `celebrationBanners` |

There are **no** `/:id` misc routes; use list endpoints and filter client-side by `id` / `_id` if needed.

---

## Route index — user auth (see [user_auth.md](./user_auth.md))

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/user/auth/register` | No |
| `POST` | `/api/user/auth/login` | No |
| `POST` | `/api/user/auth/login/password` | No |
| `POST` | `/api/user/auth/otp/send` | No |
| `POST` | `/api/user/auth/otp/verify` | No |
| `POST` | `/api/user/auth/refresh-token` | No |
| `GET` | `/api/user/auth/me` | Bearer user token |

---

## Optional base URL

```bash
# bash / Git Bash / WSL
export BASE_URL="http://localhost:5000/api"

# PowerShell
$env:BASE_URL = "http://localhost:5000/api"
```

Examples below use `http://localhost:5000/api`; substitute if yours differs.

---

## Health check

```bash
curl -sS -X GET "http://localhost:5000/api/health" \
  -H "Accept: application/json"
```

---

## Public app config (not misc)

```bash
curl -sS -X GET "http://localhost:5000/api/public/app-config" \
  -H "Accept: application/json"
```

Alias:

```bash
curl -sS -X GET "http://localhost:5000/api/public/config" \
  -H "Accept: application/json"
```

---

## `/api/public/misc` — banners, FAQs, pages, testimonials

### Banners (`getActiveBanners`)

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/banners" \
  -H "Accept: application/json"
```

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/banners?page=1&limit=50" \
  -H "Accept: application/json"
```

### FAQs (`getActiveFaqs`)

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/faqs" \
  -H "Accept: application/json"
```

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/faqs?page=1&limit=20" \
  -H "Accept: application/json"
```

### Static page by slug (`getStaticPageBySlug`)

Active pages only; missing or inactive → **404**.

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/pages/privacy-policy" \
  -H "Accept: application/json"
```

### Client testimonials (`getActiveClientTestimonials`)

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/client-testimonials" \
  -H "Accept: application/json"
```

### Video testimonials (`getActiveVideoTestimonials`)

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/video-testimonials" \
  -H "Accept: application/json"
```

---

## `/api/public/misc` — health concerns, disorders, tools, recipes, yoga

### Health concerns (`getActiveHealthConcerns`)

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/health-concerns" \
  -H "Accept: application/json"
```

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/health-concerns?page=1&limit=50&search=heart" \
  -H "Accept: application/json"
```

### Health disorders (`getActiveHealthDisorders`)

Returns active disorders with fields such as `id`, `_id`, `title`, `description`, `symptoms` (string array), `type` (`acute` | `chronic`), `status`, `createdAt`, `updatedAt`.

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/health-disorders" \
  -H "Accept: application/json"
```

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/health-disorders?page=1&limit=20&type=chronic&search=migraine" \
  -H "Accept: application/json"
```

`type` must be **`acute`** or **`chronic`**.

### Health tools (`getActiveHealthTools`)

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/health-tools" \
  -H "Accept: application/json"
```

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/health-tools?search=water" \
  -H "Accept: application/json"
```

### Health recipes (`getActiveHealthRecipes`)

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/health-recipes" \
  -H "Accept: application/json"
```

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/health-recipes?healthConcernId=PASTE_UUID&type=ytlink&search=salad&page=1&limit=20" \
  -H "Accept: application/json"
```

`type` must be **`ytlink`** or **`video`**.

### Yoga (`getActiveYoga`)

Returns active yoga items with fields such as `id`, `_id`, `title`, `description`, `thumbnail` (path under `/uploads/yoga/...`), `type` (`ytlink` | `video`), `ytLink`, `video`, `status`, `createdAt`, `updatedAt`.

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/yoga" \
  -H "Accept: application/json"
```

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/yoga?page=1&limit=20&type=ytlink&search=morning" \
  -H "Accept: application/json"
```

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/yoga?type=video&page=1&limit=10" \
  -H "Accept: application/json"
```

`type` must be **`ytlink`** or **`video`**. Prepend your API host to `thumbnail` / `video` paths for full URLs (e.g. `http://localhost:5000/uploads/yoga/file-123.jpg`).

---

## `/api/public/misc` — transformations, celebration banners

### Transformations (`getActiveTransformations`)

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/transformations" \
  -H "Accept: application/json"
```

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/transformations?search=weight" \
  -H "Accept: application/json"
```

### Celebration banners (`getActiveCelebrationBanners`)

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/celebration-banners" \
  -H "Accept: application/json"
```

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/celebration-banners?type=birthday" \
  -H "Accept: application/json"
```

`type` must be **`birthday`** or **`championship`**.

---

## Example list response shape

```json
{
  "status": true,
  "healthDisorders": [],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 0,
    "pages": 1
  }
}
```

Same pattern for `yoga`, `healthRecipes`, `healthConcerns`, etc. (array key matches the resource name).

---

## Pretty-print with jq (optional)

```bash
curl -sS "http://localhost:5000/api/public/misc/health-disorders" \
  -H "Accept: application/json" | jq .
```

```bash
curl -sS "http://localhost:5000/api/public/misc/yoga?type=ytlink" \
  -H "Accept: application/json" | jq .
```

---

## Windows PowerShell

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/public/misc/health-concerns" -Method Get
```

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/public/misc/health-disorders?type=acute&page=1&limit=20" -Method Get
```

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/public/misc/yoga?type=ytlink" -Method Get
```

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/public/misc/health-recipes?type=ytlink" -Method Get
```

User auth (OTP example):

```powershell
$body = @{ email = "user@example.com" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/user/auth/otp/send" -Method Post -Body $body -ContentType "application/json"
```

See **[user_auth.md](./user_auth.md)** for full auth curl examples.
