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
  { id: "fat-loss", name: "Fat Loss", amount: 24999, discountPercent: 0, validityHours: 24, programType: "goal_based" },
  { id: "diabetes", name: "Diabetes Reversal", amount: 29999, discountPercent: 0, validityHours: 24, programType: "goal_based" },
  { id: "thyroid", name: "Thyroid Care", amount: 22999, discountPercent: 0, validityHours: 24, programType: "goal_based" },
  { id: "pcod", name: "PCOD / PCOS", amount: 26999, discountPercent: 0, validityHours: 24, programType: "goal_based" },
];

/** @deprecated Days-based SKUs removed — app subscriptions are FY / Energy Exchange. */
export const SUBSCRIPTION_PRICING = [];

export const APP_SUBSCRIPTION_FY_DEFAULTS = {
  monthlyAmount: "200",
  fyStartMonth: "4",
  fyDiscounts: { "1": 0, "2": 0, "3": 5, "4": 10 },
};

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
  { id: "cashfree", name: "Cashfree", note: "UPI · cards · net banking · wallets" },
];

export const PAYMENT_GATEWAY_MODES = [
  { id: "uat", label: "UAT" },
  { id: "live", label: "Live" },
];

function emptyModeCredentials() {
  return { appId: "", secretKey: "", webhookSecret: "" };
}

export function createDefaultCashfreeEntry() {
  return {
    active: true,
    mode: "uat",
    uat: emptyModeCredentials(),
    live: emptyModeCredentials(),
  };
}

export function createDefaultGateways() {
  return { cashfree: createDefaultCashfreeEntry() };
}

function modeCredentialsFromObject(value) {
  const creds = value && typeof value === "object" ? value : {};
  return {
    appId: String(creds.app_id ?? creds.appId ?? "").trim(),
    secretKey: String(creds.secret_key ?? creds.secretKey ?? "").trim(),
    webhookSecret: String(creds.webhook_secret ?? creds.webhookSecret ?? "").trim(),
  };
}

function modeCredentialsToObject(entry) {
  const creds = entry && typeof entry === "object" ? entry : {};
  return {
    app_id: String(creds.appId || "").trim(),
    secret_key: String(creds.secretKey || "").trim(),
    webhook_secret: String(creds.webhookSecret || "").trim(),
  };
}

export function credentialsForMode(entry, mode = entry?.mode) {
  const resolvedMode = String(mode || "uat").toLowerCase() === "live" ? "live" : "uat";
  return entry?.[resolvedMode] || emptyModeCredentials();
}

export function mapPaymentGatewaysFromConfig(rows) {
  const gateways = createDefaultGateways();
  const extras = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = String(row?.provider || "").trim().toLowerCase();
    if (!id) continue;
    if (id !== "cashfree") {
      // Drop legacy Razorpay / Stripe / PayU rows from the UI mapping.
      continue;
    }
    const creds = row?.credentials && typeof row.credentials === "object" ? row.credentials : {};
    const mode = String(row?.mode || "uat").toLowerCase() === "live" ? "live" : "uat";
    gateways.cashfree = {
      active: true,
      mode,
      uat: modeCredentialsFromObject(creds.uat),
      live: modeCredentialsFromObject(creds.live),
    };
  }
  return { gateways, extras };
}

export function mapPaymentGatewaysToConfig(gateways) {
  const entry = gateways?.cashfree || createDefaultCashfreeEntry();
  const mode = String(entry.mode || "uat").toLowerCase() === "live" ? "live" : "uat";
  return [
    {
      provider: "cashfree",
      isActive: true,
      mode,
      credentials: {
        uat: modeCredentialsToObject(entry.uat),
        live: modeCredentialsToObject(entry.live),
      },
    },
  ];
}

export function activePaymentGateway(gateways) {
  const entry = gateways?.cashfree || createDefaultCashfreeEntry();
  const modeCreds = credentialsForMode(entry);
  if (!modeCreds.appId?.trim() || !modeCreds.secretKey?.trim()) return null;
  return {
    ...PAYMENT_GATEWAY_OPTIONS[0],
    mode: entry.mode === "live" ? "live" : "uat",
  };
}

export function paymentMethodsForGateway(gatewayId) {
  switch (gatewayId) {
    case "cashfree":
      return ["UPI", "Card", "Net banking", "Wallet"];
    default:
      return [];
  }
}

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

