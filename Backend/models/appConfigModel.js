const { PutCommand, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const { normalizeStoredMedia, resolvePublicUrl } = require("../utils/s3");
const {
  DEFAULT_COMMITMENT_LETTER_TEXT,
  resolveCommitmentLetterText,
} = require("../utils/coachContent");

const BODY_MEASUREMENT_INFO_IMAGE_KEYS = [
  "neck",
  "shoulder",
  "chest",
  "waist",
  "hip",
  "thighs",
];

const BODY_MEASUREMENT_INFO_IMAGE_FIELDS = BODY_MEASUREMENT_INFO_IMAGE_KEYS.map(
  (key) => `body_measurement_info_image_${key}`
);

const BODY_MEASUREMENT_INFO_SHOWN_FIELDS = BODY_MEASUREMENT_INFO_IMAGE_KEYS.map(
  (key) => `body_measurement_info_shown_${key}`
);

function normalizeBodyMeasurementInfoShown(value, fallback = true) {
  if (value === undefined || value === null || value === "") return Boolean(fallback);
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
  if (s === "false" || s === "0" || s === "no" || s === "off") return false;
  return Boolean(fallback);
}

const MEDIA_FIELDS = [
  "admin_logo",
  "user_logo",
  "favicon",
  "commitment_letter_template",
  "body_measurement_guide_video",
  ...BODY_MEASUREMENT_INFO_IMAGE_FIELDS,
];
const BODY_MEASUREMENT_GUIDE_TYPES = new Set(["none", "link", "video"]);
const DEFAULT_BODY_MEASUREMENT_GUIDE_TITLE = "How to measure yourself";
const DEFAULT_BODY_MEASUREMENT_GUIDE_DESCRIPTION =
  "Tape placement for neck, chest, waist, hips and thighs — follow along once and log your numbers in the app.";

const DEFAULT_HEALTH_PROGRESS_TRACKERS = [
  { id: "fatloss", name: "FatLoss", category: "Fat Loss", color: "#ec7a45", enabled: true, builtin: true, featureKey: "weightPic" },
  { id: "menstrual", name: "Menstrual cycle", category: "PCOD / PCOS", color: "#c2559a", enabled: true, builtin: true, featureKey: "menstrualCycle" },
  { id: "glucose", name: "Glucose Panel", category: "Diabetes Reversal", color: "#d64545", enabled: true, builtin: true, featureKey: "glucose" },
  { id: "thyroid", name: "Thyroid care", category: "Thyroid Care", color: "#0d9488", enabled: true, builtin: true },
  { id: "weight-gain", name: "Weight gain", category: "Weight Gain", color: "#3b82f6", enabled: true, builtin: true },
  { id: "gut", name: "Gut health", category: "Gut Health", color: "#22c55e", enabled: true, builtin: true },
  { id: "cholesterol", name: "Cholesterol", category: "Cholesterol Care", color: "#eab308", enabled: true, builtin: true },
  { id: "bp", name: "BP tracking", category: "Hypertension", color: "#a16207", enabled: true, builtin: true, featureKey: "bloodPressure" },
  { id: "fitness", name: "Fitness", category: "Fitness & Strength", color: "#5e6ad2", enabled: true, builtin: true },
  { id: "prenatal", name: "Prenatal", category: "Prenatal Wellness", color: "#ec4899", enabled: true, builtin: true },
  { id: "condition", name: "condition tracking", category: "Skin & visible conditions", color: "#6366f1", enabled: true, builtin: true, featureKey: "conditionComparison" },
];

const BUILTIN_HEALTH_PROGRESS_TRACKER_IDS = new Set(
  DEFAULT_HEALTH_PROGRESS_TRACKERS.map((row) => row.id)
);

function normalizeMediaField(value) {
  if (value == null || String(value).trim() === "") return "";
  const key = normalizeStoredMedia(String(value).trim());
  if (!key) throw new Error("Invalid S3 object key for app config media field");
  return key;
}

function normalizeBodyMeasurementGuideType(value, fallback = "none") {
  const next = String(value || fallback).toLowerCase().trim();
  return BODY_MEASUREMENT_GUIDE_TYPES.has(next) ? next : fallback;
}

function normalizeGuidelineList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function parseStoredArray(value) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
}

