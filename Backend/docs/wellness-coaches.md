# Wellness coaches API — curl examples

Admin CRUD for **Wellness Coaches (WC)** and **Assistant Wellness Coaches (AWC)** — staff assigned to a WC.

Routes are mounted at **`/api/admin/wellness-coaches`** (see `routes/adminRoutes/adminWellnessCoachRoutes.js`).

Default server port is **5000** unless `PORT` is set in `.env`.

---

## Base URL and auth

```bash
# bash / Git Bash / WSL
export BASE_URL="http://localhost:5000/api"

# PowerShell
$env:BASE_URL = "http://localhost:5000/api"
```

All endpoints require an **admin** access token:

```http
Authorization: Bearer <adminAccessToken>
```

Obtain a token via admin login:

```bash
curl -sS -X POST "${BASE_URL}/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourAdminPassword"}'
```

```bash
# bash
export ADMIN_TOKEN="<accessToken from login response>"

# PowerShell
$env:ADMIN_TOKEN = "<accessToken from login response>"
```

---

## DynamoDB tables (one-time setup)

```bash
node Backend/tables/createWellnessCoachTables.js
```

| Table | Purpose |
|-------|---------|
| `WellnessCoach` | Primary wellness coach records |
| `AssistantWellnessCoach` | AWC staff linked via `wellnessCoachId` |

---

## Route index

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/wellness-coaches` | List wellness coaches |
| `POST` | `/admin/wellness-coaches` | Create wellness coach |
| `GET` | `/admin/wellness-coaches/:id` | Get wellness coach by id |
| `PATCH` | `/admin/wellness-coaches/:id` | Update wellness coach |
| `DELETE` | `/admin/wellness-coaches/:id` | Delete wellness coach |
| `GET` | `/admin/wellness-coaches/assistants` | List all assistants (optional filter) |
| `GET` | `/admin/wellness-coaches/:coachId/assistants` | List assistants for one coach |
| `POST` | `/admin/wellness-coaches/:coachId/assistants` | Create assistant for a coach |
| `GET` | `/admin/wellness-coaches/:coachId/assistants/:id` | Get assistant |
| `PATCH` | `/admin/wellness-coaches/:coachId/assistants/:id` | Update assistant |
| `DELETE` | `/admin/wellness-coaches/:coachId/assistants/:id` | Delete assistant |

**Typical flow:** create WC → add AWCs under `/:coachId/assistants`.

---

## Wellness coach (WC)

### List wellness coaches

Query: `page`, `limit` (max 200), `status` (`active` | `inactive`), `search` (name, email, phone, specialization).

```bash
curl -sS -X GET "${BASE_URL}/admin/wellness-coaches?page=1&limit=20&status=active" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

**Response (200):**

```json
{
  "status": true,
  "wellnessCoaches": [],
  "pagination": { "page": 1, "limit": 20, "total": 0, "pages": 1 }
}
```

### Get wellness coach by id

