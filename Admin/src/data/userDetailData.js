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

/** Reduced menu for future Eagle and Maintenance clients — not applied yet. */
export const COMPACT_CLIENT_MENU = CLIENT_MENU.filter((item) =>
  ["personal", "internal", "nutritions", "food"].includes(item.id)
);

/**
 * Every program client currently gets the full coaching workspace, including
 * Diabetes Reversal. Compact menu for Eagle / Maintenance can be wired later.
 */
export function getClientProfileDefinition() {
  return {
    mode: "full",
    menu: CLIENT_MENU,
    defaultSection: "glance",
  };
}

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
  { n: 1, key: "personalDetails", label: "Personal Details", section: "personal" },
  { n: 2, key: "bodyAnalytics", label: "Body Analytics", section: "body" },
  { n: 3, key: "internalParameter", label: "Internal Parameters", section: "internal" },
  { n: 4, key: "launch", label: "LAUNCH", section: "launch", action: "schedule-launch", meetingTitle: "Schedule LAUNCH meeting", meetingNote: "We will complete your LAUNCH assessment on this call." },
  { n: 5, key: "rca", label: "RCA", action: "submit-rca" },
  {
    n: 6,
    key: "reportsBriefing",
    label: "Reports Briefing",
    action: "schedule-briefing",
    meetingTitle: "Schedule Reports briefing",
    meetingNote: "We will walk through your reports together.",
  },
  {
    n: 7,
    key: "hap",
    label: "HAP",
    action: "schedule-hap",
    meetingTitle: "Schedule HAP session",
    meetingNote: "Health Action Plan session — we will set your plan together.",
  },
  { n: 8, key: "protocolSettings", label: "Protocol Settings", section: "protocol" },
  { n: 9, key: "commitmentLetter", label: "Commitment letter", section: "presentable" },
  {
    n: 10,
    key: "programInitiation",
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
  { id: "vitd", name: "Vitamin D Plus", pack: "60 Caps", price: 1200 },
  { id: "whey", name: "Whey Protein Isolate", pack: "1 Kg", price: 2400 },
  { id: "omega", name: "Omega-3 Fish Oil", pack: "120 Tabs", price: 1200 },
  { id: "mag", name: "Magnesium Glycinate", pack: "90 Caps", price: 900 },
  { id: "b12", name: "B12 + Folate", pack: "60 Tabs", price: 650 },
  { id: "prob", name: "Probiotic 20B CFU", pack: "30 Caps", price: 1100 },
  { id: "iron", name: "Iron Bisglycinate", pack: "60 Caps", price: 750 },
];

export function dropdownOptionsToSupplementPool(options = []) {
  return (Array.isArray(options) ? options : [])
    .filter((row) => row && row.on !== false)
    .map((row) => {
      const packSize = Number(row.packSize) || 0;
      const unit = String(row.unit || "").trim();
      return {
        id: String(row.id || row.value || "").trim(),
        name: String(row.label || "").trim(),
        packSize,
        unit,
        pack: String(row.pack || "").trim() || [packSize || "", unit].filter(Boolean).join(" ").trim(),
        price: Number(row.price) || 0,
      };
    })
    .filter((row) => row.id && row.name);
}

export function mergeSupplementPoolWithBank(pool = [], bankItems = []) {
  const byName = new Map(
    (Array.isArray(bankItems) ? bankItems : [])
      .filter((item) => item?.name)
      .map((item) => [String(item.name).trim().toLowerCase(), item]),
  );
  return pool.map((item) => {
    const bank = byName.get(String(item.name || "").trim().toLowerCase());
    if (!bank) return item;
    return {
      ...item,
      pack: item.pack || bank.pack || item.pack,
      price: Number(item.price) > 0 ? Number(item.price) : Number(bank.price) || 0,
    };
  });
}

