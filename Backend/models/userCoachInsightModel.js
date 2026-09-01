const { GetCommand, PutCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");

const TABLE = "UserCoachInsight";
const MAX_MESSAGE_LENGTH = 500;
const DEFAULT_DURATION_HOURS = 24;
const ALLOWED_DURATION_HOURS = [8, 24, 48, 72];

function normalizeDurationHours(value) {
  const hours = Number(value);
  if (!Number.isFinite(hours) || !ALLOWED_DURATION_HOURS.includes(hours)) {
    const err = new Error(`durationHours must be one of: ${ALLOWED_DURATION_HOURS.join(", ")}`);
    err.name = "ValidationError";
    throw err;
  }
  return hours;
}

function computeVisibleUntil(fromIso, durationHours) {
  const start = new Date(fromIso);
  if (Number.isNaN(start.getTime())) return null;
  start.setHours(start.getHours() + durationHours);
  return start.toISOString();
}

function isCoachInsightVisible(item, now = new Date()) {
  if (!item?.message) return false;
  if (!item.visibleUntil) return true;
  const expiry = new Date(item.visibleUntil);
  if (Number.isNaN(expiry.getTime())) return true;
  return expiry.getTime() > now.getTime();
}

function normalizeMessage(value) {
  const message = String(value ?? "").trim();
  if (!message) {
    const err = new Error("message is required");
    err.name = "ValidationError";
    throw err;
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    const err = new Error(`message must be at most ${MAX_MESSAGE_LENGTH} characters`);
    err.name = "ValidationError";
    throw err;
  }
  return message;
}

function toPublicCoachInsight(item, { includeExpired = true } = {}) {
  if (!item) return null;
  const visible = isCoachInsightVisible(item);
  if (!includeExpired && !visible) return null;
  return {
    userId: item.userId,
    message: item.message,
    durationHours: item.durationHours ?? DEFAULT_DURATION_HOURS,
    visibleUntil: item.visibleUntil ?? null,
    isVisible: visible,
    updatedByCoachId: item.updatedByCoachId ?? null,
    updatedByCoachType: item.updatedByCoachType ?? null,
    createdAt: item.createdAt ?? null,
    updatedAt: item.updatedAt ?? null,
  };
}

async function getCoachInsightByUserId(userId, options = {}) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { userId: String(userId) },
    })
  );
  return Item ? toPublicCoachInsight(Item, options) : null;
}

async function upsertCoachInsight(userId, {
  message,
  durationHours = DEFAULT_DURATION_HOURS,
  updatedByCoachId,
  updatedByCoachType,
}) {
  const normalizedMessage = normalizeMessage(message);
  const normalizedDuration = normalizeDurationHours(durationHours);
  const now = new Date().toISOString();
  const existing = await getCoachInsightByUserId(userId, { includeExpired: true });

  const item = {
    userId: String(userId),
    message: normalizedMessage,
    durationHours: normalizedDuration,
    visibleUntil: computeVisibleUntil(now, normalizedDuration),
    updatedByCoachId: updatedByCoachId ? String(updatedByCoachId) : null,
    updatedByCoachType: updatedByCoachType ? String(updatedByCoachType) : null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
    })
  );

  return toPublicCoachInsight(item);
}

async function deleteCoachInsight(userId) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { userId: String(userId) },
    })
  );
}

module.exports = {
  MAX_MESSAGE_LENGTH,
  DEFAULT_DURATION_HOURS,
  ALLOWED_DURATION_HOURS,
  getCoachInsightByUserId,
  upsertCoachInsight,
  deleteCoachInsight,
  toPublicCoachInsight,
  isCoachInsightVisible,
};
