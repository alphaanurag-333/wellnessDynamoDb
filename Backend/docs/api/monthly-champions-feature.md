# Monthly Champions API

Base URL: `http://localhost:5000/api` (adjust `PORT` / host for your environment).

All successful responses use:

```json
{ "status": true, "...": "..." }
```

Errors:

```json
{ "status": false, "message": "Human-readable error" }
```

Authentication headers:

- **User (mobile app):** `Authorization: Bearer <USER_ACCESS_TOKEN>`
- **Admin:** `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`
- **Coach / AWC:** `Authorization: Bearer <COACH_OR_ASSISTANT_ACCESS_TOKEN>`

---

## Overview

Monthly Champions ranks users by **average daily reflection score** for a calendar month. On the **1st of each month**, a cron job computes the previous month’s top scorers (ranks 1–3) and creates champion posts. Tied scores share the same rank (competition ranking).

Users can:

- Browse active champion posts for a month
- View their own champion history
- Open a post with comments
- Comment on champion posts (similar to birthday posts)

Champions receive an FCM push notification when their post is first created.

---

## Setup (one-time)

Run DynamoDB migration from `Backend/`:

```bash
npm run migrate:monthly-champions
```

Or:

```bash
node migration/migrateAll.js --only=25-monthly-champions
```

**Env (optional)**

| Variable | Default | Description |
|----------|---------|-------------|
| `MONTHLY_CHAMPION_CRON_TIMEZONE` | `Asia/Kolkata` | Timezone for scheduled job |
| `MONTHLY_CHAMPION_CRON_SCHEDULE` | `10 0 1 * *` | Cron: 00:10 on the 1st of each month |
| `MONTHLY_CHAMPION_CRON_ENABLED` | `true` in production | Set `false` to disable in-process cron |

**Manual job run (admin or CLI):**

```bash
cd Backend && node scripts/runMonthlyChampionJob.js
cd Backend && node scripts/runMonthlyChampionJob.js --month=2026-06
```

---

## User — Monthly champions

Requires `protectUser` (active user account).

Base path: `/user/monthly-champions`

---

### `GET /user/monthly-champions`

List **active** champion posts for a month.

If `monthYear` is omitted, the API returns the **latest month** that has champion posts.

**Query**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `monthYear` | string | No | `YYYY-MM` (e.g. `2026-06`) |

```bash
curl -s "http://localhost:5000/api/user/monthly-champions" \
  -H "Authorization: Bearer USER_TOKEN"
```

```bash
curl -s "http://localhost:5000/api/user/monthly-champions?monthYear=2026-06" \
  -H "Authorization: Bearer USER_TOKEN"
```

**Response `200`**

```json
{
  "status": true,
  "monthYear": "2026-06",
  "monthlyChampions": [
    {
      "id": "post-uuid",
      "_id": "post-uuid",
      "userId": "user-uuid",
      "monthYear": "2026-06",
      "rank": 1,
      "averageScore": 92.5,
      "daysSubmitted": 28,
      "message": "🥇 Rank #1 Champion of June 2026! Average daily reflection score: 92.5%.",
      "status": "active",
      "notifiedAt": "2026-07-01T00:10:05.000Z",
      "createdAt": "2026-07-01T00:10:04.000Z",
      "updatedAt": "2026-07-01T00:10:04.000Z",
      "user": {
        "id": "user-uuid",
        "name": "Jane Doe",
        "profileImage": "https://..."
      }
    }
  ]
}
```

**Response when no champions exist**

```json
{
  "status": true,
  "monthYear": null,
  "monthlyChampions": []
}
```

---

### `GET /user/monthly-champions/mine`

Champion history for the **logged-in user** (active posts only, up to 24 months).

```bash
curl -s "http://localhost:5000/api/user/monthly-champions/mine" \
  -H "Authorization: Bearer USER_TOKEN"
```

**Response `200`**

```json
{
  "status": true,
  "monthlyChampions": [
    {
      "id": "post-uuid",
      "_id": "post-uuid",
      "userId": "user-uuid",
      "monthYear": "2026-06",
      "rank": 2,
      "averageScore": 88.3,
      "daysSubmitted": 26,
      "message": "🥈 Rank #2 Champion of June 2026! Average daily reflection score: 88.3%.",
      "status": "active",
      "createdAt": "2026-07-01T00:10:04.000Z",
      "updatedAt": "2026-07-01T00:10:04.000Z"
    }
  ]
}
```

---

### `GET /user/monthly-champions/:id`

Single active champion post with embedded comments and public user profile.

```bash
curl -s "http://localhost:5000/api/user/monthly-champions/POST_UUID" \
  -H "Authorization: Bearer USER_TOKEN"
```

**Response `200`**

