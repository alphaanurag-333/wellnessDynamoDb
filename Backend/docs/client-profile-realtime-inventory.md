# Client profile realtime inventory

Maps Admin client-profile menu sections to fetch APIs, polling, write paths, and socket emit priority.

## Section index

| Menu id | Domain key | Admin primary fetch | Poll / signature | Busy guards | Priority |
|---------|------------|---------------------|------------------|-------------|----------|
| glance | `glance` | `fetchUserAtAGlance`, `fetchUserCoachInsight`, `fetchUserReminders` | `atAGlancePollSignature`, `coachInsightPollSignature`, `userRemindersPollSignature` | coach message draft, meetings busy | P0 |
| personal | `personal` | `fetchUser` | `personalProfileRemoteSignature` (inline) | form editing | P0 |
| body | `body` | `fetchUserBodyAnalytics` | `bodyAnalyticsClientPollSignature` | settings, progress photos | P0 |
| medical | `medical` | `fetchUserMedicalConditions` | `medicalConditionsPollSignature` | — | P0 |
| internal | `internal` | test recs + lab reports APIs | section socket sync | lab draft | P1 |
| launch | `launch` | launch assessment APIs | section socket sync | schedule modal | P1 |
| food | `food` | meal + water tracking | `mealTrackingPollSignature`, `waterTrackingPollSignature`, `foodMetabolicPollSignature` | meal edit, water goal edit | P0 |
| bms | `bms` | steps/sleep/HR + BMS library | `bmsTrackingPollSignature`, `bmsLibraryPollSignature` | toggles | P0 |
| nutritions | `nutritions` | supplements / diet APIs | section socket sync | fulfilment draft | P1 |
| health-progress | `healthProgress` | health progress APIs | `healthProgressLogsPollSignature`, settings sig | modal busy | P0 |
| reflection | `reflection` | daily reflection APIs | section socket sync (`reflection`/`glance`/`bms`) | dirty settings | P1 |
| prescription | `prescription` | prescription assignment APIs | section socket sync | dirty editor | P1 |
| presentable | `presentable` | user presentable fields | section socket sync | review/settings busy | P1 |
| exchange | `exchange` | energy exchange APIs | manual | — | P2 |
| counselling | `counselling` | counselling tracks | section socket sync | meeting busy | P1 |
| protocol | `protocol` | protocol settings APIs | section socket sync | dirty editor | P1 |
| gut | `gut` | gut reset APIs | mount only | — | P1 |

## P0 write paths (emit required)

### food

- User: `controllers/userController/mealTrackingController.js` — create/update/delete log
- User: `controllers/userController/waterTrackingController.js` — goal, inc/dec, set day
- Staff: `controllers/adminController/mealTrackingController.js` — CRUD, mode, daily goal
- Staff: `controllers/waterTrackingHistoryController.js` — goal, unlock

### body

- User: `controllers/userController/progressPhotoController.js` — upload/update photo
- User: `controllers/userController/paidOnboardingController.js` — body measurement submit
- User: `controllers/userController/metabolicMetricsController.js` (if client submits)
- Staff: `controllers/adminController/bodyAnalyticsController.js` — settings, target weight, photo review
- Service: `services/bodyAnalyticsOnboardingSyncService.js` (onboarding sync)

### medical

- User: `controllers/userController/paidOnboardingController.js` — medical answers submit
- Staff: `controllers/adminController/userMedicalConditionController.js` — approve, in-app toggle

### healthProgress

- User: `controllers/userController/healthProgressController.js` — create logs (weight, glucose, BP, menstrual, condition)
- Staff: `controllers/adminController/healthProgressController.js` — settings, create log, photo reviews

### glance (P0 batch 2)

- Staff/user coach insight routes, reminders, at-a-glance refresh triggers
- `controllers/adminController/atAGlanceController.js`, `reminderController.js`, coach insight controllers

### bms (P0 batch 2)

- User tracking: steps, sleep, heart rate routes
- Staff BMS library assignments: physical exercise, mental wellbeing, yoga, reflection settings

### personal (P0 batch 2)

- `updateUserPersonalDetails` staff + user profile mutations affecting `fetchUser`

## Event contract

```json
{
  "type": "clientProfile.changed",
  "userId": "uuid",
  "domain": "food",
  "action": "mealLog.created",
  "at": "ISO-8601",
  "source": "user|staff",
  "meta": {}
}
```

Room: `client:{userId}`. Socket event name: `clientProfile.changed`.

## Implementation notes

- Emit after successful Dynamo write only; never block response on socket IO.
- Use `notifyClientProfileChanged` from `services/clientProfileRealtime.js`.
- Admin listeners refetch via existing REST + `clientProfileAppSync.js` signatures (diff only; no 5s interval poll).
- Mobile (out of repo): Phase F — same events; v1 uses FCM for push-to-refetch.

## QA matrix (Phase E)

See `docs/client-profile-realtime-qa.md`.
