import { USERS, canDowngradeTier, nextTier, tierLabel, tierStyle, normalizeTier } from "./usersData.js";

export const CLIENT_MENU = [
  { id: "glance", label: "At a Glance" },
  { id: "personal", label: "Personal Details" },
  { id: "body", label: "Body Analytics" },
  { id: "internal", label: "Internal Parameters" },
  { id: "launch", label: "LAUNCH", accent: true },
  { id: "food", label: "Food & Water Tracking" },
  { id: "bms", label: "Body, Mind & Soul (BMS)" },
  { id: "nutritions", label: "Nutritions" },
  { id: "health-progress", label: "Health Progress" },
  { id: "reflection", label: "Daily Reflection form" },
  { id: "prescription", label: "Wellness Prescription" },
  { id: "presentable", label: "Presentable Pics" },
  { id: "exchange", label: "Energy Exchange" },
  { id: "protocol", label: "Protocol Settings" },
  { id: "gut", label: "Gut Reset" },
];

export const DAILY_METRICS = [
  {
    id: "protein",
    label: "Protein",
    icon: "🥄",
    value: "88 g",
    goal: "90 g",
    pct: 98,
    bars: [70, 85, 90, 88, 92],
    tone: "blue",
    modal: {
      footerLabel: "Open Food & Water · full history ›",
      footerSection: "food",
      todayBreakdown: {
        title: "Protein powder",
        sub: "Today · 2 scoops ≈ 50 g",
        pct: 57,
        pctLabel: "of intake",
        barPct: 57,
        items: [
          { icon: "🥄", label: "Powder 50 g" },
          { icon: "🥗", label: "Food 38 g" },
        ],
      },
      records: [
        { when: "4 days ago", value: "91 g" },
        { when: "3 days ago", value: "68 g" },
        { when: "2 days ago", value: "75 g" },
        { when: "Yesterday", value: "60 g" },
        { when: "Today", value: "88 g", today: true },
      ],
    },
  },
  {
    id: "water",
    label: "Water",
    icon: "💧",
    value: "6 gl",
    goal: "8 gl",
    pct: 75,
    bars: [50, 60, 55, 70, 75],
    tone: "blue",
    modal: {
      footerLabel: "Open Water tracking · full history ›",
      footerSection: "food",
      records: [
        { when: "4 days ago", value: "8 gl" },
        { when: "3 days ago", value: "5 gl" },
        { when: "2 days ago", value: "7 gl" },
        { when: "Yesterday", value: "8 gl" },
        { when: "Today", value: "6 gl", today: true },
      ],
    },
  },
  {
    id: "steps",
    label: "Steps",
    icon: "👟",
    value: "9,400",
    goal: "10,000",
    pct: 94,
    bars: [80, 88, 92, 90, 94],
    tone: "teal",
    modal: {
      footerLabel: "Open Body, Mind & Soul · full history ›",
      footerSection: "bms",
      records: [
        { when: "4 days ago", value: "8,200" },
        { when: "3 days ago", value: "7,500" },
        { when: "2 days ago", value: "9,100" },
        { when: "Yesterday", value: "10,200" },
        { when: "Today", value: "9,400", today: true },
      ],
    },
  },
  {
    id: "meditation",
    label: "Meditation",
    icon: "🧘",
    value: "15 min",
    goal: "15 min",
    pct: 100,
    bars: [100, 100, 100, 100, 100],
    tone: "gold",
    modal: {
      footerLabel: "Open Body, Mind & Soul · full history ›",
      footerSection: "bms",
      records: [
        { when: "4 days ago", value: "0 min" },
        { when: "3 days ago", value: "0 min" },
        { when: "2 days ago", value: "12 min" },
        { when: "Yesterday", value: "15 min" },
        { when: "Today", value: "15 min", today: true },
      ],
    },
  },
  {
    id: "pranayam",
    label: "Pranayam",
    icon: "🫁",
    value: "6 min",
    goal: "10 min",
    pct: 60,
    bars: [40, 50, 55, 58, 60],
    tone: "sky",
    modal: {
      footerLabel: "Open Body, Mind & Soul · full history ›",
      footerSection: "bms",
      records: [
        { when: "4 days ago", value: "4 min" },
        { when: "3 days ago", value: "0 min" },
        { when: "2 days ago", value: "8 min" },
        { when: "Yesterday", value: "5 min" },
        { when: "Today", value: "6 min", today: true },
      ],
    },
  },
  {
    id: "exercise",
    label: "Exercise",
    icon: "🏋️",
    value: "45 min",
    goal: "30 min",
    pct: 150,
    bars: [90, 95, 100, 100, 100],
    tone: "orange",
    modal: {
      footerLabel: "Open Body, Mind & Soul · full history ›",
      footerSection: "bms",
      records: [
        { when: "4 days ago", value: "0 min" },
        { when: "3 days ago", value: "40 min" },
        { when: "2 days ago", value: "25 min" },
        { when: "Yesterday", value: "30 min" },
        { when: "Today", value: "45 min", today: true },
      ],
    },
  },
];

