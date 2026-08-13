import { FOOD_DEMO_TODAY, formatWaterRangeLabel } from "./foodData.js";

export { FOOD_DEMO_TODAY as BMS_DEMO_TODAY };

export const DEFAULT_BMS_RANGE = {
  from: new Date(2026, 6, 9),
  to: new Date(2026, 6, 22),
};

const STEP_VALUES = [6200, 6400, 6500, 6600, 6800, 6900, 7000, 7100, 7200, 7400, 7600, 7800, 7900, 8000];
const HEART_VALUES = [59, 78, 63, 82, 67, 86, 71, 90, 75, 60, 79, 64, 83, 68];
const SLEEP_VALUES = [7.1, 6.0, 8.9, 7.8, 6.7, 5.6, 8.5, 7.4, 6.3, 5.2, 8.1, 7.0, 5.9, 8.8];

export const BMS_GOALS = {
  steps: 10000,
  sleepHours: 8,
  heartRestMin: 60,
  heartRestMax: 100,
};

export const BMS_SLEEP_SUMMARY = {
  score: 100,
  quality: "Excellent",
  sleptHours: 8.8,
  stages: [
    { id: "deep", label: "Deep", duration: "1h 56m", pct: 22 },
    { id: "core", label: "Core", duration: "4h 35m", pct: 52 },
    { id: "rem", label: "REM", duration: "1h 46m", pct: 20 },
    { id: "awake", label: "Awake", duration: "0h 32m", pct: 6 },
  ],
};

export const BMS_SLEEP_TARGET_HISTORY = {
  value: 8,
  unit: "h / night",
  source: "Admin desk",
  date: "22 Jul 2026",
};

function buildDays(from, to, values, today = FOOD_DEMO_TODAY) {
  const days = [];
  const cursor = new Date(from);
  const end = new Date(to);
  let index = 0;

  while (cursor <= end) {
    days.push({
      day: String(cursor.getDate()).padStart(2, "0"),
      value: values[index % values.length],
      date: new Date(cursor),
    });
    cursor.setDate(cursor.getDate() + 1);
    index += 1;
  }

  const todayEntry = days.find((d) => d.date.toDateString() === today.toDateString());
  return { days, todayEntry, today };
}

export function buildStepsChart(from, to, today = FOOD_DEMO_TODAY) {
  const { days, todayEntry } = buildDays(from, to, STEP_VALUES, today);
  const values = days.map((d) => d.value);
  const avg = values.length
    ? Math.round(values.reduce((sum, val) => sum + val, 0) / values.length)
    : 0;

  return {
    rangeLabel: formatWaterRangeLabel(from, to),
    from: new Date(from),
    to: new Date(to),
    avg,
    today: todayEntry?.value ?? values[values.length - 1] ?? 0,
    todayDay: todayEntry ? String(today.getDate()).padStart(2, "0") : null,
    goal: BMS_GOALS.steps,
    days: days.map(({ day, value, date }) => ({ day, value, date })),
  };
}

export function buildHeartChart(from, to, today = FOOD_DEMO_TODAY) {
  const { days, todayEntry } = buildDays(from, to, HEART_VALUES, today);
  const values = days.map((d) => d.value);
  const avg = values.length
    ? Math.round(values.reduce((sum, val) => sum + val, 0) / values.length)
    : 0;

  return {
    rangeLabel: formatWaterRangeLabel(from, to),
    from: new Date(from),
    to: new Date(to),
    avg,
    today: todayEntry?.value ?? values[values.length - 1] ?? 0,
    todayDay: todayEntry ? String(today.getDate()).padStart(2, "0") : null,
    days: days.map(({ day, value, date }) => ({ day, value, date })),
  };
}

export function buildSleepChart(from, to, today = FOOD_DEMO_TODAY) {
  const { days, todayEntry } = buildDays(from, to, SLEEP_VALUES, today);
  const values = days.map((d) => d.value);
  const avg = values.length
    ? Math.round((values.reduce((sum, val) => sum + val, 0) / values.length) * 10) / 10
    : 0;
  const last = todayEntry?.value ?? values[values.length - 1] ?? 0;

  return {
    rangeLabel: formatWaterRangeLabel(from, to),
    from: new Date(from),
    to: new Date(to),
    avg,
    last,
    todayDay: todayEntry ? String(today.getDate()).padStart(2, "0") : null,
    days: days.map(({ day, value, date }) => ({ day, value, date })),
  };
}

