/**
 * Builds Wellness-Seed-User-Data-for-Admin.postman_collection.json
 * Run: node postman/buildSeedUserDataCollection.js
 */
const fs = require("fs");
const path = require("path");

function bearer(tokenVar) {
  return {
    type: "bearer",
    bearer: [{ key: "token", value: `{{${tokenVar}}}`, type: "string" }],
  };
}

function jsonBody(raw) {
  return {
    mode: "raw",
    raw: typeof raw === "string" ? raw : JSON.stringify(raw, null, 2),
    options: { raw: { language: "json" } },
  };
}

function formdata(fields) {
  return { mode: "formdata", formdata: fields };
}

function tests(lines) {
  return [
    {
      listen: "test",
      script: { type: "text/javascript", exec: lines },
    },
  ];
}

function withQuery(path, query) {
  if (!query || !query.length) return `{{baseUrl}}${path}`;
  const qs = query
    .filter((q) => q && q.disabled !== true)
    .map((q) => `${encodeURIComponent(q.key)}=${q.value}`)
    .join("&");
  return `{{baseUrl}}${path}?${qs}`;
}

function item({ name, method, path: p, auth, body, description, event, query, header, formdata: fd }) {
  const headers = header || [];
  const req = {
    name,
    request: {
      auth: auth === "none" ? { type: "noauth" } : auth ? bearer(auth) : { type: "inherit" },
      method,
      header: body && !fd ? [{ key: "Content-Type", value: "application/json" }, ...headers] : headers,
      url: withQuery(p, query),
    },
    response: [],
  };
  if (description) req.request.description = description;
  if (fd) req.request.body = formdata(fd);
  else if (body !== undefined) req.request.body = jsonBody(body);
  if (event) req.event = event;
  return req;
}

function folder(name, description, children) {
  return { name, description, item: children };
}

const captureUserAuth = tests([
  "const json = pm.response.json();",
  "if (json.debugOtp) pm.collectionVariables.set('userOtp', String(json.debugOtp));",
  "const token = json.accessToken || json.data?.accessToken;",
  "const refresh = json.refreshToken || json.data?.refreshToken;",
  "const user = json.user || json.data?.user || {};",
  "if (token) pm.collectionVariables.set('accessToken', token);",
  "if (refresh) pm.collectionVariables.set('refreshToken', refresh);",
  "const id = user.id || user._id || json.userId;",
  "if (id) pm.collectionVariables.set('userId', String(id));",
]);

const captureAdminAuth = tests([
  "if (pm.response.code !== 200) return;",
  "const json = pm.response.json();",
  "const token = json.accessToken || json.data?.accessToken;",
  "const refresh = json.refreshToken || json.data?.refreshToken;",
  "if (token) {",
  "  pm.collectionVariables.set('adminToken', token);",
  "  pm.environment.set('adminToken', token);",
  "}",
  "if (refresh) {",
  "  pm.collectionVariables.set('adminRefreshToken', refresh);",
  "  pm.environment.set('adminRefreshToken', refresh);",
  "}",
]);

const captureUserId = tests([
  "const json = pm.response.json();",
  "const user = json.user || json.data?.user || {};",
  "const id = user.id || user._id;",
  "if (id) pm.collectionVariables.set('userId', String(id));",
]);

