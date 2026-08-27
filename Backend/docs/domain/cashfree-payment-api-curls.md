# Cashfree payment APIs (App)

Complete curl reference for **Consultancy**, **App Subscription**, **Energy Exchange**, **Program**, and **Challenges**.

Payment routes require a **user JWT** from `/api/user/auth/*`. Gateway keys and UAT/Live mode come from Admin → Configs → Payment gateway.

```bash
BASE=http://localhost:5000
TOKEN=YOUR_USER_ACCESS_TOKEN
```

## Shared checkout contract

Create-order responses wrap the payload in `data`:

```json
{
  "status": true,
  "message": "…",
  "data": {
    "transaction": { "id": "TRANSACTION_UUID", "paymentStatus": "pending" },
    "pricing": {},
    "payment": {
      "provider": "cashfree",
      "orderId": "wd_...",
      "paymentSessionId": "session_...",
      "amount": 12300,
      "currency": "INR",
      "mode": "uat"
    }
  }
}
```

- `payment.amount` is in **paise**
- Open the Cashfree SDK with `payment.paymentSessionId` + `payment.mode` (`uat` | `live`)
- Then call **verify** with `data.transaction.id` and `data.payment.orderId`
- `payment.paymentId` on verify is optional; the server confirms paid status with Cashfree Get Order
- Reusing a pending order may set `payment.reusedPendingOrder` / `payment.repairedPendingOrder`
- Create-order fails with `PaymentGatewayError` (HTTP **502** on consultancy, subscription, program, and energy exchange) when Cashfree keys are missing

Verify body (all products):

```json
{
  "transactionId": "TRANSACTION_UUID",
  "orderId": "ORDER_ID_FROM_CREATE",
  "paymentId": "OPTIONAL_CF_PAYMENT_ID"
}
```

`transactionId` is required. `orderId` falls back to the stored Cashfree order id. Aliases `order_id` / `cashfree_order_id` and `payment_id` / `cashfree_payment_id` are accepted.

---

## 1. Consultancy

Base path: `/api/user/consultancy-payment`  
Create-order status: **201**. Verify returns `{ data: { transaction } }`.

### 1.1 Preview

```bash
curl -s "$BASE/api/user/consultancy-payment/checkout-preview?referralCode=" \
  -H "Authorization: Bearer $TOKEN"
```

Optional query: `referralCode=CODE` (also `referral_code`).

### 1.2 List health concerns (needed for create order)

Public catalog (no JWT):

```bash
curl -s "$BASE/api/public/misc/health-concerns"
```

Use an active concern `id` as `healthConcernId`. For the **Other** row, send `healthConcernId: "__other__"` and `healthConcernOther`.

### 1.3 Create order

```bash
curl -s -X POST "$BASE/api/user/consultancy-payment/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "healthConcernId": "ACTIVE_HEALTH_CONCERN_UUID",
    "referralCode": "",
    "paymentMethod": "upi"
  }'
```

| Field | Required | Notes |
|-------|----------|--------|
| `healthConcernId` | Yes | Active health concern UUID, or `__other__` |
| `referralCode` | No | Optional discount code |
| `paymentMethod` | No | Default `upi` |
| `healthConcernOther` | When concern is Other | Max 100 characters |

### 1.4 Verify

```bash
curl -s -X POST "$BASE/api/user/consultancy-payment/verify" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "TRANSACTION_UUID",
    "orderId": "ORDER_ID_FROM_CREATE",
    "paymentId": "OPTIONAL_CF_PAYMENT_ID"
  }'
```

### 1.5 Transactions / invoice

```bash
curl -s "$BASE/api/user/consultancy-payment/transactions" \
  -H "Authorization: Bearer $TOKEN"

curl -s "$BASE/api/user/consultancy-payment/transactions/TRANSACTION_UUID" \
  -H "Authorization: Bearer $TOKEN"

curl -s "$BASE/api/user/consultancy-payment/transactions/TRANSACTION_UUID/invoice" \
  -H "Authorization: Bearer $TOKEN"
```

Invoice download is available only after the transaction is `paid` (PDF).

---

## 2. App Subscription

Base path: `/api/user/subscription-payment`  
Often driven by a coach checkout offer (`pendingCoachCheckout.productType = "subscription"`).  
Create-order status: **201**. Verify returns `{ data: { transaction } }`.

### 2.1 Preview

```bash
curl -s "$BASE/api/user/subscription-payment/checkout-preview" \
  -H "Authorization: Bearer $TOKEN"
```

### 2.2 Create order

```bash
curl -s -X POST "$BASE/api/user/subscription-payment/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "upi"
  }'
```

### 2.3 Verify

```bash
curl -s -X POST "$BASE/api/user/subscription-payment/verify" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "TRANSACTION_UUID",
    "orderId": "ORDER_ID_FROM_CREATE",
    "paymentId": "OPTIONAL_CF_PAYMENT_ID"
  }'
```

### 2.4 Transactions

