# Configs Section — QA & Code Review

- **Scope:** Admin panel `/configs` (list) and `/configs/:configId` (detail), every config screen in the App, Web and Common tabs, the Admin API clients they call, and the Backend endpoints behind them.
- **Review date:** 30 Sep 2026
- **Method:** Static code review of the Admin UI, API clients, Backend routes, controllers and models, plus the public and website consumers. A production build of the Admin app (`vite build`) was run and **passes with no errors**. No live edits were made, because during the review the Admin app pointed at the production API.
- **Severity scale:** **Critical** = security or data loss in production. **High** = wrong data saved or feature broken. **Medium** = incorrect behaviour in edge cases or inconsistent UX. **Low** = cosmetic, dead code or copy.

## Executive summary

- **Scope:** 60 config screens (33 App, 11 Web, 16 Common).
- **No screen is fully clean.** Every screen has at least one issue, and **9 are broken or not functional** for at least one realistic scenario:
  - `app-payment-gateway` and `app-consultancy-amount`
  - `app-commitment-letter`
  - `app-ai-enable`
  - `web-fs-contact` and `web-location`
  - `common-google-review`, `common-recipes` and `common-yoga`

**Top issues to fix first**

1. **Payment secrets leak.** Cashfree `secret_key` and `webhook_secret` are returned to every logged-in staff account. The keys should be **rotated** (SH-02 / AC-01).
2. **Stored XSS.**
   - Static-page HTML is never sanitised and is rendered raw on the website and in the admin (LG-01).
   - `javascript:` links are accepted in app-config and banner CTA fields (WB-07, CM-M3).
3. **A failed load followed by a save overwrites live data.** This happens on legal pages, About, Compliance, Social links, Contact details, Location, App content, Health progress trackers, Commitment letter and Google review. See LG-02, AC-12, WB-01, HB-02, HB-03 and CM-03.
4. **Global tax is edited from two screens.** The Consultancy and GST screens write the same fields, which affects every checkout (AC-02).
5. **Settings are saved but never used.**
   - AI enable is never enforced (SY-01).
   - LAUNCH scores are saved out of 100 but graded on a 0–750 scale (SY-02).
   - Contact page content and locations never appear on the website (LG-09, WB-04).
   - "Push to app" on the Commitment letter is fake (HB-04).
6. **Permission keys differ between the admin panel and the backend.** For `ct` and `bn` users, Recipes, Yoga, Google review, the media picker and dropdowns fail with 403 (CM-01, CM-02, LG-07).
7. **Old files are deleted before the database write succeeds.** A failed save leaves broken logos, videos and banners (SH-03, SY-09, HB-06, CM-M5).
8. **Edits can be lost or published by mistake.** There is no unsaved-changes guard, and a stale Publish handler can publish the wrong page (SH-05, SH-06). Editing Program pricing silently publishes unsaved tag changes (SH-04).

**Admin build:** passes. **Runtime testing:** not done, to avoid touching production data. Each section ends with a list of items that need runtime verification.

---

## 1. Architecture at a glance

| Piece | File |
|---|---|
| Config catalog (tabs → groups → items) | `Admin/src/data/configsData.js` |
| List page | `Admin/src/pages/ConfigsPage.jsx` |
| Detail page (one big `switch` over `configId`, holds most state) | `Admin/src/pages/ConfigDetailPage.jsx` |
| Lazy section components | `Admin/src/pages/lazyConfigSections.js` |
| Header Publish confirm | `Admin/src/components/ConfigPublishModal.jsx` |
| Header Preview | `Admin/src/components/ConfigPreviewModal.jsx` |
| Legal/static pages API | `Admin/src/api/legalPageApi.js` → `PUT /api/admin/misc/pages/by-slug/:slug` |
| Single app-config record | `GET/PATCH /api/admin/app-config` → `Backend/controllers/adminController/appConfigController.js`, `Backend/models/appConfigModel.js` |
| Public read | `GET /api/public/app-config` → `Backend/controllers/publicController/publicAppConfigController.js` |

### Save models (important for testers)

There are **three different ways** a config screen saves, and the UI does not tell the admin which one applies:

1. **Header "Publish" (deferred):** edits stay in the browser until Publish is confirmed. Used by: `app-language-disable`, `app-whatsapp-support`, `app-consultancy-amount`, `app-compliance`, all legal pages (`app-terms-of-service`, `app-privacy-policy`, `app-community-guidelines`, `app-medical-disclaimer`, `app-dpa`, `web-fs-tos`, `web-fs-privacy`, `web-fs-guidelines`, `web-fs-medical-disclaimer`), `web-fs-contact` (page text only), `common-about` and `web-fs-social`.
2. **Mixed:** `app-program` and `app-subscriptions`. Pricing rows save instantly, but tag lists and toggles wait for Publish (see SH-04).
3. **Inline / instant save inside the section:** every other config.

---

## 2. Config inventory & status

The Status column comes from the per-section review in §4; the section number is in brackets. ⚠️ = works with issues, ❌ = broken or not functional in a realistic scenario. No screen received ✅ (fully clean).

| Tab | Group | Config ID | Name | Component | Save model | Status |
|---|---|---|---|---|---|---|
| App | Content | `app-language-disable` | Language disable | `LanguageDisableSection` | Publish | ⚠️ Issues (4.1) |
| App | Content | `app-whatsapp-support` | WhatsApp support | `WhatsappSupportSection` | Publish | ⚠️ Issues (4.1) |
| App | Content | `app-faq` | FAQ | `FaqConfigPanel` | Inline | ⚠️ Issues (4.1) |
| App | Energy exchange | `app-program` | Program | `ConfigDetailPage` (PricingPanel, TagCreatePanel, ClientLookupPanel, PwcPanel), `ProgramSetupModal` | Mixed | ⚠️ Serious issues (4.1) |
| App | Energy exchange | `app-subscriptions` | App Subscriptions | `AppSubscriptionFySection` + TagCreatePanel | Mixed | ⚠️ Issues (4.1) |
| App | Energy exchange | `app-consultancy-amount` | Consultancy amount | `ConsultancyAmountSection` | Publish | ❌ Broken (4.1) |
| App | Commerce | `app-gst` | GST option | `GstSection` | Inline | ⚠️ Issues (4.1) |
| App | Commerce | `app-payment-gateway` | Payment gateway | `PaymentGatewaySection` | Inline | ❌ Security-critical (4.1) |
| App | Legal | `app-terms-of-service` | Terms of Service | `AppMobileLegalSections` | Publish | ⚠️ Issues (4.2) |
| App | Legal | `app-privacy-policy` | Privacy Policy | `AppMobileLegalSections` | Publish | ⚠️ Issues (4.2) |
| App | Legal | `app-community-guidelines` | Community Guidelines | `AppMobileLegalSections` | Publish | ⚠️ Issues (4.2) |
| App | Legal | `app-medical-disclaimer` | Medical Disclaimer | `AppMobileLegalSections` | Publish | ⚠️ Issues (4.2) |
| App | Legal | `app-dpa` | Data processing agreement | `DpaSection` | Publish | ⚠️ Issues (4.2) |
| App | Legal | `app-compliance` | Compliance | `AppComplianceSection` | Publish | ⚠️ Issues (4.2) |
| App | Heal | `app-measurement-video` | Measurement video | `MeasurementVideoSection` | Inline | ⚠️ Issues (4.3) |
| App | Heal | `app-onboarding-video` | Onboarding video | `OnboardingVideoSection` | Inline | ⚠️ Serious issues (4.3) |
| App | Heal | `app-medical-questionnaire` | Medical conditions questionnaire | `MedicalQuestionnairePanel` | Inline | ⚠️ Issues (4.3) |
| App | Heal | `app-health-progress` | Health progress trackers | `HealthProgressTrackersPanel` | Inline | ⚠️ Serious issues (4.3) |
| App | Heal | `app-diet-plans` | Diet plans | `DietPlansSection` | Inline | ⚠️ Issues (4.3) |
| App | Heal | `app-test-catalog` | Blood test catalog | `TestCatalogSection` | Inline | ⚠️ Issues (4.3) |
| App | Banks | `app-challenges` | Challenges | `ChallengesSection` | Inline | ⚠️ Issues (4.3) |
| App | Banks | `app-coupons` | Coupons | `CouponsSection` | Inline | ⚠️ Issues (4.3) |
| App | Banks | `app-nutrition-bank` | Nutrition bank | `NutritionBankSection` | Inline | ⚠️ Issues (4.3) |
| App | Banks | `app-drf-bank` | DRF activity bank | `DrfBankSection` | Inline | ⚠️ Issues (4.3) |
| App | Banks | `app-rx-bank` | Wellness prescription bank | `RxBankSection` | Inline | ⚠️ Issues (4.3) |
| App | Banks | `app-commitment-letter` | Commitment letter | `CommitmentLetterSection` | Inline | ❌ Partly broken (4.3) |
| App | Banks | `app-gallery` | Gallery | `GallerySection` | Inline | ⚠️ Issues (4.3) |
| App | Body, Mind & Soul | `common-mental-wellbeing` | Mental & Emotional Wellbeing | `WellnessLibrarySection kind=mental` | Inline | ⚠️ Issues (4.4) |
| App | Body, Mind & Soul | `common-wellness-yoga` | Yoga | `WellnessLibrarySection kind=yoga` | Inline | ⚠️ Issues (4.4) |
| App | Body, Mind & Soul | `common-physical-exercise` | Physical Exercise | `WellnessLibrarySection kind=exercise` | Inline | ⚠️ Issues (4.4) |
| App | System | `app-launch` | LAUNCH | `LaunchSection` | Inline | ⚠️ Serious issues (4.4) |
| App | System | `app-prakriti` | Prakriti assessment | `PrakritiAssessmentSection` | Inline | ⚠️ Issues (4.4) |
| App | System | `app-ai-enable` | AI enable | `AiEnableSection` | Inline | ❌ Broken (4.4) |
| Web | Testimonials | `web-program-testimonials` | Program Testimonials | `DynamicProgramTestimonialsSection` | Inline | ⚠️ Issues (4.5) |
| Web | Footer | `web-footer` | Footer setting | `FooterSettingSection` | Inline | ⚠️ Issues (4.5) |
| Web | Footer | `web-fs-social` | FS · Social media links | `SocialLinksSection` | Publish | ⚠️ Issues (4.5) |
| Web | Footer | `web-fs-contact` | FS · Contact us | `LegalSectionsEditor` + `ContactDetailsSection` | Publish (text) + Inline (details) | ❌ Broken (4.2, 4.5) |
| Web | Legal | `web-fs-tos` | Terms & Conditions | `TermsAndConditionsSection` | Publish | ⚠️ Issues (4.2) |
| Web | Legal | `web-fs-privacy` | Privacy Policy | `PrivacyPolicySection` | Publish | ⚠️ Issues (4.2) |
| Web | Legal | `web-fs-guidelines` | Community Guidelines | `CommunityGuidelinesSection` | Publish | ⚠️ Issues (4.2) |
| Web | Legal | `web-fs-medical-disclaimer` | Medical Disclaimer | `MedicalDisclaimerSection` | Publish | ⚠️ Issues (4.2) |
| Web | Brand | `web-app-content` | App Content | `AppContentSection` | Inline | ⚠️ Issues (4.5) |
| Web | Brand | `web-logo` | Logo edit | `LogoSlotsSection` | Inline | ⚠️ Issues (4.5) |
| Web | Brand | `web-location` | Edit location | `LocationsSection` | Inline | ❌ Not shown on site (4.5) |
| Common | Banners & cards | `common-banner` | Banner | `BannerSection` | Inline | ⚠️ Serious issues (4.6) |
| Common | Banners & cards | `common-champion` | Champion of the month | `DynamicChampionSection` | Inline | ⚠️ Issues (4.6) |
| Common | Banners & cards | `common-birthday` | Birthday card | `DynamicBirthdaySection` | Inline | ⚠️ Issues (4.6) |
| Common | Testimonials | `common-transformation` | Transformation | `DynamicTransformationSection` | Inline | ⚠️ Issues (4.6) |
| Common | Testimonials | `common-client-review` | Client Review | `DynamicClientReviewSection` | Inline | ⚠️ Issues (4.6) |
| Common | Testimonials | `common-real-people` | Real People Real Healing | `DynamicRealPeopleSection` | Inline | ⚠️ Issues (4.6) |
| Common | Testimonials | `common-voice` | Voice of Healing | `DynamicVoiceOfHealingSection` | Inline | ⚠️ Issues (4.6) |
| Common | Leadership & team | `common-cofounder` | Co-Founder Message | `DynamicCofounderSection` | Inline | ⚠️ Issues (4.6) |
| Common | Leadership & team | `common-leadership` | Leadership Profile | `DynamicLeadershipSection` | Inline | ⚠️ Issues (4.6) |
| Common | Leadership & team | `common-wellness-team` | Wellness Team Profile | `DynamicWellnessTeamSection` | Inline | ⚠️ Issues (4.6) |
| Common | About | `common-about` | Description, Vision, Mission, Goal | `AboutSection` | Publish | ⚠️ Serious issues (4.2) |
| Common | About | `common-google-review` | Google Review & Followers | `DynamicGoogleReviewSection` | Inline | ❌ Broken (4.6) |
| Common | Settings | `common-dropdowns` | Dropdown options | `DropdownsSection` | Inline | ⚠️ Issues (4.6) |
| Common | Wellnesspedia | `common-health-disorders` | Health disorders | `HealthDisordersSection` | Inline | ⚠️ Issues (4.6) |
| Common | Wellnesspedia | `common-recipes` | Healthy recipes | `RecipesSection` | Inline | ❌ Broken for ct roles (4.6) |
| Common | Wellnesspedia | `common-yoga` | Yoga & Pranayam | `YogaSection` | Inline | ❌ Broken for ct roles (4.6) |