function uniqueId(raw, fallback, seen) {
  const base = slugifyTrackerId(raw) || fallback;
  let id = base;
  let n = 2;
  while (seen.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  seen.add(id);
  return id;
}

function normalizeWebLocationRow(row, index, seen) {
  if (!row || typeof row !== "object") return null;
  const name = String(row.name || "").trim();
  const address = String(row.address || "").trim();
  if (!name || !address) return null;
  return {
    id: uniqueId(row.id || name, `loc-${index + 1}`, seen),
    name,
    address,
    live: row.live !== false,
  };
}

function normalizeWebLocations(value) {
  const seen = new Set();
  return parseStoredArray(value)
    .map((row, index) => normalizeWebLocationRow(row, index, seen))
    .filter(Boolean);
}

function normalizeWebContactDetailRow(row, index, seen) {
  if (!row || typeof row !== "object") return null;
  const label = String(row.label || "").trim();
  const value = String(row.value || "").trim();
  if (!label || !value) return null;
  return {
    id: uniqueId(row.id || label, `ct-${index + 1}`, seen),
    label,
    value,
    live: row.live !== false,
  };
}

function normalizeWebContactDetails(value) {
  const seen = new Set();
  return parseStoredArray(value)
    .map((row, index) => normalizeWebContactDetailRow(row, index, seen))
    .filter(Boolean);
}

function slugifyTrackerId(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function normalizeHealthProgressTrackerRow(row, { builtinFallback = false } = {}) {
  if (!row || typeof row !== "object") return null;
  const id = slugifyTrackerId(row.id || row.name || row.category);
  if (!id) return null;
  const builtin = builtinFallback || BUILTIN_HEALTH_PROGRESS_TRACKER_IDS.has(id) || Boolean(row.builtin);
  const name = String(row.name || row.category || id).trim();
  const category = String(row.category || row.name || id).trim();
  const color = String(row.color || "#5e6ad2").trim() || "#5e6ad2";
  const featureKey = row.featureKey ? String(row.featureKey).trim() : "";
  return {
    id,
    name: name || id,
    category: category || name || id,
    color,
    enabled: row.enabled !== false,
    builtin,
    ...(featureKey ? { featureKey } : {}),
  };
}

function normalizeHealthProgressTrackers(value) {
  const stored = Array.isArray(value) ? value : [];
  const byId = new Map();

  for (const row of stored) {
    const next = normalizeHealthProgressTrackerRow(row);
    if (!next) continue;
    byId.set(next.id, next);
  }

  for (const builtin of DEFAULT_HEALTH_PROGRESS_TRACKERS) {
    const existing = byId.get(builtin.id);
    if (!existing) {
      byId.set(builtin.id, { ...builtin });
      continue;
    }
    byId.set(builtin.id, {
      ...existing,
      builtin: true,
      featureKey: builtin.featureKey,
      name: existing.name || builtin.name,
      category: existing.category || builtin.category,
      color: existing.color || builtin.color,
    });
  }

  const ordered = [];
  const seen = new Set();
  for (const row of stored) {
    const id = slugifyTrackerId(row?.id || row?.name || row?.category);
    if (!id || seen.has(id) || !byId.has(id)) continue;
    ordered.push(byId.get(id));
    seen.add(id);
  }
  for (const builtin of DEFAULT_HEALTH_PROGRESS_TRACKERS) {
    if (seen.has(builtin.id)) continue;
    ordered.push(byId.get(builtin.id));
    seen.add(builtin.id);
  }
  return ordered;
}

function normalizeProgressPhotoGuidelines(value, fallback = null) {
  const base =
    fallback && typeof fallback === "object"
      ? fallback
      : { en: [], hi: [] };
  if (Array.isArray(value)) {
    return { en: normalizeGuidelineList(value), hi: normalizeGuidelineList(base.hi) };
  }
  if (!value || typeof value !== "object") {
    return {
      en: normalizeGuidelineList(base.en),
      hi: normalizeGuidelineList(base.hi),
    };
  }
  return {
    en: normalizeGuidelineList(
      value.en !== undefined ? value.en : base.en
    ),
    hi: normalizeGuidelineList(
      value.hi !== undefined ? value.hi : base.hi
    ),
  };
}

function toPublicAppConfig(config) {
  if (!config) return null;
  const { payment_methods: _paymentMethods, dpa_content: _dpaContent, ...rest } = config;
  const pub = {
    ...rest,
    app_version: config.app_version ?? "",
    body_measurement_guide_title:
      String(config.body_measurement_guide_title || "").trim() ||
      DEFAULT_BODY_MEASUREMENT_GUIDE_TITLE,
    body_measurement_guide_description:
      String(config.body_measurement_guide_description || "").trim() ||
      DEFAULT_BODY_MEASUREMENT_GUIDE_DESCRIPTION,
    health_progress_trackers: normalizeHealthProgressTrackers(config.health_progress_trackers),
    web_locations: normalizeWebLocations(config.web_locations),
    web_contact_details: normalizeWebContactDetails(config.web_contact_details),
    commitment_letter_text: resolveCommitmentLetterText(config.commitment_letter_text),
    commitment_letter_version: Math.max(
      1,
      Number(config.commitment_letter_version) || 1
    ),
  };
  for (const field of MEDIA_FIELDS) {
    if (pub[field]) pub[field] = resolvePublicUrl(pub[field]) || "";
  }
  for (const field of BODY_MEASUREMENT_INFO_SHOWN_FIELDS) {
    pub[field] = normalizeBodyMeasurementInfoShown(config[field], true);
  }
  return pub;
}

const TABLE = "AppConfig";

// CREATE — pehli baar config banao
async function createAppConfig() {
  const now = new Date().toISOString();

  const item = {
    id: "app-config",             // fixed id — always ek hi record rahega
    app_name:       "",
    app_email:      "",
    app_mobile:     "",
    app_detail:     "",
    app_version:    "",
    admin_logo:     "",
    user_logo:      "",
    favicon:        "",
    commitment_letter_template: "",
    commitment_letter_text: DEFAULT_COMMITMENT_LETTER_TEXT,
    commitment_letter_version: 1,
    body_measurement_guide_type: "none",
    body_measurement_guide_title: DEFAULT_BODY_MEASUREMENT_GUIDE_TITLE,
    body_measurement_guide_description: DEFAULT_BODY_MEASUREMENT_GUIDE_DESCRIPTION,
    body_measurement_guide_yt_link: "",
    body_measurement_guide_video: "",
    ...Object.fromEntries(BODY_MEASUREMENT_INFO_IMAGE_FIELDS.map((field) => [field, ""])),
    ...Object.fromEntries(BODY_MEASUREMENT_INFO_SHOWN_FIELDS.map((field) => [field, true])),
    progress_photo_guidelines: { en: [], hi: [] },
    health_progress_trackers: DEFAULT_HEALTH_PROGRESS_TRACKERS.map((row) => ({ ...row })),
    web_locations: [],
    web_contact_details: [],
    address:        "",
    latitude:       "",
    longitude:      "",
    facebook:       "",
    youtube:        "",
    instagram:      "",
    linkedin:       "",
    android_app_link: "https://play.google.com/store/apps/details?id=com.example.irwellness",
    ios_app_link: "https://apps.apple.com/app/id0000000000",
    app_download_qr_link: "https://play.google.com/store/apps/details?id=com.example.irwellness",
    ios_app_qr_link: "https://apps.apple.com/app/id0000000000",
    app_details:    "",
    app_footer_text:"",
    improved_user:      "",
    success_rate:       "",
    average_rating:     "",
    happy_clients:      "",
    google_reviews:     "",
    facebook_followers: "",
    tax_type:           "",
    tax_value:          "",
    referral_discount:  "",
    consultancy_amount: "",
    subscription_amount: "",
    app_program_pricing: [],
    // Legacy catalog (days SKUs deprecated). FY pricing lives in energy_exchange_* fields.
    app_subscription_pricing: [],
    app_program_validity_periods: ["24 hours", "48 hours", "72 hours"],
    app_program_discount_slabs: [
      { pct: 10, label: "standard" },
      { pct: 15, label: "festive" },
      { pct: 20, label: "annual plan" },
      { pct: 25, label: "corporate" },
    ],
    app_subscription_validity_periods: ["24 hours", "48 hours", "72 hours"],
    app_subscription_discount_slabs: [
      { pct: 10, label: "standard" },
      { pct: 15, label: "festive" },
      { pct: 20, label: "annual plan" },
      { pct: 25, label: "corporate" },
    ],
    coaches_can_add_program_validity: true,
    coaches_can_add_subscription_validity: true,
    // Legacy shared fields remain for existing clients and stored records.
    coach_validity_periods: ["24 hours", "48 hours", "72 hours"],
    coach_discount_slabs: [
      { pct: 10, label: "standard" },
      { pct: 15, label: "festive" },
      { pct: 20, label: "annual plan" },
      { pct: 25, label: "corporate" },
    ],
    app_heal_validity_periods: ["1 year", "2 years"],
    coaches_can_add_validity: true,
    coaches_can_add_app_heal: true,
    energy_exchange_monthly_amount: "",
    fy_start_month: "4",
    energy_exchange_default_fy_discounts: { "1": 0, "2": 0, "3": 5, "4": 10 },
    energy_exchange_fy_discount_ranges: {
      "1": { min: 0, max: 100 },
      "2": { min: 0, max: 100 },
      "3": { min: 0, max: 100 },
      "4": { min: 0, max: 100 },
    },
    energy_exchange_time_based_discount_range: { min: 0, max: 100 },

    multilang: false,

    // In-app WhatsApp Help & Support (drawer button)
    support_whatsapp_enabled: false,
    support_whatsapp_number: "",
    support_whatsapp_message: "",

    // Drawer compliance line (e.g. "GDPR, HIPAA") — not a full page
    compliance_enabled: true,
    compliance_names: "GDPR, HIPAA",

    // Nested array with credentials object
    payment_gateways: [],   // default empty 

    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(id)",
  }));

  return item;
}

