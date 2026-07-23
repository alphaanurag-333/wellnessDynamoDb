# Wellness DynamoDB — Table Inventory & Optimization Guide

**Stack:** AWS DynamoDB (on-demand / PAY_PER_REQUEST)  
**Inventory source:** `Backend/models` (`TABLE` constants) + `Backend/tables` create scripts  
**Current count:** **80 tables**, ~**103 GSI** definitions in create scripts  
**Date:** July 2026

---

## 1. Executive summary

You currently model DynamoDB like a relational database: **one entity = one table**. That produces ~80 tables and duplicated index patterns (`StatusCreatedAtIndex`, `userId` + time).

For DynamoDB this is usually too many. Best practice is **few tables designed around access patterns** (domain tables or single-table design), not one table per entity.

| Metric | Today | Recommended target |
|--------|-------|--------------------|
| Physical tables | 80 | **8–10** domain tables |
| Design style | Entity-per-table | Access-pattern / domain |
| Est. mergeable without touching auth/payments | ~55–60 | — |

**Immediate answer:** Yes, 80 is too many. You do **not** need to jump to a single mega-table on day one. Consolidate by domain in phases (health metrics → daily vitals → catalogs → coach work → community).

---

## 2. Full table inventory (80)

### 2.1 Identity & access (7)

| Table | Role |
|-------|------|
| `Admin` | Admin accounts |
| `Role` | Roles / permissions |
| `User` | App users / clients |
| `WellnessCoach` | Coaches |
| `AssistantWellnessCoach` | Assistant coaches |
| `Specialization` | Coach specializations |
| `ReferralCode` | Referral codes (PK = code) |
| `RegistrationOtp` | Registration OTP (ephemeral) |

### 2.2 CMS / marketing / content (14)

| Table | Role |
|-------|------|
| `AppConfig` | App configuration |
| `Banner` | Banners |
| `Faq` | FAQs |
| `StaticPage` | Static pages |
| `LeadershipNotes` | Leadership notes |
| `CofounderMessage` | Cofounder messages |
| `HealthRecipe` | Recipes |
| `HealthTool` | Health tools |
| `HealthConcern` | Health concerns |
| `HealthDisorder` | Disorders |
| `ClientTestimonials` | Client testimonials |
| `VideoTestimonials` | Video testimonials |
| `ProgramTestimonials` | Program testimonials |
| `RealPeopleTestimonial` | Real-people testimonials |
| `Transformation` | Transformation stories |
| `ContactInquiry` | Contact form inquiries |

### 2.3 Master catalogs (16)

| Table | Role |
|-------|------|
| `ProgramCatalog` | Programs |
| `DietPlanCatalog` | Diet plans |
| `TestCatalog` | Lab / tests |
| `Supplement` | Supplements |
| `WellnessPrescriptionCatalog` | Prescriptions |
| `Yoga` | Yoga catalog |
| `PhysicalExercise` | Exercise catalog |
| `MentalWellbeing` | Mental wellbeing catalog |
| `LaunchFocusArea` | Launch focus areas |
| `LaunchQuestion` | Launch questions |
| `PrakrutiQuestion` | Prakruti questions |
| `PrakrutiRecommendation` | Prakruti recommendations |
| `PrakrutiThingToAvoid` | Things to avoid |
| `MedicalConditionQuestion` | Medical condition questions |

### 2.4 Coach assignments (6)

| Table | Role |
|-------|------|
| `CoachAssignedDietPlan` | Diet assigned to user |
| `CoachAssignedWellnessPrescription` | Prescription assigned |
| `AssignedPhysicalExercise` | Exercise assigned |
| `AssignedMentalWellbeing` | Mental plan assigned |
| `CoachRecommendedSupplement` | Supplement recommended |
| `CoachRecommendedTest` | Test recommended |
| `UserCoachInsight` | Coach insights |
| `UserCommitmentLetter` | Commitment letters |

### 2.5 User programs & assessments (8)

| Table | Role |
|-------|------|
| `UserProgram` | User enrolled programs |
| `UserLaunchAssessment` | Launch assessment answers |
| `UserPrakrutiAssessment` | Prakruti assessment |
| `UserMedicalCondition` | User medical conditions |
| `UserHealConsultancyTrack` | Heal consultancy track |
| `UserLabReport` | Lab reports |
| `UserProgressPhoto` | Progress photos |
| `UserBodyMeasurement` | Body measurements |