---

## 3. Shared / cross-cutting findings

### SH-01 · Critical · Admin API base URL is hardcoded and swapped by hand
- **File:** `Admin/src/api.js` lines 7–13
- **Issue:** `API_BASE` is a hardcoded constant. At the start of this review it was `https://irwellness.in` (production), so every edit made on `localhost:5174/configs` changed **live** data. It is now `http://localhost:5000`, but it is still switched by editing source. The comment says *"Override with VITE_API_URL"*, but nothing reads that variable.
- **Risk:** A wrong value can be committed or deployed: local testing could hit production, or a production build could call `localhost`.
- **Fix:** `const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";` and add `.env.development` / `.env.production` files.

### SH-02 · Critical · Cashfree secret keys are sent to every logged-in staff browser
- **Files:** `Backend/models/appConfigModel.js` `toPublicAppConfig()` (~line 280) spreads `...rest`, which includes `payment_gateways[].credentials.{uat,live}.{secret_key,webhook_secret}`. `Backend/routes/adminRoutes/adminAppConfigRoutes.js` line 12: `GET /` only needs `protectAccount` (any role). `Admin/src/store/loadAppConfig.js` calls it on every shell load, so the secrets sit in the Redux store of coaches, AWCs and support staff. The `PATCH` response returns them as well.
- **Correct already:** `/api/public/app-config` strips credentials (`toPublicClientAppConfig`).
- **Fix:** In the admin GET and PATCH responses, mask secrets (e.g. `secret_key: "••••" + last4`, plus `hasSecret: true`). Return full credentials only from a dedicated endpoint guarded by a payment-gateway permission. On save, treat an empty or masked secret as "keep existing".

### SH-03 · High · A failed app-config update can leave broken media
- **File:** `Backend/controllers/adminController/appConfigController.js` `applyMediaUploads()` (lines ~269–294), called from the update handler before later validations (lines ~786–846) and before `updateAppConfig()`.
- **Issue:** `if (config?.[field]) await deleteStoredMedia(config[field]);` runs **before** the request is fully validated and before the DB write. If a later check fails (e.g. empty `commitment_letter_text`, missing measurement-guide YouTube link, wrong MIME for the commitment template, which is checked *after* upload) or DynamoDB fails, the old S3 file is gone while the DB still references it. The new upload is also orphaned.
- **Fix:** Validate everything first, upload new files, write the DB, then delete old files. On failure, delete the newly uploaded files.

### SH-04 · High · On `app-program`, editing a price saves unsaved tag and toggle changes
- **File:** `Admin/src/pages/ConfigDetailPage.jsx` `persistPricingRows()` (~line 1512) and `PricingPanel.commitRows()` (~line 713)
- **Issue:** Discount slabs, validity periods, App Heal periods and the "Coaches can add" toggles are local until the header Publish. Editing, adding or removing a pricing row saves immediately and sends the **current local** tag and toggle state too, so pending changes go live without Publish.
- **Fix:** Pick one model. Either make the tag panels save instantly like pricing (and hide Publish for this page), or make pricing wait for Publish and send only `app_program_pricing` in `persistPricingRows`.

### SH-05 · Medium · No unsaved-changes protection
- **File:** `ConfigDetailPage.jsx` line 1447: `legalLocalDirty` is set but **never read**.
- **Issue:** On Publish-model screens, leaving via the back link, sidebar or header search, or refreshing, discards edits silently. The Publish modal copy admits this ("Refreshing the page before publish will discard unsaved changes").
- **Fix:** Use `legalLocalDirty` to show an "Unsaved changes" badge, add a `beforeunload` listener, and block in-app navigation (React Router `useBlocker`) while dirty.

### SH-06 · Medium · A stale Publish handler can publish the previous config
- **Files:** `ConfigDetailPage.jsx` `registerLegalPublishHandler` / `legalPublishHandlerRef`. Sections register with `registerPublishHandler(...)` in `useEffect` but **never unregister** (no cleanup), e.g. `LegalSectionsEditor.jsx:95`, `AboutSection.jsx:249`, `LanguageDisableSection.jsx:66`.
- **Issue:** `HeaderSearch.jsx:172` navigates straight from one config to another. React Router reuses the same `ConfigDetailPage` instance, so the ref keeps the previous section's handler until the new lazy chunk mounts. Clicking Publish in that window saves the **previous** page's content.
- **Fix:** Reset `legalPublishHandlerRef.current = null` in the `[configId]` effect, have each section's effect `return () => registerPublishHandler(null)`, or key the page: `<ConfigDetailPage key={configId} />`. Keying also fixes the other state that carries over between configs.

### SH-07 · Medium · Two admins editing at once overwrite each other
- **File:** `Backend/models/appConfigModel.js` `updateAppConfig()` (~line 446). The static-page PUT behaves the same way.
- **Issue:** Array fields (`app_program_pricing`, discount slabs, `web_social_links`, `web_locations`, `health_progress_trackers`, …) are replaced whole with no version or `updatedAt` condition. Two admins editing the same list means the last save wins silently.
- **Fix:** Send `updatedAt` from the client and add a `ConditionExpression: updatedAt = :expected`. Return `409` and show "This config was changed by someone else — reload".

### SH-08 · Medium · Backend accepts app-config scalar fields without validation
- **File:** `appConfigController.js` update handler `scalarFields` (lines ~567–612)
- **Issue:** The handler stores `app_email`, `app_mobile`, `latitude`, `longitude`, `facebook` / `youtube` / `instagram` / `linkedin` / `android_app_link` / `ios_app_link` URLs, `tax_value`, `referral_discount`, `consultancy_amount`, `subscription_amount`, `energy_exchange_monthly_amount` and `fy_start_month` exactly as sent: no format, range, type or length checks (only `compliance_names` is capped). `energy_exchange_default_fy_discounts` is stored as parsed JSON with no schema check. Frontend validation alone does not protect the data.
- **Fix:** Add per-field validators (email, E.164 or 10-digit mobile, lat −90..90 / lng −180..180, `https://` URLs only, non-negative numbers, percentages 0–100, month 1–12, max lengths).

### SH-09 · Medium · Read-only role is enforced only visually
- **File:** `ConfigDetailPage.jsx` ~line 2614: `style={{ pointerEvents: "none", opacity: 0.72 }}`
- **Issue:** Keyboard users can still Tab into inputs and press Enter or Space (e.g. TagCreatePanel creates on Enter, toggles are `<button>`s). Backend `authorizeStaff` still blocks writes for most endpoints (verify per section in §4), but the UI shows false success or error toasts.
- **Fix:** Wrap the editor in `<fieldset disabled>` or add the `inert` attribute, and pass a `readOnly` prop to sections.

### SH-10 · Medium · Any `console.cf.edit` holder can change payment keys and pricing
- **File:** `adminAppConfigRoutes.js` line 20: one PATCH endpoint for every app-config field, guarded only by `console.cf.edit`.
- **Issue:** Someone allowed to edit FAQs, footer text or dropdowns can also change Cashfree live keys, mode, GST and all prices.
- **Fix:** Add field-group permissions (e.g. `console.cf.payment.edit`), or split into separate endpoints with separate permission checks.

### SH-11 · Low · List page ignores permissions; header search respects them
- **Files:** `ConfigsPage.jsx` renders every catalog item. `HeaderSearch.jsx:165` filters by `can(console.<prefix>.view)`.
- **Issue:** Users see "Manage ›" for configs they cannot open. The detail page then says "You do not have access to view this config". The Preview button is also shown in that state (`showPreview` ignores `canViewConfig`).
- **Fix:** Filter items in `ConfigsPage` with the same `can()` check, and hide Preview when `!canViewConfig`.

### SH-12 · Low · Dead or unreachable code in `ConfigDetailPage`
- `case "feature-flags"` and the `feature-flags` summary branch have no catalog item with that id, so they can never run.
- `case "app-terms-conditions"`, `"app-tos"`, `"common-privacy-policy"`, `"common-terms-of-service"` and `"common-community-guidelines"` can never run, because `findConfigItem()` resolves these aliases to other ids first.
- The `web-fs-text` and `web-fs-links` entries in `PUBLISH_CONFIGS` and the wide-layout class list refer to ids that are not in the catalog.
- The `summaryOn` ternary repeats the `isLegalPrivacyConfigId` / `isLegalTosConfigId` / `isLegalGuidelinesConfigId` / `web-fs-medical-disclaimer` / `app-medical-disclaimer` checks; the second copies never run.
- The ~40-clause `className` chain (~line 2481) should become a `Set` lookup.
- **Fix:** Remove the dead branches, or add the missing catalog items if those screens are meant to exist.

### SH-13 · Low · Error messages and auth expiry
- `Admin/src/api.js` `normalizeApiError` surfaces raw `error.message` (e.g. "Network Error", "timeout of 0ms exceeded") directly in toasts.
- When refreshing the access token fails, the stored auth is cleared but the admin is not redirected to login, so the page stays up with failing requests.
- axios has no `timeout`, so a hung request can leave "Loading…" or "Publishing…" states indefinitely.
- **Fix:** Map network, timeout and 5xx errors to friendly copy, redirect to login when refresh fails, and set `timeout: 30000`.

### SH-14 · Low · `ClientLookupPanel` can send duplicate lookups
- **File:** `ConfigDetailPage.jsx` ~line 287: pressing Enter calls `lookup()` even while `lookingUp` is true (only the button is disabled).
- **Fix:** Add `if (lookingUp) return;` at the start of `lookup()`.

### SH-15 · Low · Pricing validation differs between add and edit
- **File:** `ConfigDetailPage.jsx` `validatePricingDraft()` (~line 544) does not check duplicate names, while `saveEdit()` (~line 795) does. Row removal (~line 1010) has no confirmation.
- **Fix:** Add the duplicate check when adding, and a confirm dialog before removing a row.

---

## 4. Per-config findings

### 4.1 App · Content, Energy exchange, Commerce

**Status summary**

| Config | Status | Findings |
|---|---|---|
| `app-language-disable` | ⚠️ Works with issues | AC-03, AC-12, AC-Minor |
| `app-whatsapp-support` | ⚠️ Works with issues | AC-03, AC-04, AC-12, AC-22 |
| `app-faq` | ⚠️ Works with issues | AC-14, AC-25, AC-26 |
| `app-program` | ⚠️ Works with serious issues | AC-06 to AC-11, AC-16, AC-20, AC-21, AC-27 |
| `app-subscriptions` | ⚠️ Works with issues | AC-07, AC-09, AC-17, AC-27 |
| `app-consultancy-amount` | ❌ Broken (edits global tax, and allows values that break checkout) | AC-02, AC-03, AC-04, AC-05, AC-23 |
| `app-gst` | ⚠️ Works with issues | AC-02, AC-04, AC-12, AC-18 |
| `app-payment-gateway` | ❌ Security-critical | AC-01 (= SH-02), AC-13, AC-24 |

**Verified working**
- **Language:** reads and writes `multilang`, which matches the public config. The toggle is disabled while loading, and the dirty banner works.
- **WhatsApp:** `support_whatsapp_*` fields match the public config. A number is required when the feature is enabled, and there is a max-length counter.
- **FAQ:**
  - Actions save instantly and roll back on failure for toggle, delete and reorder.
  - Delete asks for confirmation.
  - Question and answer are required on both client and server.
  - The public list filters by status, surface and platform.
  - Delete needs `cf.delete`.
- **Program and Subscriptions:**
  - Responses that arrive after navigating away are ignored.
  - The backend validates amount > 0, discount 0–100, whole-hour validity, program type, unique ids, and unique non-empty tags and slabs.
  - Triggering a checkout re-validates against the saved config.
  - Pricing edits roll back on failure.
- **Consultancy:** tax type is validated on both client and server, and inputs have length caps.
- **GST:**
  - The toggle rolls back on failure.
  - The percentage must be 0.01–100.
  - Save is disabled when nothing has changed.
  - The inclusive/exclusive calculation matches the UI copy.
- **Payment gateway:**
  - UAT and Live credentials are required when their mode is in use.
  - Switching mode needs confirmation and is blocked while there are unsaved edits.
  - The public endpoint strips credentials.
  - No secrets are logged.

#### AC-01 · Critical · Cashfree secret keys are sent to every staff browser
Details are in SH-02. Two additions:
- The same router is also mounted at `/account/app-config` (`Backend/routes/accountRoutes/index.js:165`).
- `PaymentGatewaySection.jsx:54-79` puts the secret into the page. A view-only user can Tab to **Show** and press Enter to reveal it.

**Rotate the current Cashfree keys**, because they have already been exposed to non-admin roles.

#### AC-02 · High · Consultancy amount and GST option edit the same global tax fields
- **Where:** `consultancyAmountApi.js:59-60` and `gstApi.js:38-39` both PATCH `tax_type` and `tax_value`. Every product's pricing reads that single pair: `consultancyPricingService`, `coachCheckoutService`, `programPricingService`, `subscriptionPricingService`, `energyExchangePricingService` and `challengePaymentService`.
- **Impact:** setting "Inclusive, 5%" on Consultancy (presented as consultancy-only) turns GST **OFF at 5% for all programs, subscriptions and challenges**.
- **Wrong default on GST:** the GST screen shows **18%** when the stored `tax_value` is empty or 0 (`gstApi.js:28`), while the backend charges 0%.
- **Fix:** add dedicated `consultancy_tax_*` fields, or remove the tax inputs from Consultancy and link to GST. Show the real stored value instead of 18.