// GET config
async function getAppConfig() {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { id: "app-config" },
  }));
  return Item || null;
}

// UPDATE config fields
async function updateAppConfig(updates) {
  const exprNames  = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let   setExpr    = "SET updatedAt = :updatedAt";

  for (const [key, val] of Object.entries(updates)) {
    exprNames[`#${key}`] = key;
    let nextVal = val;
    if (MEDIA_FIELDS.includes(key)) {
      nextVal = normalizeMediaField(val);
    } else if (key === "body_measurement_guide_type") {
      nextVal = normalizeBodyMeasurementGuideType(val);
    } else if (key === "body_measurement_guide_yt_link") {
      nextVal = String(val ?? "").trim();
    } else if (key === "body_measurement_guide_title") {
      nextVal = String(val ?? "").trim() || DEFAULT_BODY_MEASUREMENT_GUIDE_TITLE;
    } else if (key === "body_measurement_guide_description") {
      nextVal = String(val ?? "").trim() || DEFAULT_BODY_MEASUREMENT_GUIDE_DESCRIPTION;
    } else if (BODY_MEASUREMENT_INFO_SHOWN_FIELDS.includes(key)) {
      nextVal = normalizeBodyMeasurementInfoShown(val, true);
    } else if (key === "progress_photo_guidelines") {
      nextVal = normalizeProgressPhotoGuidelines(val);
    } else if (key === "health_progress_trackers") {
      nextVal = normalizeHealthProgressTrackers(val);
    } else if (key === "web_locations") {
      nextVal = normalizeWebLocations(val);
    } else if (key === "web_contact_details") {
      nextVal = normalizeWebContactDetails(val);
    }
    exprValues[`:${key}`] = nextVal;
    setExpr += `, #${key} = :${key}`;
  }

  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id: "app-config" },
    UpdateExpression: setExpr,
    ExpressionAttributeNames:  exprNames,
    ExpressionAttributeValues: exprValues,
    ReturnValues: "ALL_NEW",
  }));

  return Attributes;
}

module.exports = {
  createAppConfig,
  getAppConfig,
  updateAppConfig,
  toPublicAppConfig,
  MEDIA_FIELDS,
  BODY_MEASUREMENT_GUIDE_TYPES,
  BODY_MEASUREMENT_INFO_IMAGE_KEYS,
  BODY_MEASUREMENT_INFO_IMAGE_FIELDS,
  BODY_MEASUREMENT_INFO_SHOWN_FIELDS,
  DEFAULT_BODY_MEASUREMENT_GUIDE_TITLE,
  DEFAULT_BODY_MEASUREMENT_GUIDE_DESCRIPTION,
  DEFAULT_COMMITMENT_LETTER_TEXT,
  DEFAULT_HEALTH_PROGRESS_TRACKERS,
  normalizeBodyMeasurementGuideType,
  normalizeBodyMeasurementInfoShown,
  normalizeProgressPhotoGuidelines,
  normalizeHealthProgressTrackers,
  normalizeWebLocations,
  normalizeWebContactDetails,
};