# Client Testimonials (User Reviews) — Mobile App API

Base URL: `http://localhost:5000/api` (change host/port for your environment).

Authentication (all endpoints below):

```http
Authorization: Bearer <USER_ACCESS_TOKEN>
Content-Type: application/json
```

Success shape:

```json
{ "status": true, "...": "..." }
```

Error shape:

```json
{ "status": false, "message": "Human-readable error" }
```

---

## Business rules (app)

| Rule | Behavior |
|------|----------|
| One review per user | User may have **at most one** review at a time |
| Auto fields | `name` and `profileImage` are taken from the user profile (not sent by app) |
| Create status | New reviews are always saved as **`inactive`** (not public until coach/admin publishes) |
| Update | Allowed only while status is **`inactive`** |
| Delete | Allowed anytime (active or inactive). After delete, user may create again |
| Public site | Only reviews with `status: "active"` appear publicly |

**Recommended app flow**

1. `GET /user/client-testimonials/me` — if `clientTestimonial` is `null`, show “Write a review”; else show existing review.
2. Create → wait for coach/admin to publish (`active`).
3. While `inactive`: allow edit.
4. While `active`: hide edit; allow delete → then create again.

Base path: `/user/client-testimonials`

---

## Endpoints summary

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/user/client-testimonials/me` | Get current user’s single review (or `null`) |
| `GET` | `/user/client-testimonials` | List current user’s reviews (0 or 1) |
| `GET` | `/user/client-testimonials/:id` | Get review by id (owner only) |
| `POST` | `/user/client-testimonials` | Submit a review |
| `PATCH` | `/user/client-testimonials/:id` | Update review (inactive only) |
| `DELETE` | `/user/client-testimonials/:id` | Delete review (then can create again) |

---

## Review object

```json
{
  "id": "d7a1ccb6-1258-41c8-8413-e185dc1591ad",
  "_id": "d7a1ccb6-1258-41c8-8413-e185dc1591ad",
  "name": "Hetu",
  "rating": 5,
  "description": "Weekly check-ins kept me consistent…",
  "profileImage": "https://…/user/….jpg",
  "status": "inactive",
  "userId": "4da4c439-1a76-4bb5-a5db-35c78ecf1f23",
  "managedByCoachId": "b1499e9a-be33-4995-9d82-b77e90cb61ad",
  "assignedCoachType": "wellness_coach",
  "assignedCoachId": "b1499e9a-be33-4995-9d82-b77e90cb61ad",
  "submittedByRole": "user",
  "createdAt": "2026-07-20T12:40:00.000Z",
  "updatedAt": "2026-07-20T12:40:00.000Z"
}
```

| Field | Type | Notes |
|-------|------|--------|
| `id` / `_id` | string | Use either for update/delete |
| `name` | string | From user profile (read-only) |
| `rating` | number | `1`–`5` |
| `description` | string | Max **255** characters |
| `profileImage` | string \| null | Public URL from user profile |
| `status` | string | `inactive` \| `active` |
| `userId` | string | Owner |

Aliases accepted on create/update body: `review` → `description`, `stars` → `rating`.

---

## 1. Get my review

### `GET /user/client-testimonials/me`

**cURL**

```bash
curl -X GET "http://localhost:5000/api/user/client-testimonials/me" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

**Response `200` — has review**

```json
{
  "status": true,
  "clientTestimonial": {
    "id": "d7a1ccb6-1258-41c8-8413-e185dc1591ad",
    "_id": "d7a1ccb6-1258-41c8-8413-e185dc1591ad",
    "name": "Hetu",
    "rating": 5,
    "description": "Weekly check-ins kept me consistent without crash diets.",
    "profileImage": "https://cdn.example.com/user/photo.jpg",
    "status": "inactive",
    "userId": "4da4c439-1a76-4bb5-a5db-35c78ecf1f23",
    "managedByCoachId": "b1499e9a-be33-4995-9d82-b77e90cb61ad",
    "assignedCoachType": "wellness_coach",
    "assignedCoachId": "b1499e9a-be33-4995-9d82-b77e90cb61ad",
    "submittedByRole": "user",
    "createdAt": "2026-07-20T12:40:00.000Z",
    "updatedAt": "2026-07-20T12:40:00.000Z"
  }
}
```

**Response `200` — no review yet**

```json
{
  "status": true,
  "clientTestimonial": null
}
```

---

## 2. List my reviews

### `GET /user/client-testimonials`

Query: `page` (default `1`), `limit` (default `20`).

**cURL**

