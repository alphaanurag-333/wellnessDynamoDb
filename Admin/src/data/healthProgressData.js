export const HEALTH_TRACKERS = [
  { id: "fatloss", name: "FatLoss", category: "Fat Loss", color: "#ec7a45", enabled: true, builtin: true },
  { id: "menstrual", name: "Menstrual cycle", category: "PCOD / PCOS", color: "#c2559a", enabled: true, builtin: true },
  { id: "glucose", name: "Glucose Panel", category: "Diabetes Reversal", color: "#d64545", enabled: true, builtin: true },
  { id: "thyroid", name: "Thyroid care", category: "Thyroid Care", color: "#0d9488", enabled: true, builtin: true },
  { id: "weight-gain", name: "Weight gain", category: "Weight Gain", color: "#3b82f6", enabled: true, builtin: true },
  { id: "gut", name: "Gut health", category: "Gut Health", color: "#22c55e", enabled: true, builtin: true },
  { id: "cholesterol", name: "Cholesterol", category: "Cholesterol Care", color: "#eab308", enabled: true, builtin: true },
  { id: "bp", name: "BP tracking", category: "Hypertension", color: "#a16207", enabled: true, builtin: true },
  { id: "fitness", name: "Fitness", category: "Fitness & Strength", color: "#5e6ad2", enabled: true, builtin: true },
  { id: "prenatal", name: "Prenatal", category: "Prenatal Wellness", color: "#ec4899", enabled: true, builtin: true },
];

export const CONDITION_TRACKER = {
  id: "condition",
  name: "condition tracking",
  category: "Skin & visible conditions",
  color: "#6366f1",
  enabled: true,
  builtin: true,
  featureKey: "conditionComparison",
};

export const DEFAULT_HEALTH_PROGRESS_TRACKERS = [
  { ...HEALTH_TRACKERS[0], featureKey: "weightPic" },
  { ...HEALTH_TRACKERS[1], featureKey: "menstrualCycle" },
  { ...HEALTH_TRACKERS[2], featureKey: "glucose" },
  { ...HEALTH_TRACKERS[3] },
  { ...HEALTH_TRACKERS[4] },
  { ...HEALTH_TRACKERS[5] },
  { ...HEALTH_TRACKERS[6] },
  { ...HEALTH_TRACKERS[7], featureKey: "bloodPressure" },
  { ...HEALTH_TRACKERS[8] },
  { ...HEALTH_TRACKERS[9] },
  { ...CONDITION_TRACKER },
];

export const TRACKING_FILTER_OPTIONS = [
  { id: "all", name: "All tracking" },
  ...HEALTH_TRACKERS.map(({ id, name }) => ({ id, name })),
];

export const FATLOSS_JOURNEY = {
  dates: ["08 Apr", "15 Apr", "22 Apr", "29 Apr", "06 May", "13 May", "20 May", "27 May", "03 Jun", "10 Jun", "17 Jun"],
  values: [98, 97, 96, 94, 93, 92, 91, 90, 88, 87, 86],
  summary: {
    startDate: "08 Apr 26",
    startWeight: 98,
    endDate: "22 Jul 26",
    endWeight: 80,
    change: -18,
  },
};

export const WEIGHT_PHOTOS = [
  { id: "w1", date: "22 Jul 2026", weight: 80, unit: "kg", status: "pending" },
  { id: "w2", date: "15 Jul 2026", weight: 81, unit: "kg", status: "pending" },
  { id: "w3", date: "08 Jul 2026", weight: 82, unit: "kg", status: "pending" },
  { id: "w4", date: "01 Jul 2026", weight: 83, unit: "kg", status: "pending" },
  { id: "w5", date: "24 Jun 2026", weight: 84, unit: "kg", status: "pending" },
  { id: "w6", date: "17 Jun 2026", weight: 85, unit: "kg", status: "pending" },
  { id: "w7", date: "10 Jun 2026", weight: 86, unit: "kg", status: "pending" },
  { id: "w8", date: "03 Jun 2026", weight: 87, unit: "kg", status: "pending" },
  { id: "w9", date: "27 May 2026", weight: 88, unit: "kg", status: "pending" },
];

export const GLUCOSE_STATS = [
  { label: "HbA1c", value: "6.8 %", delta: "↓ 1.6 since 03 Jun", latest: "12 Jul 2026" },
  { label: "FBS", value: "112 mg/dL", delta: "↓ 36 since 03 Jun", latest: "12 Jul 2026" },
  { label: "PPBS", value: "148 mg/dL", delta: "↓ 52 since 03 Jun", latest: "12 Jul 2026" },
  { label: "Time in range", value: "74 %", delta: "↑ 22% since 03 Jun", latest: "12 Jul 2026" },
];

export const HBA1C_TREND = {
  dates: ["08 Apr", "15 Apr", "22 Apr", "29 Apr", "06 May", "13 May", "20 May", "27 May", "03 Jun", "10 Jun", "17 Jun"],
  values: [8.4, 8.1, 7.9, 7.4, 7.2, 7.0, 6.9, 6.8, 6.8, 6.8, 6.8],
  target: "< 5.7 %",
};

