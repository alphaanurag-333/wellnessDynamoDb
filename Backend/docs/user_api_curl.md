# User API — cURL testing guide

Base URL (local): `http://localhost:5000/api`

Set your token after login:

```bash
# Bash / Git Bash
export BASE_URL="http://localhost:5000/api"
export TOKEN="paste_access_token_here"
export TODAY="2026-06-18"
```

```powershell
# PowerShell
$BASE_URL = "http://localhost:5000/api"
$TOKEN = "paste_access_token_here"
$TODAY = "2026-06-18"
```

---

## 1. Health

```bash
curl -s "$BASE_URL/health"
```

---

## 2. Auth (no token)

### Send registration OTP

```bash
curl -s -X POST "$BASE_URL/user/auth/register/otp/send" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "phone": "9876543210",
    "phoneCountryCode": "+91"
  }'
```

> Dev: response may include `"debugOtp"` when `EXPOSE_OTP_IN_RESPONSE=true`.

### Register

```bash
curl -s -X POST "$BASE_URL/user/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "otp": "123456",
    "name": "Test User",
    "email": "user@example.com",
    "phone": "9876543210",
    "phoneCountryCode": "+91",
    "password": "password123",
    "gender": "boy",
    "country": "India",
    "termsAccepted": true
  }'
```

### Login with password (email)

```bash
curl -s -X POST "$BASE_URL/user/auth/login/password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Login with password (phone)

```bash
curl -s -X POST "$BASE_URL/user/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "phoneCountryCode": "+91",
    "password": "password123"
  }'
```

### Send login OTP

```bash
curl -s -X POST "$BASE_URL/user/auth/otp/send" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "phoneCountryCode": "+91"
  }'
```

### Verify login OTP

```bash
curl -s -X POST "$BASE_URL/user/auth/otp/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "phoneCountryCode": "+91",
    "otp": "123456"
  }'
```

### Refresh token

```bash
curl -s -X POST "$BASE_URL/user/auth/refresh-token" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "paste_refresh_token_here"
  }'
```

---

## 3. Profile (Bearer token required)

### Get my profile

```bash
curl -s "$BASE_URL/user/auth/me" \
  -H "Authorization: Bearer $TOKEN"
```

### Update profile

```bash
curl -s -X PATCH "$BASE_URL/user/auth/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "city": "Pune"
  }'
```

---

## 4. Water tracking (Bearer token required)

### Get today + last 7 days

```bash
curl -s "$BASE_URL/user/water-tracking?days=7&date=$TODAY" \
  -H "Authorization: Bearer $TOKEN"
```

### Update daily goal (glasses)

```bash
curl -s -X PATCH "$BASE_URL/user/water-tracking/goal" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"goalGlasses": 17}'
```

### Add 1 glass

```bash
curl -s -X POST "$BASE_URL/user/water-tracking/increment" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"date\": \"$TODAY\"}"
```

### Remove 1 glass

```bash
curl -s -X POST "$BASE_URL/user/water-tracking/decrement" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"date\": \"$TODAY\"}"
```

### Set exact glass count for a day

```bash
curl -s -X PUT "$BASE_URL/user/water-tracking/day" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"date\": \"$TODAY\", \"glassCount\": 12}"
```

---

## 5. Consultancy payment (Bearer token required)

### Checkout preview (optional referral code)

```bash
# Without referral
curl -s "$BASE_URL/user/consultancy-payment/checkout-preview" \
  -H "Authorization: Bearer $TOKEN"

# With referral
curl -s "$BASE_URL/user/consultancy-payment/checkout-preview?referralCode=COACHCODE1" \
  -H "Authorization: Bearer $TOKEN"
```

### Create payment order

```bash
curl -s -X POST "$BASE_URL/user/consultancy-payment/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "referralCode": "",
    "paymentMethod": "upi"
  }'
