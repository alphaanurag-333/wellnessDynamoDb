# Cashfree payments — Program, Subscription, Consultancy, Energy Exchange, Challenges

All products use the same Cashfree checkout contract. Gateway keys and UAT/Live mode come from Admin → Configs → Payment gateway (`AppConfig.payment_gateways`).

## Client flow

1. Preview (optional)
2. Create order
3. Open Cashfree SDK with `payment.paymentSessionId` and `payment.mode` (`uat` | `live`)
4. Verify payment

## Create-order response (`payment`)

```json
{
  "provider": "cashfree",
  "orderId": "wd_...",
  "paymentSessionId": "session_...",
  "amount": 12300,
  "currency": "INR",
  "mode": "uat"
}
```

- `amount` is in **paise**
- Create-order fails with `PaymentGatewayError` when Cashfree keys are not configured in Admin

## Verify body

```json
{
  "transactionId": "<uuid>",
  "orderId": "<cashfree order id>",
  "paymentId": "<optional>"
}
```

Server confirms paid status via Cashfree Get Order API.

## Endpoints

| Product | Preview | Create order | Verify |
|---------|---------|--------------|--------|
| Consultancy | `GET /api/user/consultancy-payment/checkout-preview` | `POST /api/user/consultancy-payment/orders` | `POST /api/user/consultancy-payment/verify` |
| App Subscription | `GET /api/user/subscription-payment/checkout-preview` | `POST /api/user/subscription-payment/orders` | `POST /api/user/subscription-payment/verify` |
| Energy Exchange | `POST /api/user/energy-exchange/preview` | `POST /api/user/energy-exchange/order` | `POST /api/user/energy-exchange/verify` |
| Program | `POST /api/user/program/preview` | `POST /api/user/program/order` | `POST /api/user/program/verify` |
| Challenges | `POST /api/user/challenges/:id/payment/preview` | `POST /api/user/challenges/:id/payment/create-order` | `POST /api/user/challenges/:id/payment/verify` |

Coach-triggered program/subscription offers create a pending Cashfree order via `POST /api/account/coach-checkout/trigger`; the mobile app then calls the matching create-order endpoint (reuses/repairs the session).

Full curl examples: [cashfree-payment-api-curls.md](./cashfree-payment-api-curls.md).