```bash
export COACH_ID="<wellness-coach-uuid>"

curl -sS -X GET "${BASE_URL}/admin/wellness-coaches/${COACH_ID}" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

**Response (200):**

```json
{
  "status": true,
  "wellnessCoach": {
    "id": "...",
    "_id": "...",
    "name": "Dr. Priya Sharma",
    "email": "priya@example.com",
    "phoneCountryCode": "+91",
    "phone": "9876543210",
    "phoneKey": "+91#9876543210",
    "profileImage": null,
    "bio": null,
    "specialization": "Weight management",
    "country": "India",
    "state": "Maharashtra",
    "city": "Mumbai",
    "status": "active",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### Create wellness coach (JSON)

```bash
curl -sS -X POST "${BASE_URL}/admin/wellness-coaches" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "name": "Dr. Priya Sharma",
    "email": "priya@example.com",
    "phoneCountryCode": "+91",
    "phone": "9876543210",
    "bio": "Certified nutrition and lifestyle coach.",
    "specialization": "Weight management",
    "country": "India",
    "state": "Maharashtra",
    "city": "Mumbai",
    "status": "active"
  }'
```

**Response (201):**

```json
{
  "status": true,
  "message": "Wellness coach created successfully",
  "wellnessCoach": { }
}
```

#### WC field reference

| Field | Required | Notes |
|-------|----------|--------|
| `name` | yes | |
| `email` | yes | Lowercased; unique among coaches |
| `phone` | yes | Unique with `phoneCountryCode` |
| `phoneCountryCode` | no | Default `+91` |
| `bio` | no | |
| `specialization` | no | |
| `country`, `state`, `city` | no | |
| `profileImage` | no | URL/path string, or upload via multipart (below) |
| `status` | no | `active` or `inactive` (default `active`) |

### Create wellness coach (profile image upload)

Multipart field name: **`file`**. Saves under `uploads/wellness-coach/`.

```bash
curl -sS -X POST "${BASE_URL}/admin/wellness-coaches" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -F "file=@/path/to/photo.jpg" \
  -F "name=Dr. Priya Sharma" \
  -F "email=priya@example.com" \
  -F "phoneCountryCode=+91" \
  -F "phone=9876543210"
```

### Update wellness coach

Send only fields to change.

```bash
curl -sS -X PATCH "${BASE_URL}/admin/wellness-coaches/${COACH_ID}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "status": "inactive",
    "specialization": "Diabetes care"
  }'
```

**Response (200):**

```json
{
  "status": true,
  "message": "Wellness coach updated successfully",
  "wellnessCoach": { }
}
```

### Delete wellness coach

Fails with `409` if any assistants are still assigned.

```bash
curl -sS -X DELETE "${BASE_URL}/admin/wellness-coaches/${COACH_ID}" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

**Response (200):**

```json
{
  "status": true,
  "message": "Wellness coach deleted successfully"
}
```

---

## Assistant wellness coach (AWC)

Assistants belong to exactly one wellness coach (`wellnessCoachId`).

### List all assistants

Optional query: `wellnessCoachId`, `page`, `limit`, `status`, `search`.

```bash
curl -sS -X GET "${BASE_URL}/admin/wellness-coaches/assistants?wellnessCoachId=${COACH_ID}" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

**Response (200):**

```json
{
  "status": true,
  "assistants": [],
  "pagination": { "page": 1, "limit": 20, "total": 0, "pages": 1 }
}
```

### List assistants for one coach

```bash
curl -sS -X GET "${BASE_URL}/admin/wellness-coaches/${COACH_ID}/assistants?page=1&limit=20" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

### Get assistant by id

```bash
export ASSISTANT_ID="<assistant-uuid>"

curl -sS -X GET "${BASE_URL}/admin/wellness-coaches/${COACH_ID}/assistants/${ASSISTANT_ID}" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

**Response (200):**

```json
{
  "status": true,
  "assistant": {
    "id": "...",
    "_id": "...",
    "wellnessCoachId": "...",
    "name": "Rahul Verma",
    "email": "rahul@example.com",
    "phoneCountryCode": "+91",
    "phone": "9123456780",
    "phoneKey": "+91#9123456780",
    "profileImage": null,
    "designation": "Senior assistant",
    "status": "active",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### Create assistant (JSON)

```bash
curl -sS -X POST "${BASE_URL}/admin/wellness-coaches/${COACH_ID}/assistants" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "name": "Rahul Verma",
    "email": "rahul@example.com",
    "phoneCountryCode": "+91",
    "phone": "9123456780",
    "designation": "Senior assistant",
    "status": "active"
  }'
```

**Response (201):**

```json
{
  "status": true,
  "message": "Assistant wellness coach created successfully",
  "assistant": { }
}
```

#### AWC field reference

| Field | Required | Notes |
|-------|----------|--------|
| `name` | yes | |
| `email` | yes | Unique among assistants |
| `phone` | yes | Unique with `phoneCountryCode` |
| `phoneCountryCode` | no | Default `+91` |
| `designation` | no | Role/title (e.g. staff label) |
| `profileImage` | no | URL or multipart `file` |
| `status` | no | `active` or `inactive` (default `active`) |

`wellnessCoachId` is taken from the URL (`:coachId`); do not send a different coach id in the body.

### Create assistant (profile image upload)

Saves under `uploads/assistant-wellness-coach/`.

```bash
curl -sS -X POST "${BASE_URL}/admin/wellness-coaches/${COACH_ID}/assistants" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -F "file=@/path/to/photo.jpg" \
  -F "name=Rahul Verma" \
  -F "email=rahul@example.com" \
  -F "phoneCountryCode=+91" \
  -F "phone=9123456780" \
  -F "designation=Senior assistant"
```

### Update assistant

```bash
curl -sS -X PATCH "${BASE_URL}/admin/wellness-coaches/${COACH_ID}/assistants/${ASSISTANT_ID}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "designation": "Lead assistant",
    "status": "active"
  }'
```

**Response (200):**

```json
{
  "status": true,
  "message": "Assistant wellness coach updated successfully",
  "assistant": { }
}
```

### Delete assistant

```bash
curl -sS -X DELETE "${BASE_URL}/admin/wellness-coaches/${COACH_ID}/assistants/${ASSISTANT_ID}" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

**Response (200):**

```json
{
  "status": true,
  "message": "Assistant wellness coach deleted successfully"
}
```

---

## Common errors

| HTTP | Typical cause |
|------|----------------|
| `400` | Missing `name`, `email`, or `phone`; invalid `status`; empty patch body |
| `401` | Missing or invalid admin token |
| `404` | Coach or assistant not found; assistant not under given `coachId` |
| `409` | Duplicate email/phone; delete coach while assistants still exist |

Error body:

```json
{
  "status": false,
  "message": "Human-readable message"
}
```

---

## End-to-end example (bash)

```bash
export BASE_URL="http://localhost:5000/api"

# 1) Admin login
curl -sS -X POST "${BASE_URL}/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourAdminPassword"}'

export ADMIN_TOKEN="paste-admin-access-token"

# 2) Create wellness coach
curl -sS -X POST "${BASE_URL}/admin/wellness-coaches" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "name":"Dr. Priya Sharma",
    "email":"priya@example.com",
    "phoneCountryCode":"+91",
    "phone":"9876543210",
    "specialization":"Weight management",
    "status":"active"
  }'

export COACH_ID="paste-coach-id-from-response"

# 3) Add assistant staff
curl -sS -X POST "${BASE_URL}/admin/wellness-coaches/${COACH_ID}/assistants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "name":"Rahul Verma",
    "email":"rahul@example.com",
    "phoneCountryCode":"+91",
    "phone":"9123456780",
    "designation":"Senior assistant"
  }'

# 4) List assistants for coach
curl -sS -X GET "${BASE_URL}/admin/wellness-coaches/${COACH_ID}/assistants" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

---

## Related

- Models: `Backend/models/wellnessCoachModel.js`, `Backend/models/assistantWellnessCoachModel.js`
- Controllers: `Backend/controllers/adminController/wellnessCoachController.js`, `assistantWellnessCoachController.js`
- User auth (separate): `Backend/docs/user_auth.md`
