# Steps Tracking — Native Data Formats

Reference shapes for mobile sync payloads. The API normalizes these into `POST /api/user/steps-tracking/sync`.

## Health Connect (Android)

Typical step record fields the app should map:

```json
{
  "metadata": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "dataOrigin": "com.samsung.health",
    "lastModifiedTime": "2026-06-22T09:15:00.000Z"
  },
  "count": 6000,
  "startTime": "2026-06-22T00:00:00.000Z",
  "endTime": "2026-06-22T23:59:59.999Z",
  "distance": { "inMeters": 4572 }
}
```

Map to API `StepsSyncRecord`:

| Native | API field |
|--------|-----------|
| `metadata.id` | `externalIds[]` |
| `metadata.dataOrigin` | `dataOrigin` |
| `count` | `stepCount` |
| `distance.inMeters` | `distanceMeters` |
| Local calendar date of record | `date` (YYYY-MM-DD) |
| `metadata.lastModifiedTime` | `syncedAt` |

## HealthKit (iOS)

Typical quantity sample:

```json
{
  "uuid": "e5f6g7h8-i9j0-1234-5678-90abcdef1234",
  "quantity": 9012,
  "startDate": "2026-06-16T00:00:00.000Z",
  "endDate": "2026-06-16T23:59:59.999Z",
  "sourceRevision": {
    "source": { "bundleIdentifier": "com.apple.Health" }
  }
}
```

Map to API `StepsSyncRecord`:

| Native | API field |
|--------|-----------|
| `uuid` | `externalIds[]` |
| `sourceRevision.source.bundleIdentifier` | `dataOrigin` |
| `quantity` | `stepCount` |
| Local calendar date | `date` |
| `endDate` | `syncedAt` |

## Server-side defaults

When `distanceMeters` or `caloriesKcal` are omitted:

- `distanceMeters = stepCount × 0.762`
- `caloriesKcal = round(stepCount × 0.04)`

Response `distanceKm` is `distanceMeters / 1000` rounded to two decimal places.
