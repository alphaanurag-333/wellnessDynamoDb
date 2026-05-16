# User auth API — curl examples

App-facing authentication for end users. Routes are mounted at **`/api/user/auth`** (see `routes/userRoutes/authRoutes.js` and `controllers/userController/authController.js`).

Default server port is **5000** unless `PORT` is set in `.env`.

---

## Base URL

```bash
# bash / Git Bash / WSL
export BASE_URL="http://localhost:5000/api"

# PowerShell
$env:BASE_URL = "http://localhost:5000/api"
```

Examples use `http://localhost:5000/api`; substitute your host if needed.

After login, save tokens:

```bash
# bash
export ACCESS_TOKEN="<accessToken from response>"
export REFRESH_TOKEN="<refreshToken from response>"

# PowerShell
$env:ACCESS_TOKEN = "<accessToken from response>"
$env:REFRESH_TOKEN = "<refreshToken from response>"
```

---

## Route index

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/user/auth/register` | No | Self-registration with password |
| `POST` | `/user/auth/login` | No | Alias for password login |
| `POST` | `/user/auth/login/password` | No | Login with email or phone + password |
| `POST` | `/user/auth/otp/send` | No | Send login OTP |
| `POST` | `/user/auth/otp/verify` | No | Verify OTP and receive tokens |
| `POST` | `/user/auth/refresh-token` | No | Exchange refresh token for new pair |
| `GET` | `/user/auth/me` | Bearer user | Current profile |

**Recommended flow for admin-created users (no password):** `otp/send` → `otp/verify`.

**Password flow:** `register` or admin-set password → `login/password` (or `login`).

---

## Success response shape (login / register / OTP verify)

```json
{
  "status": true,
  "message": "Authentication successful",
  "accessToken": "...",
  "refreshToken": "...",
  "user": { }
}
```

`user` is a public profile; `primaryHealthConcern` may be populated with `{ _id, id, title, ... }` when set.

Use the access token on protected routes:

```http
Authorization: Bearer <accessToken>
```

---

## OTP login (primary)

### 1. Send OTP — by email

```bash
curl -sS -X POST "${BASE_URL}/user/auth/otp/send" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

### 2. Send OTP — by phone

```bash
curl -sS -X POST "${BASE_URL}/user/auth/otp/send" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "phoneCountryCode": "+91",
    "phone": "9876543210"
  }'
```

**Response (200):**

```json
{
  "status": true,
  "message": "OTP sent successfully"
}
```

**Dev only:** if `EXPOSE_OTP_IN_RESPONSE=true` and `NODE_ENV` is not `production`, the response may include `debugOtp` for testing.

OTP length and expiry come from `OTP_LENGTH` and `OTP_EXPIRES_MINUTES` in `.env` (defaults: 6 digits, 10 minutes).

### 3. Verify OTP — email

```bash
curl -sS -X POST "${BASE_URL}/user/auth/otp/verify" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "email": "user@example.com",
    "otp": "123456"
  }'
```

### 4. Verify OTP — phone

```bash
curl -sS -X POST "${BASE_URL}/user/auth/otp/verify" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "phoneCountryCode": "+91",
    "phone": "9876543210",
    "otp": "123456"
  }'
```

Use the same identifier (email or phone + country code) as in the send step.

---

## Password login

Accounts created in admin **without** a password must use OTP. Password login returns `400` with *"Password login is not set up for this account. Use OTP login."*

### Login with email + password

```bash
curl -sS -X POST "${BASE_URL}/user/auth/login/password" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "yourPassword123"
  }'
```

### Login with phone + password

```bash
curl -sS -X POST "${BASE_URL}/user/auth/login/password" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "phoneCountryCode": "+91",
    "phone": "9876543210",
    "password": "yourPassword123"
  }'
```

### Alias: `POST /user/auth/login`

Same body and behavior as `/login/password`.

```bash
curl -sS -X POST "${BASE_URL}/user/auth/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "yourPassword123"
  }'
```

---

## Register (self-signup with password)

```bash
curl -sS -X POST "${BASE_URL}/user/auth/register" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phoneCountryCode": "+91",
    "phone": "9876543210",
    "password": "securePass123",
    "termsAccepted": true,
    "gender": "female",
    "primaryHealthConcern": "<health-concern-id>",
    "country": "India",
    "state": "Maharashtra",
    "city": "Mumbai"
  }'
```

| Field | Required | Notes |
|-------|----------|--------|
| `name` | yes | |
| `email` | yes | Normalized to lowercase |
| `phone` | yes | Digits only (normalized) |
| `phoneCountryCode` | no | Default `+91` if omitted |
| `password` | yes | Min 8 characters |
| `termsAccepted` | no | `true` / `"true"` sets `termsAcceptedAt` |
| `gender` | no | `male`, `female`, `other`, `boy`, `girl`, `guess` (default `boy`) |
| `primaryHealthConcern` | no | Health concern id |
| `country`, `state`, `city` | no | |

**Response:** `201` with tokens and `user` (same shape as login).

---

## Refresh access token

```bash
curl -sS -X POST "${BASE_URL}/user/auth/refresh-token" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"refreshToken\": \"${REFRESH_TOKEN}\"
  }"
```

**Response (200):**

```json
{
  "status": true,
  "message": "Token refreshed successfully",
  "accessToken": "...",
  "refreshToken": "..."
}
```

---

## Current user profile

```bash
curl -sS -X GET "${BASE_URL}/user/auth/me" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

**Response (200):**

```json
{
  "status": true,
  "message": "Profile fetched successfully",
  "user": { }
}
```

---

## Common errors

| HTTP | Typical cause |
|------|----------------|
| `400` | Missing/invalid body (`name`, `email`, `phone`, `password`, `otp`, etc.) |
| `401` | Wrong password/OTP, missing or invalid Bearer token |
| `403` | Account `inactive` or `blocked`; refresh token wrong role |
| `404` | User not found on `/me` |
| `409` | Email or phone already registered |

Error body shape (from `AppError`):

```json
{
  "status": false,
  "message": "Human-readable message"
}
```

---

## End-to-end OTP example (bash)

```bash
export BASE_URL="http://localhost:5000/api"

# 1) Request OTP
curl -sS -X POST "${BASE_URL}/user/auth/otp/send" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'

# 2) Verify (use code from SMS/email, or debugOtp in dev)
curl -sS -X POST "${BASE_URL}/user/auth/otp/verify" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","otp":"123456"}'

# 3) Call /me with accessToken from step 2
export ACCESS_TOKEN="paste-access-token-here"
curl -sS -X GET "${BASE_URL}/user/auth/me" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

---

## Related

- Admin user CRUD: create users without password → they log in via OTP only.
- Public content APIs: `Backend/docs/user_curl.md` (`/api/public/misc/...`).
