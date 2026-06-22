# Birthday Notification + Social Post API

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

- **Admin:** `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`
- **User (mobile app):** `Authorization: Bearer <USER_ACCESS_TOKEN>`

---

## Setup (one-time)

Run DynamoDB migrations from `Backend/`:

```bash
node migration/migrateAll.js --only=09-birthday-tables
node migration/migrateAll.js --only=10-user-dob-month-day-index
```

Schedule the daily job at **12:05 AM** in `BIRTHDAY_JOB_TIMEZONE` (default `Asia/Kolkata`).

When the API server is running in production, the job is scheduled automatically via `node-cron` (`Backend/jobs/birthdayJobCron.js`). Each run creates notifications, sends FCM pushes, and creates birthday posts.

**Env (optional)**

| Variable | Default | Description |
|----------|---------|-------------|
| `BIRTHDAY_JOB_TIMEZONE` | `Asia/Kolkata` | Calendar date used for “today” |
| `BIRTHDAY_JOB_CRON_SCHEDULE` | `5 0 * * *` | Cron expression (12:05 AM) |
| `BIRTHDAY_JOB_CRON_ENABLED` | `true` in production | Set `false` to disable in-process cron |

**Manual / external cron** (if the server is not always on):

```bash
5 0 * * * cd /path/to/Backend && node scripts/runBirthdayJob.js
```

Use the same `BIRTHDAY_JOB_TIMEZONE` on the host, or rely on the script default.

---

## Public — Birthday posts feed

No auth required. Returns today's active birthday posts with user profile and comment counts. Posts do not include a banner image field.

### `GET /public/misc/birthday-posts`

**Query**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Default `1` |
| `limit` | number | Default `50`, max `200` |
| `postDate` | string | `YYYY-MM-DD` (default: today in app timezone) |

```bash
curl -s "http://localhost:5000/api/public/misc/birthday-posts?page=1&limit=20"
```

```bash
curl -s "http://localhost:5000/api/public/misc/birthday-posts?postDate=2026-06-22"
```

**Response `200`**

```json
{
  "status": true,
  "birthdayPosts": [
    {
      "id": "uuid",
      "_id": "uuid",
      "userId": "user-uuid",
      "notificationId": "notification-uuid",
      "postDate": "2026-06-22",
      "message": "Happy Birthday, Jane!",
      "status": "active",
      "createdAt": "2026-06-22T00:05:00.000Z",
      "updatedAt": "2026-06-22T00:05:00.000Z",
      "user": {
        "id": "user-uuid",
        "name": "Jane Doe",
        "profileImage": "https://...",
        "dob": "1990-06-22T00:00:00.000Z"
      },
      "commentCount": 3
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "pages": 1 }
}
```

---

## User — Birthday posts & comments

Requires `protectUser` (active user account).

### `GET /user/birthday-posts`

List active posts for today (or `postDate`).

```bash
curl -s "http://localhost:5000/api/user/birthday-posts?page=1&limit=20" \
  -H "Authorization: Bearer USER_TOKEN"
```

```bash
curl -s "http://localhost:5000/api/user/birthday-posts?postDate=2026-06-22" \
  -H "Authorization: Bearer USER_TOKEN"
```

**Response:** same shape as public list (`birthdayPosts`, `pagination`).

---

### `GET /user/birthday-posts/:id`

Single post with embedded comments.

```bash
curl -s "http://localhost:5000/api/user/birthday-posts/POST_UUID" \
  -H "Authorization: Bearer USER_TOKEN"
```

**Response `200`**

```json
{
  "status": true,
  "birthdayPost": {
    "id": "uuid",
    "userId": "user-uuid",
    "postDate": "2026-06-22",
    "message": "Happy Birthday, Jane!",
    "status": "active",
    "user": { "id": "...", "name": "Jane Doe" },
    "comments": [
      {
        "id": "comment-uuid",
        "birthdayPostId": "post-uuid",
        "commenterUserId": "other-user-uuid",
        "comment": "Happy birthday!",
        "commenter": { "id": "...", "name": "Bob" },
        "createdAt": "2026-06-22T08:00:00.000Z"
      }
    ],
    "commentCount": 1
  }
}
```

---

### `GET /user/birthday-posts/:postId/comments`

Paginated comments for a post.

```bash
curl -s "http://localhost:5000/api/user/birthday-posts/POST_UUID/comments?page=1&limit=50" \
  -H "Authorization: Bearer USER_TOKEN"
```

**Response `200`**

```json
{
  "status": true,
  "comments": [ { "id": "...", "comment": "...", "commenter": { } } ],
  "pagination": { "page": 1, "limit": 50, "total": 1, "pages": 1 }
}
```

---