#### AC-03 · High · Publishing during load or right after switching configs saves defaults
- **Files:** `LanguageDisableSection.jsx:67-73`, `WhatsappSupportSection.jsx:115-118` and `ConsultancyAmountSection.jsx:118-121`. Each registers its Publish handler before its load finishes, with no loading guard. The page defaults are `hindiOn=false` and WhatsApp `{enabled:false, number:""}`.
- **Scenario:** on a slow network, click Publish before "Fetching…" disappears.
  - On WhatsApp this sends `support_whatsapp_enabled:false, number:""` and **wipes the live number**.
  - On Language this sends `multilang:false`, which **disables Hindi for everyone**.
- **Fix:** keep Publish disabled until the section reports that it has loaded and has changes. Also apply the fix in SH-06.

#### AC-04 · High · Backend accepts invalid money, tax and support fields
- **Where:** same root cause as SH-08. `PATCH {"tax_value":"-18","consultancy_amount":"abc","energy_exchange_default_fy_discounts":{"1":500}}` succeeds. The WhatsApp number and message have no format or length check.
- **Fix:** validate on the server:
  - `tax_value` 0–100.
  - `consultancy_amount` > 0.
  - `referral_discount` < `consultancy_amount`.
  - `fy_start_month` 1–12.
  - FY discount keys 1–4 with values 0–100, inside the configured ranges.
  - WhatsApp number `^\d{8,15}$`, message ≤ 500 characters.

#### AC-05 · High · Consultancy accepts values that make every consultancy payment fail
- **Files:**
  - `consultancyAmountApi.js:22-28`: the string `"0"` counts as filled in, and `parseFloat("12abc")` becomes 12.
  - `ConsultancyAmountSection.jsx:83-94` never compares the referral discount against the amount.
  - The backend computes `Math.max(0, base - discount)`, and `consultancyPaymentService.js:145` then throws "Invalid payable amount".
- **Scenario:** amount 0, or amount 200 with referral discount 300. Every consultancy checkout, or every one with a referral code, fails.
- **Fix:** strict regex `/^\d+(\.\d{1,2})?$/`, amount > 0, referral discount < amount. Mirror these checks on the backend.

#### AC-06 · High · Editing a program price silently publishes unsaved tag and toggle changes
Details are in SH-04. Example: add the slab "50% · test" (toast says "added", nothing is saved), then edit any amount. The 50% slab goes live to coaches without Publish.

#### AC-07 · High · Tag changes on Program and Subscriptions are local-only, but the UI calls them live
- **Files:** `ConfigDetailPage.jsx:1077, 1087` show "added" and "removed" toasts. `ConfigPublishModal.jsx:4-24` doesn't list these ids as deferred, so the modal says "Every change on this page goes live immediately". No dirty banner is shown.
- **Impact:** admins see success toasts, navigate away, and lose their changes.
- **Fix:** track a dirty flag, change the toasts to "…added, publish to go live", add both ids to `DEFERRED_PUBLISH_CONFIGS`, and apply the unsaved-changes guard from SH-05.

#### AC-08 · Medium · Setup modal offers unpublished tags, which the backend rejects
- **Files:** `ConfigDetailPage.jsx:1853-1855` passes local tag lists to `ProgramSetupModal`, while `coachCheckoutService.js:626-657` validates against the saved config.
- **Scenario:** create "96 hours" without publishing, open Setup, choose it, click Trigger. The request fails with 400 "Choose a … from the published list".
- **Fix:** feed the modal the published lists, or block Setup while there are unsaved tag changes.

#### AC-09 · Medium · Validity periods are free text and aren't checked as durations
- **Files:** the validity `TagCreatePanel`s have no `parseItem`. The backend `normalizeNamedOptions` accepts any string. `coachCheckoutService.js:49-61` `parseDurationToHours` only fails when a checkout is triggered.
- **Scenario:** "3 fortnights" can be published, and then every trigger using it fails.
- **Fix:** validate with the same regex as `parseDurationToHours` on the client and in `normalizeNamedOptions`.

#### AC-10 · Medium · "Net payable" in the Setup modal ignores discount and tax
- **Files:** `ProgramSetupModal.jsx:62` sets `const netPayable = program.amount;`. The backend (`coachCheckoutService.js:90-120`) applies the slab discount and then tax.
- **Impact:** the coach sees the full price while the client is charged a different amount.
- **Fix:** compute it with the backend formula, or relabel it "List price".

#### AC-11 · Medium · Per-program "Discount %" and "Valid for" are required but never used
- **Files:** `ConfigDetailPage.jsx:564-567, 847`. The backend validates these fields (`appConfigController.js:151-156`), but no service reads `app_program_pricing[].discountPercent` or `.validityHours`. Checkout uses the slab and link validity instead.
- **Fix:** remove the columns and the backend requirement, or wire them into pricing. Check first that the app doesn't read them.

#### AC-12 · Medium · After a failed load, sections keep editable defaults that can overwrite real data
- **Files:**
  - `LanguageDisableSection.jsx:54-57`
  - `WhatsappSupportSection.jsx:69-72`
  - `GstSection.jsx:33-35`: the toggle stays enabled and writes the default 18%.
  - `ConfigDetailPage.jsx:1485-1489`: Program and Subscriptions show empty tables with no error state or retry.
- **Fix:** add a `loadError` state with an error view and Retry, and disable inputs and Publish until a load succeeds.

#### AC-13 · Medium · A failed payment-mode switch still shows the new mode
- **File:** `PaymentGatewaySection.jsx:227-234` calls `setDraft(next)` before `persist` and never reverts on failure.
- **Impact:** the UI says "Live mode · Active" while payments still run on UAT. "Save credentials" would then save Live without the confirmation step.
- **Fix:** on failure, restore the draft from `savedRef.current`.

#### AC-14 · Medium · Loading the FAQ screen writes to the server, so read-only users see an empty list
- **File:** `FaqConfigPanel.jsx:254-269`. The load calls `adminEnsureSectionSurfaceConfig`, which sends a POST or PATCH (both need `cf.edit`). If that fails, the catch runs `setItems([])`.
- **Impact:** a view-only user gets a 403 toast and "No FAQs yet".
- **Fix:** make the load read-only, and move the normalisation into a backend migration.

#### AC-15 · Medium · Read-only mode and frontend permissions don't match the backend
Details are in SH-09. In addition:
- `canEditConfig` is true for a role with only `.toggle`, `.create` or `.delete`, but `PATCH /admin/app-config` requires `cf.edit`, so that role gets a 403 on every save.
- Triggering a checkout needs `console.pg.edit`, not `cf`.
- **Fix:** compute per-action flags (`canEdit`, `canDelete`, `canTrigger`) that match the backend permission slugs.

#### AC-16 · Medium · Client lookup, PWC list and staff list are open to any logged-in staff
- **Files:** `accountCoachCheckoutRoutes.js:17-22` uses only `protectAccount`. `coachCheckoutController.js:24-53` has no hierarchy check.
- **Impact:** any staff member, trainees included, can resolve any client's name, email and mobile from a referral code, and can list all recent PWC completions.
- **Fix:** add `authorizeStaff("console.pg.view")` and scope results by `canActorTriggerCheckout`.

#### AC-17 · Medium · FY monthly amount accepts 0, and FY saves separately from Publish
- **Files:** `appSubscriptionFyApi.js:60-65`: the string `"0"` passes the "> 0" check, which leads to 0 totals and "Invalid payable amount". `AppSubscriptionFySection.jsx:146-154` has its own "Save settings", while the header Publish saves only the tags. That gives two save models on one page.
- **Fix:** check `Number(monthlyAmount) > 0`, and pick a single save model for the page.

#### AC-18 · Medium · Toggling GST also saves an unsaved percentage draft
- **File:** `GstSection.jsx:64-75` uses `rate = parseTaxValue(draftPercent) || saved`.
- **Scenario:** type 12 without clicking Save, then toggle GST. 12% is saved silently.
- **Fix:** toggle using the saved percentage.

#### Low findings
- **AC-19 · Publish modal:**
  - Clicking the backdrop closes the modal mid-publish, so a second publish can be started (duplicate PATCH).
  - `publishConfig` swallows errors, so the modal always closes, even on failure.
  - **Fix:** ignore backdrop clicks while publishing, and rethrow after the toast.
- **AC-20 · Pricing table:**
  - Duplicate names are allowed on add, and the backend doesn't check either.
  - There are no name length or amount caps.
  - Delete saves instantly with no confirmation.
  - "Add" isn't disabled while a save is in progress, so a rollback can undo the other change.
- **AC-21 · Enter-key lookup:** pressing Enter bypasses the "Looking up…" guard. Responses aren't ordered, so a stale client can overwrite a newer one.
- **AC-22 · WhatsApp number format:** `+` is allowed anywhere, and only one digit is required. `wa.me` needs digits only.
- **AC-23 · Consultancy tax type default:** Consultancy shows "Inclusive" when `tax_type` is empty, but the backend defaults to "exclusive".
- **AC-24 · Webhook secret:** the gateway has no UI field for the webhook secret, and `verifyCashfreeWebhookSignature` (`utils/paymentGateway.js:158-163`) is never called.
  - The backend has **no webhook route**. Payments are confirmed by the server querying Cashfree directly (`verifyCashfreePayment` / `getCashfreeOrder`, `utils/paymentGateway.js:114-134`), so this is dead code, not a vulnerability.
  - **Fix:** remove `webhook_secret` and the unused verifier, or add a signed webhook route if asynchronous confirmation is needed.
- **AC-25 · FAQ leftovers and limits:**
  - The deferred-publish code path in `FaqConfigPanel` can never run.
  - Question and answer have no length limits on client or server, and duplicate questions are allowed.
  - The list is capped at `limit: 200`, so reordering beyond 200 sends a partial id list.
- **AC-26 · FAQ app visibility:** the "Hide in app" setting is only applied when the app sends `?platform=app` (`miscController.js:95-96`). Check that the APK sends it.
- **AC-27 · 100% discount slab:** it is accepted but fails at checkout with "Invalid payable amount". Cap slabs at 99, or support free checkouts explicitly.
- **AC-Minor:**
  - Switching from Program to Subscriptions mounts `AppSubscriptionFySection` twice, so it fetches twice.
  - The Language toggle isn't disabled while a publish is in flight, so an older response can overwrite a newer toggle.

### 4.2 Legal pages (App + Web), Contact us, About

**Status summary**

| Config | Status | Findings |
|---|---|---|
| `app-terms-of-service` | ⚠️ Works with issues | LG-01, 02, 03, 04, 10, 12, 16 |
| `app-privacy-policy` | ⚠️ Works with issues | LG-01, 02, 03, 04, 10, 12 |
| `app-community-guidelines` | ⚠️ Works with issues | LG-01, 02, 03, 04, 10, 12 |
| `app-medical-disclaimer` | ⚠️ Works with issues | LG-01, 02, 03, 04, 10, 12 |
| `app-dpa` | ⚠️ Works with issues | LG-01, 02, 03, 04, 10, 12, 16 |
| `app-compliance` | ⚠️ Works with issues | LG-02, 03, 06, 12, 15, 18 |
| `web-fs-tos` | ⚠️ Works with issues | LG-01, 02, 03, 04, 10, 12, 18 |
| `web-fs-privacy` | ⚠️ Works with issues | LG-01, 02, 03, 04, 10, 12, 18 |
| `web-fs-guidelines` | ⚠️ Works with issues | LG-01, 02, 03, 04, 10, 12, 18 |
| `web-fs-medical-disclaimer` | ⚠️ Works with issues | LG-01, 02, 03, 04, 10, 12, 18 |
| `web-fs-contact` | ❌ Broken | LG-01, 02, 03, 04, 08, 09, 16 |
| `common-about` | ⚠️ Works with serious issues | LG-01, 02, 03, 05, 06, 07, 10, 11, 18 |
| Preview modal (`ConfigPreviewModal`) | ❌ Broken for draft preview (10 of 12 configs) | LG-01, 04, 15, 17 |

**Verified working (all 10 `LegalSectionsEditor` pages)**
- Loading text is shown, and the request is cancelled if the page unmounts.
- Title must be at least 3 characters and content non-empty, checked in both the UI and the backend.
- The Live toggle maps to `active` / `inactive`. Inactive pages return 404 publicly but still load in the admin.
- After Publish, the saved state resets and the "unsaved" banner clears.
- Double-clicking Publish is blocked.
- `PUT /admin/misc/pages/by-slug/:slug` requires `console.cf.edit`, and trainees are blocked.

**Slugs** used by the admin, the website routes and the backend docs match: `terms-and-conditions`, `privacy-policy`, `community-guideline` (singular, with backend aliases for the plural), `medical-disclaimer`, `app-*`, `contact-us`, `about-us`, `our-mission`, `our-vision` and `our-goal`.

#### LG-01 · High · Stored XSS through static page HTML
- **Backend:**
  - `Backend/controllers/adminController/staticPageController.js:58-60` stores `content` as sent.
  - `Backend/models/staticPageModel.js:82-91` (`compactHtml`) only strips comments and Word markup.
  - `Backend/utils/legalBlocks.js:197` passes HTML-looking text through unchanged.
  - No sanitiser dependency exists in Backend, Admin or Frontend.
