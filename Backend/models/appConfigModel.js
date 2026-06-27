const { PutCommand, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const { normalizeStoredMedia, resolvePublicUrl } = require("../utils/s3");

const MEDIA_FIELDS = ["admin_logo", "user_logo", "favicon"];

function normalizeMediaField(value) {
  if (value == null || String(value).trim() === "") return "";
  const key = normalizeStoredMedia(String(value).trim());
  if (!key) throw new Error("Invalid S3 object key for app config media field");
  return key;
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
    address:        "",
    latitude:       "",
    longitude:      "",
    facebook:       "",
    twitter:        "",
    instagram:      "",
    linkedin:       "",
    app_details:    "",
    app_footer_text:"",
    improved_user:      "",
    success_rate:       "",
    average_rating:     "",
    happy_clients:      "",
    tax_type:           "",
    tax_value:          "",
    referral_discount:  "",
    consultancy_amount: "",
    subscription_amount: "",
    energy_exchange_monthly_amount: "",
    fy_start_month: "4",
    energy_exchange_default_fy_discounts: { "1": 0, "2": 0, "3": 5, "4": 10 },

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
    exprValues[`:${key}`] = MEDIA_FIELDS.includes(key) ? normalizeMediaField(val) : val;
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
};