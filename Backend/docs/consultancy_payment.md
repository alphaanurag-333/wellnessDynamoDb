# Consultancy Payment & Meeting Scheduling

## Overview

End-to-end consultancy checkout for mobile users with Razorpay (or mock in dev), referral-based meeting assignment, Zoom meeting creation, WhatsApp notifications, PDF invoices, and admin/coach visibility.

## User flow (mobile API)

1. `GET /api/user/consultancy-payment/checkout-preview?referralCode=OPTIONAL`
2. `POST /api/user/consultancy-payment/orders` — creates pending transaction + payment order
3. Client completes payment (Razorpay UPI / Net Banking)
4. `POST /api/user/consultancy-payment/verify` — verifies signature and runs post-payment logic
5. `GET /api/user/consultancy-payment/transactions` — user history

### Pricing formula

- **Exclusive tax:** `total = (base - discount) + tax% of (base - discount)`
- **Inclusive tax:** `total = base - discount` (tax shown as extracted amount on invoice)
- Discount applies only when referral code is **valid** (exists in `ReferralCode` table)

## Meeting assignee (`resolveMeetingAssignee`)

| Referral code | Meeting with | Parent coach visibility |
|---------------|--------------|-------------------------|
| None | Admin | — |
| Coach code | That coach | Coach |
| Assistant code | That assistant | Assistant + parent coach |
| User (Heal) code | Referrer's owning coach | Owning coach |

## Post-payment (non-blocking failures)

On successful payment verification:

1. Convert Seek → Heal (if not already Heal), using checkout referral code
2. Create Zoom meeting (mock link in dev if Zoom not configured)
3. Send WhatsApp to user + assignee (+ parent coach for assistant bookings)
4. Generate PDF invoice → S3 `invoices/`
5. Mark transaction `paid`

WhatsApp/Zoom failures are logged but **do not** block transaction recording.

## Admin APIs (`protectAdmin`)

- `GET /api/admin/consultancy/transactions` — filter by status, referral, coach, date, search
- `GET /api/admin/consultancy/transactions/:id`
- `GET /api/admin/consultancy/transactions/:id/invoice`
- `GET /api/admin/consultancy/enrolled-users`

## Coach APIs (`protectWellnessCoach`)

- `GET /api/coach/consultancy/transactions`
- `GET /api/coach/consultancy/transactions/:id`

## Configuration

### App config (Pricing tab)

- `consultancy_amount`, `tax_type`, `tax_value`, `referral_discount`
- Payment gateways: Razorpay `key_id` + `key_secret` (active)

### Environment variables

```
MOCK_PAYMENTS=true          # force mock gateway
ZOOM_ACCOUNT_ID=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
ZOOM_USER_ID=me
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
```

Without Razorpay credentials, dev uses **mock payments** automatically.

## DynamoDB

Table: `ConsultancyTransaction` — run `npm run table:consultancy-transactions`

## Admin UI

- `/admin/consultancy/transactions`
- `/admin/consultancy/enrolled-users`