export const APP_PRIVACY_POLICY_CONTENT = {
  intro:
    "This Privacy Policy explains how IR Wellness collects, uses, and protects personal information when you use our mobile application.",
  bullets: [
    "We collect account details, health profile inputs, and usage data needed to run your program.",
    "Information is used to deliver coaching, improve the app, and meet legal obligations.",
    "We do not sell your personal data. Trusted processors only receive what is required for a service.",
    "You may request access, correction, or deletion of your data through in-app support, subject to legal retention rules.",
  ],
};

export const APP_TERMS_OF_SERVICE_CONTENT = {
  intro:
    "These Terms of Service describe how you may access and use the IR Wellness mobile application and the coaching services made available through it.",
  bullets: [
    "You receive a personal, non-transferable licence to use the app for your wellness program.",
    "Coaching, content, and tracking tools support general wellness and do not replace emergency or specialist medical care.",
    "Fees, renewals, and cancellations follow the plan shown at purchase and any in-app billing notices.",
    "We may update features or these terms; continued use after notice means you accept the revised terms.",
  ],
};

export const APP_TERMS_CONDITIONS_CONTENT = {
  intro:
    "These Terms & Conditions govern your use of the IR Wellness mobile app. By creating an account or continuing to use the app, you agree to these terms.",
  bullets: [
    "You must be at least 18 years old and provide accurate account information.",
    "App access is personal and non-transferable; keep your login credentials secure.",
    "Program guidance is wellness support and does not replace emergency or specialist medical care.",
    "We may update these terms; continued use after updates means you accept the revised terms.",
  ],
};

export const APP_COMMUNITY_GUIDELINES_CONTENT = {
  intro:
    "Our community spaces are for respectful wellness support. These guidelines keep conversations safe, helpful, and inclusive for every member.",
  bullets: [
    "Be kind, honest, and supportive — no harassment, hate speech, or personal attacks.",
    "Do not share another person's private health details without clear consent.",
    "Avoid spam, solicitation, or medical claims that could mislead others.",
    "Report concerns through in-app tools or support so our team can review them promptly.",
  ],
};

function escapeLegalHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function legalCopyBlock(id, title, html) {
  return {
    id,
    title,
    shown: true,
    webVersion: 1,
    appVersion: 1,
    versions: [{ n: 1, date: "", author: "Admin", text: html }],
  };
}

function legalCopyToBlocks(prefix, introTitle, intro, listTitle, bullets) {
  return [
    legalCopyBlock(prefix, introTitle, `<p>${escapeLegalHtml(intro)}</p>`),
    legalCopyBlock(
      `${prefix}-points`,
      listTitle,
      `<ul>${(bullets || []).map((item) => `<li>${escapeLegalHtml(item)}</li>`).join("")}</ul>`
    ),
  ];
}

export const APP_DPA_BLOCKS = legalCopyToBlocks(
  "intro",
  "Overview",
  DPA_CONTENT.intro,
  "How we process data",
  DPA_CONTENT.bullets
);

export const APP_PRIVACY_POLICY_BLOCKS = legalCopyToBlocks(
  "intro",
  "Overview",
  APP_PRIVACY_POLICY_CONTENT.intro,
  "Key points",
  APP_PRIVACY_POLICY_CONTENT.bullets
);

export const APP_TERMS_OF_SERVICE_BLOCKS = legalCopyToBlocks(
  "intro",
  "Overview",
  APP_TERMS_OF_SERVICE_CONTENT.intro,
  "Key points",
  APP_TERMS_OF_SERVICE_CONTENT.bullets
);

export const APP_TERMS_CONDITIONS_BLOCKS = legalCopyToBlocks(
  "intro",
  "Overview",
  APP_TERMS_CONDITIONS_CONTENT.intro,
  "Key points",
  APP_TERMS_CONDITIONS_CONTENT.bullets
);

export const APP_COMMUNITY_GUIDELINES_BLOCKS = legalCopyToBlocks(
  "intro",
  "Overview",
  APP_COMMUNITY_GUIDELINES_CONTENT.intro,
  "Key points",
  APP_COMMUNITY_GUIDELINES_CONTENT.bullets
);
