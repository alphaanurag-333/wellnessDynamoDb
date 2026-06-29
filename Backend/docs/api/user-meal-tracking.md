# User Meal Tracking API

Meal tracking / macro insights endpoints for the **mobile user app** (Heal-tier users).

- **Base URL:** `http://localhost:5000/api`
- **Route prefix:** `/user/meal-tracking`

---

## Authentication

All endpoints require a valid **user JWT**:

```http
Authorization: Bearer <USER_ACCESS_TOKEN>
```

Get a token via login:

```bash
curl -X POST "http://localhost:5000/api/user/auth/login/password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-password"
  }'
```

Use the `accessToken` from the response as `<USER_ACCESS_TOKEN>`.

---

## Access rules

| Rule | Detail |
|------|--------|
| Role | JWT `role` must be `"user"` |
| Tier | User must be **Heal** tier (`userTier === "heal"`) |
| Ownership | A user can only read/update/delete logs where `userId` matches their own ID |
| Coach logs | Logs created by a coach/assistant for the user are visible via GET; the user can also update/delete them |

**403 example (non-heal user):**

```json
{
  "status": false,
  "message": "Seek to Heal subscription required for this feature"
}
```

---

## Endpoints overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/user/meal-tracking` | List logs + daily macro summary |
| `GET` | `/user/meal-tracking/:logId` | Get one meal log |
| `POST` | `/user/meal-tracking` | Create meal log |
| `PUT` | `/user/meal-tracking/:logId` | Update meal log |
| `DELETE` | `/user/meal-tracking/:logId` | Delete meal log |

---

## Data models

### Meal log object

```json
{
  "id": "uuid",
  "_id": "uuid",
  "userId": "uuid",
  "date": "2026-06-29",
  "entryTime": "08:30",
  "category": "meal",
  "mealType": "First",
  "description": "Healthy morning meal",
  "items": [
    { "name": "Rice", "quantityGm": 100 },
    { "name": "Dal", "quantityGm": 80 }
  ],
  "photoKey": "meal-tracking/...",
  "photoUrl": "https://cdn.example.com/meal-tracking/...",
  "proteinGm": 16.3,
  "fatsGm": 8.5,
  "carbsGm": 85,
  "caloriesKcal": 490,
  "loggedByRole": "user",
  "loggedById": "uuid",
  "coachId": "uuid-or-null",
  "createdAt": "2026-06-29T03:00:00.000Z",
  "updatedAt": "2026-06-29T03:00:00.000Z"
}
```

### Macro summary (per day)

```json
{
  "date": "2026-06-29",
  "day": "Mon",
  "proteinGm": 64.7,
  "fatsGm": 30.1,
  "carbsGm": 236.7,
  "caloriesKcal": 1541.3
}
```

### Field validation

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `date` | string | No | `YYYY-MM-DD`; defaults to today |
| `entryTime` | string | No | `HH:MM` (24h), e.g. `"08:30"` |
| `category` | string | No | `functional_juice`, `salad`, `meal`, `beverage`, `snacks`, `protein`; default `meal` |
| `mealType` | string | No | e.g. `First`, `Second`, `Snack`; max 60 chars; default `First` |
| `description` | string | No | Max 1000 chars |
| `items` | array | No | Max 50 items; each needs `name` (required), `quantityGm` (≥ 0) |
| `proteinGm` | number | No | ≥ 0; default `0` |
| `fatsGm` | number | No | ≥ 0; default `0` |
| `carbsGm` | number | No | ≥ 0; default `0` |
| `caloriesKcal` | number | No | ≥ 0; default `0` |
| `photo` | file | No | Multipart only; jpeg/png/webp |

---

## 1. Get meal tracking (logs + macro charts)

`GET /user/meal-tracking`

### Query parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `date` | string | today | End date (`YYYY-MM-DD`) |
| `days` | number | `7` | Range length; min `1`, max `90` |

### cURL

```bash
# Default: last 7 days ending today
curl -X GET "http://localhost:5000/api/user/meal-tracking" \
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>"

# Last 30 days ending on a specific date
curl -X GET "http://localhost:5000/api/user/meal-tracking?date=2026-06-29&days=30" \
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>"
```

### Success response `200`

```json
{
  "status": true,
  "message": "Meal tracking fetched successfully",
  "logs": [ /* meal log objects, newest first */ ],
  "macroSummary": [ /* one entry per day in range */ ],
  "range": {
    "startDate": "2026-06-23",
    "endDate": "2026-06-29",
    "days": 7
  }
}
```

**Mobile usage:** use `macroSummary` for the Protein / Fats / Carbs / Calories bar charts; use `logs` for the meal list.

---

## 2. Get single meal log

`GET /user/meal-tracking/:logId`

### cURL

```bash
curl -X GET "http://localhost:5000/api/user/meal-tracking/<LOG_ID>" \
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>"
```

### Success response `200`

```json
{
  "status": true,
  "message": "Meal log fetched successfully",
  "mealLog": { /* meal log object */ }
}
```

