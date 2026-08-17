export const FAQ_ITEMS = [
  {
    id: "faq-1",
    question: "How soon will I see results?",
    answer: "Most clients report better energy and digestion within two weeks; measurable weight and lab changes typically appear by week six.",
    shown: true,
  },
  {
    id: "faq-2",
    question: "Do I need a gym?",
    answer: "No. Protocols are built around home-friendly movement — walks, bodyweight work and yoga count.",
    shown: true,
  },
  {
    id: "faq-3",
    question: "Can I pause my program?",
    answer: "Yes — you can pause for up to 30 days. Tell your coach so billing and app access stay in sync.",
    shown: true,
  },
  {
    id: "faq-4",
    question: "How do daily reflections work?",
    answer: "A short scored check-in unlocks before bedtime. Monthly totals feed the champion leaderboard.",
    shown: true,
  },
];

export const PROGRAM_PRICING = [
  { id: "fat-loss", name: "Fat Loss", amount: 24999, discountPercent: 0, validityHours: 24 },
  { id: "diabetes", name: "Diabetes Reversal", amount: 29999, discountPercent: 0, validityHours: 24 },
  { id: "thyroid", name: "Thyroid Care", amount: 22999, discountPercent: 0, validityHours: 24 },
  { id: "pcod", name: "PCOD / PCOS", amount: 26999, discountPercent: 0, validityHours: 24 },
];

export const SUBSCRIPTION_PRICING = [
  { id: "sub-month", name: "App subscription · monthly", amount: 499 },
  { id: "sub-year", name: "App subscription · yearly", amount: 4999 },
  { id: "sub-2y", name: "App subscription · 2 years", amount: 8999 },
];

export const PWC_COMPLETED = [
  { id: "pwc-1", name: "Madhupriya Bilas", initials: "MB", consult: "Fat Loss consult", code: "IRW-WC-544", coach: "Anita Rao", ago: "2h ago" },
  { id: "pwc-2", name: "Bikash Sharma", initials: "BS", consult: "Diabetes consult", code: "IRW-WC-201", coach: "Priya Nair", ago: "5h ago" },
  { id: "pwc-3", name: "Hetu Mehra", initials: "HM", consult: "PCOD consult", code: "IRW-WC-318", coach: "Vikram Sethi", ago: "9h ago" },
  { id: "pwc-4", name: "Kabir Shah", initials: "KS", consult: "Thyroid consult", code: "IRW-WC-402", coach: "Anita Rao", ago: "18h ago" },
];

export const VALIDITY_PERIODS = ["24 hours", "48 hours", "72 hours"];
export const APP_HEAL_PERIODS = ["1 year", "2 years"];
export const DISCOUNT_SLABS = [
  { pct: 10, label: "standard" },
  { pct: 15, label: "festive" },
  { pct: 20, label: "annual plan" },
  { pct: 25, label: "corporate" },
];

export const REFERRAL_LOOKUP = {
  "IRW-WC-544": {
    name: "Madhupriya Bilas",
    email: "te.madhupriyabilas@gmail.com",
    mobile: "+91 98765 43210",
  },
  "IRW-WC-201": {
    name: "Bikash Sharma",
    email: "bikash.s@irwellness.in",
    mobile: "+91 98200 55021",
  },
  "IRW-WC-318": {
    name: "Hetu Mehra",
    email: "hetu.m@irwellness.in",
    mobile: "+91 98200 77318",
  },
  "IRW-WC-402": {
    name: "Kabir Shah",
    email: "kabir.shah@irwellness.in",
    mobile: "+91 98989 11223",
  },
};

export const PAYMENT_GATEWAY_OPTIONS = [
  { id: "razorpay", name: "Razorpay", note: "UPI · cards · net banking" },
  { id: "stripe", name: "Stripe", note: "International cards" },
  { id: "payu", name: "PayU", note: "UPI · wallets · EMI" },
];

export function createDefaultGateways() {
  return Object.fromEntries(
    PAYMENT_GATEWAY_OPTIONS.map((option) => [
      option.id,
      { active: false, keyId: "", keySecret: "", webhookSecret: "", merchantId: "" },
    ]),
  );
}

function credentialsFromRow(row) {
  const creds = row?.credentials && typeof row.credentials === "object" ? row.credentials : {};
  return {
    keyId: String(creds.key_id ?? creds.keyId ?? ""),
    keySecret: String(creds.key_secret ?? creds.keySecret ?? ""),
    webhookSecret: String(creds.webhook_secret ?? creds.webhookSecret ?? ""),
    merchantId: String(creds.merchant_id ?? creds.merchantId ?? ""),
  };
}

export function mapPaymentGatewaysFromConfig(rows) {
  const gateways = createDefaultGateways();
  const known = new Set(PAYMENT_GATEWAY_OPTIONS.map((option) => option.id));
  const extras = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = String(row?.provider || "").trim().toLowerCase();
    if (!id) continue;
    const mapped = {
      active: Boolean(row.isActive ?? row.active),
      ...credentialsFromRow(row),
    };
    if (known.has(id)) gateways[id] = mapped;
    else extras.push(row);
  }
  return { gateways, extras };
}

