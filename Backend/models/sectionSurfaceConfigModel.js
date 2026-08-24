const { PutCommand, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");

const TABLE = "SectionSurfaceConfig";

/** Allowed section keys → DynamoDB id */
const SECTION_CONFIG_IDS = Object.freeze({
  banner: "banner-config",
  transformation: "transformation-config",
  "real-people": "real-people-config",
  voice: "voice-config",
  leadership: "leadership-config",
  "wellness-team": "wellness-team-config",
  recipes: "recipes-config",
  yoga: "yoga-config",
  "client-review": "client-review-config",
  faq: "faq-config",
  "health-disorders": "health-disorders-config",
  challenges: "challenges-config",
});

function parseBool(value, fallback = true) {
  if (value === true || value === false) return value;
  const next = String(value ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(next)) return true;
  if (["false", "0", "no", "off"].includes(next)) return false;
  return fallback;
}

function resolveConfigId(section) {
  const key = String(section || "").trim().toLowerCase();
  return SECTION_CONFIG_IDS[key] || null;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function toPublicConfig(item, sectionKey) {
  const row = withLegacyId(item);
  if (!row) return null;
  return {
    ...row,
    section: sectionKey || row.section || null,
    appOn: parseBool(row.appOn, true),
    webOn: parseBool(row.webOn, true),
  };
}

async function createSectionSurfaceConfigShell(section) {
  const configId = resolveConfigId(section);
  if (!configId) throw new Error(`Unknown section surface config: ${section}`);

  const sectionKey = String(section).trim().toLowerCase();
  const now = new Date().toISOString();
  const item = {
    id: configId,
    section: sectionKey,
    appOn: true,
    webOn: true,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );

  return item;
}

async function getSectionSurfaceConfigRecord(section) {
  const configId = resolveConfigId(section);
  if (!configId) return null;

  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id: configId },
    })
  );
  return withLegacyId(Item || null);
}

async function getSectionSurfaceConfig(section) {
  const sectionKey = String(section || "").trim().toLowerCase();
  const item = await getSectionSurfaceConfigRecord(sectionKey);
  return item ? toPublicConfig(item, sectionKey) : null;
}

async function updateSectionSurfaceConfig(section, updates = {}) {
  const configId = resolveConfigId(section);
  if (!configId) throw new Error(`Unknown section surface config: ${section}`);

  const blockedFields = new Set(["id", "_id", "createdAt", "section"]);
  const entries = Object.entries(updates || {})
    .filter(([k, v]) => !blockedFields.has(k) && v !== undefined)
    .map(([k, v]) => {
      if (k === "appOn" || k === "webOn") return [k, parseBool(v, true)];
      return [k, v];
    });

  if (entries.length === 0) throw new Error("No valid fields provided for update");

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [k, v] of entries) {
    exprNames[`#${k}`] = k;
    exprValues[`:${k}`] = v;
    setExpr += `, #${k} = :${k}`;
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id: configId },
      UpdateExpression: setExpr,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return toPublicConfig(Attributes || null, String(section).trim().toLowerCase());
}

module.exports = {
  TABLE,
  SECTION_CONFIG_IDS,
  resolveConfigId,
  createSectionSurfaceConfigShell,
  getSectionSurfaceConfig,
  getSectionSurfaceConfigRecord,
  updateSectionSurfaceConfig,
  toPublicConfig,
  parseBool,
};