export const TIMING_OPTIONS = [
  "Empty stomach",
  "Before breakfast",
  "After breakfast",
  "Morning",
  "After 1st Meal",
  "After 2nd Meal",
  "After 3rd Meal",
  "After 4th Meal",
  "Before lunch",
  "Before dinner",
  "Bedtime",
];

export const UNIT_OPTIONS = ["Cap", "Tab", "Scoop", "gm", "ml", "Drop"];

function buildDosageMeals(timings, qty, unit, doneLabel) {
  return timings.map((label) => ({
    label,
    amount: `${qty} ${unit}`,
    done: label === doneLabel,
    count: qty,
  }));
}

export const DOSAGE_CARDS = [
  {
    id: "omega",
    name: "Omega-3 Fish Oil",
    daily: "33 Tab",
    range: "12 Jul – 12 Aug",
    pct: 12,
    progressTone: "purple",
    meals: buildDosageMeals(TIMING_OPTIONS, 3, "Tab", "After 1st Meal"),
  },
  {
    id: "b12",
    name: "B12 + Folate",
    daily: "33 Tab",
    range: "12 Jul – 12 Aug",
    pct: 12,
    progressTone: "green",
    meals: buildDosageMeals(TIMING_OPTIONS, 3, "Tab", "Empty stomach"),
  },
  {
    id: "prob",
    name: "Probiotic 20B CFU",
    daily: "33 Tab",
    range: "12 Jul – 12 Aug",
    pct: 12,
    progressTone: "orange",
    meals: buildDosageMeals(TIMING_OPTIONS, 3, "Tab", "Empty stomach"),
  },
];

export function formatSupplementOption(item) {
  const name = String(item?.name || "").trim();
  const pack = String(item?.pack || "").trim();
  const price = Number(item?.price) > 0 ? `Rs. ${Number(item.price).toLocaleString("en-IN")}` : "";
  const detail = [pack, price].filter(Boolean).join(" · ");
  if (name && detail) return `${name} — ${detail}`;
  return name || detail;
}

export function createDosageCard(name, timings, qty, unit, pool = SUPPLEMENT_POOL) {
  const poolItem = (pool || []).find((s) => s.name === name);
  const id = poolItem?.id || `dosage-${Date.now()}`;
  const dailyTotal = qty * timings.length;
  return {
    id,
    name,
    daily: `${dailyTotal} ${unit}`,
    range: "12 Jul – 12 Aug",
    pct: 0,
    progressTone: "purple",
    meals: timings.map((label) => ({
      label,
      amount: `${qty} ${unit}`,
      done: false,
      count: qty,
    })),
  };
}

export function createDraftOrder(index) {
  return {
    id: `order-${Date.now()}-${index}`,
    number: index,
    items: [],
    placedOn: "",
    vendor: "",
    tracking: "",
    expectedDelivery: "",
    billName: "",
    saved: false,
  };
}

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

function emptyProfileExtras(goal = "") {
  return {
    dob: "",
    phone: "",
    whatsapp: "",
    gender: "",
    country: "",
    city: "",
    addressLine1: "",
    addressLine2: "",
    pincode: "",
    address: "",
    state: "",
    stateRaw: "",
    dietaryPreference: "",
    wellnessJourneyFor: "",
    joined: "",
    joinedAgo: "",
    lastReviewed: "",
    lastUpdated: "",
    termsIp: "",
    termsAccepted: "",
    termsAcceptedBool: false,
    profileImage: "",
    presentablePic: "",
    referralCode: "",
    paidOnboardingCompleted: false,
    paidOnboardingStep: "",
    paidOnboardingStepStatus: null,
    onboardingDone: undefined,
    onboardingTotal: 7,
    onboardingPct: 0,
    programs: 0,
    programLabel: "",
    subscriptionDays: 0,
    tags: goal ? [goal] : [],
    goals: goal ? [goal] : [],
  };
}