export function mapPaymentGatewaysToConfig(gateways, extras = []) {
  const uiActive = PAYMENT_GATEWAY_OPTIONS.some((option) => gateways[option.id]?.active);
  const uiRows = PAYMENT_GATEWAY_OPTIONS.map((option) => {
    const entry = gateways[option.id] || {};
    return {
      provider: option.id,
      isActive: Boolean(entry.active),
      credentials: {
        key_id: String(entry.keyId || "").trim(),
        key_secret: String(entry.keySecret || "").trim(),
        webhook_secret: String(entry.webhookSecret || "").trim(),
        merchant_id: String(entry.merchantId || "").trim(),
      },
    };
  });
  const extraRows = extras.map((row) => ({
    ...row,
    isActive: uiActive ? false : Boolean(row.isActive),
  }));
  return [...uiRows, ...extraRows];
}

export function activePaymentGateway(gateways) {
  return (
    PAYMENT_GATEWAY_OPTIONS.find(
      (option) => gateways[option.id]?.active && gateways[option.id]?.keyId?.trim(),
    ) ?? null
  );
}

export function paymentMethodsForGateway(gatewayId) {
  switch (gatewayId) {
    case "razorpay":
      return ["UPI", "Card", "Net banking"];
    case "stripe":
      return ["Card", "Apple Pay"];
    case "payu":
      return ["UPI", "Wallet", "EMI"];
    default:
      return [];
  }
}

export const TOS_CONTENT = {
  intro:
    "By creating an account you agree to these terms and to the protocols prescribed by your assigned wellness coach.",
  bullets: [
    "Programs are delivered digitally through the IRW app. Session timings are agreed with your coach.",
    "Program fees are refundable on a pro-rata basis within the first 14 days.",
    "Your labs, photos and notes are visible only to you and your assigned coach.",
    "We may update these terms; material changes are notified in the app.",
  ],
};

export const MEDICAL_ANSWER_TYPES = [
  { id: "yes_no", label: "Yes / No" },
  { id: "yes_no_text", label: "Yes / No + details" },
  { id: "text", label: "Text" },
  { id: "date", label: "Date" },
];

export const MEDICAL_QUESTIONNAIRE = [
  {
    id: "mq-1",
    question: "Have you been diagnosed with diabetes, thyroid disorder, PCOD/PCOS or hypertension?",
    shown: true,
  },
  {
    id: "mq-2",
    question: "List every medication and supplement you take, with dose and timing.",
    shown: true,
  },
  {
    id: "mq-3",
    question: "Which conditions run in your immediate family?",
    shown: true,
  },
  {
    id: "mq-4",
    question: "List any surgeries in the last five years and all known allergies.",
    shown: true,
  },
];

export const TRACKER_COLORS = ["#ec7a45", "#d64545", "#c2559a", "#22c55e", "#0d9488", "#eab308", "#3b82f6", "#ec4899", "#a16207", "#5e6ad2", "#6366f1"];

export const DRF_ACTIVITY_BANK = [
  { id: "drf-salad", name: "Salad", section: "Meal Tracking", enabled: true },
  { id: "drf-protein", name: "Protein", section: "Meal Tracking", enabled: true },
  { id: "drf-protein-qty", name: "Protein quantity", section: "Meal Tracking", enabled: true },
  { id: "drf-water", name: "Water", section: "Meal Tracking", enabled: true },
  { id: "drf-juice", name: "Functional juice", section: "Meal Tracking", enabled: true },
  { id: "drf-junk", name: "No junk food / refined oil", section: "Meal Tracking", enabled: true },
  { id: "drf-dosage", name: "Dosages taken as prescribed", section: "Nutritions", enabled: true },
  { id: "drf-qty", name: "Correct quantity (Qty)", section: "Nutritions", enabled: true },
  { id: "drf-steps", name: "Steps goal met", section: "Physical Activities", enabled: true },
  { id: "drf-workout", name: "Workout completed", section: "Physical Activities", enabled: true },
  { id: "drf-yoga", name: "Yoga", section: "Physical Activities", enabled: true },
  { id: "drf-meditation", name: "Meditation / breathing", section: "Mindfulness & Mood", enabled: true },
  { id: "drf-mood", name: "Overall mood was positive", section: "Mindfulness & Mood", enabled: true },
];

export const DRF_SECTIONS = ["Meal Tracking", "Nutritions", "Physical Activities", "Mindfulness & Mood"];

export const COMMITMENT_LETTER_CONTENT = {
  intro:
    "I, {name}, commit to following the wellness programme designed for me by India Redefining Wellness (IRW). I understand this is a partnership — my coach guides me, but lasting change comes from my daily choices.",
  bullets: [
    "I will track my meals, water, and reflection honestly in the app.",
    "I will communicate openly with my coach about challenges.",
    "I will attend scheduled check-ins and complete assigned protocols.",
    "I understand that results depend on consistency over time, and I commit to giving this programme my genuine effort for the full duration of my membership.",
  ],
};

export const DPA_CONTENT = {
  intro:
    "IR Wellness processes your health data to deliver coaching, lab reviews, and app features. This agreement explains what we collect, why, and how long we keep it.",
  bullets: [
    "We collect profile details, body metrics, lab reports, and coach notes needed for your program.",
    "Data is stored securely and accessed only by you, your assigned coach, and authorised IRW staff.",
    "We do not sell your data. Processors such as labs and payment gateways receive only what is required to fulfil a service.",
    "You may request export or deletion of your account data by contacting support; some records may be retained where law requires.",
  ],
};
