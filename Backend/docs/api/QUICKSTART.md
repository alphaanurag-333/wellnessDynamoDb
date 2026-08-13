# API Quick Start

Base URL (local): `http://localhost:5000/api`

Set `Authorization: Bearer <token>` on protected routes.

---

## Staff (Account) auth

```bash
# Login (admin / coach / assistant — same endpoint; pass activeRole)
curl -s -X POST "$BASE/api/account/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password","activeRole":"admin"}'

# Profile
curl -s "$BASE/api/account/auth/me" -H "Authorization: Bearer $TOKEN"
```

Legacy `/admin/auth`, `/coach/auth`, `/assistant/auth` were removed.

---

## Admin feature APIs

```bash
# List users (requires admin-role Account token)
curl -s "$BASE/api/admin/users?page=1&limit=10" -H "Authorization: Bearer $ADMIN_TOKEN"

# Consultancy transactions
curl -s "$BASE/api/admin/consultancy/transactions?paymentStatus=all" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Postman:** Use `POST /account/auth/login` with `activeRole: "admin"` → set `adminToken` from `accessToken`.

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
# Login (Account auth)
curl -s -X POST "$BASE/api/account/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"coach@example.com","password":"your-password","activeRole":"wellness_coach"}'

# My Heal clients
curl -s "$BASE/api/coach/heal-users?scope=all" -H "Authorization: Bearer $COACH_TOKEN"

# Consultancy transactions (scoped to coach)
curl -s "$BASE/api/coach/consultancy/transactions?paymentStatus=all" \
  -H "Authorization: Bearer $COACH_TOKEN"
```

---

## Assistant Coach

```bash
# Login (Account auth)
curl -s -X POST "$BASE/api/account/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"assistant@example.com","password":"your-password","activeRole":"assistant_wellness_coach"}'

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