/** Merge list/API row into the client-profile shape; missing unique fields stay empty. */
export function profileFromListUser(row, userId) {
  if (!row && !userId) return null;
  const base = row || {
    id: String(userId),
    n: String(userId),
    name: "",
    email: "",
    phone: "",
    tier: "Seek",
    goal: "",
    coach: "— Unassigned —",
    awc: "",
    lastActive: "",
    status: "Active",
    utype: "individual",
    team: "",
    ageDays: 0,
    joined: "",
    joinedAgo: "",
    lastReviewed: "",
    lastUpdated: "",
  };
  const extra = emptyProfileExtras(base.goal);
  return {
    ...extra,
    ...base,
    name: String(base.name || "").trim() || "Client",
    phone: base.phone || extra.phone,
    whatsapp: base.whatsapp || extra.whatsapp,
    dob: base.dob || extra.dob,
    gender: base.gender || extra.gender,
    country: base.country || extra.country,
    city: base.city || extra.city,
    addressLine1: base.addressLine1 || extra.addressLine1,
    addressLine2: base.addressLine2 || extra.addressLine2,
    pincode: base.pincode || extra.pincode,
    address: base.address || extra.address,
    state: base.state || extra.state,
    stateRaw: base.stateRaw || extra.stateRaw,
    dietaryPreference: base.dietaryPreference || extra.dietaryPreference,
    wellnessJourneyFor: base.wellnessJourneyFor || extra.wellnessJourneyFor,
    joined: base.joined || extra.joined,
    joinedAgo: base.joinedAgo || extra.joinedAgo,
    lastReviewed: base.lastReviewed || extra.lastReviewed,
    lastUpdated: base.lastUpdated || extra.lastUpdated,
    termsIp: base.termsIp || extra.termsIp,
    termsAccepted: base.termsAccepted || extra.termsAccepted,
    profileImage: base.profileImage || extra.profileImage,
    presentablePic: base.presentablePic || extra.presentablePic,
    referralCode: base.referralCode || extra.referralCode,
    tags: Array.isArray(base.tags) && base.tags.length ? base.tags : extra.tags,
    goals: Array.isArray(base.goals) && base.goals.length ? base.goals : extra.goals,
    programLabel: base.programLabel || extra.programLabel,
    onboardingDone: base.onboardingDone ?? extra.onboardingDone,
    onboardingTotal: base.onboardingTotal ?? extra.onboardingTotal,
    onboardingPct: base.onboardingPct ?? extra.onboardingPct,
    paidOnboardingStepStatus: base.paidOnboardingStepStatus ?? extra.paidOnboardingStepStatus,
    tierStyle: tierStyle(base.tier),
  };
}

export function getUserProfile(userId) {
  const raw = String(userId || "").trim();
  if (!raw) return null;
  const id = Number(raw);
  const base = Number.isFinite(id) && id > 0 ? USERS.find((u) => u.n === id) : null;
  if (!base) return profileFromListUser(null, raw);
  const extra = PROFILE_DETAILS[id] || emptyProfileExtras(base.goal);
  if (!PROFILE_DETAILS[id]) {
    extra.programs = 1;
    extra.programLabel = "LM";
    extra.subscriptionDays = 180;
  }
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
    canConvert: t === "Seek to Heal",
    canDowngrade: canDowngradeTier(t, ageDays),
    convertLabel: `Move to ${tierLabel(upTier)}`,
    convertTitle: t === "Seek to Heal"
      ? "Move this client into MAINTENANCE — for when every goal has been achieved"
      : "Move this client up one tier by hand — for when the automatic upgrade did not go through",
    downgradeLabel: t === "Maintenance" ? "Move down to HEAL" : "Move down to SEEK",
    downgradeTitle: t === "Maintenance"
      ? "Move this client back to HEAL — for when maintenance was entered too early"
      : t === "Seek to Heal"
        ? "Move this client back down to SEEK — ends paid coaching entitlements"
        : `Move this client back down to SEEK — allowed because the account is ${ageDays} days old`,
    upTier,
    downTier,
  };
}
