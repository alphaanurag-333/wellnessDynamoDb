# Banner Management API

Base URL: `http://localhost:5000/api` (adjust `PORT` / host for your environment).

All successful responses use:

```json
{ "status": true, "...": "..." }
```

Errors:

```json
{ "status": false, "message": "Human-readable error" }
```

---

## How it works

Banners are marketing hero/carousel slides stored in DynamoDB table `Banner`. Admins create and manage them in the Admin panel (**Configs → Banner Management**). Public sites and the mobile app consume only **active** banners via an unauthenticated endpoint.

```
Admin UI (BannerSection)
    │  multipart + JSON
    ▼
/admin/banners  (or /account/banners)
    │  protectAccount + authorizeStaff
    ▼
bannerController → bannerModel → DynamoDB `Banner` + S3 (`banner/` folder)
    │
    ▼
Public consumers
    GET /public/misc/banners  (active only, optional platform / type filters)
    ├── Website SiteHero          → bannerType=main, platform=web
    ├── WellnesspediaHero         → bannerType=wellnesspedia
    └── Mobile app                → platform=app
```

### Visibility layers

A banner appears on a surface only if **all** of the following pass:

| Layer | Field / config | Effect |
|-------|----------------|--------|
| Status | `status: active \| inactive` | Inactive never returned on public API |
| Per-banner channel | `appOn`, `webOn` | Filtered when public caller passes `platform=app` or `platform=web` |
| Section surface | `SectionSurfaceConfig` id `banner-config` | If section is off for that platform, public list returns empty |
| Type | `bannerType` | Public defaults to `main`; admin/UI can filter by type |

### Sort order

- `sortOrder` is an integer (`0`–`100000`). Lower sorts first.
- New banners without an explicit `sortOrder` get `max(existing) + 1`.
- Admin drag-reorder calls `PUT .../reorder` with the full ordered id list; each id gets `sortOrder = index + 1`.
- List responses are sorted by `sortOrder` ascending, then `createdAt` descending as tie-breaker.

### Media

- Desktop/web image field: `image` (multipart field name `file` on upload).
- Mobile/app image field: `mobileImage` (multipart field name `mobileImage`).
- Stored as S3 object keys under folder `banner/`; API responses resolve them to public URLs.
- On create, if only one image is provided, it is copied to both fields.
- `split: true` means desktop and mobile use different assets (auto-set when both differ).
- Recommended crop sizes (Admin UI): desktop **1905×640**, mobile **1080×480**.

### Banner types & dropdowns

Allowed `bannerType` values come from config dropdown slug `banner-type` (active options). If that dropdown is empty/unavailable, fallback is:

- `main`
- `wellnesspedia`

Related Admin dropdowns (UI only; not validated on every field server-side except type):

| Slug | Purpose |
|------|---------|
| `banner-type` | Type selector (`main`, `wellnesspedia`, …) |
| `banner-placement` | Optional placement chip (`home-hero-web`, …) |
| `banner-headline` | Suggested headline copy |

### Permissions

Staff auth via `Authorization: Bearer <account access token>` (`protectAccount`).

| Action | Console permission | Legacy admin permission |
|--------|--------------------|-------------------------|
| List / get | `console.bn.view` | `banners.view` |
| Create / update / reorder | `console.bn.edit` | `banners.edit` |
| Delete | `console.bn.delete` | `banners.delete` |

Routes are mounted at both:

- `/api/admin/banners`
- `/api/account/banners` (same handlers; account-console style)

---

## Data model (`Banner`)

| Field | Type | Notes |
|-------|------|--------|
| `id` | string (UUID) | Partition key. Also exposed as `_id` for legacy clients |
| `title` | string | Required on create |
| `description` | string | Required on create |
| `image` | string | S3 key → public URL in responses |
| `mobileImage` | string | S3 key → public URL in responses |
| `status` | `active` \| `inactive` | Default `active` |
| `bannerType` | string | e.g. `main`, `wellnesspedia`. Missing → treated as `main` |
| `placement` | string | Optional slug (`a-z0-9_-`, max 80) |
| `ctaLabel` | string | CTA button text (body alias: `cta`) |
| `ctaLink` | string | Absolute `http(s)://…` or path starting with `/` (truncated to 500) |
| `split` | boolean | Separate desktop/mobile images |
| `appOn` | boolean | Default `true` |
| `webOn` | boolean | Default `true` |
| `sortOrder` | number | Display order |
| `createdAt` | ISO string | |
| `updatedAt` | ISO string | |