```json
{
  "status": true,
  "monthlyChampion": {
    "id": "post-uuid",
    "_id": "post-uuid",
    "userId": "user-uuid",
    "monthYear": "2026-06",
    "rank": 1,
    "averageScore": 92.5,
    "daysSubmitted": 28,
    "message": "🥇 Rank #1 Champion of June 2026! Average daily reflection score: 92.5%.",
    "status": "active",
    "user": {
      "id": "user-uuid",
      "name": "Jane Doe",
      "profileImage": "https://..."
    },
    "comments": [
      {
        "id": "comment-uuid",
        "_id": "comment-uuid",
        "monthlyChampionPostId": "post-uuid",
        "commenterUserId": "other-user-uuid",
        "comment": "Congratulations!",
        "commenter": {
          "id": "other-user-uuid",
          "name": "Bob Smith",
          "profileImage": "https://..."
        },
        "createdAt": "2026-07-02T08:00:00.000Z",
        "updatedAt": "2026-07-02T08:00:00.000Z"
      }
    ],
    "commentCount": 1
  }
}
```

**Response `404`** — post not found or not active.

---

### `GET /user/monthly-champions/:postId/comments`

Paginated comments for a champion post.

**Query**

| Param | Type | Default | Max |
|-------|------|---------|-----|
| `page` | number | `1` | — |
| `limit` | number | `50` | `200` |

```bash
curl -s "http://localhost:5000/api/user/monthly-champions/POST_UUID/comments?page=1&limit=50" \
  -H "Authorization: Bearer USER_TOKEN"
```

**Response `200`**

```json
{
  "status": true,
  "comments": [
    {
      "id": "comment-uuid",
      "monthlyChampionPostId": "post-uuid",
      "commenterUserId": "user-uuid",
      "comment": "Well done!",
      "commenter": { "id": "...", "name": "Bob Smith" },
      "createdAt": "2026-07-02T08:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 1, "pages": 1 }
}
```

---

### `POST /user/monthly-champions/:postId/comments`

Add a comment on a champion post.

**Body (JSON)**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `comment` | string | Yes | 1–2000 characters |

```bash
curl -s -X POST "http://localhost:5000/api/user/monthly-champions/POST_UUID/comments" \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment":"Congrats champion! Amazing consistency."}'
```

**Response `201`**

```json
{
  "status": true,
  "message": "Comment added successfully",
  "comment": {
    "id": "comment-uuid",
    "monthlyChampionPostId": "POST_UUID",
    "commenterUserId": "USER_UUID",
    "comment": "Congrats champion! Amazing consistency.",
    "commenter": { "id": "...", "name": "Bob Smith" },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

The champion user receives an FCM notification (`monthly_champion_comment`) when someone else comments on their post.

---

### `DELETE /user/monthly-champions/:postId/comments/:id`

Delete **own** comment only.

```bash
curl -s -X DELETE "http://localhost:5000/api/user/monthly-champions/POST_UUID/comments/COMMENT_UUID" \
  -H "Authorization: Bearer USER_TOKEN"
```

**Response `200`**

```json
{ "status": true, "message": "Comment deleted successfully" }
```

**Response `403`** — attempting to delete another user’s comment.

---

## Ranking logic

1. Scan all **daily reflection day logs** for the target month (`YYYY-MM`).
2. For each user, compute **average score** across days with a submitted reflection.
3. Sort by average score (descending).
4. Assign **competition ranks** (ties share rank; next rank skips accordingly).
5. Keep users with rank **1, 2, or 3** only.
6. Upsert `MonthlyChampionPost` records and notify newly created champions.

Example: if two users tie for highest score, both get rank **1**; the next user gets rank **3** (not 2).

---

## Related endpoints (other roles)

| Role | Base path | Description |
|------|-----------|-------------|
| Admin | `/admin/monthly-champions` | List, view, edit, run job, delete comments |
| Coach | `/coach/monthly-champions` | Read-only list and detail |
| AWC | `/assistant/monthly-champions` | Read-only list and detail |

Admin manual job:

```bash
curl -s -X POST "http://localhost:5000/api/admin/monthly-champions/jobs/run" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"monthYear":"2026-06"}'
```

---

## Data model (DynamoDB)

| Table | Key fields |
|-------|------------|
| `MonthlyChampionPost` | `userId`, `monthYear`, `rank`, `averageScore`, `daysSubmitted`, `message`, `status` |
| `MonthlyChampionPostComment` | `monthlyChampionPostId`, `commenterUserId`, `comment` |
| `DailyReflectionDayLog` | Source data for monthly score averages |

---

## Error codes

| HTTP | Example |
|------|---------|
| `400` | Invalid `monthYear`, empty comment, comment too long |
| `401` | Missing or invalid user token |
| `403` | Deleting another user’s comment |
| `404` | Champion post or comment not found |

---

## Mobile integration notes

1. **Login** — obtain `accessToken` from `POST /user/auth/login` or OTP flow.
2. **Feed screen** — call `GET /user/monthly-champions?monthYear=YYYY-MM` (or omit `monthYear` for latest).
3. **My achievements** — call `GET /user/monthly-champions/mine`.
4. **Post detail** — call `GET /user/monthly-champions/:id` (includes comments).
5. **Comment** — `POST /user/monthly-champions/:postId/comments` with `{ "comment": "..." }`.
6. Handle push types: `monthly_champion`, `monthly_champion_comment`.

Frontend API client: `Frontend/src/api/userMonthlyChampions.js`