- **Editor:** `Admin/src/components/RichTextEditorInner.jsx:65-74` allows every tag and attribute (`htmlSupport.allow: [{ name: /.*/, attributes: true, ... }]`).
- **Rendered raw:**
  - Website: `Frontend/src/site/pages/StaticPageView.jsx:61`, `Frontend/src/site/components/AboutUsSection.jsx:393,423`, `Frontend/src/site/components/About.jsx:49`.
  - Admin: `AboutSection.jsx:145`, `ConfigPreviewModal.jsx:~2069`.
- **Impact:** `PUT .../by-slug/privacy-policy {"content":"<img src=x onerror=...>"}` runs script for every website visitor and for any admin who previews it. The admin token is in `localStorage`, so an injected script can steal it.
- **Fix:** sanitise on save with `sanitize-html` (allow-list: `p,h2,h3,strong,em,u,ul,ol,li,blockquote,br,a[href|target|rel]`, no `on*`, no `javascript:`/`data:` URLs), wrap render points in DOMPurify, and narrow the CKEditor allow-list.

#### LG-02 · High · A failed load shows default text as if it were saved, so Publish overwrites live content
- **Files:**
  - `LegalSectionsEditor.jsx:77-85`
  - `legalPageApi.js:199-209` and `:126-132`
  - `AboutSection.jsx:226-240`
  - `AppComplianceSection.jsx:51-54`
  - `ContactDetailsSection.jsx:112-116`
- **Scenarios:**
  - **Legal pages:** the GET fails (500, 403 or timeout). The bundled default text becomes the "saved" state with no unsaved banner, and one Publish overwrites the live page.
  - **About:** one of the four GETs fails. All four fall back to defaults, and Publish overwrites all four pages.
  - **Compliance:** the load fails, so the form shows `enabled: true, names: "GDPR, HIPAA"`, and that gets published.
  - **Contact details:** the list loads empty, but "+ Add detail" is still enabled. Adding one row PATCHes `web_contact_details` with only that row, wiping every existing detail.
  - **404 (e.g. `contact-us` was never seeded):** the admin shows defaults marked LIVE while the website shows "Page not found".
- **Fix:**
  - Add a `loadError` state with an error view and Retry button, lock the editor and Publish until the load succeeds, and have publish handlers throw if the page hasn't loaded.
  - Have `getLegalPage` return `isDefault: true` on 404 so the UI can show a "Default template, not published yet" banner.

#### LG-03 · High · No unsaved-changes protection
Same as SH-05. Every Publish-model screen loses edits when the admin navigates away, closes the tab or refreshes. The banner says *"stored in this session only"*, but the edits live only in memory.

#### LG-04 · High · Preview ignores unsaved edits on all `LegalSectionsEditor` pages
- **File:** `LegalSectionsEditor.jsx:61` calls `setBlocks` only inside `applySavedPage` (after load or publish). `markDirty` and the title, content and live change handlers never update the page-level blocks that `ConfigPreviewModal` reads.
- **Impact:** Preview shows the last published version, or the hardcoded defaults if opened before load finishes. This contradicts the hint in `configPreviewHint.js` ("Edit the copy, then open Preview").
- **Fix:** in `markDirty`, call `setBlocksRef.current(previewBlocksFromContent(title, content, live))`.

#### LG-05 · Medium · `common-about` publishes four pages with no partial-failure handling
- **File:** `AboutSection.jsx:253-269` uses `Promise.all(current.map(saveLegalPage))`.
- **Impact:** if one page fails, the others are already saved, but the UI treats the whole publish as failed and still marks everything as unsaved. The website ends up with mixed old and new copy.
- **Fix:** use `Promise.allSettled`, mark successful pages as saved, and show a toast naming the failed pages.

#### LG-06 · Medium · About and Compliance can publish before loading finishes, and About drops an open edit
- **Files:** `AboutSection.jsx:192, 249-271, 252`, `AppComplianceSection.jsx:95-98`. The header Publish button is never disabled.
- **Scenarios:**
  - Publishing before the GET completes writes the default values.
  - On About, typing in an open card without pressing the card's Save and then pressing the header Publish shows a "published" toast but discards the typed text.
- **Fix:** throw "Still loading" while `loading` is true, and throw "Save or cancel the open edit first" while `editingSlug` is set.

#### LG-07 · Medium · `common-about` checks different permissions in the UI and the backend
- **Files:** `configsData.js:852-873` maps `common-about` to `ct`, but `Backend/routes/adminRoutes/adminStaticPageRoutes.js:19-20` require `console.cf.view` / `console.cf.edit`.
- **Impact:** a `ct` editor gets a 403 on load, then sees defaults (LG-02), then gets a 403 on Publish. A `cf` editor can change About copy through the API without having About access in the UI.
- **Fix:** accept `ct` permissions for the four About slugs, or move `common-about` to `cf`.

#### LG-08 · Medium · Contact details: hidden or deleted phone/email still show, deleted rows come back, and saving changes other configs
- **Files:** `Admin/src/api/contactDetailsApi.js:15-33, 44-68`, `Frontend/src/site/hooks/useSiteConfig.js:177-184`, `ContactDetailsSection.jsx:153-184`.
- **Scenarios:**
  - Hiding or deleting the Phone row leaves it visible on the website, because the footer falls back to `app_mobile`.
  - Deleting every row re-seeds Phone and Email straight away (`if (mapped.length) return mapped;`).
  - A live "WhatsApp" row matches `/phone|mobile|whatsapp|tel/`, so it overwrites `app_mobile`, which the App Content config and the app also use.
  - There's no email or phone format check, no max length, and duplicate labels are allowed.
- **Fix:** stop syncing to `app_*` (or clear those fields when no live row of that type remains), re-seed only when the field is `undefined`, and add validation.

#### LG-09 · Medium · Contact Us page body is edited in the admin but never shown on the website
- **File:** `Frontend/src/site/components/ContactUs.jsx:209` renders only `page?.title`.
- **Fix:** render the sanitised `page.content`, or reduce the admin editor to the title only.

#### LG-10 · Medium · Separate web and app versions don't work end to end
- **Files:**
  - `staticPageModel.js:101-105, 164-168, 213-218` always store the web-compiled `content`.
  - `userController/miscController.js:207-216`: `?platform=app` is ignored once content is stored.
  - `staticPageController.js:104-106`: `if (blocks === undefined) updates.blocks = null`.
  - `legalPageApi.js:57-68, 88`
  - `AboutSection.jsx:167-186`
- **Impact:**
  - The app always receives the web text.
  - Publishing from `LegalSectionsEditor` sends only content, so the backend wipes the stored blocks and version history.
  - `blocksFromSections` overwrites old versions in place and drops sections without a title.
  - About resets to v1 on every publish.
- **Fix:** implement per-surface compilation with append-only versions, or remove the version UI and the `?platform` handling.

#### LG-11 · Medium · About description titled "About Us" loses its body, and hiding it shows fallback text
- **Files:** `AboutSection.jsx:66-75`, `Frontend/src/site/api/publicMisc.js:371-381`, `Frontend/src/site/components/AboutUsSection.jsx:354-360`.
- **Impact:**
  - A title of "About Us" with no headline reloads as defaults, and the next Publish overwrites the saved body.
  - Hiding the Description shows the hardcoded "Meet Your Wellness Partner" text on the website instead of hiding the block.
- **Fix:** remove the generic-title special case, and skip the block on the website when the page is inactive.

#### LG-12 · Medium · Publish handler is never cleared, so the previous page can be published
Same as SH-06. Additionally, `previewOpen` and `publishOpen` carry over when `configId` changes.

#### LG-13 · Low/Medium · Static-page save has no size limits, returns raw errors and silently renames slugs
- **Files:** `staticPageController.js:47-122`, `Backend/config/index.js:34` (5 MB JSON limit), `middleware/errorHandler.js`.
- **Impact:**
  - Content above DynamoDB's 400 KB item limit returns a raw 500 error.
  - There is no length limit on title or content.
  - An alias match (e.g. an existing `privacy` row) silently renames the stored slug to `privacy-policy`.
- **Fix:** cap the title (~200 characters) and HTML (~300 KB) with a friendly 400/413, map DynamoDB errors to friendly messages, and don't rename the slug on an alias match.

#### LG-14 · Low (High if ever enabled) · `web-fs-text` can't be reached, and its editor has a crash bug
- **Unreachable:** `web-fs-text` isn't in `configsData.js`, so `/configs/web-fs-text` redirects to the list.
- **Dead references:** `ConfigDetailPage.jsx` (lines 1301, 1589, 1759, 2282-2294), `legalPageApi.js:195`, `configPreviewHint.js:24`, `ConfigPreviewModal.jsx:2461-2471`.
- **Crash bug:** `LegalBlocksSection.jsx:353` calls an undefined `persist(`, which throws a ReferenceError on "Save version".
- **Fake upload:** Upload and Replace (lines 324-331) only set `uploaded: true` without uploading anything.
- **Fix:** delete the dead path, or add the catalog item and fix the component.

#### LG-15 · Low · Dead switch cases and legacy-id code
- **`ConfigDetailPage.jsx`:** cases at 1979, 2000-2001, 2022-2031 and 2032, the `AppTermsConditionsSection` import, `appTermsBlocks` state, and duplicate summary branches at 1746-1755.
- **`ConfigPreviewModal.jsx`:** the legacy cases, plus the `app-compliance` preview case, which can't be reached because `PREVIEW_CONFIGS` only holds the legal slug map.
- **Also:** the `app-tos` / `common-*` branches in the `isLegal*ConfigId` helpers.

#### LG-16 · Low · Publish modal behaviour and copy are inconsistent
- **Modal closes on failure:** `publishConfig` swallows errors, so `ConfigPublishModal.handleConfirm` always closes. The modal should stay open on failure.
- **Same copy for every config:** it always says "go live on the website and app", even for app-only (`app-dpa`) or web-only pages.
- **Wrong warning on Contact Us:** the modal says refreshing discards changes, but contact details already saved instantly.
- **Four names for one page:** the app Terms page is called "Terms of Service" in the catalog, "App Terms and Conditions" in the editor, `/app-terms-and-conditions` as the route, and "Terms of Service" in the preview.
- **Fix:** rethrow in `publishConfig` after the toast, and build the copy from `item.app` / `item.web`.

#### LG-17 · Low · Read-only role and Preview access gaps
Same as SH-09 and SH-11. Preview opens without view permission and shows hardcoded defaults.

#### LG-18 · Low · Small validation and UX gaps
- `AboutSection.jsx:323-328`: "Title is required" can never trigger, because an empty title falls back to the default.
- `AboutSection.jsx:434`: the icon `<img>` has no `onError` fallback.
- `AppComplianceSection.jsx:80-81`: disabling with empty names silently saves "GDPR, HIPAA".
- `LegalSectionsEditor.jsx:99`: an emptied title is silently replaced, and the title input has no `maxLength`.
- `legalPageApi.js:119-120`: plain-text bodies are inserted unescaped and without `<p>` wrapping.
- Website footer (`SiteFooter.jsx:49-52`) always shows legal links. When a page is hidden, `StaticPageView.jsx:52-55` shows a red "Page not found" alert instead of "This page is currently unavailable".