```bash
curl -X GET "http://localhost:5000/api/user/client-testimonials?page=1&limit=20" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

**Response `200`**

```json
{
  "status": true,
  "clientTestimonials": [
    {
      "id": "d7a1ccb6-1258-41c8-8413-e185dc1591ad",
      "_id": "d7a1ccb6-1258-41c8-8413-e185dc1591ad",
      "name": "Hetu",
      "rating": 5,
      "description": "Weekly check-ins kept me consistent without crash diets.",
      "profileImage": "https://cdn.example.com/user/photo.jpg",
      "status": "inactive",
      "userId": "4da4c439-1a76-4bb5-a5db-35c78ecf1f23",
      "submittedByRole": "user",
      "createdAt": "2026-07-20T12:40:00.000Z",
      "updatedAt": "2026-07-20T12:40:00.000Z"
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

---

## 3. Get review by id

### `GET /user/client-testimonials/:id`

Owner only.

**cURL**

```bash
curl -X GET "http://localhost:5000/api/user/client-testimonials/d7a1ccb6-1258-41c8-8413-e185dc1591ad" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

**Response `200`**

```json
{
  "status": true,
  "clientTestimonial": {
    "id": "d7a1ccb6-1258-41c8-8413-e185dc1591ad",
    "name": "Hetu",
    "rating": 5,
    "description": "Weekly check-ins kept me consistent without crash diets.",
    "status": "inactive",
    "userId": "4da4c439-1a76-4bb5-a5db-35c78ecf1f23"
  }
}
```

**Response `404`**

```json
{
  "status": false,
  "message": "Client testimonial not found"
}
```

---

## 4. Create review

### `POST /user/client-testimonials`

**Body**

| Field | Required | Type | Notes |
|-------|----------|------|--------|
| `description` or `review` | yes | string | Max 255 chars |
| `rating` or `stars` | yes | number | Integer `1`–`5` |

Do **not** send `name` or `profileImage` — server fills them from the logged-in user.

**cURL**

```bash
curl -X POST "http://localhost:5000/api/user/client-testimonials" \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"description\": \"Great coaching experience and lasting results.\",
    \"rating\": 5
  }"
```

**Response `201`**

```json
{
  "status": true,
  "message": "Review submitted. It will appear publicly once activated by your coach or admin.",
  "clientTestimonial": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Hetu",
    "rating": 5,
    "description": "Great coaching experience and lasting results.",
    "profileImage": "https://cdn.example.com/user/photo.jpg",
    "status": "inactive",
    "userId": "4da4c439-1a76-4bb5-a5db-35c78ecf1f23",
    "managedByCoachId": "b1499e9a-be33-4995-9d82-b77e90cb61ad",
    "assignedCoachType": "wellness_coach",
    "assignedCoachId": "b1499e9a-be33-4995-9d82-b77e90cb61ad",
    "submittedByRole": "user",
    "createdAt": "2026-07-20T12:45:00.000Z",
    "updatedAt": "2026-07-20T12:45:00.000Z"
  }
}
```

**Response `409` — already has a review**

```json
{
  "status": false,
  "message": "You already have a review. Update or delete it before submitting a new one."
}
```

**Response `400` — validation**

```json
{
  "status": false,
  "message": "rating must be a number between 1 and 5"
}
```

---

## 5. Update review (inactive only)

### `PATCH /user/client-testimonials/:id`

**Body** (at least one field)

| Field | Type | Notes |
|-------|------|--------|
| `description` or `review` | string | Max 255 |
| `rating` or `stars` | number | `1`–`5` |

**cURL**

```bash
curl -X PATCH "http://localhost:5000/api/user/client-testimonials/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"description\": \"Updated: coaching helped me stay consistent every week.\",
    \"rating\": 4
  }"
```

**Response `200`**

```json
{
  "status": true,
  "message": "Review updated",
  "clientTestimonial": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Hetu",
    "rating": 4,
    "description": "Updated: coaching helped me stay consistent every week.",
    "status": "inactive",
    "userId": "4da4c439-1a76-4bb5-a5db-35c78ecf1f23",
    "updatedAt": "2026-07-20T13:00:00.000Z"
  }
}
```

**Response `400` — already published**

```json
{
  "status": false,
  "message": "Published reviews cannot be edited. Delete it to submit a new review, or ask your coach to unpublish it."
}
```

---

## 6. Delete review

### `DELETE /user/client-testimonials/:id`

Works for both `inactive` and `active`. After delete, user can `POST` a new review.

**cURL**

```bash
curl -X DELETE "http://localhost:5000/api/user/client-testimonials/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

**Response `200`**

```json
{
  "status": true,
  "message": "Review deleted successfully. You can submit a new review now."
}
```

**Response `404`**

```json
{
  "status": false,
  "message": "Client testimonial not found"
}
```

---

## Auth errors (all endpoints)

**`401`**

```json
{
  "status": false,
  "message": "Authentication required"
}
```

---

## App UI checklist

| Screen state | API | UI |
|--------------|-----|-----|
| No review | `GET …/me` → `null` | Show create form |
| Inactive review | `GET …/me` → `status: "inactive"` | Show edit + delete |
| Active (published) | `GET …/me` → `status: "active"` | Show read-only + delete (no edit) |
| After delete | `DELETE` then `POST` | Allow create again |

---

## Related (not user app)

Publishing (`status: active` / `inactive`) is done by **Admin**, **Wellness Coach**, or **Assistant Wellness Coach** panels — not by the user app.

Public listing (website): `GET /public/misc/client-testimonials` (active only).
