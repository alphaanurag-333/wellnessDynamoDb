const { PutCommand, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");

const BLOG_CONFIG_ID = "blog-config";
const TABLE = "BlogConfig";

function parseBool(value, fallback = true) {
  if (value === true || value === false) return value;
  const next = String(value ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(next)) return true;
  if (["false", "0", "no", "off"].includes(next)) return false;
  return fallback;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function toPublicBlogConfig(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  return {
    ...row,
    appOn: parseBool(row.appOn, true),
    webOn: parseBool(row.webOn, true),
  };
}

async function createBlogConfigShell() {
  const now = new Date().toISOString();
  const item = {
    id: BLOG_CONFIG_ID,
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

async function getBlogConfigRecord() {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id: BLOG_CONFIG_ID },
    })
  );
  return withLegacyId(Item || null);
}

async function getBlogConfig() {
  const item = await getBlogConfigRecord();
  return item ? toPublicBlogConfig(item) : null;
}

async function updateBlogConfig(updates = {}) {
  const blockedFields = new Set(["id", "_id", "createdAt"]);
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
      Key: { id: BLOG_CONFIG_ID },
      UpdateExpression: setExpr,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return toPublicBlogConfig(Attributes || null);
}

module.exports = {
  BLOG_CONFIG_ID,
  createBlogConfigShell,
  getBlogConfig,
  getBlogConfigRecord,
  updateBlogConfig,
  toPublicBlogConfig,
  parseBool,
};