```bash
curl -s "$BASE/api/user/subscription-payment/transactions" \
  -H "Authorization: Bearer $TOKEN"

curl -s "$BASE/api/user/subscription-payment/transactions/TRANSACTION_UUID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 3. Energy Exchange

Base path: `/api/user/energy-exchange`  
Requires consultancy + program purchase (or a Maintenance renewal).  
Create-order status: **201**. Verify returns `{ data: { transaction } }`.  
`fyStartYears` is required on preview and create order (array of FY start years from `/plans`).

### 3.1 Program / plans

```bash
curl -s "$BASE/api/user/energy-exchange/program" \
  -H "Authorization: Bearer $TOKEN"

curl -s "$BASE/api/user/energy-exchange/plans" \
  -H "Authorization: Bearer $TOKEN"
```

### 3.2 Preview

```bash
curl -s -X POST "$BASE/api/user/energy-exchange/preview" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fyStartYears": [2026]
  }'
```

### 3.3 Create order

```bash
curl -s -X POST "$BASE/api/user/energy-exchange/order" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fyStartYears": [2026],
    "paymentMethod": "upi"
  }'
```

### 3.4 Verify

```bash
curl -s -X POST "$BASE/api/user/energy-exchange/verify" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "TRANSACTION_UUID",
    "orderId": "ORDER_ID_FROM_CREATE",
    "paymentId": "OPTIONAL_CF_PAYMENT_ID"
  }'
```

### 3.5 Subscriptions

```bash
curl -s "$BASE/api/user/energy-exchange/subscriptions" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 4. Program

Base path: `/api/user/program`  
Coach-triggered offer or an assigned purchasable program.  
Create-order status: **201**. Verify returns `{ data: { transaction } }`.

### 4.1 Get current program / offer

```bash
curl -s "$BASE/api/user/program" \
  -H "Authorization: Bearer $TOKEN"
```

### 4.2 Preview

```bash
curl -s -X POST "$BASE/api/user/program/preview" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 4.3 Create order

```bash
curl -s -X POST "$BASE/api/user/program/order" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "upi"
  }'
```

### 4.4 Verify

```bash
curl -s -X POST "$BASE/api/user/program/verify" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "TRANSACTION_UUID",
    "orderId": "ORDER_ID_FROM_CREATE",
    "paymentId": "OPTIONAL_CF_PAYMENT_ID"
  }'
```

---

## 5. Challenges

Base path: `/api/user/challenges`  
Preview, create-order, and verify return `{ status: true, data }` with HTTP **200**.  
Verify `data` includes `transaction` and `enrollment`.

### 5.1 List / detail / my enrollments

```bash
curl -s "$BASE/api/user/challenges" \
  -H "Authorization: Bearer $TOKEN"

curl -s "$BASE/api/user/challenges/me" \
  -H "Authorization: Bearer $TOKEN"

curl -s "$BASE/api/user/challenges/CHALLENGE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 5.2 Validate coupon (optional)

```bash
curl -s -X POST "$BASE/api/user/challenges/coupons/validate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "challengeId": "CHALLENGE_ID",
    "couponCode": "SAVE10"
  }'
```

### 5.3 Preview payment

```bash
curl -s -X POST "$BASE/api/user/challenges/CHALLENGE_ID/payment/preview" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "couponCode": ""
  }'
```

### 5.4 Create order

```bash
curl -s -X POST "$BASE/api/user/challenges/CHALLENGE_ID/payment/create-order" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "upi",
    "couponCode": ""
  }'
```

### 5.5 Verify

```bash
curl -s -X POST "$BASE/api/user/challenges/CHALLENGE_ID/payment/verify" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "TRANSACTION_UUID",
    "orderId": "ORDER_ID_FROM_CREATE",
    "paymentId": "OPTIONAL_CF_PAYMENT_ID"
  }'
```

---

## Endpoint summary

| Product | Preview | Create order | Verify |
|---------|---------|--------------|--------|
| Consultancy | `GET /api/user/consultancy-payment/checkout-preview` | `POST /api/user/consultancy-payment/orders` | `POST /api/user/consultancy-payment/verify` |
| App Subscription | `GET /api/user/subscription-payment/checkout-preview` | `POST /api/user/subscription-payment/orders` | `POST /api/user/subscription-payment/verify` |
| Energy Exchange | `POST /api/user/energy-exchange/preview` | `POST /api/user/energy-exchange/order` | `POST /api/user/energy-exchange/verify` |
| Program | `POST /api/user/program/preview` | `POST /api/user/program/order` | `POST /api/user/program/verify` |
| Challenges | `POST /api/user/challenges/:id/payment/preview` | `POST /api/user/challenges/:id/payment/create-order` | `POST /api/user/challenges/:id/payment/verify` |

Coach-triggered program/subscription offers create a pending Cashfree order via `POST /api/account/coach-checkout/trigger`. The app then calls the matching create-order endpoint, which reuses or repairs the session.

---

## Typical app sequence

1. Call **preview**
2. Call **create order** → read `data.transaction.id`, `data.payment.orderId`, `data.payment.paymentSessionId`, `data.payment.mode`
3. Open Cashfree checkout
4. Call **verify** with `transactionId` + `orderId`

Related: [cashfree-payments.md](./cashfree-payments.md), [consultancy-payment.md](./consultancy-payment.md), [program-payment.md](./program-payment.md)