### Errors

| Status | Message |
|--------|---------|
| `404` | `Meal log not found` |

---

## 3. Create meal log

`POST /user/meal-tracking`

Supports:
- `application/json` (no photo)
- `multipart/form-data` (with optional photo)

### 3a. JSON — full meal with items

```bash
curl -X POST "http://localhost:5000/api/user/meal-tracking" \
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-06-29",
    "entryTime": "08:30",
    "category": "meal",
    "mealType": "First",
    "description": "What did you eat?",
    "items": [
      { "name": "Rice", "quantityGm": 100 },
      { "name": "Dal", "quantityGm": 80 }
    ],
    "proteinGm": 16.3,
    "fatsGm": 8.5,
    "carbsGm": 85,
    "caloriesKcal": 490
  }'
```

### 3b. JSON — minimal (defaults applied)

```bash
curl -X POST "http://localhost:5000/api/user/meal-tracking" \
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "beverage",
    "description": "Green tea"
  }'
```

### 3c. Multipart — with photo

> For multipart, send `items` as a **JSON string**.

```bash
curl -X POST "http://localhost:5000/api/user/meal-tracking" \
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>" \
  -F "date=2026-06-29" \
  -F "entryTime=08:30" \
  -F "category=meal" \
  -F "mealType=First" \
  -F "description=Morning meal" \
  -F 'items=[{"name":"Oats","quantityGm":80},{"name":"Banana","quantityGm":120}]' \
  -F "proteinGm=12" \
  -F "fatsGm=6" \
  -F "carbsGm=65" \
  -F "caloriesKcal=360" \
  -F "photo=@/path/to/meal.jpg"
```

### Success response `201`

```json
{
  "status": true,
  "message": "Meal log created successfully",
  "mealLog": { /* created meal log */ }
}
```

---

## 4. Update meal log

`PUT /user/meal-tracking/:logId`

Partial update — only fields sent in the body are changed.

### 4a. JSON — update macros and items

```bash
curl -X PUT "http://localhost:5000/api/user/meal-tracking/<LOG_ID>" \
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "mealType": "Second",
    "proteinGm": 20,
    "caloriesKcal": 520,
    "items": [
      { "name": "Rice", "quantityGm": 120 }
    ]
  }'
```

### 4b. Multipart — update photo only

```bash
curl -X PUT "http://localhost:5000/api/user/meal-tracking/<LOG_ID>" \
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>" \
  -F "description=Updated with new photo" \
  -F "photo=@/path/to/new-meal.jpg"
```

### Success response `200`

```json
{
  "status": true,
  "message": "Meal log updated successfully",
  "mealLog": { /* updated meal log */ }
}
```

### Errors

| Status | Message |
|--------|---------|
| `404` | `Meal log not found` |
| `400` | Validation errors (category, entryTime, items, macros, etc.) |

---

## 5. Delete meal log

`DELETE /user/meal-tracking/:logId`

Also deletes the associated S3 photo if one exists.

### cURL

```bash
curl -X DELETE "http://localhost:5000/api/user/meal-tracking/<LOG_ID>" \
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>"
```

### Success response `200`

```json
{
  "status": true,
  "message": "Meal log deleted successfully"
}
```

---

## Error responses (common)

All errors follow this shape:

```json
{
  "status": false,
  "message": "Error description"
}
```

| HTTP | Scenario | Example message |
|------|----------|-----------------|
| `401` | Missing/invalid/expired token | `Not authorized to access this route` |
| `403` | User not Heal tier | `Seek to Heal subscription required for this feature` |
| `404` | Log not found or not owned | `Meal log not found` |
| `400` | Invalid category | `category must be one of: functional_juice, salad, meal, beverage, snacks, protein` |
| `400` | Invalid time | `entryTime must be in HH:MM format` |
| `400` | Invalid items (multipart) | `items must be a valid JSON array` |
| `400` | Invalid photo type | `Only JPEG, PNG, and WebP images are allowed` |
| `400` | Negative macro | `proteinGm must be a non-negative number` |

---

## Category values (UI labels)

| API value | UI label |
|-----------|----------|
| `functional_juice` | Functional Juice |
| `salad` | Salad |
| `meal` | Meal |
| `beverage` | Beverage |
| `snacks` | Snacks |
| `protein` | Protein |

---

## Mobile app flow (recommended)

1. **Macro Insights screen** → `GET /user/meal-tracking?days=7`
2. **Submit meal** → `POST /user/meal-tracking`
3. **Detailed edit** → `GET /user/meal-tracking/:logId` then `PUT`
4. **Delete entry** → `DELETE /user/meal-tracking/:logId`

```
App  ->  POST /user/auth/login/password      ->  accessToken
App  ->  GET  /user/meal-tracking?days=7      ->  logs + macroSummary (charts)
App  ->  POST /user/meal-tracking             ->  mealLog created
App  ->  PUT  /user/meal-tracking/:logId      ->  mealLog updated
App  ->  DELETE /user/meal-tracking/:logId    ->  deleted
```
