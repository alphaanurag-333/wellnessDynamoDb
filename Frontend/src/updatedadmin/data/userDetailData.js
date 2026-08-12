import { USERS, tierStyle } from "./usersData.js";

export const CLIENT_MENU = [
  { id: "glance", label: "At a Glance" },
  { id: "personal", label: "Personal Details" },
  { id: "body", label: "Body Analytics" },
  { id: "internal", label: "Internal Parameters" },
  { id: "launch", label: "LAUNCH", accent: true },
  { id: "food", label: "Food & Water Tracking" },
  { id: "bms", label: "Body, Mind & Soul (BMS)" },
  { id: "nutritions", label: "Nutritions" },
];

export const DAILY_METRICS = [
  { id: "protein", label: "Protein", icon: "🥄", value: "88 g", goal: "90 g", pct: 98, bars: [70, 85, 90, 88, 92], tone: "blue" },
  { id: "water", label: "Water", icon: "💧", value: "6 gl", goal: "8 gl", pct: 75, bars: [50, 60, 55, 70, 75], tone: "blue" },
  { id: "steps", label: "Steps", icon: "👟", value: "9,400", goal: "10,000", pct: 94, bars: [80, 88, 92, 90, 94], tone: "teal" },
  { id: "meditation", label: "Meditation", icon: "🧘", value: "15 min", goal: "15 min", pct: 100, bars: [100, 100, 100, 100, 100], tone: "gold" },
  { id: "pranayam", label: "Pranayam", icon: "🫁", value: "6 min", goal: "10 min", pct: 60, bars: [40, 50, 55, 58, 60], tone: "sky" },
  { id: "exercise", label: "Exercise", icon: "🏋️", value: "45 min", goal: "45 min", pct: 100, bars: [90, 95, 100, 100, 100], tone: "orange" },
];

export const METABOLIC_SNAPSHOT = [
  { label: "Age", value: "34 yrs", tone: "default" },
  { label: "Height", value: "163 cm", tone: "default" },
  { label: "Weight", value: "68 kg", tone: "default" },
  { label: "BMR", value: "1,368", tone: "blue" },
  { label: "TDEE", value: "1,980", tone: "green" },
  { label: "Body fat", value: "33.1%", tone: "gold" },
  { label: "Lean mass", value: "67%", tone: "green" },
  { label: "Visceral", value: "13%", tone: "default" },
];

export const ONBOARDING_STEPS = [
  { n: 1, label: "Personal Details", done: false, action: "open" },
  { n: 2, label: "Profile Setup", done: true, action: "undo" },
  { n: 3, label: "Body Analytics", done: true, action: "undo" },
  { n: 4, label: "Internal Parameters", done: true, action: "undo" },
  { n: 5, label: "LAUNCH", done: true, action: "undo" },
  { n: 6, label: "RCA", done: false, action: "submit-rca" },
  { n: 7, label: "Reports Briefing", done: false, action: "schedule-briefing" },
  { n: 8, label: "HAP", done: false, action: "schedule-hap" },
  { n: 9, label: "Protocol Settings", done: false, action: "open" },
  { n: 10, label: "Commitment letter", done: false, action: "none" },
  { n: 11, label: "Program initiation", done: false, action: "schedule-initiation" },
];

export const ACTIVE_SUPPLEMENTS = [
  { name: "Vitamin D Plus", note: "After breakfast", dosages: [{ label: "Morning · 1", tone: "morning" }], date: "12 Aug", daysLeft: 18, urgent: false },
  { name: "Omega-3 Fish Oil", note: "After each meal", dosages: [{ label: "Morning · 1", tone: "morning" }, { label: "Noon · 1", tone: "noon" }, { label: "Evening · 1", tone: "evening" }, { label: "Night · 1", tone: "night" }], date: "02 Aug", daysLeft: 8, urgent: false },
  { name: "Magnesium Glycinate", note: "Bedtime", dosages: [{ label: "Night · 1", tone: "night" }], date: "27 Jul", daysLeft: 2, urgent: true },
  { name: "Probiotic 20B CFU", note: "Empty stomach", dosages: [{ label: "Morning · 1", tone: "morning" }], date: "20 Aug", daysLeft: 26, urgent: false },
  { name: "B12 + Folate", note: "After lunch", dosages: [{ label: "Noon · 1", tone: "noon" }], date: "05 Sep", daysLeft: 42, urgent: false },
];

export const SUPPLEMENT_POOL = [
  { id: "vitd", name: "Vitamin D Plus", pack: "60 Caps", price: 800 },
  { id: "omega", name: "Omega-3 Fish Oil", pack: "120 Tabs", price: 1200 },
  { id: "mag", name: "Magnesium Glycinate", pack: "90 Caps", price: 950 },
  { id: "prob", name: "Probiotic 20B CFU", pack: "30 Caps", price: 1400 },
  { id: "b12", name: "B12 + Folate", pack: "60 Tabs", price: 650 },
  { id: "whey", name: "Whey Protein Isolate", pack: "1 kg", price: 3200 },
];

export const TIMING_OPTIONS = [
  "Empty stomach", "Before breakfast", "After breakfast", "Morning",
  "After 1st Meal", "After 2nd Meal", "After 3rd Meal", "After 4th Meal",
  "After lunch", "Evening", "Bedtime", "Night",
];