export const HBA1C_TREND_DISPLAY = {
  dates: ["08 Apr", "15 Apr", "22 Apr", "29 Apr", "06 May", "13 May"],
  values: [8.4, 8.1, 7.9, 7.4, 7.2, 6.8],
  target: "< 5.7 %",
};

export const GLUCOSE_WEEKLY = {
  dates: ["01 Jul", "08 Jul", "15 Jul", "22 Jul"],
  fbs: [126, 121, 117, 113],
  ppbs: [176, 165, 155, 145],
};

export const MENSTRUAL_SUMMARY = [
  { label: "Avg cycle length", value: "34 days" },
  { label: "Regularity", value: "Irregular" },
  { label: "Last period", value: "02 Jun 2026" },
  { label: "Cycles logged", value: "4" },
];

export const MENSTRUAL_CYCLES = [
  { id: "c1", date: "02 Jun 2026", length: "31 days", flow: "Moderate", latest: true },
  { id: "c2", date: "02 May 2026", length: "34 days", flow: "Heavy", latest: false },
  { id: "c3", date: "29 Mar 2026", length: "38 days", flow: "Light", latest: false },
  { id: "c4", date: "19 Feb 2026", length: "—", flow: "Moderate", latest: false },
];

export const MENSTRUAL_NOTES = [
  {
    id: "n1",
    author: "Anita Rao · WC",
    date: "12 Jun 2026",
    text: "Cycle length shortening month-on-month — good response to the protocol. Continue seed cycling.",
  },
  {
    id: "n2",
    author: "Dr. Mehta · Admin",
    date: "02 May 2026",
    text: "Flagged irregular flow; advised Vitamin D and inositol. Review next cycle.",
  },
];

export const BP_STATS = [
  { label: "Systolic", value: "128 mmHg", delta: "↓ 20 since 03 Jun", latest: "21 Jul 2026" },
  { label: "Diastolic", value: "84 mmHg", delta: "↓ 10 since 03 Jun", latest: "21 Jul 2026" },
  { label: "Latest", value: "126/82", delta: "In range", latest: "21 Jul 2026" },
  { label: "Readings logged", value: "42", delta: "since joining", latest: "21 Jul 2026" },
];

export const BP_WEEKLY = {
  dates: ["08 Apr", "15 Apr", "22 Apr", "29 Apr", "06 May", "13 May", "20 May", "27 May", "03 Jun", "10 Jun", "17 Jun", "24 Jun"],
  systolic: [150, 148, 146, 144, 142, 140, 139, 138, 137, 136, 136, 135],
  diastolic: [96, 95, 94, 93, 92, 91, 90, 89, 88, 88, 87, 87],
};

export const THYROID_SUMMARY = {
  label: "TSH",
  value: "3.1 µIU/mL",
  delta: "↓ 1.5 since 03 Jun",
  latest: "10 Jul 2026",
  target: "0.4 – 4.0 µIU/mL",
};

export const TSH_TREND = {
  dates: ["08 Apr", "15 Apr", "22 Apr", "29 Apr", "06 May", "13 May", "20 May", "27 May", "03 Jun", "10 Jun", "17 Jun"],
  values: [6.4, 6.2, 6.0, 5.7, 5.5, 5.3, 5.1, 4.9, 4.6, 4.4, 4.2],
};

export const CONDITION_OPTIONS = ["Acne", "Psoriasis", "Eczema"];

export const CONDITION_PHOTOS = [
  { id: "p1", date: "14 Jul 2026", status: "pending" },
  { id: "p2", date: "07 Jul 2026", status: "pending" },
  { id: "p3", date: "01 Jul 2026", status: "pending" },
  { id: "p4", date: "24 Jun 2026", status: "pending" },
  { id: "p5", date: "17 Jun 2026", status: "pending" },
];

export const SIMPLE_TRACKER_STATS = {
  gut: [
    { label: "Gut score", value: "78/100", delta: "↑ 6 since 03 Jun", latest: "12 Jul 2026" },
    { label: "Bloating", value: "Mild", delta: "Improving", latest: "12 Jul 2026" },
    { label: "Stool", value: "Regular", delta: "Stable", latest: "12 Jul 2026" },
    { label: "Protocol week", value: "Week 6", delta: "On track", latest: "12 Jul 2026" },
  ],
  cholesterol: [
    { label: "Total cholesterol", value: "198 mg/dL", delta: "↓ 24 since 03 Jun", latest: "10 Jul 2026" },
    { label: "LDL", value: "118 mg/dL", delta: "↓ 18 since 03 Jun", latest: "10 Jul 2026" },
    { label: "HDL", value: "52 mg/dL", delta: "↑ 4 since 03 Jun", latest: "10 Jul 2026" },
    { label: "Triglycerides", value: "140 mg/dL", delta: "↓ 22 since 03 Jun", latest: "10 Jul 2026" },
  ],
  "weight-gain": [
    { label: "Current weight", value: "58.2 kg", delta: "↑ 1.4 since 03 Jun", latest: "12 Jul 2026" },
    { label: "Weekly gain", value: "0.3 kg", delta: "On plan", latest: "12 Jul 2026" },
    { label: "Calorie surplus", value: "+320 kcal", delta: "Target met", latest: "12 Jul 2026" },
    { label: "Check-ins", value: "11", delta: "since joining", latest: "12 Jul 2026" },
  ],
  prenatal: [
    { label: "Gestational week", value: "24", delta: "Week 24", latest: "12 Jul 2026" },
    { label: "Weight gain", value: "6.8 kg", delta: "Within range", latest: "12 Jul 2026" },
    { label: "BP", value: "118/76", delta: "Normal", latest: "12 Jul 2026" },
    { label: "Next visit", value: "28 Jul", delta: "Scheduled", latest: "12 Jul 2026" },
  ],
  fitness: [
    { label: "Weekly workouts", value: "4", delta: "↑ 1 since last week", latest: "12 Jul 2026" },
    { label: "Active minutes", value: "186 min", delta: "↑ 22 min", latest: "12 Jul 2026" },
    { label: "Steps avg", value: "8,420", delta: "↑ 640", latest: "12 Jul 2026" },
    { label: "Strength sessions", value: "2", delta: "On plan", latest: "12 Jul 2026" },
  ],
};