### `POST /user/birthday-posts/:postId/comments`

Add a comment (authenticated user).

```bash
curl -s -X POST "http://localhost:5000/api/user/birthday-posts/POST_UUID/comments" \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment":"Happy birthday! Have a great year ahead."}'
```

**Response `201`**

```json
{
  "status": true,
  "message": "Comment added successfully",
  "comment": {
    "id": "uuid",
    "birthdayPostId": "POST_UUID",
    "commenterUserId": "USER_UUID",
    "comment": "Happy birthday! Have a great year ahead.",
    "commenter": { "id": "...", "name": "Bob" },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### `DELETE /user/birthday-posts/:postId/comments/:id`

Delete own comment only (`403` if not owner).

```bash
curl -s -X DELETE "http://localhost:5000/api/user/birthday-posts/POST_UUID/comments/COMMENT_UUID" \
  -H "Authorization: Bearer USER_TOKEN"
```

**Response `200`**

```json
{ "status": true, "message": "Comment deleted successfully" }
```

---

## Admin — Birthday notifications

### `GET /admin/birthday-notifications`

```bash
curl -s "http://localhost:5000/api/admin/birthday-notifications?page=1&limit=10" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

```bash
curl -s "http://localhost:5000/api/admin/birthday-notifications?status=sent&notificationDate=2026-06-22" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Query:** `page`, `limit`, `status` (`pending`|`sent`|`failed`), `notificationDate`, `search`

List items include an embedded `user` object (name, profile image, etc.) when the user record exists.

**Response `200`**

```json
{
  "status": true,
  "birthdayNotifications": [
    {
      "id": "uuid",
      "_id": "uuid",
      "userId": "user-uuid",
      "notificationDate": "2026-06-22",
      "message": "Happy Birthday, Jane! Wishing you a wonderful day from IR Wellness.",
      "status": "sent",
      "sentAt": "2026-06-22T00:05:01.000Z",
      "createdAt": "...",
      "updatedAt": "...",
      "user": {
        "id": "user-uuid",
        "name": "Jane Doe",
        "profileImage": "https://...",
        "dob": "1990-06-22T00:00:00.000Z"
      }
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "pages": 1 }
}
```

---

### `GET /admin/birthday-notifications/:id`

```bash
curl -s "http://localhost:5000/api/admin/birthday-notifications/NOTIFICATION_UUID" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response `200`**

```json
{
  "status": true,
  "birthdayNotification": { "id": "...", "status": "sent", "message": "..." },
  "user": { "id": "...", "name": "Jane Doe", "dob": "..." }
}
```

---

### `POST /admin/birthday-notifications/:id/resend`

Resend FCM push to the birthday user.

```bash
curl -s -X POST "http://localhost:5000/api/admin/birthday-notifications/NOTIFICATION_UUID/resend" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response `200`**

```json
{
  "status": true,
  "message": "Birthday notification resent (1 delivered, 0 failed)",
  "birthdayNotification": { "id": "...", "status": "sent", "sentAt": "..." },
  "push": { "successCount": 1, "failureCount": 0, "skipped": false, "total": 1 }
}
```

---

### `POST /admin/birthday-notifications/jobs/run`

Manually trigger the daily birthday job (admin only). The job **automatically sends FCM push notifications** to matched users as part of processing — no separate send step is required.

Defaults to today in `BIRTHDAY_JOB_TIMEZONE` (default `Asia/Kolkata`) when `dateOnly` is omitted.

```bash
curl -s -X POST "http://localhost:5000/api/admin/birthday-notifications/jobs/run" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

Override date (testing):

```bash
curl -s -X POST "http://localhost:5000/api/admin/birthday-notifications/jobs/run" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dateOnly":"2026-06-22"}'
```

Query param also works: `?dateOnly=2026-06-22`

**Response `200`**

```json
{
  "status": true,
  "message": "Birthday job completed for 2026-06-22 (3 user(s) matched by dob)",
  "dateOnly": "2026-06-22",
  "timezone": "Asia/Kolkata",
  "monthDays": ["06-22"],
  "matchedUsers": 3,
  "processed": 3,
  "sent": 1,
  "created": 1,
  "retried": 1,
  "skipped": 1,
  "failed": 1,
  "results": [
    {
      "userId": "user-uuid-1",
      "userName": "Jane Doe",
      "skipped": false,
      "retried": false,
      "notificationId": "notification-uuid",
      "notificationStatus": "sent",
      "postId": "post-uuid",
      "push": { "successCount": 1, "failureCount": 0, "skipped": false, "total": 1 }
    },
    {
      "userId": "user-uuid-2",
      "userName": "Bob Smith",
      "skipped": true,
      "notificationId": "notification-uuid",
      "notificationStatus": "sent",
      "postId": "post-uuid"
    },
    {
      "userId": "user-uuid-3",
      "userName": "Carol Lee",
      "skipped": false,
      "retried": true,
      "notificationId": "notification-uuid",
      "notificationStatus": "failed",
      "postId": "post-uuid",
      "push": { "successCount": 0, "failureCount": 0, "skipped": true, "reason": "no_token" }
    }
  ]
}
```

**Response fields**

| Field | Description |
|-------|-------------|
| `matchedUsers` | Users whose `dob` matches the job date |
| `sent` | Push delivered successfully on this run (excludes already-sent skips) |
| `created` | New notification records created on this run |
| `retried` | Existing `pending`/`failed` notifications that were retried |
| `skipped` | Users already `sent` for this date (idempotent skip) |
| `failed` | Processing errors or push still `failed` after this run |

**CLI equivalent:**

```bash
cd Backend && node scripts/runBirthdayJob.js
cd Backend && node scripts/runBirthdayJob.js --date=2026-06-22
```

---

## Admin — Birthday posts

### `GET /admin/birthday-posts`

```bash
curl -s "http://localhost:5000/api/admin/birthday-posts?page=1&limit=10" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

```bash
curl -s "http://localhost:5000/api/admin/birthday-posts?status=active&postDate=2026-06-22" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response `200`**

```json
{
  "status": true,
  "birthdayPosts": [
    {
      "id": "uuid",
      "userId": "user-uuid",
      "postDate": "2026-06-22",
      "message": "Happy Birthday, Jane!",
      "status": "active",
      "user": { "name": "Jane Doe" },
      "commentCount": 3
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "pages": 1 }
}
```

---

### `GET /admin/birthday-posts/:id`

Post detail with user, comments, and linked notification.

```bash
curl -s "http://localhost:5000/api/admin/birthday-posts/POST_UUID" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response `200`**

```json
{
  "status": true,
  "birthdayPost": {
    "id": "...",
    "message": "...",
    "user": { },
    "comments": [ ],
    "commentCount": 0
  },
  "notification": { "id": "...", "status": "sent" }
}
```

---

### `PATCH /admin/birthday-posts/:id`

Update message and/or status (`active`|`inactive`). JSON body only.

```bash
curl -s -X PATCH "http://localhost:5000/api/admin/birthday-posts/POST_UUID" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Updated birthday message","status":"inactive"}'
```

**Response `200`**

```json
{
  "status": true,
  "message": "Birthday post updated successfully",
  "birthdayPost": { "id": "...", "status": "inactive", "message": "..." }
}
```

---

### `DELETE /admin/birthday-posts/:postId/comments/:commentId`

Admin delete any comment (hard delete).

```bash
curl -s -X DELETE "http://localhost:5000/api/admin/birthday-posts/POST_UUID/comments/COMMENT_UUID" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response `200`**

```json
{ "status": true, "message": "Comment deleted successfully" }
```

---

## Job behaviour

1. Resolves the job date (`dateOnly`) using `BIRTHDAY_JOB_TIMEZONE` (default `Asia/Kolkata`).
2. Finds active users whose `dob` matches that date via the `dobMonthDay` GSI (`MM-DD`). Feb 29 birthdays are included on Feb 28 in non-leap years.
3. For each matched user (idempotent per `userId` + `notificationDate`):
   - **Already `sent`:** Skips push; ensures a `BirthdayPost` exists for the date.
   - **`pending` or `failed`:** Retries FCM push and updates notification status.
   - **No record yet:** Creates `BirthdayNotification` (`pending`), sends FCM immediately, then sets `sent` or `failed`.
   - Always ensures an active `BirthdayPost` is created (even when push fails).
4. Push uses `sendPushToTokens` with the user's `fcm_id`. If no token is registered, status remains `failed` (`reason: no_token` in job `results`).
5. Admin **Resend** (`POST .../resend`) can manually retry a single notification at any time.

---

## Data model (DynamoDB)

| Table | Key fields |
|-------|------------|
| `BirthdayNotification` | `userId`, `notificationDate`, `status` (`pending`\|`sent`\|`failed`) |
| `BirthdayPost` | `userId`, `postDate`, `message`, `status` (`active`\|`inactive`) — no banner image |
| `BirthdayPostComment` | `birthdayPostId`, `commenterUserId`, `comment` |
| `User` | `dob` (ISO), `dobMonthDay` (`MM-DD`, GSI) |

---

## Error codes

| HTTP | Example |
|------|---------|
| `400` | Invalid `postDate`, empty comment |
| `401` | Missing/invalid token |
| `403` | User deleting another user's comment |
| `404` | Post/notification/comment not found |