export const UNIT_OPTIONS = ["Cap", "Tab", "Scoop", "gm", "ml", "Drop"];

export const DOSAGE_CARDS = [
  {
    id: "vitd",
    name: "Vitamin D Plus",
    daily: "7 Cap",
    range: "12 Jul – 12 Aug",
    pct: 12,
    meals: [
      { label: "After 1st Meal", amount: "1 Cap", done: true },
      { label: "After 2nd Meal", amount: "2 Cap", done: false, count: 2 },
      { label: "After 3rd Meal", amount: "2 Cap", done: false, count: 2 },
      { label: "After 4th Meal", amount: "2 Cap", done: false, count: 2 },
    ],
  },
  {
    id: "omega",
    name: "Omega-3 Fish Oil",
    daily: "5 Tab",
    range: "12 Jul – 12 Aug",
    pct: 12,
    meals: [
      { label: "After 1st Meal", amount: "1 Tab", done: true },
      { label: "After 2nd Meal", amount: "2 Tab", done: false, count: 2 },
      { label: "After 3rd Meal", amount: "2 Tab", done: false, count: 2 },
    ],
  },
];

export const ORDER_HISTORY = [
  { date: "12 Jul 2026", items: "Omega-3 Fish Oil × 2 · Vitamin D Plus × 1", type: "Coach delivery", amount: 3600, status: "Delivered", tone: "green" },
  { date: "20 Jun 2026", items: "Omega-3 Fish Oil × 2", type: "Self billing", amount: 2400, status: "Bill uploaded", tone: "purple" },
];

const PROFILE_DETAILS = {
  1: {
    dob: "12 Mar 1991",
    phone: "+91 90000 10000",
    whatsapp: "+91 90000 20000",
    address: "Flat 101, Green Meadows, Baner Road, Pune, Maharashtra 411000",
    state: "Maharashtra (India)",
    joined: "19 Jul 2026",
    joinedAgo: "3 days ago",
    lastReviewed: "4 days ago",
    lastUpdated: "22 Jul",
    onboardingDone: 4,
    onboardingTotal: 11,
    onboardingPct: 36,
    lifestyleScore: 7.2,
    prakriti: "Vata",
    dailyScore: 91,
    monthlyScore: 291,
    monthlyRank: "1st of 24",
    healthGoal: "Diabetes Reversal",
    healthMetric: "HBA1C",
    healthValue: "6.8%",
    healthDelta: "▼ 1.6 since start",
    termsIp: "49.43.219.121",
    termsAccepted: "19 Jul 2026, 12:50 IST",
    programs: 1,
    programLabel: "LM",
    subscriptionDays: 236,
    tags: ["Fat Loss", "Diabetes Reversal", "Thyroid Care"],
    goals: ["Fat Loss", "Diabetes Reversal"],
  },
};

export function getUserProfile(userId) {
  const id = Number(userId);
  const base = USERS.find((u) => u.n === id);
  if (!base) return null;
  const extra = PROFILE_DETAILS[id] || {
    dob: "—",
    phone: "—",
    whatsapp: "—",
    address: "—",
    state: "—",
    joined: "—",
    termsIp: "—",
    termsAccepted: "—",
    programs: 1,
    programLabel: "LM",
    subscriptionDays: 180,
    tags: [base.goal],
    goals: [base.goal],
  };
  return {
    ...base,
    ...extra,
    tierStyle: tierStyle(base.tier),
  };
}

export const DEFAULT_REMINDERS = [
  { id: 1, text: "Morning gym session", freq: "Daily", time: "06:30" },
  { id: 2, text: "Take supplements", freq: "After lunch", time: "13:30" },
  { id: 3, text: "Evening walk", freq: "Daily", time: "18:00" },
];

export const CLIENT_NOTIFICATIONS = {
  lastAction: { icon: "✅", text: "Marked Body Analytics complete", time: "2h ago" },
  items: [
    { icon: "🩸", text: "New blood report uploaded today — flagged markers awaiting review", time: "4h ago" },
    { icon: "📉", text: "Down 0.8 kg this week — on track", time: "1d ago" },
    { icon: "📝", text: "6/7 daily reflections logged — great consistency", time: "2d ago" },
    { icon: "💊", text: "Magnesium Glycinate running low — 2 days left", time: "3d ago" },
    { icon: "📅", text: "Reports briefing scheduled for 24 Jul", time: "5d ago" },
  ],
};

const TIER_ORDER = ["SEEK", "HEAL", "PWC"];

export function tierNeighbors(tier) {
  const idx = TIER_ORDER.indexOf(tier);
  return {
    canUp: idx >= 0 && idx < TIER_ORDER.length - 1,
    canDown: idx > 0,
    upLabel: idx >= 0 && idx < TIER_ORDER.length - 1 ? `Move up to ${TIER_ORDER[idx + 1]}` : null,
    downLabel: idx > 0 ? `Move down to ${TIER_ORDER[idx - 1]}` : null,
    upTier: idx >= 0 && idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null,
    downTier: idx > 0 ? TIER_ORDER[idx - 1] : null,
  };
}