### 2.6 Daily tracking (6–7)

| Table | Primary key pattern | Notes |
|-------|---------------------|--------|
| `StepsTracking` | `userId` + `recordKey` | Good Dynamo shape |
| `SleepTracking` | `userId` + `recordKey` | Same shape |
| `WaterTracking` | `userId` + `recordKey` | Same shape |
| `HeartRateTracking` | `userId` + `recordKey` | Same shape |
| `MealTracking` | `id` + GSIs on user/date | Merge candidate |
| `DailyReflection` | by user | Merge candidate |
| `Reminder` | by user | Merge or Notify |

### 2.7 Health progress (8)

| Table | Access pattern |
|-------|----------------|
| `HealthProgressWeight` | by `userId` + time |
| `HealthProgressBloodPressure` | by `userId` + time |
| `HealthProgressGlucose` | by `userId` + time |
| `HealthProgressMetabolicMetric` | by `userId` + time |
| `HealthProgressCondition` | by `userId` + time |
| `HealthProgressMenstrualCycle` | by `userId` + time |
| `UserSupplementDosage` | by user |
| `UserSupplementDosageLog` | by user |

### 2.8 Commerce / subscriptions (5)

| Table | Role |
|-------|------|
| `ConsultancyTransaction` | Payments / consultancy txs |
| `EnergyExchangeProgram` | EE programs |
| `EnergyExchangeSubscription` | EE subscriptions |
| `Coupon` | Coupons |
| `UserProgram` | Entitlements (also listed above) |

### 2.9 Community / social (4+)

| Table | Role |
|-------|------|
| `BirthdayPost` | Birthday posts |
| `BirthdayPostComment` | Comments |
| `MonthlyChampionPost` | Champion posts |
| `MonthlyChampionPostComment` | Comments |

### 2.10 Notifications (3)

| Table | Role |
|-------|------|
| `Notification` | Notifications |
| `UserNotificationRead` | Read state |
| `BirthdayNotification` | Birthday notifications |

---

## 3. Why this hurts

1. **Operational overhead** — 80 create scripts, 80 IAM/table policies, harder backups/monitoring.
2. **Multi-table reads** — User dashboards need many `Query`/`BatchGet` across tables (latency + cost).
3. **Duplicated GSIs** — Same `StatusCreatedAtIndex` repeated; often `ProjectionType: ALL` → extra storage.
4. **Hot partitions** — Listing `status = active` on many tables creates similar hot keys.
5. **Cost** — More tables/indexes = more baseline complexity; on-demand still pays per request/storage duplicated by ALL projections.
6. **Relational joins in app code** — Coaches/users/assignments stitched in Node instead of one Query with SK prefixes.

**Important:** Table count alone is not “wrong” if each table has a unique access pattern. Yours mostly do **not** — they repeat the same patterns.

---

## 4. Target architecture (~8 domain tables)

| Target table | Absorbs | Key sketch |
|--------------|---------|------------|
| **WellnessCore** | User, Admin, Role, WellnessCoach, AssistantWellnessCoach, Specialization, ReferralCode, RegistrationOtp | `PK=ENTITY#type#id`, `SK=PROFILE` |
| **Catalog** | Programs, diet, tests, supplements, prescriptions, yoga, exercise, mental, recipes, tools, FAQ, banner, static, config, questions… | `PK=CATALOG#type`, `SK=ITEM#id` |
| **UserHealth** | All HealthProgress*, body measurement, lab, photos, medical condition, assessments, supplement dosage | `PK=USER#userId`, `SK=WEIGHT#ts` / `BP#ts` / `LAB#id`… |
| **UserDaily** | Steps, sleep, water, HR, meals, reflections, reminders | `PK=USER#userId`, `SK=STEPS#date` / `MEAL#date#id`… |
| **CoachWork** | All assigned/recommended coach items, insights, commitment letters | `PK=USER#userId` or `COACH#id`, `SK=ASSIGN#DIET#id`… |
| **Commerce** | Transactions, EE program/subscription, coupons, user programs, heal track | `PK=USER#id` / `TXN#id`, `SK=PAYMENT#…` |
| **Community** | Posts, comments, testimonials, transformations, leadership content | `PK=FEED#type` / `POST#id`, `SK=META` / `COMMENT#ts` |
| **Notify** | Notification, read state, birthday notification | `PK=USER#id`, `SK=NOTIF#ts#id` |