// Keep carousel/program helpers for At a Glance
const PROGRAM_META = {
  "fat-loss": {
    id: "fat-loss",
    name: "Fat Loss",
    metric: "WEIGHT",
    icon: "🏃",
    iconClass: "pgi-fatloss",
    iconBg: "#fff4ed",
    accent: "#c2661d",
    current: "76.8 kg",
    val: "−0.8 kg",
    delta: "trending down",
    deltaTone: "green",
    layout: "default",
    insights: [
      { label: "Start", val: "84.0 kg" },
      { label: "Current", val: "76.8 kg" },
      { label: "Goal", val: "68.0 kg" },
      { label: "To go", val: "8.8 kg", highlight: true },
      { label: "Best week", val: "▼1.4 kg", tone: "green" },
    ],
    history: [
      { date: "22 Jul 2026", value: "76.8 kg", delta: "−0.8 kg", tone: "green" },
      { date: "15 Jul 2026", value: "77.6 kg", delta: "−0.6 kg", tone: "green" },
    ],
    trend: [82, 80, 79, 78, 77, 76.8],
  },
  diabetes: {
    id: "diabetes",
    name: "Diabetes Reversal",
    metric: "HBA1C",
    icon: "🩸",
    iconClass: "pgi-diabetes",
    iconBg: "#fdeaea",
    accent: "#2b8f5b",
    current: "6.8%",
    val: "6.8%",
    delta: "↓ 1.6 since start",
    deltaTone: "green",
    layout: "default",
    insights: [
      { label: "Start", val: "8.4%" },
      { label: "Current", val: "6.8%" },
      { label: "Target", val: "<6.0%" },
      { label: "Fasting", val: "112" },
      { label: "Meds", val: "Tapering" },
    ],
    history: [
      { date: "22 Jul 2026", value: "6.8%", delta: "−0.2", tone: "green" },
    ],
    trend: [8.4, 8.2, 7.9, 7.5, 7.1, 6.8],
  },
  pcod: {
    id: "pcod",
    name: "PCOD/PCOS",
    metric: "CYCLE LENGTH",
    icon: "🌸",
    iconClass: "pgi-pcod",
    iconBg: "#fdf6fb",
    accent: "#c2559a",
    current: "32 days",
    layout: "bar",
    barPct: 82,
    barLabel: "32 days",
    status: "regularity improving",
    statusTone: "green",
    insights: [
      { label: "Cycle", val: "32 d" },
      { label: "Regularity", val: "Improving", tone: "green" },
      { label: "Last", val: "18 Jul" },
      { label: "Symptoms", val: "Mild" },
      { label: "Weight", val: "▼2.1 kg", tone: "green" },
    ],
    history: [],
    trend: [45, 42, 38, 36, 34, 32],
  },
  gut: {
    id: "gut",
    name: "Gut",
    metric: "PROGRESS",
    icon: "✨",
    iconClass: "pgi-gut",
    iconBg: "#f4f5fe",
    accent: "#5e6ad2",
    layout: "bar",
    barPct: 72,
    barLabel: "On track",
    status: "monitoring",
    statusTone: "muted",
    insights: [
      { label: "Score", val: "78/100" },
      { label: "Trend", val: "Improving", tone: "green" },
      { label: "Bloating", val: "Mild" },
      { label: "Stool", val: "Regular" },
      { label: "Protocol", val: "Week 6" },
    ],
    history: [],
    trend: [52, 58, 63, 68, 74, 78],
  },
};

const USER_PROGRAMS = {
  1: ["fat-loss", "diabetes", "pcod", "gut"],
};

export function getHealthPrograms(userId) {
  const ids = USER_PROGRAMS[Number(userId)] || ["fat-loss"];
  return ids.map((id) => ({ ...PROGRAM_META[id] })).filter(Boolean);
}

export function getHealthProgram(userId, programId) {
  return getHealthPrograms(userId).find((p) => p.id === programId) ?? null;
}