**GSI:** `StatusCreatedAtIndex` — HASH `status`, RANGE `createdAt`.

Table create script: `Backend/tables/createBannerTable.js`.

---

## Public API (no auth)

### `GET /public/misc/banners`

Returns **active** banners only, sorted by `sortOrder`.

**Query**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `limit` | number | `50` | Max `200` |
| `bannerType` / `type` | string | `main` | Filter by type; invalid values fall back to `main` |
| `platform` | `app` \| `web` | — | Applies section-surface + `appOn`/`webOn` filters |

```bash
curl -s "http://localhost:5000/api/public/misc/banners?page=1&limit=20&bannerType=main&platform=web"
```

```bash
curl -s "http://localhost:5000/api/public/misc/banners?bannerType=wellnesspedia&platform=app"
```

**Response `200`**

```json
{
  "status": true,
  "banners": [
    {
      "id": "a1b2c3d4-…",
      "_id": "a1b2c3d4-…",
      "title": "Reverse it, don't manage it",
      "description": "A protocol for metabolic reversal…",
      "image": "https://…/banner/….jpg",
      "mobileImage": "https://…/banner/….jpg",
      "status": "active",
      "bannerType": "main",
      "placement": "home-hero-web",
      "ctaLabel": "Book a free consult",
      "ctaLink": "/consult",
      "split": true,
      "appOn": true,
      "webOn": true,
      "sortOrder": 1,
      "createdAt": "2026-08-01T10:00:00.000Z",
      "updatedAt": "2026-08-15T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

If the banner section surface is disabled for the requested `platform`, response is an empty list with `total: 0` (still `200`).

**Consumers in this repo**

| Client | Call |
|--------|------|
| Website home hero | `fetchActiveBanners({ bannerType: "main", platform: "web" })` |
| Wellnesspedia hero | `bannerType: "wellnesspedia"` |
| Admin preview | Uses admin list, not this endpoint |

---

## Admin / Account API (auth required)

Base paths (equivalent):

- `/api/admin/banners`
- `/api/account/banners`

Header: `Authorization: Bearer <ACCESS_TOKEN>`

Create/update with files: `Content-Type: multipart/form-data`  
Reorder / JSON-only update: `application/json`

Multipart field names:

| Form field | Maps to |
|------------|---------|
| `file` | `image` (desktop) |
| `mobileImage` | `mobileImage` |
| `title`, `description`, `status`, `bannerType`, `placement`, `ctaLabel`, `ctaLink`, `split`, `appOn`, `webOn`, `sortOrder` | same |

Body aliases accepted: `type` → `bannerType`, `cta` → `ctaLabel`.

---

### `GET /admin/banners`

List banners (any status). Permission: `console.bn.view`.

**Query**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Default `1` |
| `limit` | number | Default `10`, max `200` |
| `status` | `active` \| `inactive` | Optional filter |
| `search` | string | Case-insensitive match on `title` / `description` |
| `bannerType` / `type` | string | Must be an allowed dropdown value if provided |

```bash
curl -s "http://localhost:5000/api/admin/banners?page=1&limit=50&bannerType=main" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`**

```json
{
  "status": true,
  "banners": [ /* same shape as public, may include inactive */ ],
  "pagination": { "page": 1, "limit": 50, "total": 3, "pages": 1 }
}
```

---

### `GET /admin/banners/:id`

Get one banner by id. Permission: `console.bn.view`.

```bash
curl -s "http://localhost:5000/api/admin/banners/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:** `{ "status": true, "banner": { … } }`  
**Response `404`:** Banner not found

---

### `POST /admin/banners`

Create banner. Permission: `console.bn.edit`.

**Required:** `title`, `description`, `bannerType` (valid), and at least one of `file` / `mobileImage` / body image keys.

```bash
curl -s -X POST "http://localhost:5000/api/admin/banners" \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Reverse it, don't manage it" \
  -F "description=A protocol for metabolic reversal" \
  -F "bannerType=main" \
  -F "status=active" \
  -F "placement=home-hero-web" \
  -F "ctaLabel=Book a free consult" \
  -F "ctaLink=/consult" \
  -F "split=true" \
  -F "appOn=true" \
  -F "webOn=true" \
  -F "file=@desktop.jpg" \
  -F "mobileImage=@mobile.jpg"
```

**Response `201`**

