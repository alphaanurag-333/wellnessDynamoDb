const { PutCommand, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const { normalizeStoredMedia, resolvePublicUrl } = require("../utils/s3");

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

const MEDIA_FIELDS = [
  "admin_logo",
  "user_logo",
  "favicon",
  "commitment_letter_template",
  "body_measurement_guide_video",
  ...BODY_MEASUREMENT_INFO_IMAGE_FIELDS,
];
const BODY_MEASUREMENT_GUIDE_TYPES = new Set(["none", "link", "video"]);

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
  const { payment_methods: _paymentMethods, ...rest } = config;
  const pub = { ...rest, app_version: config.app_version ?? "" };
  for (const field of MEDIA_FIELDS) {
    if (pub[field]) pub[field] = resolvePublicUrl(pub[field]) || "";
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
    body_measurement_guide_type: "none",
    body_measurement_guide_yt_link: "",
    body_measurement_guide_video: "",
    ...Object.fromEntries(BODY_MEASUREMENT_INFO_IMAGE_FIELDS.map((field) => [field, ""])),
    progress_photo_guidelines: { en: [], hi: [] },
    address:        "",
    latitude:       "",
    longitude:      "",
    facebook:       "",
    youtube:        "",
    instagram:      "",
    linkedin:       "",
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
    app_subscription_pricing: [
      { id: "sub-month", name: "App subscription · monthly", amount: 499 },
      { id: "sub-year", name: "App subscription · yearly", amount: 4999 },
      { id: "sub-2y", name: "App subscription · 2 years", amount: 8999 },
    ],
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
    } else if (key === "progress_photo_guidelines") {
      nextVal = normalizeProgressPhotoGuidelines(val);
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
  normalizeBodyMeasurementGuideType,
  normalizeProgressPhotoGuidelines,
};