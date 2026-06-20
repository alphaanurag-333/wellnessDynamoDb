# API Quick Start

Base URL (local): `http://localhost:5000/api`

Set `Authorization: Bearer <token>` on protected routes.

---

## Admin

```bash
# Login
curl -s -X POST "$BASE/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'

# Profile
curl -s "$BASE/api/admin/auth/me" -H "Authorization: Bearer $ADMIN_TOKEN"

# List users
curl -s "$BASE/api/admin/users?page=1&limit=10" -H "Authorization: Bearer $ADMIN_TOKEN"

# Consultancy transactions
curl -s "$BASE/api/admin/consultancy/transactions?paymentStatus=all" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Postman:** Import `Wellness-Admin-API` → run `POST /admin/auth/login` → set `adminToken` from response.

---

## User (mobile)

```bash
# Password login
curl -s -X POST "$BASE/api/user/auth/login/password" \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","phoneCountryCode":"+91","password":"your-password"}'

# Water tracking today
curl -s "$BASE/api/user/water-tracking" -H "Authorization: Bearer $ACCESS_TOKEN"

# Consultancy checkout preview
curl -s "$BASE/api/user/consultancy-payment/checkout-preview?referralCode=COACHCODE" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Postman:** Use `Wellness-User-API` — auth scripts auto-save `accessToken`.

---

## Wellness Coach

```bash
# Login
curl -s -X POST "$BASE/api/coach/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"coach@example.com","password":"your-password"}'

# My Heal clients
curl -s "$BASE/api/coach/heal-users?scope=all" -H "Authorization: Bearer $COACH_TOKEN"

# Consultancy transactions (scoped to coach)
curl -s "$BASE/api/coach/consultancy/transactions?paymentStatus=all" \
  -H "Authorization: Bearer $COACH_TOKEN"
```

---

## Assistant Coach

```bash
# Login
curl -s -X POST "$BASE/api/assistant/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"assistant@example.com","password":"your-password"}'

# My assigned Heal clients
curl -s "$BASE/api/assistant/heal-users" -H "Authorization: Bearer $ASSISTANT_TOKEN"

# My consultancy transactions
curl -s "$BASE/api/assistant/consultancy/transactions" \
  -H "Authorization: Bearer $ASSISTANT_TOKEN"
```

---

## Public (no auth)

```bash
curl -s "$BASE/api/health"
curl -s "$BASE/api/public/app-config"
curl -s "$BASE/api/public/misc/banners"
curl -s "$BASE/api/public/misc/health-concerns"
```

---

## Common query parameters

| Param | Used on | Description |
|-------|---------|-------------|
| `page`, `limit` | List endpoints | Pagination |
| `search` | Users, heal-users, consultancy | Text search |
| `status` | CMS resources | Filter by active/inactive |
| `paymentStatus` | Consultancy | `all`, `paid`, `pending`, `failed`, `refunded` |
| `scope` | Coach heal-users / consultancy | `all`, `direct`, `assistant` |

See [domain guides](../domain/) for referral assignment and consultancy payment rules.