export function formatStepsLabel(value) {
  if (value >= 1000) {
    const k = value / 1000;
    return Number.isInteger(k) ? `${k}.0k` : `${k.toFixed(1)}k`;
  }
  return String(value);
}

export function isHeartOutOfZone(value) {
  return value < BMS_GOALS.heartRestMin || value > BMS_GOALS.heartRestMax;
}

export const MENTAL_CONTENT = [
  {
    id: "me-1",
    type: "video",
    title: "5-Minute Morning Calm Meditation",
    source: "YouTube · Great Meditation",
    duration: "5:12",
    inApp: true,
  },
  {
    id: "me-2",
    type: "video",
    title: "Box Breathing for Anxiety Relief",
    source: "YouTube · Therapy in a Nutshell",
    duration: "8:40",
    inApp: true,
  },
  {
    id: "me-3",
    type: "audio",
    title: "Deep Sleep Yoga Nidra",
    source: "Audio · Ally Boothroyd",
    duration: "22:05",
    inApp: true,
  },
  {
    id: "me-4",
    type: "video",
    title: "Understanding & Managing Stress",
    source: "YouTube · TED-Ed",
    duration: "6:33",
    inApp: false,
  },
  {
    id: "me-5",
    type: "audio",
    title: "Body Scan for Relaxation",
    source: "Audio · Calm Studio",
    duration: "12:00",
    inApp: true,
  },
  {
    id: "me-6",
    type: "audio",
    title: "Gratitude Journaling Prompt",
    source: "Audio · Mindful Coach",
    duration: "4:20",
    inApp: true,
  },
];

export const YOGA_CONTENT = [
  {
    id: "yo-1",
    type: "video",
    title: "Gentle Morning Yoga Flow",
    source: "YouTube · Yoga With Adriene",
    duration: "18:00",
    inApp: true,
  },
  {
    id: "yo-2",
    type: "video",
    title: "Chair Yoga for Desk Workers",
    source: "YouTube · SarahBethYoga",
    duration: "12:30",
    inApp: true,
  },
  {
    id: "yo-3",
    type: "video",
    title: "Hip Opener Sequence",
    source: "YouTube · Five Parks Yoga",
    duration: "25:00",
    inApp: false,
  },
  {
    id: "yo-4",
    type: "audio",
    title: "Guided Savasana Relaxation",
    source: "Audio · Ally Boothroyd",
    duration: "10:00",
    inApp: true,
  },
  {
    id: "yo-5",
    type: "video",
    title: "Sun Salutation A & B",
    source: "YouTube · KinoYoga",
    duration: "15:45",
    inApp: false,
  },
];

export const EXERCISE_CONTENT = [
  {
    id: "pe-1",
    type: "video",
    title: "Low-Impact Full-Body Workout",
    source: "YouTube · growingannanas",
    duration: "20:00",
    inApp: true,
  },
  {
    id: "pe-2",
    type: "video",
    title: "Beginner Strength — Dumbbell Basics",
    source: "YouTube · Caroline Girvan",
    duration: "28:30",
    inApp: false,
  },
  {
    id: "pe-3",
    type: "video",
    title: "15-Min Brisk Indoor Walk",
    source: "YouTube · GrowWithJo",
    duration: "15:10",
    inApp: true,
  },
  {
    id: "pe-4",
    type: "video",
    title: "Mobility & Joint Warm-Up Routine",
    source: "YouTube · MoveU",
    duration: "9:40",
    inApp: true,
  },
  {
    id: "pe-5",
    type: "video",
    title: "Post-Workout Stretch & Cooldown",
    source: "YouTube · MadFit",
    duration: "8:20",
    inApp: false,
  },
  {
    id: "pe-6",
    type: "video",
    title: "Resistance Band Lower-Body",
    source: "YouTube · FitnessBlender",
    duration: "22:45",
    inApp: false,
  },
];

export const STEPS_CHART = buildStepsChart(DEFAULT_BMS_RANGE.from, DEFAULT_BMS_RANGE.to);
export const HEART_CHART = buildHeartChart(DEFAULT_BMS_RANGE.from, DEFAULT_BMS_RANGE.to);
export const SLEEP_CHART = buildSleepChart(DEFAULT_BMS_RANGE.from, DEFAULT_BMS_RANGE.to);
