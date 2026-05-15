# User / public API — curl examples

All routes are mounted under **`/api`** (see `server.js`). Default port is **5000** unless `PORT` is set in `.env`.

- **`/api/public/...`** — defined in `routes/publicRoutes/` (e.g. app config).
- **`/api/public/misc/...`** — defined in `routes/userRoutes/miscRoutes.js`, handled by `controllers/userController/miscController.js`.

Only **GET** handlers exist on misc routes; responses use `{ status: true, ... }` plus **`pagination`** where the underlying list model returns it.

---

## Query parameters (misc controller)

| Endpoint | `page` | `limit` | `search` | Other |
|----------|--------|---------|----------|--------|
| `/banners` | yes | yes (default 50, max 200) | no | — |
| `/faqs` | yes | yes | no | — |
| `/pages/:slug` | no | no | no | slug in path |
| `/client-testimonials` | yes | yes | no | — |
| `/video-testimonials` | yes | yes | no | — |
| `/health-concerns` | yes | yes | yes | — |
| `/health-tools` | yes | yes | yes | — |
| `/health-recipes` | yes | yes | yes | **`healthConcernId`**, **`type`** (`ytlink` or `video`) |
| `/transformations` | yes | yes | yes | — |
| `/celebration-banners` | yes | yes | yes | **`type`** (`birthday` or `championship`) |

---

## Route index (GET) — misc only

| Path | Handler | Response payload (besides `status`, `pagination`) |
|------|---------|---------------------------------------------------|
| `/api/public/misc/banners` | `getActiveBanners` | `banners` |
| `/api/public/misc/faqs` | `getActiveFaqs` | `faqs` |
| `/api/public/misc/pages/:slug` | `getStaticPageBySlug` | `page` |
| `/api/public/misc/client-testimonials` | `getActiveClientTestimonials` | `clientTestimonials` |
| `/api/public/misc/video-testimonials` | `getActiveVideoTestimonials` | `videoTestimonials` |
| `/api/public/misc/health-concerns` | `getActiveHealthConcerns` | `healthConcerns` |
| `/api/public/misc/health-tools` | `getActiveHealthTools` | `healthTools` |
| `/api/public/misc/health-recipes` | `getActiveHealthRecipes` | `healthRecipes` |
| `/api/public/misc/transformations` | `getActiveTransformations` | `transformations` |
| `/api/public/misc/celebration-banners` | `getActiveCelebrationBanners` | `celebrationBanners` |

There are **no** `/:id` misc routes; use list endpoints (and client-side filter by `id` if needed).

---

## Optional base URL

```bash
# bash / Git Bash / WSL
export BASE_URL="http://localhost:5000/api"

# PowerShell
$env:BASE_URL = "http://localhost:5000/api"
```

Examples below use the literal base `http://localhost:5000/api`; substitute if yours differs.

---

## Public app config (not misc)

```bash
curl -sS -X GET "http://localhost:5000/api/public/app-config" \
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

## `/api/public/misc` — health concerns, tools, recipes

### Health concerns (`getActiveHealthConcerns`)

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/health-concerns" \
  -H "Accept: application/json"
```

```bash
curl -sS -X GET "http://localhost:5000/api/public/misc/health-concerns?page=1&limit=50&search=heart" \
  -H "Accept: application/json"
```

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

`type` must match the recipe model: **`ytlink`** or **`video`**.

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

`type` must match the celebration banner model: **`birthday`** or **`championship`**.

---

## Pretty-print with jq (optional)

```bash
curl -sS "http://localhost:5000/api/public/misc/health-recipes" \
  -H "Accept: application/json" | jq .
```

---

## Windows PowerShell

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/public/misc/health-concerns" -Method Get
```

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/public/misc/health-recipes?type=ytlink" -Method Get
```
