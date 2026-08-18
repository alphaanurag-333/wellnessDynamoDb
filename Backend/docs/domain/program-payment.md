# Coach-triggered Wellness Program payment

Admin publishes Program, Discount, and Link validity on Configs → App Program (`/configs/app-program`). A Wellness Coach then triggers that configured offer from the client's Energy Exchange page. The mobile app reads and pays the pending offer through `/api/user/program`.

This path is separate from catalog `UserProgram` assignments. A trigger does **not** create a `UserProgram` row.

## Staff flow

1. Publish options with `GET` / `PATCH /api/account/app-config`:
   - `app_program_pricing[]` `{ id, name, amount }`
   - `app_program_discount_slabs[]` `{ pct, label }`
   - `app_program_validity_periods[]` e.g. `"24 hours"`
2. Coach opens `/users/:userId?section=exchange` and picks Program, Discount, Link validity. Value is the discounted list price.
3. `POST /api/account/coach-checkout/trigger`

```json
{
  "userId": "<User.id>",
  "productType": "program",
  "itemId": "<app_program_pricing.id>",
  "discountPercent": 15,
  "discountLabel": "festive",
  "linkValidity": "24 hours"
}
```

Coach IDs are optional. When omitted, the API attributes the offer to the authenticated Wellness Coach and the client's assigned assistant.

**Auth:** Account JWT. Wellness Coaches need program edit access (`console.pg.edit` / `nav.my-users`). The coach may only trigger for clients in their hierarchy.

**What it writes:**

- `User.pendingCoachCheckout` — offer object (`itemId`, amounts, `expiresAt`, `transactionId`)
- `ConsultancyTransaction` — `productType: "program"`, `checkoutOffer: true`, discounted + tax pricing, Razorpay/mock `paymentGatewayOrderId`

Expired unpaid offers are not payable. Re-triggering replaces the pending offer.

## Mobile flow

Use the user JWT from `/user/auth/*`.

1. `GET /api/user/program`
2. `POST /api/user/program/preview`
3. `POST /api/user/program/order`
4. Complete Razorpay (or mock in development)
5. `POST /api/user/program/verify`

### `GET /api/user/program`

When an unexpired coach offer exists, the response prefers that offer even if no `UserProgram` assignment exists:

```json
{
  "status": true,
  "message": "Wellness Program offer fetched",
  "enabled": true,
  "payable": true,
  "program": {
    "id": "fat-loss",
    "title": "Fat Loss",
    "price": 24999,
    "currency": "INR",
    "source": "coach_checkout",
    "discountPercent": 15,
    "netPayable": 25123.99,
    "expiresAt": "2026-08-18T12:00:00.000Z",
    "transactionId": "<transactionId>"
  },
  "offer": {
    "source": "coach_checkout",
    "productType": "program",
    "itemId": "fat-loss",
    "itemName": "Fat Loss",
    "amount": 24999,
    "discountPercent": 15,
    "discountLabel": "festive",
    "netPayable": 25123.99,
    "linkValidity": "24 hours",
    "expiresAt": "2026-08-18T12:00:00.000Z",
    "appHealValidity": null,
    "transactionId": "<transactionId>",
    "payable": true
  },
  "programPurchased": false,
  "programPurchasedAt": null
}
```

If there is no offer, the previous catalog-assignment payload is returned (`program` from `UserProgram`, `offer: null`). Expired offers are omitted.

### `POST /api/user/program/preview`

Uses the pending offer transaction's discounted/tax amounts when a coach offer is active. `data.source` is `"coach_checkout"`. An expired offer returns `400` with `"This payment link has expired"`.

### `POST /api/user/program/order`

Reuses the existing pending Razorpay/mock order while the link is valid (`data.payment.reusedPendingOrder: true`). Body: `{ "paymentMethod": "upi" }` (optional).

### `POST /api/user/program/verify`

```json
{
  "transactionId": "<transactionId>",
  "razorpay_order_id": "<orderId>",
  "razorpay_payment_id": "<paymentId>",
  "razorpay_signature": "<signature>"
}
```

On success the transaction is `paid`, `user.programPurchased` is set, and `pendingCoachCheckout` is cleared.

### Development mock

```env
NODE_ENV=development
MOCK_PAYMENTS=true
AUTO_CONFIRM_MOCK_PAYMENT=false
```

Verify with the mock order id from `/order` (`order_mock_...`).