```

Save from response:
- `data.transaction.id` → `TRANSACTION_ID`
- `data.payment.orderId` → `ORDER_ID`

In **development** with mock payments, the order is **auto-confirmed** (`paymentStatus: "paid"`) unless you set `AUTO_CONFIRM_MOCK_PAYMENT=false` in `.env`. You do not need a separate verify call in that case.

If the transaction stays `pending`, call verify below.

### Verify payment (mock — dev without Razorpay)

Required when create order left `paymentStatus` as `pending`. With mock payments you only need `transactionId` (order id is read from the saved transaction):

```bash
curl -s -X POST "$BASE_URL/user/consultancy-payment/verify" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "TRANSACTION_ID"
  }'
```

Or pass the mock order id explicitly:

```bash
curl -s -X POST "$BASE_URL/user/consultancy-payment/verify" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "TRANSACTION_ID",
    "razorpay_order_id": "ORDER_ID",
    "razorpay_payment_id": "pay_mock_test",
    "razorpay_signature": "mock"
  }'
```

### Verify payment (real Razorpay)

Use values returned by Razorpay SDK after user pays:

```bash
curl -s -X POST "$BASE_URL/user/consultancy-payment/verify" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "TRANSACTION_ID",
    "razorpay_order_id": "order_xxx",
    "razorpay_payment_id": "pay_xxx",
    "razorpay_signature": "signature_from_razorpay"
  }'
```

### My transaction history

```bash
curl -s "$BASE_URL/user/consultancy-payment/transactions" \
  -H "Authorization: Bearer $TOKEN"
```

### Get one transaction

```bash
curl -s "$BASE_URL/user/consultancy-payment/transactions/TRANSACTION_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### Download invoice PDF (redirects to S3 URL)

```bash
curl -s -L -o invoice.pdf \
  "$BASE_URL/user/consultancy-payment/transactions/TRANSACTION_ID/invoice" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 6. Public app config (no token)

```bash
curl -s "$BASE_URL/public/app-config"
```

### Public content examples

```bash
curl -s "$BASE_URL/public/misc/banners"
curl -s "$BASE_URL/public/misc/faqs"
curl -s "$BASE_URL/public/misc/health-concerns"
curl -s "$BASE_URL/public/misc/health-tools"
```

---

## Quick end-to-end test flow

```bash
# 1) Login
curl -s -X POST "$BASE_URL/user/auth/login/password" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# 2) Copy accessToken from response, then:
export TOKEN="eyJhbG..."

# 3) Water tracking
curl -s -X PATCH "$BASE_URL/user/water-tracking/goal" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"goalGlasses": 17}'

curl -s -X POST "$BASE_URL/user/water-tracking/increment" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"date\": \"$TODAY\"}"

# 4) Consultancy payment (mock)
ORDER_RESP=$(curl -s -X POST "$BASE_URL/user/consultancy-payment/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod":"upi"}')

echo "$ORDER_RESP"
# Extract transactionId + orderId manually, then verify:

curl -s -X POST "$BASE_URL/user/consultancy-payment/verify" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "YOUR_TRANSACTION_ID",
    "razorpay_order_id": "order_mock_xxx",
    "razorpay_payment_id": "pay_mock_test",
    "razorpay_signature": "mock"
  }'
```

---

## PowerShell examples

```powershell
# Login
$r = Invoke-RestMethod -Method POST -Uri "$BASE_URL/user/auth/login/password" `
  -ContentType "application/json" `
  -Body '{"email":"user@example.com","password":"password123"}'
$TOKEN = $r.accessToken

# Water tracking
Invoke-RestMethod -Uri "$BASE_URL/user/water-tracking?days=7" `
  -Headers @{ Authorization = "Bearer $TOKEN" }

# Consultancy checkout preview
Invoke-RestMethod -Uri "$BASE_URL/user/consultancy-payment/checkout-preview" `
  -Headers @{ Authorization = "Bearer $TOKEN" }
```
