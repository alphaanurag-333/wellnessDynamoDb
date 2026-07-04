# Daily Reflection Score — User API

User-facing endpoints for the mobile **Daily Score** card and score history modals.

**Base path:** `/api/user/daily-reflection`  
**Auth:** Bearer token (`protectUser`)  
**Tier:** Heal users only (`requireHealTier`)

---

## Score scale

Daily reflection scores are stored as **0–100** (percentage). The score is the average of applicable tracking and activity percents for that day (steps, water, nutrition, meals, enabled reflection activities).

---

## 1. Daily Score card

### `GET /user/daily-reflection/score`

Returns today’s score when submitted; otherwise the most recent score from the last 30 days.

**Response (today submitted):**

```json
{
  "status": true,
  "message": "Daily reflection score fetched",
  "score": {
    "date": "2026-07-04",
    "score": 84,
    "maxScore": 100,
    "isToday": true,
    "submittedToday": true,
    "statusLabel": "Great Going",
    "primaryMessage": "You're making great progress today.",
    "secondaryMessage": "Keep it up!",
    "band": {
      "key": "good",
      "label": "Good",
      "color": "#16a34a"
    },
    "thresholds": [
      { "value": 0, "label": null },
      { "value": 50, "label": "Average" },
      { "value": 80, "label": "Good" },
      { "value": 100, "label": "Excellent" }
    ]
  }
}
```

**Response (no submission yet):**

```json
{
  "status": true,
  "message": "Daily reflection score fetched",
  "score": null
}
```

**Mobile UI mapping:**

| UI element | Field |
|------------|-------|
| `84/100` | `score.score` / `score.maxScore` |
| Status badge (“Great Going”) | `score.statusLabel` |
| “You're making great progress today.” | `score.primaryMessage` |
| “Keep it up!” | `score.secondaryMessage` |
| Progress bar marker | `score.score` on `score.thresholds` scale |
| “View last daily score” | Use `last-4-weeks` or `month-to-date` analytics |

---

## 2. Score analytics (modals)

### `GET /user/daily-reflection/analytics?range={range}`

| `range` | Modal / screen |
|---------|----------------|
| `last-6-months` | **Monthly Scores** bar chart |
| `last-4-weeks` | **Last 4 Week Score** |
| `month-to-date` | **Month Beginning Till Today** |

Optional query for `month-to-date`:

| Param | Description |
|-------|-------------|
| `month` | `YYYY-MM` (defaults to current month) |

---

### Monthly Scores — `range=last-6-months`

```http
GET /api/user/daily-reflection/analytics?range=last-6-months
```

```json
{
  "status": true,
  "message": "Daily reflection analytics fetched",
  "range": "last-6-months",
  "months": [
    {
      "month": "2026-02",
      "label": "Feb",
      "averageScore": 72.5,
      "daysSubmitted": 18
    },
    {
      "month": "2026-07",
      "label": "Jul",
      "averageScore": 84,
      "daysSubmitted": 3
    }
  ]
}
```

Use `averageScore` for bar height. `null` average when no submissions that month.

---

### Last 4 Week Score — `range=last-4-weeks`

```http
GET /api/user/daily-reflection/analytics?range=last-4-weeks
```

```json
{
  "status": true,
  "message": "Daily reflection analytics fetched",
  "range": "last-4-weeks",
  "weeks": [
    {
      "weekStart": "2026-06-22",
      "weekEnd": "2026-06-28",
      "weekLabel": "22 Jun – 28 Jun",
      "days": [
        {
          "date": "2026-06-22",
          "dayLabel": "Mon",
          "dateLabel": "22 Jun",
          "score": 84,
          "submitted": true
        },
        {
          "date": "2026-06-23",
          "dayLabel": "Tue",
          "dateLabel": "23 Jun",
          "score": null,
          "submitted": false
        }
      ]
    }
  ]
}
```

Weeks are ordered **most recent first**. Each week has Mon–Sun `days`. Future dates have `score: null`.

---

### Month Beginning Till Today — `range=month-to-date`

```http
GET /api/user/daily-reflection/analytics?range=month-to-date
GET /api/user/daily-reflection/analytics?range=month-to-date&month=2026-06
```

```json
{
  "status": true,
  "message": "Daily reflection analytics fetched",
  "range": "month-to-date",
  "month": "2026-07",
  "monthLabel": "Jul",
  "weeks": [
    {
      "weekStart": "2026-06-30",
      "weekEnd": "2026-07-06",
      "weekLabel": "30 Jun – 6 Jul",
      "days": []
    }
  ]
}
```

Weeks are ordered **oldest first** within the month. Only days inside the month and on or before today are included.

---

## 3. Other related endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/user/daily-reflection` | Today’s reflection form snapshot (activities, tracking progress) |
| `POST` | `/user/daily-reflection` | Submit daily reflection (computes & stores score) |
| `GET` | `/user/daily-reflection/history?month=YYYY-MM` | Flat daily list `{ date, score }[]` for a month |
| `PATCH` | `/user/daily-reflection/plugged-headphones` | Record headphone preference after submit |
| `GET` | `/user/commitment-letter` | “I remain committed” letter status |

---

## Submit daily reflection

### `POST /user/daily-reflection`

```json
{
  "date": "2026-07-04",
  "honestConfirmed": true,
  "gratitudeYes": true,
  "activityValues": {
    "meditation": 1,
    "physicalExercise": 30
  }
}
```

**Response:**

```json
{
  "status": true,
  "message": "Daily reflection submitted successfully",
  "score": 84,
  "breakdown": {
    "stepsPercent": 100,
    "waterPercent": 80,
    "nutritionPercent": null,
    "mealPercent": 67,
    "activityPercents": { "meditation": 100, "physicalExercise": 75 }
  },
  "dayLog": { "date": "2026-07-04", "score": 84, "submittedAt": "..." }
}
```

---

## Status bands

| Score | Status label | Band key |
|-------|--------------|----------|
| 0–49 | Keep Going | `needs_improvement` |
| 50–79 | On Track | `average` |
| 80–89 | Great Going | `good` |
| 90–100 | Excellent | `excellent` |

Progress bar thresholds: **50** (Average), **80** (Good), **100** (Excellent).
