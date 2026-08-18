/**
 * Generates Wellness-User-Flow-API.postman_collection.json
 * Run: node Backend/postman/buildUserFlowCollection.js
 */
const fs = require("fs");
const path = require("path");

const COLLECTION_AUTH_SCRIPT = `
try {
  const json = pm.response.json();
  if (json.accessToken) {
    pm.collectionVariables.set("accessToken", json.accessToken);
    if (json.refreshToken) pm.collectionVariables.set("refreshToken", json.refreshToken);
  }
  if (json.user?.id) pm.collectionVariables.set("userId", json.user.id);
} catch (e) {}
`.trim();

const SAVE_HEALTH_CONCERN_SCRIPT = `
try {
  const json = pm.response.json();
  const items = json.data || json.healthConcerns || json.concerns || [];
  if (Array.isArray(items) && items[0]?.id) {
    pm.collectionVariables.set("healthConcernId", items[0].id);
  }
} catch (e) {}
`.trim();

const SAVE_CONSULTANCY_ORDER_SCRIPT = `
try {
  const json = pm.response.json();
  const txn = json.data?.transaction;
  const orderId = json.data?.payment?.orderId || json.data?.payment?.id;
  if (txn?.id) pm.collectionVariables.set("consultancyTransactionId", txn.id);
  if (orderId) pm.collectionVariables.set("razorpay_order_id", orderId);
} catch (e) {}
`.trim();

const SAVE_SUBSCRIPTION_ORDER_SCRIPT = `
try {
  const json = pm.response.json();
  const txn = json.data?.transaction;
  const orderId = json.data?.payment?.orderId || json.data?.payment?.id;
  if (txn?.id) pm.collectionVariables.set("subscriptionTransactionId", txn.id);
  if (orderId) pm.collectionVariables.set("razorpay_order_id", orderId);
} catch (e) {}
`.trim();

const SAVE_EE_ORDER_SCRIPT = `
try {
  const json = pm.response.json();
  const txn = json.data?.transaction;
  const orderId = json.data?.payment?.orderId || json.data?.payment?.id;
  if (txn?.id) pm.collectionVariables.set("energyExchangeTransactionId", txn.id);
  if (orderId) pm.collectionVariables.set("razorpay_order_id", orderId);
} catch (e) {}
`.trim();

const SAVE_PROGRAM_ORDER_SCRIPT = `
try {
  const json = pm.response.json();
  const txn = json.data?.transaction;
  const orderId = json.data?.payment?.orderId || json.data?.payment?.id;
  if (txn?.id) pm.collectionVariables.set("programTransactionId", txn.id);
  if (orderId) pm.collectionVariables.set("razorpay_order_id", orderId);
} catch (e) {}
`.trim();

const VERIFY_PAYMENT_BODY = `{
  "transactionId": "{{transactionId}}",
  "razorpay_order_id": "{{razorpay_order_id}}",
  "razorpay_payment_id": "pay_mock_dev",
  "razorpay_signature": "mock"
}`;

function bearerAuth() {
  return {
    type: "bearer",
    bearer: [{ key: "token", value: "{{accessToken}}", type: "string" }],
  };
}

function jsonRequest(name, method, urlPath, body, tests, description) {
  const item = {
    name,
    request: {
      method,
      header: [{ key: "Content-Type", value: "application/json" }],
      url: `{{baseUrl}}${urlPath}`,
      description: description || "",
    },
  };
  if (body) {
    item.request.body = { mode: "raw", raw: body };
  }
  if (tests) {
    item.event = [{ listen: "test", script: { type: "text/javascript", exec: tests.split("\n") } }];
  }
  return item;
}

function authRequest(name, method, urlPath, body, tests, description) {
  const item = jsonRequest(name, method, urlPath, body, tests, description);
  item.request.auth = bearerAuth();
  return item;
}