**Needs live verification:**
- Whether CKEditor keeps `<script>` tags or `on*` attributes.
- Whether both singular and plural slug rows exist in DynamoDB.
- How the mobile app renders this HTML (the app code isn't in this repo).

### 4.3 App · Heal & Banks

**Status summary**

| Config | Status | Findings |
|---|---|---|
| `app-measurement-video` | ⚠️ Works with issues | HB-06, HB-M3 |
| `app-onboarding-video` | ⚠️ Works with serious issues | HB-05, HB-07, HB-M4, HB-M5 |
| `app-medical-questionnaire` | ⚠️ Works with issues | HB-M6 |
| `app-health-progress` | ⚠️ Works with serious issues | HB-02 |
| `app-diet-plans` | ⚠️ Works with issues | HB-M15 |
| `app-test-catalog` | ⚠️ Works with issues | HB-M7, HB-M8 |
| `app-challenges` | ⚠️ Works with issues | HB-M9 |
| `app-coupons` | ⚠️ Works with issues | HB-M10 |
| `app-nutrition-bank` | ⚠️ Works with issues | HB-M11 |
| `app-drf-bank` | ⚠️ Works with issues | HB-M12 |
| `app-rx-bank` | ⚠️ Works with issues | HB-M7 |
| `app-commitment-letter` | ❌ Partly broken ("Push to app" is fake; stale signed status) | HB-03, HB-04, HB-07, HB-M1, HB-M2 |
| `app-gallery` | ⚠️ Works with issues | HB-M13 |

**Verified working**

| Config | What works |
|---|---|
| Measurement video | Live toggle saves correctly. |
| Onboarding video | Per-coach live toggle, upload, and MIME checks. |
| Medical questionnaire | Delete confirmation; rollback on toggle, type, delete and reorder; answer types match the backend. |
| Health progress | Save and reload return the same data when the load succeeded. |
| Diet plans | After adding, it jumps to the last page, which is correct because this list sorts oldest first. Backend limits title (2–200) and content (≤ 4000). |
| Test catalog | Backend length and parameter limits; deleting a test that is in use is blocked. |
| Challenges | Thorough frontend validation; backend checks price and dates; deleting a challenge with enrollments is blocked. |
| Coupons | 409 on duplicate codes; percentage capped at ≤ 100. |
| Nutrition bank | Object URLs are released; delete confirmation; crop flow; routes gated by `cf.*`. |
| DRF bank | Backend enforces the weight and points caps. |
| Rx bank | Delete confirmation; deleting a protocol that is in use is blocked. |
| Commitment letter | Empty text rejected on both client and server; double-save guard; the WhatsApp reminder calls a real endpoint; coach letter upload is PDF-only. |
| Gallery | Live assets can't be deleted (client and server); delete confirmation; bulk delete reloads on failure; history and download work; routes gated by `cf.view` / `cf.edit` / `cf.delete`. |

#### HB-01 · Critical · App-config GET returns gateway secrets
Same issue as SH-02 / AC-01. Measurement video, Health progress and Commitment letter all load through this endpoint.

#### HB-02 · High · Health progress: after a failed load, any edit deletes all custom trackers
- **Where:** `Admin/src/components/ConfigAppRemainingSections.jsx:43-44`. When the load fails, it shows `DEFAULT_HEALTH_PROGRESS_TRACKERS` and leaves editing enabled.
- **Impact:** toggling one tracker PATCHes the default list. `normalizeHealthProgressTrackers` keeps only what was sent plus the built-in trackers, so every custom tracker is deleted.
- **Fix:** add a `loadError` state with Retry and block edits until the load succeeds. Optionally, have the backend reject payloads that drop existing custom ids unless the deletion is explicit.

#### HB-03 · High · Commitment letter: after a failed load, Save overwrites the real letter and forces every coach to re-sign
- **Where:** `ConfigDetailPage.jsx:1382` starts from `useState(COMMITMENT_LETTER_DEFAULT)`. `CommitmentLetterSection.jsx:244-245` only shows a toast when the load fails. `appConfigController.js:786-795` bumps the version whenever the text changes.
- **Impact:** a failed load shows believable default text. One click on Save replaces the production letter, creates v(n+1), and moves every coach to "pending".
- **Fix:** show an error state and disable Save and Reset until the load succeeds.

#### HB-04 · High · Commitment letter: "Push to app" is fake
- **Where:** `CommitmentLetterSection.jsx:189-192` only sets a busy flag and shows a success toast (`setBusyPush(true); onToast("Reminder pushed…"); setBusyPush(false);`). No API is called.
- **Fix:** add a push-reminder endpoint (the `teamReminderService` push path already exists), or hide the button.

#### HB-05 · High · Onboarding video: "Pick from Gallery" makes coaches share one stored file
- **Where:** `Backend/controllers/accountController/accountAdminController.js` `applyCoachContentPatch` (~L703-881). A gallery pick copies the source coach's `videoKey` / `coverKey`. `replaceMediaKey` then deletes the old key whenever either coach replaces the video or cover, or switches to a link.
- **Impact:** the other coach's intro video or cover breaks. Separately, uploading a video without a cover in the same request wipes the existing cover, and the frontend always uploads them separately.
- **Fix:** copy the S3 object on a gallery pick, or check that no other account references a key before deleting it.

#### HB-06 · High · Measurement video: the old guide video is deleted before the new one is validated or saved
- **Where:** `appConfigController.js:811-816` deletes the stored video before the checks at 835-846 and before the DB write. This is the same pattern as SH-03.
- **Fix:** validate first, then write the DB, then delete the old file.

#### HB-07 · High · Onboarding and Commitment letter coach lists fail for non-admin editors, and it looks like "no coaches"
- **Where:** `Backend/routes/accountRoutes/index.js:113, 144-150` guard `/account/accounts` and `coach-content` with `requireActiveRole("admin")`. The UI shows "No active wellness coaches found." whenever the request fails.
- **Fix:** gate these routes with `authorizeStaff("console.cf.*")` so they match the config permission, and show a distinct error state.

#### Medium findings

**HB-M1 · Commitment letter: coaches who signed an old version still show as signed.**
- **Where:** `Admin/src/api/coachContentApi.js:79`: `signed = hasFile && (letter.signed || signedVersion === letterVersion)`. The backend sets `signed = true` permanently.
- **Fix:** use `signedVersion === letterVersion` only.

**HB-M2 · Commitment letter: any text edit silently creates a new version that every coach must re-sign.**
- **Fix:** show a confirm dialog ("This creates v{n+1}; all coaches must re-sign").

**HB-M3 · Measurement video: problems saving the copy.**
- **Where:** `MeasurementVideoSection.jsx:112-115` closes the editor even when the save fails, so the draft is lost.
- **Also:**
  - An empty title silently falls back to the default.
  - There is no length or URL validation.
  - A failed load shows editable defaults.

**HB-M4 · Onboarding video: "Saved" shows even when the save fails.**
- **Where:** `OnboardingVideoSection.jsx:185-189`.
- **Also:** there is no empty-title validation.

**HB-M5 · Onboarding video: stats and gallery reflect only the current page.**
- **Stats:** they mix the overall total with counts from the current page, so "Every coach has a live video" can be wrong.
- **Gallery:** it lists only coaches on the current page.
- **Tags:** `ONB-XX` tags come from list position (`coachContentApi.js:46`), and `ONB-DEFAULT` doesn't exist in the backend.
- **Pages:** switching pages has no stale-response guard.

**HB-M6 · Medical questionnaire: failed load looks empty, and reorder can scramble the order.**
- **Where:**
  - A failed load shows "No questions yet".
  - `limit: 200` silently cuts off anything past the backend maximum.
  - Reorder sends only the loaded ids, and the model applies it with a non-atomic `Promise.all`.
- **Fix:** add an error state, and do the reorder as a batched or transactional update with the full id list.

**HB-M7 · Test catalog and Rx bank: a newly added item lands on the wrong page.**
- **Where:** `TestCatalogSection.jsx:437-439` and `RxBankSection.jsx:311-313` jump to the last page, but both lists sort newest first.
- **Fix:** go to page 1.

**HB-M8 · Test catalog: silent validation, lost edits and broken references.**
- `TestEditModal.save()` returns `false` without a toast when validation fails.
- `useEffect([test])` wipes unsaved modal edits when the Live toggle refreshes.
- The `testId` slug stays editable even though coach recommendations reference it. Delete checks references, but update doesn't.

**HB-M9 · Challenges: image picks, group counts and paging.**
- `ChallengesSection.jsx:229` replaces earlier image picks instead of appending, and new files get no preview.
- "New group" has no busy guard, so a double-click creates duplicates.
- `challengeController.js:293-296` never decrements the old group's count when a challenge is unassigned, so counts drift.
- There is no group capacity check, and the count increment is a non-atomic read-then-write.
- Enrollments and challenges load with limits of 50 and 100 and no pagination.
- "Run job now" has no confirmation.

**HB-M10 · Coupons: bad values, lost scoping and a misleading empty state.**
- `CouponsSection.jsx:96` turns an empty or invalid value into 0, and the backend accepts 0.
- Lines 98-99 hardcode `appliesTo: ["challenge"], challengeIds: []` on every save, wiping any existing scoping.
- A failed load shows "No coupons yet".

**HB-M11 · Nutrition bank: name length mismatch.**
- The frontend allows 80 characters (`NutritionBankSection.jsx:33`); the backend allows 60 (`supplementController.js:20`). Names of 61–80 characters pass the UI and then fail on save.

**HB-M12 · DRF bank: deletes and autosave.**
- Deleting a section or question has no confirmation, and deleting a section also deletes its questions.
- Problems with the 450 ms autosave:
  - A slow response can overwrite newer keystrokes.
  - Leaving the page drops pending edits.
  - Any error reloads everything, which wipes other local edits.
  - Clearing the weight sends 0, which the backend rejects.
- The subtitle says values "above the cap are trimmed on save", but the backend rejects them instead.

**HB-M13 · Gallery: filter change race.**
- Changing a filter fetches with the old page, then the page-reset effect fetches again. There is no stale-response guard, so the wrong page and total can win.

**HB-M14 · Orphan uploads and double uploads.**
- These upload to S3 before validating the request, so a rejected request leaves an orphan file: `applyMediaUploads`, `uploadChallengeImages`, supplement upload.
- `useMediaPicker` / `MediaPickerModal` uploads to `/admin/media-assets` and then uploads the same file again to the target endpoint. Every pick is uploaded twice, and a rejection leaves an orphan in the library. The progress bar is fake (35% → 100%).

**HB-M15 · Diet plans: autosave and counts.**
- Edits save on blur, including when you click Delete or Close (needs runtime check).
- Counts are for the current page only but are labelled as totals.
- Changing page fetches twice.

#### Low findings

| Config | Findings |
|---|---|
| Coupons | No code-format validation; delete not guarded against double-clicks; no upper limit on fixed discounts; duplicate check can race with a concurrent create. |
| Medical questionnaire / DRF bank | Delete routes require `cf.edit` instead of `cf.delete`; no `maxLength` on inputs (backend allows 300); duplicates allowed. |
| Health progress | The `builtin` flag is trusted from the client; no duplicate-name or length checks. |
| Diet plans | Update uses `req.body.live ? "active" : "inactive"`, so the string `"false"` becomes active. |
| Rx bank | Title can't be edited after creation; duplicate titles return a technical 409; Enter followed by blur may add the same entry twice. |
| Gallery | Restore has no confirmation and doesn't restore `type`; files beyond the 30-version history become orphans; the type filter is hidden but still applied; the summary pill reflects only the current page; from-date after to-date is accepted; backend accepts PDF, zip and doc uploads as `image`. |
| Commitment letter | The signature box is a static placeholder; coach list capped at 200; `remind-whatsapp` accepts any `accountId`; unsaved text is lost on return. |
| MediaPickerModal | Escape closes the modal during an upload; object URLs can leak; the library shows at most 100 items. |
| All | "Add one below" copy appears in sections where the form is above the list. |
| Dead code | `DrfActivityBankPanel` and `CommitmentLetterPanel` in `ConfigAppRemainingSections.jsx` are unused and show fake toasts. |

**Needs live verification:**
- Diet-plan saves firing on blur, and the Rx Enter-plus-blur double add.
- Challenge image parsing when updating.
- Whether a fixed coupon larger than the price is capped.
- Whether client supplement recommendations break after a nutrition-bank item is deleted.
- The object-URL leak under React StrictMode.

### 4.4 App · Body, Mind & Soul libraries, and App · System

**Status summary**

| Config | Status | Findings |
|---|---|---|
| `common-mental-wellbeing` | ⚠️ Works with issues | SY-04 to SY-10, SY-L1 to SY-L4 |
| `common-wellness-yoga` | ⚠️ Works with issues | SY-04 to SY-10, SY-L3, SY-L4 |
| `common-physical-exercise` | ⚠️ Works with issues | SY-04 to SY-10, SY-L1 to SY-L4 |
| `app-launch` | ⚠️ Works with serious issues | SY-02, 03, 11 to 16, SY-L5, SY-L6, SY-L11 |
| `app-prakriti` | ⚠️ Works with issues | SY-14, 17, 18, SY-L7 to SY-L9, SY-L11 |
| `app-ai-enable` | ❌ Broken (toggle has no effect) | SY-01, SY-14, SY-L9 |
| `feature-flags` (not in catalog) | Dead code | SY-L12 |

**Verified working**
- **Wellness libraries:**
  - Loading always finishes.
  - Empty and filtered-empty states are shown.
  - Delete asks for confirmation.
  - Titles are trimmed, required and capped at 100 characters on both client and server (mental/yoga).
  - The time format is validated.
  - The 25 MB limit matches the backend.
  - Pagination steps back when the last row on a page is deleted.
  - Routes are protected by `protectAccount` + `authorizeStaff`.
  - The app's assigned-content endpoints hide inactive or deleted items.
- **LAUNCH:**
  - The backend validates weights (0–100 and the remaining free weight), question points within the domain, and name lengths.
  - Coach and user endpoints use only live domains and enabled questions.
  - Toggles roll back correctly when a save fails.
- **Prakriti:**
  - Busy states and rollbacks work, and deletes ask for confirmation.
  - The backend validates lengths, status and type.
  - Coach endpoints return only active items.
- **AI enable:**
  - Double-click guards and rollback work.
  - Bulk actions reload the list when they fail.
  - The backend validates the role and `enabled`.

#### SY-01 · High · AI enable is saved but never enforced
- **Where it's written:** `aiEnabled` is set only in `Backend/controllers/adminController/aiEnableController.js` (lines ~107 and ~132) and stored in `accountModel.js`.
- **Where it should be checked but isn't:** no code reads it, including the AI endpoints `testRecommendationController.js` ~L216 (lab-report analysis) and `mealTrackingController.js` ~L251 (meal-photo analysis).
- **Impact:** switching AI off for a coach does nothing, even though the UI copy (`AiEnableSection.jsx` ~L210) promises the feature is hidden.
- **Fix:**
  - Add middleware to both AI routes that returns 403 when the acting account has `aiEnabled === false`, and decide whether an assistant inherits its parent coach's flag.
  - Expose `aiEnabled` on `/coach/me` so the coach UI can hide the button.

#### SY-02 · High · LAUNCH score scale mismatch (0–100 vs 0–750)
- **The mismatch:** `Admin/src/components/clientProfile/LaunchSection.jsx:683` saves `totalScore` on a 0–100 scale (`launchConfigData.js:295` `maxOverall: 100`). The user-facing zones in `Backend/controllers/userController/launchAssessmentController.js:20-27` run 0–150 "Needs attention" up to 601–750 "Excellent", and `userLaunchAssessmentModel.js:24` sets `SCORE_MAX = 750`.
- **Impact:** a perfect score of 100 falls in "Needs attention", so every client sees the red zone in the app. `adminAtAGlanceService.js:205` already notes that legacy data may use the 750 scale.
- **Fix:** pick one scale, then align the zones, `SCORE_MAX` and a migration for existing rows.

#### SY-03 · High · LAUNCH deletes have no confirmation, and deleting a domain deletes its questions
- **Files:**
  - `LaunchSection.jsx` L620–628 (domain), L687–694 (question) and L473–481 (rating) call remove directly.
  - The backend `launchConfigController.js` ~L431 also runs `deleteQuestionsByDomainId`.
- **Fix:**
  - Put `ConfirmDialog` in front of all three deletes, and show the question count in the domain dialog.
  - Block deleting a rating that saved assessments still reference.

#### SY-04 · Medium · Switching between the three wellness libraries can show the wrong items
- **File:** `WellnessLibrarySection.jsx` L456–519. The component is reused with a different `kind` and has no `key`.
- **Impact:**
  - The old page, search and filter are used for the first fetch.
  - Responses can arrive out of order, so Mental items can appear under Yoga.
  - Edit or delete then calls the wrong endpoint and gets a 404.
- **Fix:** render the section with `key={kind}` in `ConfigDetailPage.jsx` ~L2470. Guard `loadItems` with a request id or an `AbortController`.

#### SY-05 · Medium · Failed live-toggle rollback leaves the switch wrong and wipes open edits
- **File:** `WellnessLibrarySection.jsx` L672–678. `snapshotItem` (L80–89) doesn't include `live`.
- **Impact:** after a failed toggle, the switch still shows the new state. Any unsaved edits on that row are overwritten.
- **Fix:** roll back only `{ live, status }`, and disable the toggle while the row is being edited.

#### SY-06 · Medium · A failed edit save discards the user's input
- **File:** `WellnessLibrarySection.jsx` L657–662: `else { updateItem(item.id, saved); }`.
- **Fix:** keep the edits and show the error so the user can retry.

#### SY-07 · Medium · "Add" can create two items while the YouTube duration is detected
- **File:** `WellnessLibrarySection.jsx` L794–810. `setBusy(true)` runs after `await detectYoutubeTime`, and `locked` ignores `detecting`.
- **Fix:** set `busy` before the await, or include `detecting` in `locked`.

#### SY-08 · Medium · Changing the YouTube link keeps the old duration
- **Files:** `WellnessLibrarySection.jsx` L606. The backend (`mentalWellbeingController.js` L180–190) trusts the supplied duration.
- **Fix:** when `ytLink` changes, clear the duration and detect it again.

#### SY-09 · Medium · Backend deletes old media before validating, and uploads before validating
- **Files:** `mentalWellbeingController.js` (create L64 vs L67; update L136, L155–157, L173 vs the checks at L153 and L187 and the DB write at L202), `wellnessYogaController.js` L133–173, `physicalExerciseController.js` L150–193.
- **Impact:** this is the same pattern as SH-03. A failed update leaves broken media, and a failed create leaves orphaned S3 files.
- **Fix:** validate first, upload, write the DB, then delete the old files.

#### SY-10 · Medium · Uploads have no per-field file-type check
- **Files:**
  - `Backend/utils/fileUploader.js` L7–42 and L104–122 apply one global allow-list to every field, including SVG, PDF, Office and zip.
  - The client-side `assertMediaFile` checks only size.
  - The `WELLNESS_VIDEO_ACCEPT`/`WELLNESS_AUDIO_ACCEPT` constants are imported but unused.
- **Impact:** a PDF, SVG or zip can be uploaded as a thumbnail, and a document can be uploaded as audio.
- **Fix:** validate the MIME type per field on both client and server. Thumbnails should be `image/*` without SVG, and media files must match `type`.

#### SY-11 · Medium · LAUNCH save-as-you-type races and eats spaces
- **Files:** `LaunchSection.jsx` L147–155 and L182–206 (450 ms debounce, then the server response is merged back in), `launchConfigApi.js` L105, L152 and L199 (trim).
- **Impacts:**
  - Typing "Load ", pausing, then typing "Preset" produces "LoadPreset".
  - Out-of-order responses can restore older text.
  - An invalid rating value (0 or >100) or a cleared name gets a 400, and the screen then calls `loadConfig()`, which reloads everything and collapses all panels.
- **Fix:**
  - Save on blur, or stop merging text fields back from the response.
  - Validate ranges on the client.
  - Roll back just that field on error.

#### SY-12 · Medium · Leaving LAUNCH within 450 ms drops pending saves
- **File:** `LaunchSection.jsx` L118–120. On unmount the timers are cleared instead of run.
- **Fix:** run the pending saves on unmount, or warn before leaving.

#### SY-13 · Medium · A failed LAUNCH load looks like an empty, editable config
- **File:** `LaunchSection.jsx` L133–137. Prakriti (L94–98) and AI enable (L137–139) do the same.
- **Impact:** the admin may re-create domains that already exist.
- **Fix:** show an error state with a Retry button, and block editing until the load succeeds.

#### SY-14 · Medium · Server trusts the client's LAUNCH `totalScore`
- **File:** `launchAssessmentControllerHelpers.js` L65–70 and L302.
- **Fix:** recompute the score on the server from `answers` against the live config.

#### SY-15 · Medium · Disabling every LAUNCH question brings back the old question bank
- **File:** `launchAssessmentControllerHelpers.js` L237–253 falls back to the legacy `listLaunchQuestions` when no config questions are enabled.
- **Fix:** use the fallback only when the config tables have no rows at all.

#### SY-16 · Low · LAUNCH weight copy and totals disagree with the backend
- **Totals differ:** the frontend "allocated" total counts domains that are off (`launchConfigData.js` L203–208); the backend counts only live ones (`launchScoreService.js` L28–33).
- **No free-weight limit:** weight edits aren't capped to the remaining free weight.
- **"Must total 100" is not enforced:** only "≤ 100" is checked.

#### SY-17 · Medium · Prakriti reorder sends a request per row, and partial failures leave the order inconsistent
- **Files:** `PrakritiAssessmentSection.jsx` L229–258, L358–385 and L457–480.
- **Fix:** save only the two swapped rows, or add a bulk reorder endpoint. Reload after a failure.

#### SY-18 · Medium · Hidden Prakriti recommendations still reach clients
- **File:** `Backend/models/userPrakrutiAssessmentModel.js` L81–92 prefers the stored `recommendationTexts` and `avoidTexts` copies, which are never filtered against active items.
- **Fix:** decide whether saved texts should stay frozen. If not, filter them against the currently active titles. This needs an app-side check of which field the app reads.

#### Low findings (SY-L*)
- **SY-L1:** physical-exercise titles have no backend max length (`physicalExerciseController.js` L69 and L125–128).
- **SY-L2:** deleting an audio exercise leaves the file in S3 (L237 only checks `video`).
- **SY-L3:** the client-side YouTube check accepts `evilyoutube.com` (`wellnessLibraryData.js` L99 uses `endsWith`).
- **SY-L4:** cancelling an edit keeps the discarded file's blob preview, and the blob URL is never released.
- **SY-L5 / SY-L6:** see SY-16.
- **SY-L7:** Prakriti column headers show "x / 10", implying a limit that doesn't exist.
- **SY-L8:** a new Prakriti item's `sortOrder = count + 1` can collide with an existing one after deletes.
- **SY-L9:** Prakriti and AI enable silently stop at 200 rows, with no pagination.
- **SY-L10:** read-only mode is CSS-only (SH-09). `canEditConfig` treats `cf.toggle`/`cf.delete` as edit access, but the PATCH routes need `cf.edit`.
- **SY-L11:** duplicate names are allowed for ratings, domains, questions and Prakriti items.
- **SY-L12:** dead code:
  - the `feature-flags` screen: `FeatureFlagsSection.jsx`, `featureFlagsData.js`, and in `ConfigDetailPage.jsx` the state (L1438), the summary branch (L1799), the switch case (L2217) and the class (L2481), plus the case in `ConfigPreviewModal.jsx` (L2648);
  - the LAUNCH mock re-exports and the unused `adminScoreLaunchConfig`;
  - the unused wellness `ACCEPT` constants.
- **SY-L13:** raw Axios error text is shown to users (SH-13).

**Needs live verification:**
- The SY-04 race when switching libraries quickly with a filter applied.
- Whether `MediaPickerModal` filters by `accept`.
- Which Prakriti fields the app reads (SY-18).
- How the app renders LAUNCH zones, and whether legacy rows use the 0–750 scale (SY-02).

### 4.5 Web tab

**Status summary**

| Config | Status | Findings |
|---|---|---|
| `web-program-testimonials` | ⚠️ Works with issues | WB-M3, WB-M7, WB-L3 |
| `web-footer` | ⚠️ Works with issues | WB-M6 |
| `web-fs-social` | ⚠️ Works with issues | WB-01, WB-06, WB-07, WB-M8, WB-L2 |
| `web-fs-contact` | ❌ Broken (see LG-08/09) | WB-01, WB-02, WB-03, WB-M4, WB-M5 |
| `web-app-content` | ⚠️ Works with issues | WB-01, WB-04, WB-M5, WB-M10 |
| `web-logo` | ⚠️ Works with issues | WB-M1, WB-M2, WB-M3, WB-L7 |
| `web-location` | ❌ Not visible on the website | WB-01, WB-04, WB-05, WB-M4, WB-L5 |

**Verified working**

| Config | What works |
|---|---|
| Program testimonials | Loading, empty, error and busy states work, and delete asks for confirmation. Reorder and the live toggle roll back on failure. Required fields are checked on both client and server. Images must be `image/*` and are cropped to 1:1. Routes are guarded by `ct.view/edit/delete`. Field names match across admin, backend and site. |
| Footer | Loading, error and empty states work. The field is trimmed, capped at 100 characters and cannot be saved empty. `app_footer_text` matches end to end. |
| Social links | The client blocks `javascript:` and other non-http(s) URLs. The unsaved-changes banner works. Field keys match the website, and the website's `toExternalHref` neutralises bad footer URLs. |
| Contact details | Delete asks for confirmation. The toggle rolls back on failure, and the busy lock works. |
| App content | Save is disabled when nothing changed and while saving. Fields are trimmed. `app_name` drives the site header. |
| Logo | Field names match. The favicon syncs in both admin and site. A failed upload keeps the current logo. |
| Location | Name and address are required. The toggle rolls back on failure. |

#### WB-01 · High · If the first load fails, saving overwrites live data (Social, Contact, Location, App content)
- **`web-fs-social`:** on error, `SocialLinksSection.jsx:179-187` treats blank rows as the saved state, while Publish stays available. Publishing then sends empty strings for Facebook, the app-store links and the other fields, plus `web_social_links: []`. **This wipes all social and app-download links.**
- **`web-fs-contact`:** `ContactDetailsSection.jsx:113-116` shows an empty list. Adding one row replaces every existing detail on the server.
- **`web-location`:** `LocationsSection.jsx:140-142` and `209-211` have the same problem.
- **`web-app-content`:** `AppContentSection.jsx:38-41` falls back to empty content. Saving then sends `address: ""` and wipes the saved address.
- **Fix:**
  - Add a `loadError` state with an error view and Retry button.
  - Lock editing until a load succeeds.
  - Don't register the Publish handler until the section has loaded.

#### WB-02 · High · Hiding or deleting the phone/email in Contact details doesn't hide it on the website
- Covered by LG-08. The website falls back to `app_email` / `app_mobile` (`useSiteConfig.js:178-184`), and these fields keep the last synced value.
- The WhatsApp link also keeps using the hidden phone number.

#### WB-03 · High · Contact values aren't validated, and saving silently overwrites the app-wide email and mobile
- **Where:** `ContactDetailsSection.jsx:153-176` only trims and checks the value isn't empty. `contactDetailsApi.js:59-63` copies it into `app_email` / `app_mobile`. The backend stores both unvalidated (SH-08).
- **Scenario:** a row labelled "Email" with the value "abc" sets `app_email` to "abc", and App content then shows "abc". A row labelled "WhatsApp" overwrites `app_mobile`.
- **Fix:** validate by label type on both client and server, and tell the admin that saving also updates App content.

#### WB-04 · High · Locations and the App content address don't appear anywhere on the public website
- **Where:** `Frontend/src/site/components/ContactSection.jsx` is the only component that renders `contact.locations` / `contact.address`, and **nothing imports it** (verified). `/contact-us` shows only the form, and `SiteFooter.jsx` renders no address.
- **Misleading copy:** `LocationsSection.jsx:230` says "Shown on the contact page and in the footer", which is not true.
- **Fix:** render the locations block on `/contact-us` and/or in the footer, or correct the copy.

#### WB-05 · High · Deleting a location has no confirmation and saves immediately
- **Where:** `LocationsSection.jsx:312-315`.
- **Fix:** reuse the `ConfirmDialog` that Contact details already uses.

#### WB-06 · High · Footer social icons are nested inside a `<Link to="/">`
- **Where:** in `Frontend/src/site/components/SiteFooter.jsx:179-217`, the social `<a target="_blank">` anchors, and `FooterBrandText`, sit inside the brand `<Link to="/">` (verified).
- **Why it matters:** an `<a>` inside another `<a>` is invalid HTML. React Router's click handler probably intercepts the click and navigates to Home instead of opening the social link.
- **Fix:** move the social block and the brand text outside the `<Link>`.
- **Runtime check:** click a footer social icon.

#### WB-07 · High · Stored XSS and a site-wide crash through unvalidated app-config fields
- **Unsafe links:** the website uses `android_app_link`, `ios_app_link` and `facebook` directly as `href` (`site/utils/mobileAppLink.js:26-27`, `AppDownloadButtons.jsx:41-48`, `useSiteConfig.js:307`). React 18 still runs `javascript:` links, and the backend doesn't validate these fields (SH-08). The admin UI does validate them, but anyone with `cf.edit` can call the API directly.
- **Crash:** sending `app_name` as an object makes `selectAppDisplayName` call `.trim()` on it (`Frontend/src/store/appConfigSelectors.js:14`), which **crashes the whole public site**.
- **Fix:**
  - Backend: check field types, cap lengths, and accept only http(s) URLs.
  - Website: add a `safeHref()` helper for every link that comes from config, and coerce values with `String(value ?? "")` in the selectors.

#### Medium findings

**WB-M1 · Logo uploads accept any file type, and the size limits are too loose.**
- The backend doesn't check image type for `LOGO_FIELDS`. SVG (which can contain script), PDF and zip are accepted up to 25 MB.
- The client lets through files with an empty MIME type, allows 25 MB even for the favicon, and doesn't check dimensions.
- **Fix:** accept png, jpeg and webp only, plus ico for the favicon. Cap uploads at about 2 MB (favicon about 256 KB) and check dimensions on the server.

**WB-M2 · Cropping turns SVG and GIF logos into opaque JPEGs.**
- `Admin/src/utils/cropImage.js:79` outputs JPEG for anything that isn't PNG or WebP, so transparent logos lose their transparency.
- **Fix:** output PNG whenever the source isn't JPEG.

**WB-M3 · The old image is deleted before the DB write.**
- This affects the logo and program testimonials (`programTestimonialController.js:147-152, 211-213`). It is the same issue as SH-03.

**WB-M4 · Deleted locations and contact details come back after reload.**
- `locationsApi.js:17-22` re-creates a "Registered office" row from `address`, and `address` is never cleared.
- `contactDetailsApi.js:25-32` re-creates the Phone and Email rows.
- **Fix:** seed default rows only when the field has never been set, not when it is an empty array.

**WB-M5 · App content, Contact details and Location silently overwrite each other.**
- Contact details overwrites `app_email` / `app_mobile`, and Locations overwrites `address`. The website prefers the Contact details and Locations values.
- **Fix:** pick one source of truth per field, or explain the link on each screen.

**WB-M6 · Footer: misleading catalog note, and saving drops other footer lines.**
- The catalog note says "Links, policies, contact and copyright line", but the screen only edits the copyright line. The footer links are hardcoded (`SiteFooter.jsx:37-53`).
- `footerApi.js:94-99` rewrites the `footer-text` page with only `<p>copyright</p>`. That drops the seeded `secondary` block or credit line, and there is no longer any UI to restore it (`web-fs-text` isn't in the catalog).

**WB-M7 · Program testimonials for Fat Loss (and any other program without a page) never appear on the website.**
- The admin lists every active health concern as a program. Only the Diabetes, Thyroid, PCOD and Gut Health pages render these testimonials, and `FatLoss.jsx` uses a different section.
- Public matching is loose (any shared word matches), so a single story can appear on several pages.
- **Fix:** add `<ProgramTestimonialsSection type="fat_loss" />` to the Fat Loss page, and flag programs that have no public page in the admin.

**WB-M8 · A stale Publish handler can save the wrong page, and nothing warns about unsaved changes.**
- Same issues as SH-05 and SH-06. `SocialLinksSection` registers its Publish handler without a cleanup.

**WB-M9 · Read-only mode is CSS-only, and UI permissions don't match the backend.**
- Same issue as SH-09. In addition, a role with only `cf.upload` sees an editable Logo screen where every upload fails with 403, because the PATCH endpoint requires `cf.edit`.

**WB-M10 · App content is fetched twice, and the two requests race.**
- `ConfigDetailPage.jsx:1497-1510` and `AppContentSection.jsx:31-49` both call `getAppContent()`. The page-level response can overwrite what the admin has typed.
- **Fix:** remove the page-level fetch.

**WB-M11 · No length limits, and the whole app config is one DynamoDB item.**
- None of the text fields have length limits, while the JSON body limit is 5 MB. A single huge paste can push the `app-config` item past DynamoDB's 400 KB limit, after which **every** app-config write fails, including payments and pricing.
- **Fix:** add length caps per field.

**WB-M12 · Invalid JSON for the locations, contact or social arrays wipes the data.**
- `appConfigController.js:770-784` uses `parseJSON(value, [])`, so unparseable input is saved as an empty array.
- **Fix:** return 400 when parsing fails.

#### Low findings

**WB-L1 · Save behaviour differs between screens.**
- On Contact, the header Publish only covers the page text, while contact details save instantly. The modal copy doesn't say this.
- Social links wait for Publish, while every other Web screen saves inline.

**WB-L2 · Social links.**
- App-download links can't be cleared or removed.
- Duplicate labels and URLs are allowed.
- Re-adding "Facebook" gives it a generated id, so the legacy `facebook` field is saved as `""`.

**WB-L3 · Program testimonials.**
- `toggleLive` has no busy guard.
- The admin list is capped at 100, and reorder renumbers only the rows on the current page.
- The public site loads at most 200.

**WB-L4 · Dead code.**
- Admin `ProgramTestimonialsSection.jsx` contains hardcoded demo data and isn't used.
- `web-fs-text` and `web-fs-links` leftovers remain.
- Preview-modal cases for testimonials, footer, social, logo and location can't be reached.
- The public `ContactSection.jsx` isn't used.

**WB-L5 · Location.**
- The note says "on the map", but there is no map or lat/lng UI.
- `normalizeWebLocationRow` drops per-location coordinates.

**WB-L6 · Dark APK logo.**
- `selectApkLogoDarkUrl` isn't used on the website. Confirm whether the mobile app uses it.

**WB-L7 · Logo removal.**
- There's no way to remove a logo or reset it to the default.

**WB-L8 · Raw footer HTML in the admin preview.**
- `copyrightBlockHtml` stores raw HTML, which the admin preview renders unsanitised (LG-01).

**WB-L9 · Footer contact links.**
- Rows like "Support hours" get a phone icon.
- Email opens Gmail compose instead of `mailto:`.
- A landline labelled "Phone" becomes a WhatsApp link.

**WB-L10 · Summary chips before load.**
- Before loading finishes, the chips show default values: Contact shows "Live", and Logo shows "Hidden" while the site is using its default logo.

**Needs live verification:**
- A coach token receiving gateway secrets (SH-02).
- Footer social click behaviour (WB-06).
- Whether a footer credit line currently exists.
- How long the stale-Publish window lasts.
- What happens when the config item nears 400 KB.
- Whether the app uses the dark APK logo.

### 4.6 Common tab

**Review depth**
- **Fully read:** shared reorder, section surface, banner, client review, dropdowns, health disorders, champion, Google review, and the recipe/yoga backend.
- **Partly read:** `RecipesSection`, `YogaSection` and `MediaPickerModal`.
- **Skimmed:** save, toggle, move and crop paths for Transformation, Real People, Voice, Leadership, Wellness Team, Cofounder and Birthday.

**Status summary**

| Config | Status | Findings |
|---|---|---|
| `common-banner` | ⚠️ Works with serious issues | CM-02, CM-M1 to M6 |
| `common-champion` | ⚠️ Works with issues | CM-L (copy, run-job confirm) |
| `common-birthday` | ⚠️ Works with issues (skimmed) | CM-02 |
| `common-transformation` | ⚠️ Works with issues (skimmed) | CM-02, CM-M7 |
| `common-client-review` | ⚠️ Works with issues | CM-02, CM-M6, CM-M8 |
| `common-real-people` | ⚠️ Works with issues | CM-02, CM-M1, CM-M6, CM-M7, CM-M13 |
| `common-voice` | ⚠️ Works with issues (skimmed) | CM-02, CM-M7, CM-M12 |
| `common-cofounder` | ⚠️ Works with issues (skimmed) | CM-02, CM-M11 |
| `common-leadership` | ⚠️ Works with issues (skimmed) | CM-02, CM-M7, CM-L (static "Hidden" state) |
| `common-wellness-team` | ⚠️ Works with issues (skimmed) | CM-02, CM-M7 |
| `common-google-review` | ❌ Broken for `ct`-only roles, and can wipe stats | CM-01, CM-03 |
| `common-dropdowns` | ⚠️ Works with issues | CM-M9 |
| `common-health-disorders` | ⚠️ Works with issues | CM-M10 |
| `common-recipes` | ❌ Broken for `ct`-only roles | CM-01, CM-M1, CM-M12 |
| `common-yoga` | ❌ Broken for `ct`-only roles | CM-01, CM-M12 |

**Verified working**
- **Banner:** delete asks for confirmation, fields map correctly, and the preview renders.
- **Client review:**
  - Creating a review from the admin is blocked with a 410.
  - Ratings are limited to 1–5.
  - Sorting by order works, and the web/app filter works.
  - Approve, hide and delete are guarded against double clicks, and delete asks for confirmation.
- **Dropdowns:** delete asks for confirmation, and toggle/delete update the screen immediately and undo themselves if the save fails.
- **Health disorders:** toggles wait for the server and guard against double clicks, and delete asks for confirmation.
- **Recipes / Yoga:**
  - Title and description limits match the backend (100 and 500 characters).
  - Loads are sequenced (`loadSeq`), so an older response can't overwrite a newer one.
  - Toggles undo themselves if the save fails.
- **Champion / Birthday:** the message is required and capped at 1000 characters.
- **Voice, Leadership, Real People, Wellness Team, Transformation:**
  - Delete asks for confirmation, and required fields are checked.
  - Toggles undo themselves if the save fails.
  - Real People star ratings are validated on the backend.
- **Public site:** sends `platform: "web"`, and recipes, yoga and health disorders also check `isSectionLiveOnWeb`.

#### CM-01 · High · The admin checks one permission key and the backend checks another
- **Where:** `configsData.js:852-873` gates `common-google-review`, `common-recipes` and `common-yoga` with `ct`. The backend checks `console.cf.*` (verified):
  - `adminHealthRecipeRoutes.js:16-32`
  - `adminYogaRoutes.js:16-20`
  - `adminWellnessYogaRoutes.js`
  - `adminAppConfigRoutes.js` (Google review saves through app config)
- **Impact:**
  - A `ct`-only staff member sees an editable screen, but every list call and save returns 403.
  - A `cf`-only staff member is shown "no access" on the screen, even though the API would allow them.
- **Fix:** choose one key per config. Either return `cf` for these three, or accept both keys on the routes, as `adminSectionSurfaceConfigRoutes.js` already does.

#### CM-02 · High · Shared building blocks on `bn` and `ct` screens need `cf` permission
Banner uses the `bn` key; the testimonial and profile screens use `ct`. The shared pieces they rely on check `cf`:

| Shared piece | Backend requirement | Effect on `bn`/`ct` users |
|---|---|---|
| Media picker (`MediaPickerModal.jsx:318` → `/admin/media-assets`) | `console.cf.view` / `console.cf.edit` (`adminMediaAssetRoutes.js:17-22`, verified) | Every photo or cover pick fails without `cf.edit` |
| Section surface config (`adminSectionSurfaceConfigRoutes.js`) | `cf` or `ct` only, no `bn` | Banner users can't change surfaces |
| Config dropdowns (`adminConfigDropdownRoutes.js:18-25`) | `cf` only | Banner silently falls back to the static types list; Real People's "create category" fails |
| Banner gallery | `/admin/media-assets` | `bn`-only users get a 403 toast on every filter change |

- **Fix:** accept the calling screen's key on these shared routes (e.g. `["console.cf.edit","console.ct.edit","console.bn.edit"]`), or upload directly to each section's own endpoint.

#### CM-03 · High · Google review: a failed load followed by one save wipes all stats
- **Where:** `DynamicGoogleReviewSection.jsx` / `googleReviewApi.js`. If the load fails, the stats reset to empty strings. Save then PATCHes all 6 keys, so the 5 untouched values are overwritten with `""`.
- **Also:**
  - Numbers aren't validated, so a rating above 5 or a success rate above 100% is accepted.
  - `updateStat` trims on every keystroke, so you can't type trailing spaces.
- **Fix:** keep a `loadError` state that disables Save and shows Retry, send only the fields that changed, and validate the numbers.

#### CM-04 · High · Read-only mode can be bypassed, and edit rights are granted too broadly
- **Where:** same issue as SH-09 / AC-15. A role that has only `toggle` sees every Save, Delete and Add button enabled, and each of those calls fails with 403.
- **Fix:** pass per-action flags (`canCreate`, `canDelete`, `canToggle`) into each section, and add the `inert` attribute as a backstop.

#### Medium findings

**CM-M1 · Banner: uploading a new image throws away unsaved edits and saves the split setting.**
- **Where:** `BannerSection.jsx:434-451`. The upload saves immediately, then calls `selectItem(saved)`, which reloads the editor.
- **Same pattern:**
  - Real People: `DynamicRealPeopleSection.jsx:345-346`
  - Recipes: `confirmCoverCrop` → `persistItem`
  - Probably Voice, Leadership and Wellness Team as well
- **Fix:** keep the cropped file in the draft until Save, or merge only the image fields into the editor after upload.

**CM-M2 · Banner crop sizes don't match the placement ratios.**
- **Where:**
  - Placements are 21:9 or 16:9, but the crop sizes are 1905×640 (about 2.98:1) and 1080×480 (2.25:1).
  - With split turned off, the desktop crop is also used as the mobile image (`BannerSection.jsx:438-441`).
- **Fix:** derive the crop size from the chosen placement.

**CM-M3 · Banner CTA link accepts anything, including `javascript:`, and the website ignores the CTA.**
- **Where:**
  - `bannerModel.js:51-56`: `normalizeCtaLink` returns the input on both branches (verified), and the client doesn't validate it either.
  - The website's `SiteHero` `toHeroSlide` ignores `cta`, `ctaLink` and `placement`.
- **Fix:** allow only `https:` links or relative `/…` paths, and either render the CTA on the website or label the field "App only".

**CM-M4 · Editing a banner fails after its banner type is hidden in Dropdowns.**
- **Where:** `bannerController.js` re-checks the type against the active dropdown values on every update.
- **Fix:** skip the check when the type hasn't changed.

**CM-M5 · Banner S3 cleanup can delete a live image.**
- **Where:** `bannerController.js`.
  - Updating deletes the old file before the database write.
  - When the legacy `image` and `mobileImage` point to the same key, replacing the desktop image deletes the mobile file too.
  - Deleting a banner removes the S3 files before the database row.
  - Creating uploads before validating, which leaves orphan files. This is the same pattern as SH-03.
- **Fix:** validate first, write to the database, then delete only the keys that nothing references any more.

**CM-M6 · Toggles and reorders can race, and a failed save can undo other changes.**
- **Where:**
  - Banner `persistPatch` (522-545) has no busy flag, and on failure it rolls back to a snapshot of the whole list, which can undo other changes that did succeed.
  - Banner `moveItem`/`finishDrag` have no busy flag.
  - Client review `toggleSurface` and Real People `toggleLive`/`toggleSurface` have no busy flag.
- **Fix:** add a per-row pending flag, and roll back only the fields that failed.

**CM-M7 · The shared reorder helper sends one request per row and can leave a partial order.**
- **Where:** `configReorder.js:71-73` uses `Promise.all(... updateItem(id, {order}))`.
  - `listAll` stops at 200 rows.
  - `busy` is read from a stale closure, so a double click gets through.
  - `DynamicWellnessTeamSection.jsx:500-543` duplicates this logic.
- **Fix:** add backend `POST …/reorder {ids}` endpoints (banners already have one), guard with a ref, and remove the duplicate.

**CM-M8 · Client review: the pending queue is per page, and a hidden review can be deleted outright.**
- **Where:** `DynamicClientReviewSection.jsx`.
  - Pending and published are split within one page (200-226), so the "awaiting review" count is only for that page.
  - Hiding a review moves it back to Pending (279-291), where "Reject" deletes it permanently. There's no `rejected` status and no confirmation on hide.
  - The edit field has no `maxLength`; the backend limit is 255 and returns a 500 when exceeded.
  - Search responses aren't sequenced, so an older response can overwrite a newer one.
- **Fix:**
  - Filter pending and published on the server.
  - Keep hidden reviews separate from pending ones.
  - Add `maxLength={255}` to the edit field.
  - Sequence search requests so only the latest response is applied.

**CM-M9 · Dropdowns: concurrent edits are lost, a GET writes data, and values can collide.**
- **Where:**
  - `configDropdownModel.js` rewrites the whole options array without a version check, so concurrent edits overwrite each other.
  - `listDropdowns` calls `ensureSeeded()` on every GET, which writes and deletes rows.
  - "Fat-loss" and "Fat loss" both become the value `fat_loss`.
  - There's no duplicate or length check on the backend, and deleting an option doesn't check whether anything uses it.
  - Load failures are swallowed and show as empty lists (`DropdownsSection.jsx:166-167`).
  - The admin sorts by seed order, while the public site sorts by `sortOrder`.
- **Fix:**
  - Use a conditional write with a version number.
  - Move seeding to a migration.
  - Check value uniqueness on the backend.
  - Show an error state when the load fails.

**CM-M10 · Health disorders: unsaved edits look saved, and filtering by type is case-sensitive.**
- **Where:**
  - Edits write into the shared `items` list (`HealthDisordersSection.jsx:190-221`). Starting to edit row B replaces the snapshot, so row A's unsaved text looks saved.
  - Reordering is enabled even though the page size is 10, so rows can't be moved across pages.
  - The model lowercases the filter but stores `type` exactly as typed, so `?type=chronic` never matches "Chronic".
- **Fix:** keep a separate draft for edits, normalise `type` when saving, and disable reordering when there is more than one page.

**CM-M11 · The section on/off switch can be bypassed.**
- **Where:** `miscController.js` `isSectionSurfaceEnabled` returns true when the request has no `platform`. The Cofounder endpoint doesn't check the switch at all, and the website doesn't send a platform when fetching it.
- **Fix:** require `platform` (or treat a missing value as "both must be on"), and add the check to Cofounder.

**CM-M12 · Recipes, Yoga and Voice: YouTube links aren't validated, and creating a live item notifies every user.**
- **Where:**
  - `youtubeEmbedUrl` passes through any string that contains `/embed/`, without checking the scheme, and Shorts links aren't supported.
  - The placeholder mentions Vimeo, which isn't supported.
  - Backend controllers only trim the link.
  - Creating an `active` recipe or yoga item calls `dispatchBroadcastNotification` to **all users**, with no confirmation.
  - Replacing a video waits for Save in Recipes but saves immediately in Yoga.
- **Fix:**
  - Validate the YouTube host and video ID on the client and the backend.
  - Add a "Notify users" checkbox with a confirmation step.
  - Make video replacement behave the same in both sections.

**CM-M13 · Model validation errors return HTTP 500.**
- **Where:** e.g. `realPeopleTestimonialModel.js:55` throws a plain `new Error(...)`.
- **Fix:** throw `AppError(msg, 400)`.

**CM-M14 · The "ensure section surface" step can fail with 409.**
- **Where:** it does a GET followed by a POST (`attribute_not_exists`). Two tabs, or a double effect run, can make the POST return 409.
- **Fix:** when the POST returns 409, fetch again instead of showing an error.

#### Low findings

**Dead or mock code**
- Recipes (non-persist branch): the history "Download" button only shows a toast.
- Yoga: the mock gallery can't be reached because `persist` and `showGallery` are constants (lines 560 and 564).
- Banner: a hidden surfaces block (`display:none`, 995-1021).

**Banner**
- The gallery's live toggle changes the banner's status without confirmation.

**Public banners**
- `getActiveBanners` overwrites `pagination.total` with the length of the current page.
- Banners aren't filtered by `placement`.

**Misleading copy**
- Champion says "Pick a designed card or upload a new one" and is tagged Upload, but there is no upload.
- Leadership has a static `live:false` in the catalog, so its summary always says Hidden.
- Health disorders shows "Catalog from HealthDisorder".

**Champion**
- "Run job now" has no confirmation.
- Loading after a run happens twice.

**Uploads**
- The global allowlist accepts SVG, PDF, Office and zip files in image fields.
- The media picker saves a copy to the media library before the section validates the file, so every file is stored twice.

**Real People**
- "Create category" creates a health concern with no icon, while Dropdowns requires one.

**Needs live verification:**
- Whether the mobile app always sends `platform` (CM-M11).
- Which health-disorder `type` values the app sends.
- Whether Recipes `persistItem` overwrites unsaved text.
- How staff roles are assigned in practice, which decides how often CM-01 and CM-02 affect real users.

---

## 5. Recommended fix order

### Phase 0: now (security, before anything else)
1. **Mask payment-gateway credentials** in every admin app-config response, and serve secrets only from a separate endpoint gated by a payment permission. **Rotate the Cashfree UAT and Live keys.** (SH-02, AC-01)
2. **Sanitise static-page HTML** on save (`sanitize-html`) and on render (DOMPurify), and narrow the CKEditor allow-list. (LG-01)
3. **Allow only `https:` or relative URLs** for app-config links, social links and the banner CTA, on both backend and website (`safeHref`). Coerce app-config values to strings in the website selectors. (WB-07, CM-M3)
4. **Put the client lookup, PWC list and staff list endpoints behind `authorizeStaff`.** (AC-16)
5. **Read `API_BASE` from `VITE_API_URL`.** (SH-01)

### Phase 1: data-loss prevention
6. **Add a shared load-error pattern** (`loadError`, error view with Retry, editing and Publish locked) to every section that currently falls back to defaults. (LG-02, AC-12, WB-01, HB-02, HB-03, SY-13, CM-03, CM-M9)
7. **Delete old media only after the database write succeeds,** in the app-config controller, the wellness library controllers, the banner controller, program testimonials and coach content. **Copy S3 objects** when a gallery pick shares a file. (SH-03, SY-09, HB-05, HB-06, WB-M3, CM-M5)
8. **Clear the Publish handler** whenever `configId` changes or the section unmounts, and keep Publish disabled until the section has loaded and has changes. The simplest route is `<ConfigDetailPage key={configId} />`. (SH-06, AC-03, LG-12)
9. **Warn before leaving with unsaved changes** (`useBlocker` + `beforeunload`), driven by `legalLocalDirty` and the section dirty flags. (SH-05, LG-03)
10. **Fix Program pricing** so a price edit sends only pricing. Use one save model per page. (SH-04, AC-06, AC-07)
11. **Stop contact details and locations from re-seeding and overwriting** `app_email`, `app_mobile` and `address`. (LG-08, WB-M4, WB-M5)

### Phase 2: correctness and features that don't work
12. **Separate consultancy tax from GST,** or merge them into one editor. Show the real stored tax value. (AC-02)
13. **Enforce AI enable** on the AI endpoints. (SY-01)
14. **Align the LAUNCH score scale,** compute the score on the server, and add delete confirmations. (SY-02, SY-03, SY-14)
15. **Make admin permission keys match the backend.** This covers the `ct` vs `cf` prefix on About, Recipes, Yoga and Google review, and the shared routes (media assets, dropdowns, section surface) accepting `bn` and `ct`. Also compute per-action UI flags. (CM-01, CM-02, LG-07, AC-15, HB-07)
16. **Add backend validation for app-config fields:** types, ranges, formats and lengths. (SH-08, AC-04, AC-05, WB-M11, WB-M12)
17. **Show Contact Us content and locations on the website.** (LG-09, WB-04)
18. **Wire up "Push to app"** for the commitment letter, or remove the button. Fix the signed-version logic. (HB-04, HB-M1)
19. **Make Preview show unsaved drafts.** (LG-04)
20. **Fix the footer social links** nested inside `<Link>`. (WB-06)
21. **Show Fat Loss program testimonials on the website.** (WB-M7)

### Phase 3: robustness and UX
22. **Add optimistic concurrency** (a version or `updatedAt` condition) for app config, dropdowns and static pages. (SH-07, CM-M9)
23. **Add bulk reorder endpoints** instead of N parallel PATCHes. (CM-M7, SY-17, HB-M6)
24. **Check file types per upload field;** block SVG in image fields. (SY-10, WB-M1)
25. **Enforce read-only mode for real** with `inert` or `<fieldset disabled>`. (SH-09)
26. **Handle stale responses and double-submits** (request-id guards, busy flags). (SY-04, SY-07, HB-M13, AC-21, CM-M6)
27. **Clean up the remaining Medium and Low findings,** remove dead code (`feature-flags`, `web-fs-text`, legacy legal cases, mock sections), and correct misleading copy.

### Suggested automated tests to add
- **Backend unit tests:**
  - `normalizePaymentGateways` and the admin serializer never return a `secret_key`.
  - Static-page save strips `<script>` and `on*` attributes.
  - The app-config validators reject negative tax, zero consultancy amount, invalid URLs, invalid email and phone, and out-of-range latitude/longitude.
- **Backend integration tests:** a coach token calling `GET /api/admin/app-config` gets no credentials. A `ct`-only token can list recipes once CM-01 is fixed.
- **Admin component tests:**
  - A section whose load fails shows an error view and keeps Publish disabled.
  - Switching `configId` clears the Publish handler.
  - A price edit doesn't include tag arrays in the PATCH.

---

## 6. Manual test checklist (run against local/staging, never production)

For **every** config screen:

1. Open it directly by URL, and from the list. Check that the loading state appears and resolves (no infinite "Loading…").
2. Stop the backend and reload. A clear error or retry should appear, not a blank or crashed screen, and no default placeholder text should be shown as real data.
3. Empty data: the empty state is shown, and nothing that looks like live data is invented.
4. Invalid input: empty or whitespace, over-long text, negative, zero, non-numeric or >100% values, invalid URL / email / phone, duplicates. Each should be blocked with a clear message and also rejected by the API (test with curl).
5. Double-click save or publish: exactly one request is sent.
6. Save failure (simulate a 500): the UI rolls back or keeps the edit with an error, and never shows false success.
7. Unsaved edits, then navigate away or refresh: a warning appears (currently fails, SH-05).
8. Switch config via the header search while on a Publish screen: Publish affects only the current config (SH-06).
9. Read-only role: nothing is editable by mouse **or keyboard** (SH-09), and the API returns 403.
10. After saving, check the change on the **website** and/or **app** endpoint (`/api/public/...`).
11. Two browsers editing the same config: check for a lost-update warning (currently fails, SH-07).