const collection = {
  info: {
    _postman_id: "wellness-seed-user-data-for-admin",
    name: "Wellness Dynamo — Seed User Data for Admin",
    description: [
      "Feed one example client through Postman (no mobile app) so the Admin client profile has live data.",
      "",
      "Import this collection **and** `Wellness-API.postman_environment.json`. Select **Wellness API — Local**.",
      "",
      "**Run order (folder 0 → 9).** Tokens and IDs are saved automatically.",
      "",
      "### Example client (matches Admin Personal Details)",
      "- Name: Madhupriya Postman",
      "- Email: `{{userEmail}}` (default `postman.madhupriya@example.com`)",
      "- Phone: `+91 9000010000`",
      "- DOB: 12 Mar 1991",
      "- Gender: female",
      "- Address: Flat 101, Green Meadows, Baner Road, Pune, Maharashtra 411000",
      "- Dietary preference: vegetarian",
      "- Wellness journey for: self",
      "- Primary concern: Fat Loss (captured from public health-concerns)",
      "- Password: `User@12345`",
      "",
      "### Admin login (seeded staff)",
      "- Email: `admin@irwellness.local`",
      "- Password: `Admin@12345`",
      "- Requires `npm run seed:staff-accounts -- --confirm` in Backend.",
      "",
      "### What Admin actually shows from APIs",
      "Live: Users list, Personal Details, paid-onboarding status, At a Glance (metrics, metabolic snapshot, prakriti, lifestyle, supplements, weight).",
      "Still fixture/demo in Admin UI (data is still stored if you POST it): Body Analytics page, Internal Parameters page, Food page, BMS charts, Nutritions page, Health Progress page, Reflection page, Prescription, Presentable, Energy Exchange, Protocol, Gut Reset.",
      "",
      "Open the created user at `/users/{{userId}}` (UUID). Numeric `/users/1` is mock-only.",
      "",
      "Dev OTP: set `EXPOSE_OTP_IN_RESPONSE=true` so Send OTP responses include `debugOtp`.",
    ].join("\n"),
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  auth: bearer("accessToken"),
  variable: [
    { key: "baseUrl", value: "http://localhost:5000/api" },
    { key: "accessToken", value: "" },
    { key: "refreshToken", value: "" },
    { key: "adminToken", value: "" },
    { key: "adminRefreshToken", value: "" },
    { key: "adminEmail", value: "admin@irwellness.local" },
    { key: "adminPassword", value: "Admin@12345" },
    { key: "userId", value: "" },
    { key: "userName", value: "Madhupriya Postman" },
    { key: "userEmail", value: "postman.madhupriya@example.com" },
    { key: "userPhone", value: "9000010000" },
    { key: "userPhoneCountryCode", value: "+91" },
    { key: "userWhatsapp", value: "9000020000" },
    { key: "userPassword", value: "User@12345" },
    { key: "userOtp", value: "123456" },
    { key: "todayDate", value: "2026-08-17" },
    { key: "healthConcernId", value: "" },
    { key: "coachId", value: "" },
    { key: "supplementId", value: "" },
    { key: "launchFocusAreaId", value: "" },
    { key: "medicalAnswersJson", value: "[]" },
    { key: "mealLogId", value: "" },
    { key: "reminderId", value: "" },
    { key: "fcmId", value: "postman-sample-fcm-token" },
  ],
  item: [
    folder(
      "0. Health",
      "Confirm the API is running before seeding.",
      [
        item({
          name: "Server Health",
          method: "GET",
          path: "/health",
          auth: "none",
          description: "Expected `{ ok: true }`.",
        }),
      ]
    ),

    folder(
      "1. Catalog lookups (no auth)",
      "Capture IDs used later. Run Health Concerns and Supplements before register / dosage.",
      [
        item({
          name: "List Health Concerns",
          method: "GET",
          path: "/public/misc/health-concerns",
          auth: "none",
          query: [
            { key: "page", value: "1" },
            { key: "limit", value: "50" },
          ],
          description:
            "Saves `healthConcernId`. Prefers a concern titled Fat Loss (Admin example goal).",
          event: tests([
            "const json = pm.response.json();",
            "const list = json.healthConcerns || json.data?.healthConcerns || [];",
            "const fat = list.find((x) => /fat\\s*loss/i.test(String(x.title || '')));",
            "const pick = fat || list[0];",
            "if (pick) pm.collectionVariables.set('healthConcernId', String(pick.id || pick._id));",
          ]),
        }),
        item({
          name: "List Active Supplements",
          method: "GET",
          path: "/public/misc/supplements",
          auth: "none",
          description: "Saves `supplementId` for staff dosage assignment (At a Glance supplements).",
          event: tests([
            "const json = pm.response.json();",
            "const list = json.supplements || json.data?.supplements || json.data || [];",
            "const rows = Array.isArray(list) ? list : [];",
            "const pick = rows[0];",
            "if (pick) pm.collectionVariables.set('supplementId', String(pick.id || pick._id));",
          ]),
        }),
        item({
          name: "App Config",
          method: "GET",
          path: "/public/app-config",
          auth: "none",
        }),
        item({
          name: "Validate Referral Code (optional)",
          method: "GET",
          path: "/public/misc/referral/validate",
          auth: "none",
          query: [{ key: "code", value: "IRW-WC-001", description: "Staff referral, e.g. IRW-WC-NNN" }],
        }),
      ]
    ),

    folder(
      "2. Staff login (Admin)",
      "Uses `/account/auth` (legacy `/admin/auth` is removed). Saves `adminToken`.",
      [
        item({
          name: "Admin Login",
          method: "POST",
          path: "/account/auth/login",
          auth: "none",
          body: {
            email: "{{adminEmail}}",
            password: "{{adminPassword}}",
            activeRole: "admin",
          },
          description: "Example: admin@irwellness.local / Admin@12345 after staff seed.",
          event: captureAdminAuth,
        }),
        item({
          name: "Get Staff Me",
          method: "GET",
          path: "/account/auth/me",
          auth: "adminToken",
        }),
        item({
          name: "List Wellness Coaches",
          method: "GET",
          path: "/account/wellness-coaches",
          auth: "adminToken",
          query: [
            { key: "page", value: "1" },
            { key: "limit", value: "20" },
            { key: "status", value: "active" },
          ],
          description: "Saves `coachId` (first coach, prefers Anita).",
          event: tests([
            "const json = pm.response.json();",
            "const list = json.wellnessCoaches || [];",
            "const anita = list.find((x) => /anita/i.test(String(x.name || '')));",
            "const pick = anita || list[0];",
            "if (pick) pm.collectionVariables.set('coachId', String(pick.id || pick._id));",
          ]),
        }),
        item({
          name: "List Users (Admin)",
          method: "GET",
          path: "/account/users",
          auth: "adminToken",
          query: [
            { key: "page", value: "1" },
            { key: "limit", value: "20" },
            { key: "search", value: "{{userEmail}}" },
          ],
          description: "Same endpoint Admin Users page calls.",
        }),
      ]
    ),

    folder(
      "3. Register example user",
      "Creates a SEEK client. `primaryHealthConcern` is required. OTP is sent to WhatsApp/phone.",
      [
        item({
          name: "Send Registration OTP",
          method: "POST",
          path: "/user/auth/register/otp/send",
          auth: "none",
          body: {
            email: "{{userEmail}}",
            phone: "{{userPhone}}",
            phoneCountryCode: "{{userPhoneCountryCode}}",
            whatsappSameAsMobile: false,
            whatsappCountryCode: "+91",
            whatsappPhone: "{{userWhatsapp}}",
          },
          description:
            "Must use the same email + WhatsApp delivery number as Register. OTP is keyed by WhatsApp phone when whatsappSameAsMobile is false. In local/dev with EXPOSE_OTP_IN_RESPONSE=true, `debugOtp` is auto-saved to `userOtp`.",
          event: tests([
            "const json = pm.response.json();",
            "if (json.debugOtp) pm.collectionVariables.set('userOtp', String(json.debugOtp));",
            "if (!json.debugOtp) console.warn('No debugOtp — set EXPOSE_OTP_IN_RESPONSE=true or paste OTP into userOtp');",
          ]),
        }),
        item({
          name: "Register (full example JSON)",
          method: "POST",
          path: "/user/auth/register",
          auth: "none",
          body: {
            otp: "{{userOtp}}",
            name: "{{userName}}",
            email: "{{userEmail}}",
            phone: "{{userPhone}}",
            phoneCountryCode: "{{userPhoneCountryCode}}",
            password: "{{userPassword}}",
            gender: "female",
            dob: "1991-03-12",
            country: "India",
            state: "Maharashtra",
            city: "Pune",
            primaryHealthConcern: "{{healthConcernId}}",
            termsAccepted: true,
            whatsappSameAsMobile: false,
            whatsappCountryCode: "+91",
            whatsappPhone: "{{userWhatsapp}}",
            fcm_id: "{{fcmId}}",
          },
          description:
            "Register fields stored on User. Address / diet / journey are filled in paid-onboarding profile next. Gender values: male, female, other, boy, girl, guess.",
          event: captureUserAuth,
        }),
        item({
          name: "Login with Password (email)",
          method: "POST",
          path: "/user/auth/login/password",
          auth: "none",
          body: {
            email: "{{userEmail}}",
            password: "{{userPassword}}",
            fcm_id: "{{fcmId}}",
          },
          description: "Use if the user already exists.",
          event: captureUserAuth,
        }),
        item({
          name: "Get My Profile",
          method: "GET",
          path: "/user/auth/me",
          description: "Confirms tokens. Saves `userId`.",
          event: captureUserId,
        }),
      ]
    ),

    folder(
      "4. Convert to Heal + assign coach",
      "Heal tier is required for onboarding, meals, reflection, metabolic, health-progress. Assign a WC so meal logs and dosages have a coach hierarchy.",
      [
        item({
          name: "Convert User to Heal",
          method: "POST",
          path: "/account/users/{{userId}}/convert-to-heal",
          auth: "adminToken",
          body: {
            referralCode: "",
            catalogProgramId: "",
          },
          description:
            "Optional `referralCode` / `catalogProgramId`. After this, Admin list shows HEAL (Seek to Heal).",
          event: captureUserId,
        }),
        item({
          name: "Assign Wellness Coach",
          method: "POST",
          path: "/account/users/{{userId}}/assign-coach",
          auth: "adminToken",
          body: {
            assignedCoachId: "{{coachId}}",
            assignedCoachType: "wellness_coach",
          },
          description:
            "`assignedCoachType`: wellness_coach | assistant_wellness_coach. For AWC also send parentCoachId.",
          event: captureUserId,
        }),
        item({
          name: "Enable Health Progress features",
          method: "PATCH",
          path: "/account/heal-users/{{userId}}/health-progress-settings",
          auth: "adminToken",
          body: {
            weightPic: true,
            glucose: true,
            bloodPressure: true,
            menstrualCycle: true,
            conditionComparison: true,
          },
          description:
            "User POSTs to /user/health-progress/* are blocked until these flags are on. menstrualCycle only sticks for female users.",
        }),
        item({
          name: "Enable Daily Reflection activities",
          method: "PATCH",
          path: "/account/heal-users/{{userId}}/daily-reflection-settings",
          auth: "adminToken",
          body: {
            activities: {
              yogaNamaskar: { enabled: true, goal: 12 },
              suryaNamaskar: { enabled: true, goal: 12 },
              bhramari: { enabled: true, goal: 10 },
              meditation: { enabled: true, goal: 15 },
              nadiSuddhi: { enabled: true, goal: 10 },
              lnb: { enabled: true, goal: 10 },
              pranayam: { enabled: true, goal: 10 },
              blessingsFromSun: { enabled: true, goal: 10 },
              physicalExercise: { enabled: true, goal: 30 },
              grounding: { enabled: true, goal: 10 },
              gratitudeJournal: { enabled: true, goal: 1 },
            },
          },
          description: "Enables At a Glance meditation / pranayam / exercise from DRF logs.",
        }),
      ]
    ),

    folder(
      "5. Paid onboarding (fills Personal Details + onboarding grid)",
      "Maps to Admin paid-onboarding keys: personalDetails, profileSetup, bodyMeasurement, progressPhotos180, medicalConditions, internalParameter, launch.",
      [
        item({
          name: "Get Onboarding State",
          method: "GET",
          path: "/user/paid-onboarding/state",
        }),
        item({
          name: "Submit Profile (personal + diet + address)",
          method: "POST",
          path: "/user/paid-onboarding/profile",
          body: {
            name: "{{userName}}",
            dob: "1991-03-12",
            gender: "female",
            country: "India",
            state: "Maharashtra",
            city: "Pune",
            addressLine1: "Flat 101, Green Meadows",
            addressLine2: "Baner Road",
            pincode: "411000",
            dietaryPreference: "vegetarian",
            wellnessJourneyFor: ["self"],
            whatsappSameAsMobile: false,
            whatsappCountryCode: "+91",
            whatsappPhone: "{{userWhatsapp}}",
          },
          description:
            "dietaryPreference: vegetarian | eggetarian | vegan | non_vegetarian | jain. wellnessJourneyFor is an array of strings. Marks personalDetails + profileSetup done.",
        }),
        item({
          name: "Submit Body Measurements",
          method: "POST",
          path: "/user/paid-onboarding/body-measurements",
          body: {
            heightCm: 163,
            heightUnit: "cm",
            weightKg: 68,
            weightUnit: "kg",
            neckCm: 32,
            shoulderCm: 38,
            chestCm: 90,
            waistCm: 78,
            hipCm: 98,
            thighsCm: 54,
            activityLevel: "moderately_active",
          },
          description:
            "Feeds At a Glance metabolic snapshot (height/weight). activityLevel: sedentary | lightly_active | moderately_active | highly_active. Optional multipart field `weight_pic`.",
        }),
        item({
          name: "Skip Progress Photos (no files)",
          method: "POST",
          path: "/user/paid-onboarding/skip-step",
          body: { step: "progressPhotos180" },
          description: "Skippable steps: bodyMeasurement, progressPhotos180, medicalConditions.",
        }),
        item({
          name: "Upload Progress Photos (optional files)",
          method: "POST",
          path: "/user/paid-onboarding/progress-photos",
          formdata: [
            { key: "front_pic", type: "file", src: [], description: "Required JPEG/PNG/WebP" },
            { key: "right_pic", type: "file", src: [], description: "Required" },
            { key: "left_pic", type: "file", src: [], description: "Required" },
            { key: "heightCm", value: "163", type: "text" },
            { key: "weightKg", value: "68", type: "text" },
          ],
          description: "Use instead of skip if you have 3 photos. Field names: front_pic, right_pic, left_pic.",
        }),
        item({
          name: "Get Medical Questions",
          method: "GET",
          path: "/user/paid-onboarding/medical-questions",
          description: "Builds `medicalAnswersJson` for the next request.",
          event: tests([
            "const json = pm.response.json();",
            "const questions = json.data?.questions || json.questions || [];",
            "const answers = questions.map((q) => {",
            "  const type = String(q.answerType || 'text').toLowerCase();",
            "  if (type === 'yes_no') return { questionId: q.id, answer: false };",
            "  if (type === 'yes_no_text') return { questionId: q.id, answer: true, details: 'No current medication' };",
            "  if (type === 'date') return { questionId: q.id, date: '2020-01-15' };",
            "  return { questionId: q.id, text: 'No known issues' };",
            "});",
            "pm.collectionVariables.set('medicalAnswersJson', JSON.stringify(answers));",
          ]),
        }),
        item({
          name: "Submit Medical Conditions",
          method: "POST",
          path: "/user/paid-onboarding/medical-conditions",
          body: `{
  "answers": {{medicalAnswersJson}}
}`,
          description:
            "Must include every active question. yes_no uses `answer` boolean; yes_no_text needs `details` when true; text uses `text`; date uses `date`.",
        }),
        item({
          name: "Upload Lab Report (internal parameters)",
          method: "POST",
          path: "/user/internal-parameters/reports",
          formdata: [
            { key: "file", type: "file", src: [], description: "Required PDF" },
            { key: "reportDate", value: "{{todayDate}}", type: "text" },
          ],
          description: "Marks paidOnboardingStepStatus.internalParameter = done. Field name: file (PDF only).",
        }),
        item({
          name: "Complete LAUNCH onboarding step",
          method: "POST",
          path: "/user/paid-onboarding/launch/complete",
          body: {},
          description: "Marks launch done. Lifestyle score still needs a staff LAUNCH assessment (folder 8).",
        }),
      ]
    ),

    folder(
      "6. Daily tracking (At a Glance metrics)",
      "Water, steps, meals, daily reflection. Admin At a Glance reads the last ~5 days.",
      [
        item({
          name: "Set Water Goal (8 glasses)",
          method: "PATCH",
          path: "/user/water-tracking/goal",
          body: { goalGlasses: 8 },
        }),
        item({
          name: "Set Water Day Count",
          method: "PUT",
          path: "/user/water-tracking/day",
          body: { date: "{{todayDate}}", glassCount: 6 },
          description: "Example: 6 / 8 glasses (Admin water card).",
        }),
        item({
          name: "Increment Water (+1 glass)",
          method: "POST",
          path: "/user/water-tracking/increment",
          body: { date: "{{todayDate}}" },
        }),
        item({
          name: "Set Steps Goal",
          method: "PATCH",
          path: "/user/steps-tracking/goal",
          body: { goalSteps: 10000 },
        }),
        item({
          name: "Set Steps Day Count (manual)",
          method: "PUT",
          path: "/user/steps-tracking/day",
          body: { date: "{{todayDate}}", stepCount: 9400 },
          description: "Example: 9,400 / 10,000 (Admin steps card).",
        }),
        item({
          name: "Sync Steps (Health Connect example)",
          method: "POST",
          path: "/user/steps-tracking/sync",
          body: {
            platform: "android",
            source: "health_connect",
            records: [
              {
                date: "{{todayDate}}",
                platform: "android",
                source: "health_connect",
                stepCount: 9400,
                distanceMeters: 7200,
                caloriesKcal: 280,
                dataOrigin: "com.samsung.health",
                externalIds: ["postman-steps-1"],
                syncedAt: "2026-08-17T09:15:00.000Z",
              },
            ],
          },
        }),
        item({
          name: "Log Meal (protein breakfast)",
          method: "POST",
          path: "/user/meal-tracking",
          body: {
            date: "{{todayDate}}",
            entryTime: "08:30",
            category: "meal",
            mealType: "First",
            description: "High-protein breakfast — paneer bhurji + 2 eggs",
            items: [
              { name: "Paneer bhurji", quantityGm: 120 },
              { name: "Eggs", quantityGm: 100 },
            ],
            proteinGm: 38,
            fatsGm: 22,
            carbsGm: 12,
            caloriesKcal: 420,
          },
          description:
            "category: functional_juice | salad | meal | beverage | snacks | protein. Requires Heal + assigned coach. User logs get dummy macros server-side; still send example macros.",
          event: tests([
            "if (pm.response.code === 201) {",
            "  const json = pm.response.json();",
            "  const id = json.mealLog?.id || json.mealLog?._id;",
            "  if (id) pm.collectionVariables.set('mealLogId', String(id));",
            "}",
          ]),
        }),
        item({
          name: "Log Meal (protein snack)",
          method: "POST",
          path: "/user/meal-tracking",
          body: {
            date: "{{todayDate}}",
            entryTime: "16:00",
            category: "protein",
            mealType: "Snack",
            description: "Whey protein shake — 2 scoops",
            items: [{ name: "Whey isolate", quantityGm: 50 }],
            proteinGm: 50,
            fatsGm: 2,
            carbsGm: 4,
            caloriesKcal: 230,
          },
        }),
        item({
          name: "Get Daily Reflection Form",
          method: "GET",
          path: "/user/daily-reflection",
          query: [{ key: "date", value: "{{todayDate}}" }],
        }),
        item({
          name: "Submit Daily Reflection",
          method: "POST",
          path: "/user/daily-reflection",
          body: {
            date: "{{todayDate}}",
            honestConfirmed: true,
            gratitudeYes: true,
            activityValues: {
              yogaNamaskar: 12,
              suryaNamaskar: 12,
              bhramari: 10,
              meditation: 15,
              nadiSuddhi: 10,
              lnb: 10,
              pranayam: 6,
              blessingsFromSun: 10,
              physicalExercise: 45,
              grounding: 10,
            },
          },
          description:
            "`honestConfirmed` must be true. Values are minutes/cycles per activity. Example matches Admin cards: meditation 15 min, pranayam 6 min, exercise 45 min.",
        }),
        item({
          name: "Record Plugged Headphones",
          method: "PATCH",
          path: "/user/daily-reflection/plugged-headphones",
          body: { date: "{{todayDate}}", pluggedHeadphones: true },
        }),
      ]
    ),

    folder(
      "7. Metabolic + health progress",
      "Body analytics snapshot + weight card on At a Glance. Health-progress POSTs need folder 4 settings first.",
      [
        item({
          name: "Save BMI",
          method: "POST",
          path: "/user/metabolic-metrics/bmi",
          body: {
            gender: "female",
            age: 34,
            heightCm: 163,
            weightKg: 68,
            date: "{{todayDate}}",
          },
        }),
        item({
          name: "Save BMR / TDEE",
          method: "POST",
          path: "/user/metabolic-metrics/bmr",
          body: {
            gender: "female",
            age: 34,
            heightCm: 163,
            weightKg: 68,
            activityLevel: "moderately_active",
            date: "{{todayDate}}",
          },
          description: "activityLevel: sedentary | lightly_active | moderately_active | highly_active | very_active | extra_active",
        }),
        item({
          name: "Save Body Fat % (female example)",
          method: "POST",
          path: "/user/metabolic-metrics/body_fat",
          body: {
            gender: "female",
            age: 34,
            heightCm: 163,
            weightKg: 68,
            neckCm: 32,
            waistCm: 78,
            hipCm: 98,
            bodyFatGoal: 28,
            date: "{{todayDate}}",
          },
          description: "Female users must send hipCm (US Navy method).",
        }),
        item({
          name: "Save Visceral Fat",
          method: "POST",
          path: "/user/metabolic-metrics/visceral_fat",
          body: {
            gender: "female",
            age: 34,
            heightCm: 163,
            waistCm: 78,
            date: "{{todayDate}}",
          },
        }),
        item({
          name: "Log Weight (health progress)",
          method: "POST",
          path: "/user/health-progress/weight",
          body: {
            weightKg: 68,
            date: "{{todayDate}}",
          },
          description: "Optional multipart `weight_pic`. Feeds At a Glance healthProgressPrograms.",
        }),
        item({
          name: "Log Glucose (FBS)",
          method: "POST",
          path: "/user/health-progress/glucose",
          body: { type: "fbs", value: 102, date: "{{todayDate}}" },
          description: "type: fbs | ppbs",
        }),
        item({
          name: "Log Blood Pressure",
          method: "POST",
          path: "/user/health-progress/blood-pressure",
          body: { sys: 118, dia: 76, date: "{{todayDate}}" },
        }),
        item({
          name: "Log Menstrual Cycle",
          method: "POST",
          path: "/user/health-progress/menstrual-cycle",
          body: { startDate: "2026-08-01", endDate: "2026-08-05" },
          description: "Only for female users with menstrualCycle feature enabled.",
        }),
      ]
    ),

    folder(
      "8. Staff data Admin At a Glance also reads",
      "LAUNCH lifestyle score, prakriti label, and supplement cards are written by staff APIs, not the mobile user.",
      [
        item({
          name: "List LAUNCH Focus Areas",
          method: "GET",
          path: "/account/heal-users/{{userId}}/launch-assessment/focus-areas",
          auth: "adminToken",
          event: tests([
            "const json = pm.response.json();",
            "const list = json.focusAreas || [];",
            "if (list[0]) pm.collectionVariables.set('launchFocusAreaId', String(list[0].id || list[0]._id));",
          ]),
        }),
        item({
          name: "Create LAUNCH Assessment",
          method: "POST",
          path: "/account/heal-users/{{userId}}/launch-assessment",
          auth: "adminToken",
          body: {
            assessmentDate: "{{todayDate}}",
            totalScore: 540,
            focusAreaIds: ["{{launchFocusAreaId}}"],
          },
          description: "totalScore 0–750. 540 → lifestyle ~7.2 / 10 (Admin example).",
        }),
        item({
          name: "Save Prakruti Assessment",
          method: "POST",
          path: "/account/heal-users/{{userId}}/prakruti-assessment",
          auth: "adminToken",
          body: {
            prakrutiType: "vata",
            thingToAvoidIds: [],
          },
          description:
            "prakrutiType: vata | pitta | kapha | vata_pitta | pitta_kapha | kapha_vata | sama_prakriti. Admin example: Vata.",
        }),
        item({
          name: "Assign Supplement Dosage",
          method: "POST",
          path: "/account/heal-users/{{userId}}/supplement-dosages",
          auth: "adminToken",
          body: {
            supplementId: "{{supplementId}}",
            startDate: "{{todayDate}}",
            periods: [
              { period: "morning", quantity: 1, mealRelation: "after" },
              { period: "evening", quantity: 1, mealRelation: "after" },
            ],
          },
          description:
            "Each period needs period (morning|afternoon|evening), quantity > 0, mealRelation (before|after). Requires an active catalog supplement.",
        }),
      ]
    ),

    folder(
      "9. Verify in Admin",
      "These are the reads Admin uses. After this, open Admin → Users → the UUID profile.",
      [
        item({
          name: "Get User (Personal Details)",
          method: "GET",
          path: "/account/users/{{userId}}",
          auth: "adminToken",
          description: "Admin profile shell + Personal Details.",
        }),
        item({
          name: "Get At a Glance",
          method: "GET",
          path: "/account/users/{{userId}}/at-a-glance",
          auth: "adminToken",
          description:
            "Live glance: metabolicSnapshot, dailyMetrics (protein/water/steps/meditation/pranayam/exercise), supplements, lifestyleScore, prakriti, dailyScore, healthProgressPrograms.",
        }),
        item({
          name: "Admin Water History",
          method: "GET",
          path: "/account/users/{{userId}}/water-tracking",
          auth: "adminToken",
          query: [{ key: "days", value: "7" }],
        }),
        item({
          name: "Admin Steps History",
          method: "GET",
          path: "/account/users/{{userId}}/steps-tracking",
          auth: "adminToken",
          query: [{ key: "days", value: "7" }],
        }),
        item({
          name: "Admin Sleep History",
          method: "GET",
          path: "/account/users/{{userId}}/sleep-tracking",
          auth: "adminToken",
        }),
        item({
          name: "Admin Heart Rate History",
          method: "GET",
          path: "/account/users/{{userId}}/heart-rate-tracking",
          auth: "adminToken",
        }),
        item({
          name: "Search User in Admin List",
          method: "GET",
          path: "/account/users",
          auth: "adminToken",
          query: [
            { key: "search", value: "{{userEmail}}" },
            { key: "page", value: "1" },
            { key: "limit", value: "10" },
          ],
        }),
      ]
    ),

    folder(
      "10. Extra user writes (optional)",
      "Stored in DynamoDB. New Admin section pages mostly still show fixtures, but these APIs work without the mobile app.",
      [
        item({
          name: "Sync Sleep",
          method: "POST",
          path: "/user/sleep-tracking/sync",
          body: {
            platform: "android",
            source: "health_connect",
            records: [
              {
                date: "{{todayDate}}",
                platform: "android",
                source: "health_connect",
                bedTime: "23:10",
                wakeTime: "06:40",
                durationMinutes: 450,
                dataOrigin: "com.samsung.health",
                externalIds: ["postman-sleep-1"],
                syncedAt: "2026-08-17T06:45:00.000Z",
              },
            ],
          },
        }),
        item({
          name: "Sync Heart Rate",
          method: "POST",
          path: "/user/heart-rate-tracking/sync",
          body: {
            platform: "android",
            source: "health_connect",
            records: [
              {
                date: "{{todayDate}}",
                platform: "android",
                source: "health_connect",
                latestBpm: 72,
                latestRecordedAt: "2026-08-17T09:00:00.000Z",
                restingBpm: 62,
                averageBpm: 78,
                maxBpm: 142,
                sampleCount: 1200,
                dataOrigin: "com.samsung.health",
                externalIds: ["postman-hr-1"],
                syncedAt: "2026-08-17T09:05:00.000Z",
              },
            ],
          },
        }),
        item({
          name: "Create Reminder",
          method: "POST",
          path: "/user/reminders",
          body: {
            name: "Morning gym session",
            time: "06:30",
            days: [1, 2, 3, 4, 5],
            isActive: true,
          },
          description: "time HH:mm. days: 0=Sun … 6=Sat. Admin reminders UI is still local.",
          event: tests([
            "if (pm.response.code === 201) {",
            "  const json = pm.response.json();",
            "  const id = json.reminder?.id || json.reminder?._id;",
            "  if (id) pm.collectionVariables.set('reminderId', String(id));",
            "}",
          ]),
        }),
        item({
          name: "Create Reminder (supplements)",
          method: "POST",
          path: "/user/reminders",
          body: {
            name: "Take supplements",
            time: "13:30",
            days: [0, 1, 2, 3, 4, 5, 6],
            isActive: true,
          },
        }),
        item({
          name: "Create Reminder (evening walk)",
          method: "POST",
          path: "/user/reminders",
          body: {
            name: "Evening walk",
            time: "18:00",
            days: [0, 1, 2, 3, 4, 5, 6],
            isActive: true,
          },
        }),
        item({
          name: "Book Heal Consultancy Track",
          method: "POST",
          path: "/user/heal-consultancy-tracks",
          body: {
            concern: "Need follow-up on fat-loss plan and protein intake",
            scheduledAt: "2026-08-24T10:00:00.000Z",
          },
        }),
        item({
          name: "Consultancy Checkout Preview",
          method: "GET",
          path: "/user/consultancy-payment/checkout-preview",
        }),
        item({
          name: "Create Client Testimonial",
          method: "POST",
          path: "/user/client-testimonials",
          body: {
            title: "Feeling lighter already",
            message: "Down 0.8 kg this week and sleeping better. Grateful for the coaching.",
            rating: 5,
          },
        }),
      ]
    ),
  ],
};

const out = path.join(__dirname, "Wellness-Seed-User-Data-for-Admin.postman_collection.json");
fs.writeFileSync(out, JSON.stringify(collection, null, 2));
console.log("Wrote", out);
