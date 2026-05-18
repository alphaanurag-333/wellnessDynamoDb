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

After login or registration, save tokens:

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
| `POST` | `/user/auth/register/otp/send` | No | Send OTP before self-registration |
| `POST` | `/user/auth/register` | No | Verify registration OTP and create account |
| `POST` | `/user/auth/login` | No | Alias for password login |
| `POST` | `/user/auth/login/password` | No | Login with email or phone + password |
| `POST` | `/user/auth/otp/send` | No | Send login OTP (existing users) |
| `POST` | `/user/auth/otp/verify` | No | Verify login OTP and receive tokens |
| `POST` | `/user/auth/refresh-token` | No | Exchange refresh token for new pair |
| `GET` | `/user/auth/me` | Bearer user | Current profile |

**Recommended flows**

| Scenario | Steps |
|----------|--------|
| **Self-registration** | `register/otp/send` → `register` (include `otp` + profile fields) |
| **Admin-created user (no password)** | `otp/send` → `otp/verify` |
| **Account with password** | `login/password` or `login` |

Registration OTPs are stored in DynamoDB table **`RegistrationOtp`** (shared across API instances, TTL auto-expiry). Create once per environment:

```bash
node Backend/tables/createRegistrationOtpTable.js
```

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

## Register (OTP required)

Self-signup is a **two-step** flow: request a registration OTP, then submit the full profile with that OTP.

### 1. Send registration OTP

Requires `email` and `phone` (must not already be registered).

```bash
curl -sS -X POST "${BASE_URL}/user/auth/register/otp/send" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "email": "jane@example.com",
    "phoneCountryCode": "+91",
    "phone": "9876543210"
  }'
```

**Response (200):**

```json
{
  "status": true,
  "message": "Registration OTP sent successfully"
}
```

**Dev only:** if `EXPOSE_OTP_IN_RESPONSE=true` and `NODE_ENV` is not `production`, the response may include `debugOtp` for testing.

OTP length and expiry come from `OTP_LENGTH` and `OTP_EXPIRES_MINUTES` in `.env` (defaults: 6 digits, 10 minutes).

### 2. Register (verify OTP + create account)

Use the **same** `email` and `phone` as in step 1. Include `otp` from SMS/email (or `debugOtp` in dev).

```bash
curl -sS -X POST "${BASE_URL}/user/auth/register" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "otp": "123456",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phoneCountryCode": "+91",
    "phone": "9876543210",
    "termsAccepted": true,
    "gender": "female",
    "dob": "1990-05-15",
    "whatsappSameAsMobile": true,
    "primaryHealthConcern": "<health-concern-id>",
    "country": "India",
    "state": "Maharashtra",
    "city": "Mumbai",
    "fcm_id": "device-push-token",
    "password": "securePass123"
  }'
```

**Response:** `201` with tokens and `user` (same shape as login). Message: `"Registration successful"`.

#### Register field reference

| Field | Required | Notes |
|-------|----------|--------|
| `otp` | yes | From step 1; must not be expired |
| `name` | yes | |
| `email` | yes | Normalized to lowercase |
| `phone` | yes | Trimmed |
| `phoneCountryCode` | no | Default `+91` if omitted |
| `termsAccepted` | yes | Must be `true` (or `"true"`) |
| `password` | no | If sent, min 8 characters; omit for OTP-only accounts |
| `gender` | no | `male`, `female`, `other`, `boy`, `girl`, `guess` (default `boy`) |
| `dob` | no | ISO date string |
| `whatsappSameAsMobile` | no | Default `false`; when `true`, WhatsApp copies mobile |
| `whatsappCountryCode` | no | Used when `whatsappSameAsMobile` is `false` |
| `whatsappPhone` | no | Used when `whatsappSameAsMobile` is `false` |
| `primaryHealthConcern` | no | Health concern id; must exist in DB |
| `country`, `state`, `city` | no | |
| `fcm_id` | no | Push notification token |
| `profileImage` | no | URL/path string |

---

## OTP login (existing users)

For users already in the system (e.g. created in admin without a password).

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

Login OTP is stored on the **User** record (`otp`, `otpExpire`), not in `RegistrationOtp`.

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

Accounts **without** a `passwordHash` must use OTP login. Password login returns `400` with *"Password login is not set up for this account. Use OTP login."*

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
| `400` | Missing/invalid body; `termsAccepted` not true on register; no registration/login OTP sent first; OTP expired |
| `401` | Wrong password/OTP; user not registered (login OTP); invalid Bearer token |
| `403` | Account `inactive` or `blocked`; refresh token wrong role |
| `404` | User not found on `/me`; `primaryHealthConcern` id invalid on register |
| `409` | Email or phone already registered |

Error body shape (from `AppError`):

```json
{
  "status": false,
  "message": "Human-readable message"
}
```

---

## End-to-end examples (bash)

### Registration

```bash
export BASE_URL="http://localhost:5000/api"

# 1) Send registration OTP
curl -sS -X POST "${BASE_URL}/user/auth/register/otp/send" \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","phoneCountryCode":"+91","phone":"9876543210"}'

# 2) Register with OTP (use code from SMS/email, or debugOtp in dev)
curl -sS -X POST "${BASE_URL}/user/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "otp":"123456",
    "name":"Jane Doe",
    "email":"jane@example.com",
    "phoneCountryCode":"+91",
    "phone":"9876543210",
    "termsAccepted":true
  }'

# 3) Call /me with accessToken from step 2
export ACCESS_TOKEN="paste-access-token-here"
curl -sS -X GET "${BASE_URL}/user/auth/me" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Login OTP (existing user)

```bash
export BASE_URL="http://localhost:5000/api"

# 1) Request login OTP
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

- Admin user CRUD: create users without password → they log in via **login** OTP (`otp/send` → `otp/verify`).
- Public content APIs: `Backend/docs/user_curl.md` (`/api/public/misc/...`).
- Registration OTP storage: `Backend/models/registrationOtpModel.js`, table script `Backend/tables/createRegistrationOtpTable.js`.