export const REVIEW_HISTORY = {
  1: [
    {
      date: "20 Jul 2026",
      coach: "Anita Rao",
      note: "Weight down 0.8 kg this week; HbA1c trending down. Continue high-protein breakfast and low-GI dinners. Client motivated — monthly score rank 1.",
      prescription: true,
    },
    {
      date: "13 Jul 2026",
      coach: "Anita Rao",
      note: "Onboarding progressing well — LAUNCH complete, internal parameters reviewed. Adjusted water target to 8 glasses. Schedule HAP next week.",
      prescription: false,
    },
    {
      date: "06 Jul 2026",
      coach: "Anita Rao",
      note: "Initial body analytics baseline captured. Fat loss goal set at 68 kg. Introduced daily reflection form — 5/7 logged first week.",
      prescription: true,
    },
    {
      date: "28 Jun 2026",
      coach: "Anita Rao",
      note: "Welcome call completed. Client prefers morning check-ins. Prakriti assessed as Vata — shared lifestyle recommendations.",
      prescription: false,
    },
  ],
};

export function getReviewHistory(userId) {
  return REVIEW_HISTORY[Number(userId)] || REVIEW_HISTORY[1] || [];
}

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
  { n: 1, label: "Personal Details", section: "personal" },
  { n: 2, label: "Body Analytics", section: "body" },
  { n: 3, label: "Internal Parameters", section: "internal" },
  { n: 4, label: "LAUNCH", section: "launch" },
  { n: 5, label: "RCA", action: "submit-rca" },
  {
    n: 6,
    label: "Reports Briefing",
    action: "schedule-briefing",
    meetingTitle: "Schedule Reports briefing",
    meetingNote: "We will walk through your reports together.",
  },
  {
    n: 7,
    label: "HAP",
    action: "schedule-hap",
    meetingTitle: "Schedule HAP session",
    meetingNote: "Health Action Plan session — we will set your plan together.",
  },
  { n: 8, label: "Protocol Settings", section: "protocol", doneAction: "schedule-hap" },
  { n: 9, label: "Commitment letter", section: "personal" },
  {
    n: 10,
    label: "Program initiation",
    action: "schedule-initiation",
    meetingTitle: "Schedule Program initiation",
    meetingNote: "Program initiation call — your journey starts here.",
  },
];

/** Default completion for Madhupriya Bilas demo — steps 1–5 done; next is Reports Briefing */
export const ONBOARDING_INITIAL_DONE = {
  1: true,
  2: true,
  3: true,
  4: true,
  5: true,
};

/** Completion notes shown under a step label (e.g. RCA submission stamp) */
export const ONBOARDING_STEP_NOTES = {
  5: "RCA submitted by Admin desk · 13 Aug 2026",
};

export function buildOnboardingRemindMessage(user, nextStepLabel) {
  const first = user.name.split(" ")[0];
  return `Hi ${first}, your next onboarding step is '${nextStepLabel}'. Please complete it in the app when you get a moment.`;
}

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
    onboardingDone: 5,
    onboardingTotal: 10,
    onboardingPct: 50,
    lifestyleScore: 7.2,
    prakriti: "Vata",
    dailyScore: 91,
    monthlyScore: 291,
    monthlyRank: "1st of 24",
    healthGoal: "Fat Loss",
    healthMetric: "",
    healthValue: "76.8 kg",
    healthDelta: "▼ 0.8 kg · trending down",
    healthIcon: "🔥",
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

export function getTierActions(tier, ageDays = 30) {
  const t = normalizeTier(tier);
  const upTier = nextTier(t);
  const downTier = t === "Maintenance" ? "Seek to Heal" : "Seek";
  return {
    canConvert: t !== "Maintenance",
    canDowngrade: canDowngradeTier(t, ageDays),
    convertLabel: `Move to ${tierLabel(upTier)}`,
    convertTitle: t === "Seek to Heal"
      ? "Move this client into MAINTENANCE — for when every goal has been achieved"
      : "Move this client up one tier by hand — for when the automatic upgrade did not go through",
    downgradeLabel: t === "Maintenance" ? "Move down to HEAL" : "Move down to SEEK",
    downgradeTitle: t === "Maintenance"
      ? "Move this client back to HEAL — for when maintenance was entered too early"
      : `Move this client back down to SEEK — allowed because the account is ${ageDays} days old`,
    upTier,
    downTier,
  };
}