Optional later: collapse further into **1–3** tables (classic single-table design) once access patterns are documented.

### Example item (UserHealth)

```text
PK = USER#u123
SK = WEIGHT#2026-07-22T10:00:00.000Z
entityType = weight
weightKg = 72.5
recordedAt = 2026-07-22T10:00:00.000Z
```

Query weight history:

```text
Query PK = USER#u123, SK begins_with WEIGHT#
```

---

## 5. Priority merge roadmap

| Priority | Action | Tables | Risk |
|----------|--------|--------|------|
| **P0** | Merge `HealthProgress*` + `UserBodyMeasurement` → `UserHealthMetrics` | 7 → 1 | Low |
| **P0** | Merge `Steps` / `Sleep` / `Water` / `HeartRate` → `UserDailyVitals` | 4 → 1 | Low |
| **P1** | Merge CMS + master catalogs → `Catalog` | ~20 → 1 | Low–Med |
| **P1** | Merge coach assignment tables → `CoachWork` | 6–8 → 1 | Medium |
| **P2** | Merge testimonials → `ContentTestimonial` | 4 → 1 | Low |
| **P2** | Merge posts + comments → `CommunityFeed` | 4 → 1 | Medium |
| **P3** | Optional single-table for remaining domains | ~25 → 1–3 | High |

### Keep separate (or migrate carefully)

- `User` / `WellnessCoach` / `Admin` (auth boundaries) — can still share **WellnessCore** with typed PKs
- `ConsultancyTransaction` (payments / audit)
- `ReferralCode` (natural unique key)
- `EnergyExchangeProgram` / `EnergyExchangeSubscription` (billing lifecycle)

---

## 6. Other DynamoDB optimizations (even before merges)

1. **Design from access patterns** — Document every API read/write path before creating any new table.
2. **Stop creating new one-off tables** — New entities must fit an existing domain table via `entityType` + SK prefix.
3. **GSI projections** — Prefer `KEYS_ONLY` or `INCLUDE` instead of `ALL` when full item is not needed.
4. **TTL** — Enable on `RegistrationOtp`, old notifications, ephemeral read markers.
5. **Composite keys** — Prefer `userId` (HASH) + typed sort key over random `id` + GSI for user-scoped data (your Steps/Sleep tables already do this well).
6. **Avoid Scan** — Ensure admin list screens use GSIs or sparse indexes, not table scans.
7. **Batch operations** — Dashboard: one `Query` on consolidated table beats N parallel queries.
8. **Item size** — Keep items under 400 KB; store media in S3 (you already use keys + public URLs — keep that).

---

## 7. Migration playbook (safe)

For each domain merge:

1. Create new target table + GSIs.
2. **Dual-write** old + new for a release.
3. Backfill historical data (script).
4. **Dual-read** with feature flag → prefer new table.
5. Validate counts / sample checksums.
6. Remove dual-write; delete old table after soak period.

Do **not** big-bang migrate all 80 tables at once.

---

## 8. Suggested Phase 1 (next 1–2 sprints)

1. Create `UserHealthMetrics` and `UserDailyVitals`.
2. Dual-write from existing health progress + vitals models.
3. Point list APIs (`listWeightLogsByUser`, etc.) at the new table.
4. Measure latency and DynamoDB cost vs baseline.
5. Freeze new entity tables in code review checklist.

**Expected outcome of Phase 1 alone:** ~**11 fewer tables**, clearer patterns for the rest of the team, low product risk.

---

## 9. Related repo paths

- Models: `Backend/models/*Model.js`
- Table DDL scripts: `Backend/tables/create*.js`
- Dynamo helpers: `Backend/utils/dynamoList.js`, `Backend/config/db.js`

---

## 10. Verdict

| Question | Answer |
|----------|--------|
| Are 80 tables too many? | **Yes** for this access-pattern overlap |
| Must you use single-table design? | **No** — start with **8–10 domain tables** |
| Highest ROI merges? | Health progress + daily vitals + catalogs |
| Biggest risk to delay? | Payments / auth identity tables |