```json
{
  "status": true,
  "message": "Banner created successfully",
  "banner": { /* … */ }
}
```

**Common errors**

| Status | Message |
|--------|---------|
| `400` | `title is required` / `description is required` / `image is required` |
| `400` | `bannerType must be one of: main, wellnesspedia` |
| `400` | `status must be active or inactive` |

---

### `PATCH /admin/banners/:id`

Partial update. Permission: `console.bn.edit`.

- Send JSON for field-only updates.
- Send multipart when uploading new `file` and/or `mobileImage` (old S3 objects are deleted when replaced).
- Passing empty/`null`-style clear for image body keys removes media and deletes storage when applicable.

```bash
# Toggle live / channel flags (JSON)
curl -s -X PATCH "http://localhost:5000/api/admin/banners/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"inactive","webOn":false}'
```

```bash
# Replace desktop image
curl -s -X PATCH "http://localhost:5000/api/admin/banners/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@new-desktop.jpg"
```

**Response `200`:** `{ "status": true, "message": "Banner updated successfully", "banner": { … } }`

---

### `PUT /admin/banners/reorder`

Set display order. Permission: `console.bn.edit`.

**Body**

```json
{
  "orderedIds": ["uuid-first", "uuid-second", "uuid-third"]
}
```

- All ids must exist and be unique.
- Assigned `sortOrder` values: `1`, `2`, `3`, …

```bash
curl -s -X PUT "http://localhost:5000/api/admin/banners/reorder" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orderedIds":["id-a","id-b","id-c"]}'
```

**Response `200`**

```json
{
  "status": true,
  "message": "Banners reordered successfully",
  "banners": [ /* reordered list */ ]
}
```

---

### `DELETE /admin/banners/:id`

Delete banner and its S3 images. Permission: `console.bn.delete`.

```bash
curl -s -X DELETE "http://localhost:5000/api/admin/banners/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`:** `{ "status": true, "message": "Banner deleted successfully" }`

---

## Endpoint summary

| Method | Path | Auth | Permission |
|--------|------|------|------------|
| `GET` | `/public/misc/banners` | No | — |
| `GET` | `/admin/banners` | Yes | `console.bn.view` |
| `GET` | `/admin/banners/:id` | Yes | `console.bn.view` |
| `POST` | `/admin/banners` | Yes | `console.bn.edit` |
| `PATCH` | `/admin/banners/:id` | Yes | `console.bn.edit` |
| `PUT` | `/admin/banners/reorder` | Yes | `console.bn.edit` |
| `DELETE` | `/admin/banners/:id` | Yes | `console.bn.delete` |

Same admin routes also available under `/account/banners`.

---

## Related section surface

Global on/off for the banner section (separate from per-banner `appOn`/`webOn`):

| Method | Path |
|--------|------|
| `GET` | `/public/misc/section-surface-config/banner` |
| Admin | `/admin/section-surface-config` (config id `banner-config`) |

---

## Code map

| Layer | Path |
|-------|------|
| Admin routes | `Backend/routes/adminRoutes/adminBannerRoutes.js` |
| Public route | `Backend/routes/userRoutes/miscRoutes.js` → `GET /banners` |
| Admin controller | `Backend/controllers/adminController/bannerController.js` |
| Public controller | `Backend/controllers/userController/miscController.js` → `getActiveBanners` |
| Model | `Backend/models/bannerModel.js` |
| Table | `Backend/tables/createBannerTable.js` |
| Upload middleware | `Backend/middleware/authMultipart.js` → `optionalBannerFile` |
| Admin UI | `Admin/src/components/BannerSection.jsx` |
| Admin API client | `Admin/src/api/bannerApi.js` |
| Public site API | `Frontend/src/site/api/publicMisc.js` → `fetchActiveBanners` |
| Home hero | `Frontend/src/site/components/SiteHero.jsx` |
| Wellnesspedia hero | `Frontend/src/site/components/wellnesspedia/WellnesspediaHero.jsx` |

---

## Notes / caveats

1. **Not the same as CelebrationBanners** — birthday/championship celebration images live in a different table/API.
2. **Admin list does not filter by `platform`** — `appOn`/`webOn` apply on the public endpoint when `platform` is set.
3. **`PUT /reorder` must be registered before `/:id` routes** — already correct in `adminBannerRoutes.js`.
4. Existing catalog docs (`admin.md`, `public.md`) list paths only; this file is the full behavioral reference.