const collection = {
  info: {
    _postman_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    name: "Wellness User App — Complete Flow",
    description:
      "User App API collection organized by onboarding flow:\n\n**Seek → PWC → Zoom Call → Energy Exchange → Client Payment → Profile Settings**\n\n## Flow overview\n1. **Seek** — Register with health concern + optional referral code (WC/AWC assignment)\n2. **PWC** — Consultancy payment (application subscription by health concern)\n3. **Zoom Call** — Zoom link created after consultancy payment; view via transaction detail\n4. **Heal Subscription** — Full Heal tier unlock (required for most wellness features)\n5. **Energy Exchange** — Coach enables program; user previews, orders, and pays\n6. **Client Payment** — Coach-triggered App Program checkout (optional)\n7. **Paid Onboarding** — Post-subscription profile setup\n8. **Profile Settings** — Update profile, phone, WhatsApp\n\n## Setup\n- Import `Wellness-API.postman_environment.json`\n- Set `baseUrl` (default: `http://localhost:5000/api`)\n- For dev payments: `MOCK_PAYMENTS=true` in backend `.env`\n\n## Auth\nUser auth endpoints auto-save `accessToken` and `refreshToken` to collection variables.\n\n## Staff prerequisites (folder A)\nSome steps require coach/admin actions (enable Energy Exchange, trigger program checkout, assign coach). Use folder **A - Staff Prerequisites** when testing end-to-end.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    { key: "baseUrl", value: "http://localhost:5000/api" },
    { key: "accessToken", value: "" },
    { key: "refreshToken", value: "" },
    { key: "userId", value: "" },
    { key: "healthConcernId", value: "" },
    { key: "referralCode", value: "" },
    { key: "razorpay_order_id", value: "" },
    { key: "consultancyTransactionId", value: "" },
    { key: "subscriptionTransactionId", value: "" },
    { key: "energyExchangeTransactionId", value: "" },
    { key: "programTransactionId", value: "" },
    { key: "energyExchangeProgramId", value: "" },
    { key: "coachToken", value: "" },
    { key: "adminToken", value: "" },
    { key: "testPhone", value: "9876543210" },
    { key: "testEmail", value: "user@example.com" },
    { key: "testPassword", value: "Test@1234" },
    { key: "registrationOtp", value: "123456" },
  ],
  item: [
    {
      name: "00 - Public (Pre-login)",
      description: "Catalog data needed before registration and checkout.",
      item: [
        jsonRequest("Health Check", "GET", "/health", null, null, "Server health check."),
        jsonRequest("App Config", "GET", "/public/app-config", null, null, "App configuration and pricing."),
        jsonRequest(
          "List Health Concerns",
          "GET",
          "/public/misc/health-concerns",
          null,
          SAVE_HEALTH_CONCERN_SCRIPT,
          "Active health concerns for registration and consultancy checkout. Auto-saves first concern ID."
        ),
        jsonRequest(
          "Validate Referral Code",
          "GET",
          "/public/misc/referral/validate?referralCode={{referralCode}}",
          null,
          null,
          "Validate WC/AWC/user referral code before registration or checkout."
        ),
        jsonRequest("List Wellness Coaches", "GET", "/public/misc/wellness-coaches", null, null, "Public WC directory."),
        jsonRequest(
          "List Assistant Wellness Coaches",
          "GET",
          "/public/misc/assistant-wellness-coaches",
          null,
          null,
          "Public AWC directory."
        ),
      ],
    },
    {
      name: "01 - Seek (Registration & Login)",
      description:
        "Free-tier user registration. Optional `referralCode` assigns WC/AWC at registration. `primaryHealthConcern` is required.",
      item: [
        jsonRequest(
          "Send Registration OTP",
          "POST",
          "/user/auth/register/otp/send",
          `{
  "email": "{{testEmail}}",
  "phone": "{{testPhone}}",
  "phoneCountryCode": "+91",
  "whatsappSameAsMobile": true
}`,
          null,
          "Sends OTP to WhatsApp. In dev with EXPOSE_OTP_IN_RESPONSE=true, OTP is in response as debugOtp."
        ),
        jsonRequest(
          "Register User",
          "POST",
          "/user/auth/register",
          `{
  "otp": "{{registrationOtp}}",
  "name": "Test User",
  "email": "{{testEmail}}",
  "phone": "{{testPhone}}",
  "phoneCountryCode": "+91",
  "primaryHealthConcern": "{{healthConcernId}}",
  "termsAccepted": true,
  "password": "{{testPassword}}",
  "referralCode": "{{referralCode}}",
  "whatsappSameAsMobile": true,
  "fcm_id": "test-fcm-token"
}`,
          COLLECTION_AUTH_SCRIPT,
          "Creates Seek-tier account. Saves accessToken. referralCode optional for WC/AWC assignment."
        ),
        jsonRequest(
          "Login (Password)",
          "POST",
          "/user/auth/login/password",
          `{
  "phone": "{{testPhone}}",
  "phoneCountryCode": "+91",
  "password": "{{testPassword}}"
}`,
          COLLECTION_AUTH_SCRIPT,
          "Password login for returning users."
        ),
        jsonRequest(
          "Send Login OTP",
          "POST",
          "/user/auth/otp/send",
          `{
  "phone": "{{testPhone}}",
  "phoneCountryCode": "+91"
}`,
          null,
          "Send OTP for OTP-based login."
        ),
        jsonRequest(
          "Verify Login OTP",
          "POST",
          "/user/auth/otp/verify",
          `{
  "phone": "{{testPhone}}",
  "phoneCountryCode": "+91",
  "otp": "{{registrationOtp}}"
}`,
          COLLECTION_AUTH_SCRIPT,
          "Verify OTP login."
        ),
        jsonRequest(
          "Refresh Token",
          "POST",
          "/user/auth/refresh-token",
          `{
  "refreshToken": "{{refreshToken}}"
}`,
          COLLECTION_AUTH_SCRIPT,
          "Refresh access token."
        ),
      ],
    },
    {
      name: "02 - PWC (Consultancy / Application Subscription)",
      description:
        "Seek-to-Heal consultancy payment. User selects health concern, pays consultancy fee. On success: tier becomes consultancy_only, WC/AWC assigned (via referral or pending_admin), Zoom meeting created.",
      item: [
        authRequest(
          "Checkout Preview",
          "GET",
          "/user/consultancy-payment/checkout-preview?referralCode={{referralCode}}",
          null,
          null,
          "Preview pricing with optional referral discount."
        ),
        authRequest(
          "Create Consultancy Order",
          "POST",
          "/user/consultancy-payment/orders",
          `{
  "healthConcernId": "{{healthConcernId}}",
  "referralCode": "{{referralCode}}",
  "paymentMethod": "upi"
}`,
          SAVE_CONSULTANCY_ORDER_SCRIPT,
          "Creates Razorpay/mock order. Saves consultancyTransactionId and razorpay_order_id."
        ),
        authRequest(
          "Verify Consultancy Payment",
          "POST",
          "/user/consultancy-payment/verify",
          `{
  "transactionId": "{{consultancyTransactionId}}",
  "razorpay_order_id": "{{razorpay_order_id}}",
  "razorpay_payment_id": "pay_mock_dev",
  "razorpay_signature": "mock"
}`,
          null,
          "Verify payment. User tier → consultancy_only. Zoom meeting scheduled."
        ),
        authRequest(
          "List My Consultancy Transactions",
          "GET",
          "/user/consultancy-payment/transactions",
          null,
          null,
          "List all consultancy transactions."
        ),
        authRequest(
          "Get Consultancy Transaction Detail",
          "GET",
          "/user/consultancy-payment/transactions/{{consultancyTransactionId}}",
          null,
          null,
          "Transaction detail including zoomMeetingLink."
        ),
        authRequest(
          "Download Consultancy Invoice",
          "GET",
          "/user/consultancy-payment/transactions/{{consultancyTransactionId}}/invoice",
          null,
          null,
          "PDF invoice download."
        ),
      ],
    },
    {
      name: "03 - WC/AWC Assignment (View)",
      description:
        "Coach assignment happens automatically at registration (referral code) or consultancy payment. Admin can also assign via staff APIs. User views assignment via profile.",
      item: [
        authRequest(
          "Get My Profile (coach assignment)",
          "GET",
          "/user/auth/me",
          null,
          null,
          "Check assignedCoachId, assignedCoachType, parentCoachId, assignmentStatus, userTier."
        ),
        authRequest(
          "Get Coach Insight",
          "GET",
          "/user/coach-insight",
          null,
          null,
          "Coach notes/insights for Heal-tier users."
        ),
      ],
    },
    {
      name: "04 - Zoom Call",
      description:
        "After consultancy payment, a Zoom meeting is auto-created. Join URL is in the consultancy transaction. Heal consultancy tracks available after Heal subscription.",
      item: [
        authRequest(
          "Get Zoom Meeting Link (via transaction)",
          "GET",
          "/user/consultancy-payment/transactions/{{consultancyTransactionId}}",
          null,
          null,
          "Response includes zoomMeetingLink and zoomMeetingId on paid transactions."
        ),
        authRequest(
          "Request Consultancy Session (Heal tier)",
          "POST",
          "/user/heal-consultancy-tracks",
          `{
  "concern": "Follow-up consultation",
  "scheduledAt": "2026-08-20T10:00:00.000Z"
}`,
          null,
          "Request a consultancy track session. Requires Heal tier."
        ),
        authRequest(
          "List My Consultancy Tracks",
          "GET",
          "/user/heal-consultancy-tracks",
          null,
          null,
          "List consultancy booking tracks. Requires Heal tier."
        ),
      ],
    },
    {
      name: "05 - Heal Subscription (Full Access)",
      description:
        "After consultancy (PWC), user upgrades to full Heal tier. Required to unlock most wellness features.",
      item: [
        authRequest(
          "Subscription Checkout Preview",
          "GET",
          "/user/subscription-payment/checkout-preview",
          null,
          null,
          "Requires consultancy_only tier."
        ),
        authRequest(
          "Create Subscription Order",
          "POST",
          "/user/subscription-payment/orders",
          `{
  "paymentMethod": "upi"
}`,
          SAVE_SUBSCRIPTION_ORDER_SCRIPT,
          "Creates subscription order. Saves subscriptionTransactionId."
        ),
        authRequest(
          "Verify Subscription Payment",
          "POST",
          "/user/subscription-payment/verify",
          `{
  "transactionId": "{{subscriptionTransactionId}}",
  "razorpay_order_id": "{{razorpay_order_id}}",
  "razorpay_payment_id": "pay_mock_dev",
  "razorpay_signature": "mock"
}`,
          null,
          "Verify payment. User tier → heal."
        ),
        authRequest(
          "List Subscription Transactions",
          "GET",
          "/user/subscription-payment/transactions",
          null,
          null,
          "List subscription payment history."
        ),
        authRequest(
          "Get Subscription Transaction",
          "GET",
          "/user/subscription-payment/transactions/{{subscriptionTransactionId}}",
          null,
          null,
          "Subscription transaction detail."
        ),
      ],
    },
    {
      name: "06 - Energy Exchange Program",
      description:
        "WC enables Energy Exchange program for client (see Staff Prerequisites). User previews FY plans, creates order, and pays.",
      item: [
        authRequest(
          "Get Energy Exchange Program",
          "GET",
          "/user/energy-exchange/program",
          null,
          null,
          "Current EE program config for user. enabled=false until coach enables."
        ),
        authRequest(
          "List FY Plans",
          "GET",
          "/user/energy-exchange/plans",
          null,
          null,
          "Financial year plans and pricing."
        ),
        authRequest(
          "Preview Energy Exchange Checkout",
          "POST",
          "/user/energy-exchange/preview",
          `{
  "fyStartYears": [2025]
}`,
          null,
          "Preview selected FY years pricing."
        ),
        authRequest(
          "Create Energy Exchange Order",
          "POST",
          "/user/energy-exchange/order",
          `{
  "fyStartYears": [2025],
  "paymentMethod": "upi"
}`,
          SAVE_EE_ORDER_SCRIPT,
          "Creates EE payment order."
        ),
        authRequest(
          "Verify Energy Exchange Payment",
          "POST",
          "/user/energy-exchange/verify",
          `{
  "transactionId": "{{energyExchangeTransactionId}}",
  "razorpay_order_id": "{{razorpay_order_id}}",
  "razorpay_payment_id": "pay_mock_dev",
  "razorpay_signature": "mock"
}`,
          null,
          "Verify EE payment."
        ),
        authRequest(
          "List Energy Exchange Subscriptions",
          "GET",
          "/user/energy-exchange/subscriptions",
          null,
          null,
          "Active/queued/expired EE subscriptions."
        ),
      ],
    },
    {
      name: "07 - Client Payment (Coach Program Checkout)",
      description:
        "After WC discussion, coach triggers App Program payment link. User pays via /user/program endpoints.",
      item: [
        authRequest(
          "Get Assigned Program / Coach Offer",
          "GET",
          "/user/program",
          null,
          null,
          "Returns coach-triggered program offer or assigned program."
        ),
        authRequest(
          "Preview Program Checkout",
          "POST",
          "/user/program/preview",
          "{}",
          null,
          "Preview coach-triggered program pricing."
        ),
        authRequest(
          "Create Program Order",
          "POST",
          "/user/program/order",
          `{
  "paymentMethod": "upi"
}`,
          SAVE_PROGRAM_ORDER_SCRIPT,
          "Creates program payment order."
        ),
        authRequest(
          "Verify Program Payment",
          "POST",
          "/user/program/verify",
          `{
  "transactionId": "{{programTransactionId}}",
  "razorpay_order_id": "{{razorpay_order_id}}",
  "razorpay_payment_id": "pay_mock_dev",
  "razorpay_signature": "mock"
}`,
          null,
          "Verify program payment. Sets programPurchased=true."
        ),
      ],
    },
    {
      name: "08 - Paid Onboarding",
      description: "Post-Heal subscription onboarding steps.",
      item: [
        authRequest("Get Onboarding State", "GET", "/user/paid-onboarding/state", null, null, "Current onboarding step."),
        authRequest(
          "Submit Onboarding Profile",
          "POST",
          "/user/paid-onboarding/profile",
          `{
  "dietaryPreference": "vegetarian",
  "wellnessJourney": "weight_loss"
}`,
          null,
          "Profile step during pending onboarding."
        ),
        authRequest(
          "Submit Body Measurements",
          "POST",
          "/user/paid-onboarding/body-measurements",
          `{
  "heightCm": 170,
  "weightKg": 72
}`,
          null,
          "Body measurements. Requires Heal tier."
        ),
        authRequest(
          "Get Medical Questions",
          "GET",
          "/user/paid-onboarding/medical-questions",
          null,
          null,
          "Medical condition questions."
        ),
        authRequest(
          "Submit Medical Conditions",
          "POST",
          "/user/paid-onboarding/medical-conditions",
          `{
  "answers": []
}`,
          null,
          "Submit medical condition answers."
        ),
        authRequest("List Progress Photos", "GET", "/user/paid-onboarding/progress-photos", null, null, "Progress photos."),
        authRequest(
          "Complete Launch",
          "POST",
          "/user/paid-onboarding/launch/complete",
          "{}",
          null,
          "Complete paid onboarding launch."
        ),
      ],
    },
    {
      name: "09 - Profile Settings",
      description: "Update user profile, phone, and WhatsApp.",
      item: [
        authRequest("Get Profile", "GET", "/user/auth/me", null, null, "Full enriched profile."),
        authRequest(
          "Update Profile",
          "PATCH",
          "/user/auth/me",
          `{
  "name": "Updated Name",
  "dob": "1990-01-15",
  "gender": "female",
  "country": "India",
  "state": "Maharashtra",
  "city": "Mumbai"
}`,
          null,
          "Update profile fields. Use multipart for profile photo."
        ),
        authRequest(
          "Send Phone Change OTP",
          "POST",
          "/user/auth/profile/phone/otp/send",
          `{
  "phone": "9876543211",
  "phoneCountryCode": "+91"
}`,
          null,
          "Start phone number change."
        ),
        authRequest(
          "Verify Phone Change OTP",
          "POST",
          "/user/auth/profile/phone/otp/verify",
          `{
  "phone": "9876543211",
  "phoneCountryCode": "+91",
  "otp": "{{registrationOtp}}"
}`,
          null,
          "Complete phone change."
        ),
        authRequest(
          "Send WhatsApp Change OTP",
          "POST",
          "/user/auth/profile/whatsapp/otp/send",
          `{
  "whatsappPhone": "9876543211",
  "whatsappCountryCode": "+91"
}`,
          null,
          "Start WhatsApp number change."
        ),
        authRequest(
          "Verify WhatsApp Change OTP",
          "POST",
          "/user/auth/profile/whatsapp/otp/verify",
          `{
  "whatsappPhone": "9876543211",
  "whatsappCountryCode": "+91",
  "otp": "{{registrationOtp}}"
}`,
          null,
          "Complete WhatsApp change."
        ),
      ],
    },
    {
      name: "10 - Heal Features (Post-unlock)",
      description: "Sample Heal-tier feature APIs available after subscription.",
      item: [
        authRequest("Water Tracking Today", "GET", "/user/water-tracking", null, null, "Today's water intake."),
        authRequest("Steps Tracking Today", "GET", "/user/steps-tracking", null, null, "Today's steps."),
        authRequest("Assigned Diet Plans", "GET", "/user/diet-plans/assigned", null, null, "Coach-assigned diet plans."),
        authRequest("Assigned Physical Exercises", "GET", "/user/physical-exercises/assigned", null, null, "Assigned exercises."),
        authRequest("Assigned Mental Wellbeing", "GET", "/user/mental-wellbeing/assigned", null, null, "Mental wellbeing content."),
        authRequest("Wellness Prescriptions", "GET", "/user/wellness-prescriptions", null, null, "Wellness prescriptions."),
        authRequest("Supplement Recommendations", "GET", "/user/supplements/recommendations", null, null, "Supplement recommendations."),
        authRequest("Metabolic Profile", "GET", "/user/metabolic-metrics/profile", null, null, "Metabolic health profile."),
        authRequest("Health Progress Settings", "GET", "/user/health-progress/settings", null, null, "Health progress feature flags."),
        authRequest("Daily Reflection", "GET", "/user/daily-reflection", null, null, "Today's daily reflection."),
        authRequest("Notifications", "GET", "/user/notifications", null, null, "User notifications."),
        authRequest("Unread Notification Count", "GET", "/user/notifications/unread-count", null, null, "Unread count."),
      ],
    },
    {
      name: "A - Staff Prerequisites (Testing)",
      description:
        "Staff/coach APIs needed to complete the user flow during testing. Use Account auth (not legacy /admin/auth).",
      item: [
        jsonRequest(
          "Staff Login (Coach)",
          "POST",
          "/account/auth/login",
          `{
  "email": "coach@example.com",
  "password": "your-password",
  "activeRole": "wellness_coach"
}`,
          `
try {
  const json = pm.response.json();
  if (json.accessToken) pm.collectionVariables.set("coachToken", json.accessToken);
} catch (e) {}
`.trim(),
          "Coach login. Saves coachToken."
        ),
        jsonRequest(
          "Staff Login (Admin)",
          "POST",
          "/account/auth/login",
          `{
  "email": "admin@example.com",
  "password": "your-password",
  "activeRole": "admin"
}`,
          `
try {
  const json = pm.response.json();
  if (json.accessToken) pm.collectionVariables.set("adminToken", json.accessToken);
} catch (e) {}
`.trim(),
          "Admin login. Saves adminToken."
        ),
        {
          name: "Admin Assign Coach to User",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{adminToken}}", type: "string" }],
            },
            body: {
              mode: "raw",
              raw: `{
  "coachId": "WELLNESS_COACH_UUID",
  "coachType": "wellness_coach"
}`,
            },
            url: "{{baseUrl}}/admin/users/{{userId}}/assign-coach",
            description: "Assign WC when user has pending_admin assignment status.",
          },
        },
        {
          name: "Coach List EE Programs for User",
          request: {
            method: "GET",
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{coachToken}}", type: "string" }],
            },
            url: "{{baseUrl}}/coach/energy-exchange/programs?userId={{userId}}",
            description: "List Energy Exchange programs for a client.",
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "try {",
                  "  const json = pm.response.json();",
                  "  if (json.programs?.[0]?.id) pm.collectionVariables.set('energyExchangeProgramId', json.programs[0].id);",
                  "} catch (e) {}",
                ],
              },
            },
          ],
        },
        {
          name: "Coach Create Energy Exchange Program",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{coachToken}}", type: "string" }],
            },
            body: {
              mode: "raw",
              raw: `{
  "userId": "{{userId}}"
}`,
            },
            url: "{{baseUrl}}/coach/energy-exchange/programs",
            description: "Create EE program for client after Zoom consultation.",
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "try {",
                  "  const json = pm.response.json();",
                  "  const id = json.program?.id || json.data?.program?.id;",
                  "  if (id) pm.collectionVariables.set('energyExchangeProgramId', id);",
                  "} catch (e) {}",
                ],
              },
            },
          ],
        },
        {
          name: "Coach Enable Energy Exchange Program",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{coachToken}}", type: "string" }],
            },
            url: "{{baseUrl}}/coach/energy-exchange/programs/{{energyExchangeProgramId}}/enable",
            description: "Enable EE program for client. Run Create or List first to set energyExchangeProgramId.",
          },
        },
        {
          name: "Coach Trigger Program Checkout",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{coachToken}}", type: "string" }],
            },
            body: {
              mode: "raw",
              raw: `{
  "userId": "{{userId}}",
  "productType": "program",
  "itemId": "fat-loss",
  "discountPercent": 15,
  "discountLabel": "festive",
  "linkValidity": "24 hours"
}`,
            },
            url: "{{baseUrl}}/account/coach-checkout/trigger",
            description: "Coach triggers App Program payment link for client.",
          },
        },
        {
          name: "Coach Trigger Subscription Checkout",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{coachToken}}", type: "string" }],
            },
            body: {
              mode: "raw",
              raw: `{
  "userId": "{{userId}}",
  "productType": "subscription",
  "discountPercent": 0,
  "linkValidity": "24 hours"
}`,
            },
            url: "{{baseUrl}}/account/coach-checkout/trigger",
            description: "Coach triggers Heal subscription payment for client.",
          },
        },
      ],
    },
  ],
};

const outPath = path.join(__dirname, "Wellness-User-Flow-API.postman_collection.json");
fs.writeFileSync(outPath, JSON.stringify(collection, null, 2));
console.log("Wrote", outPath);
