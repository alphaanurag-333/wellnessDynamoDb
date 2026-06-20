# Consultancy Payment & Meeting Scheduling

End-to-end consultancy checkout: pricing, Razorpay/mock payment, meeting assignment, Zoom, WhatsApp, PDF invoice, and portal visibility.

## User flow (mobile)

1. `GET /api/user/consultancy-payment/checkout-preview?referralCode=OPTIONAL`
2. `POST /api/user/consultancy-payment/orders` — body must include `healthConcernId` (active health concern UUID)
3. Client completes payment (Razorpay or mock in dev)
4. `POST /api/user/consultancy-payment/verify`
5. `GET /api/user/consultancy-payment/transactions`

In development, mock payments may auto-confirm when `AUTO_CONFIRM_MOCK_PAYMENT` is not `false`.

## Transaction fields

Each `ConsultancyTransaction` stores `healthConcernId` and `healthConcernSnapshot` (title/description at checkout). The user's `primaryHealthConcern` is updated when the order is created.

## Pricing

- Base amount from app config `consultancy_amount`
- Referral discount (`referral_discount`) when code is valid
- Tax from `tax_type` / `tax_value` (exclusive or inclusive)

## Meeting assignee

| Referral code | Meeting with | Visible to |
|---------------|--------------|------------|
| None | Admin | Admin only |
| Coach code | That coach | Coach |
| Assistant code | That assistant | Assistant + parent coach |
| Heal user code | Referrer's owning coach | Owning coach |

## Post-payment (failures are non-blocking)

1. Convert Seek → Heal (if needed)
2. Create Zoom meeting
3. WhatsApp notifications
4. PDF invoice → S3
5. Transaction status → `paid`

## APIs by portal

| Portal | Base path |
|--------|-----------|
| User | `/api/user/consultancy-payment` |
| Admin | `/api/admin/consultancy` |
| Coach | `/api/coach/consultancy` |
| Assistant | `/api/assistant/consultancy` |

Coach and assistant lists are **scoped** — only transactions/users related to that account.

## Configuration

**App config:** `consultancy_amount`, `tax_type`, `tax_value`, `referral_discount`, Razorpay gateway keys.

**Environment:**

```
MOCK_PAYMENTS=true
AUTO_CONFIRM_MOCK_PAYMENT=false   # optional; dev auto-complete
ZOOM_ACCOUNT_ID= ...
WHATSAPP_PHONE_NUMBER_ID= ...
WHATSAPP_ACCESS_TOKEN= ...
```

## DynamoDB

Table: `ConsultancyTransaction` — `npm run table:consultancy-transactions`

## Tests

```bash
node --test tests/consultancyPricing.test.js
```
