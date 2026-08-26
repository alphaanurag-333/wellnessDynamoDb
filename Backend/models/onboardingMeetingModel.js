const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");
const { SCHEDULE_STEP_KEYS } = require("../utils/paidOnboardingHelpers");

const TABLE = "OnboardingMeeting";

const MEETING_STATUSES = new Set([
  "slots_offered",
  "time_requested",
  "confirmed",
  "cancelled",
  "expired",
]);

const ACTIVE_STATUSES = new Set(["slots_offered", "time_requested", "confirmed"]);

const HOLD_OPTIONS_MS = {
  "2 hours": 2 * 60 * 60 * 1000,
  "6 hours": 6 * 60 * 60 * 1000,
  "12 hours": 12 * 60 * 60 * 1000,
  "24 hours": 24 * 60 * 60 * 1000,
  "48 hours": 48 * 60 * 60 * 1000,
  "7 days": 7 * 24 * 60 * 60 * 1000,
};

function isScheduleStepKey(value) {
  return SCHEDULE_STEP_KEYS.includes(String(value || "").trim());
}

function normalizeStatus(value, fallback = "slots_offered") {
  const next = String(value || fallback).toLowerCase().trim();
  return MEETING_STATUSES.has(next) ? next : null;
}

function parseIsoDate(value, fieldName) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const err = new Error(`${fieldName} must be a valid date`);
    err.name = "ValidationError";
    throw err;
  }
  return date.toISOString();
}

const MAX_REQUESTED_SLOTS = 4;

function normalizeSlots(rawSlots) {
  if (!Array.isArray(rawSlots) || !rawSlots.length) {
    const err = new Error("At least one slot is required");
    err.name = "ValidationError";
    throw err;
  }
  return rawSlots.map((slot, index) => {
    const startAt = parseIsoDate(slot.startAt || slot.start_at, `slots[${index}].startAt`);
    const endAt = parseIsoDate(slot.endAt || slot.end_at, `slots[${index}].endAt`);
    if (!startAt || !endAt) {
      const err = new Error(`slots[${index}] requires startAt and endAt`);
      err.name = "ValidationError";
      throw err;
    }
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      const err = new Error(`slots[${index}] endAt must be after startAt`);
      err.name = "ValidationError";
      throw err;
    }
    return {
      id: String(slot.id || uuidv4()),
      startAt,
      endAt,
    };
  });
}

/**
 * Normalize user-proposed alternate times (1–4).
 * Accepts `slots` array, or legacy single `{ startAt, endAt }` / body fields.
 */
function normalizeRequestedSlots(raw, { startAt, endAt } = {}) {
  let list = Array.isArray(raw) ? raw : null;
  if (!list || !list.length) {
    if (startAt && endAt) {
      list = [{ startAt, endAt }];
    } else {
      const err = new Error("At least one requested time slot is required");
      err.name = "ValidationError";
      throw err;
    }
  }
  if (list.length > MAX_REQUESTED_SLOTS) {
    const err = new Error(`At most ${MAX_REQUESTED_SLOTS} requested time slots are allowed`);
    err.name = "ValidationError";
    throw err;
  }
  return normalizeSlots(list);
}

function resolveRequestedSlots(meeting) {
  if (!meeting) return [];
  if (Array.isArray(meeting.requestedSlots) && meeting.requestedSlots.length) {
    return meeting.requestedSlots;
  }
  if (meeting.requestedStartAt && meeting.requestedEndAt) {
    return [
      {
        id: "legacy",
        startAt: meeting.requestedStartAt,
        endAt: meeting.requestedEndAt,
      },
    ];
  }
  return [];
}

/**
 * Confirmed meeting time: preferred selected slot, else explicit confirmed range,
 * else first slot (legacy coach-offer fallback).
 */
function resolveConfirmedSlot(meeting) {
  if (!meeting || meeting.status !== "confirmed") return null;
  const slots = Array.isArray(meeting.slots) ? meeting.slots : [];
  if (meeting.selectedSlotId) {
    const selected = slots.find((s) => String(s.id) === String(meeting.selectedSlotId));
    if (selected?.startAt) return selected;
  }
  if (meeting.confirmedStartAt && meeting.confirmedEndAt) {
    return {
      id: meeting.selectedSlotId || "confirmed",
      startAt: meeting.confirmedStartAt,
      endAt: meeting.confirmedEndAt,
    };
  }
  return slots[0] || null;
}

function mirrorRequestedSlots(requestedSlots) {
  const slots = Array.isArray(requestedSlots) ? requestedSlots : [];
  const first = slots[0] || null;
  return {
    requestedSlots: slots,
    requestedStartAt: first?.startAt || null,
    requestedEndAt: first?.endAt || null,
  };
}

function holdExpiresAtFrom(hold, now = Date.now()) {
  const label = String(hold || "24 hours").trim();
  const ms = HOLD_OPTIONS_MS[label] || HOLD_OPTIONS_MS["24 hours"];
  return new Date(now + ms).toISOString();
}

function toPublicOnboardingMeeting(item) {
  if (!item) return null;
  return {
    id: item.id,
    _id: item.id,
    userId: item.userId,
    stepKey: item.stepKey,
    status: item.status,
    slots: Array.isArray(item.slots) ? item.slots : [],
    holdExpiresAt: item.holdExpiresAt || null,
    coachNote: item.coachNote || "",
    durationMinutes: Number(item.durationMinutes) || 45,
    selectedSlotId: item.selectedSlotId || null,
    requestedSlots: resolveRequestedSlots(item),
    requestedStartAt: item.requestedStartAt || null,
    requestedEndAt: item.requestedEndAt || null,
    zoomMeetingId: item.zoomMeetingId || null,
    zoomJoinUrl: item.zoomJoinUrl || null,
    zoomStartUrl: item.zoomStartUrl || null,
    confirmedAt: item.confirmedAt || null,
    confirmedStartAt: item.confirmedStartAt || null,
    confirmedEndAt: item.confirmedEndAt || null,
    coachId: item.coachId || null,
    createdById: item.createdById || null,
    createdByRole: item.createdByRole || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function toUserFacingMeeting(item) {
  const pub = toPublicOnboardingMeeting(item);
  if (!pub) return null;
  delete pub.zoomStartUrl;
  return pub;
}

function buildUserStepKey(userId, stepKey) {
  return `${String(userId).trim()}#${String(stepKey).trim()}`;
}

function buildItem(input, { id, now }) {
  const stepKey = String(input.stepKey || "").trim();
  if (!isScheduleStepKey(stepKey)) {
    const err = new Error("Invalid meeting stepKey");
    err.name = "ValidationError";
    throw err;
  }
  const status = normalizeStatus(input.status, "slots_offered");
  if (!status) {
    const err = new Error("Invalid meeting status");
    err.name = "ValidationError";
    throw err;
  }
  const userId = String(input.userId || "").trim();
  if (!userId) {
    const err = new Error("userId is required");
    err.name = "ValidationError";
    throw err;
  }

  return {
    id: id || uuidv4(),
    userId,
    stepKey,
    userStepKey: buildUserStepKey(userId, stepKey),
    status,
    slots: Array.isArray(input.slots) ? input.slots : [],
    holdExpiresAt: input.holdExpiresAt || null,
    coachNote: input.coachNote ? String(input.coachNote).trim() : "",
    durationMinutes: Number(input.durationMinutes) || 45,
    selectedSlotId: input.selectedSlotId || null,
    requestedSlots: Array.isArray(input.requestedSlots) ? input.requestedSlots : [],
    requestedStartAt: input.requestedStartAt || null,
    requestedEndAt: input.requestedEndAt || null,
    zoomMeetingId: input.zoomMeetingId || null,
    zoomJoinUrl: input.zoomJoinUrl || null,
    zoomStartUrl: input.zoomStartUrl || null,
    confirmedAt: input.confirmedAt || null,
    confirmedStartAt: input.confirmedStartAt || null,
    confirmedEndAt: input.confirmedEndAt || null,
    coachId: input.coachId ? String(input.coachId) : null,
    createdById: input.createdById ? String(input.createdById) : null,
    createdByRole: input.createdByRole ? String(input.createdByRole) : null,
    createdAt: now,
    updatedAt: now,
  };
}

async function createOnboardingMeeting(input) {
  const now = new Date().toISOString();
  const item = buildItem(input, { now });
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
  return item;
}

async function getOnboardingMeetingById(id, { consistentRead = false } = {}) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id: String(id) },
      ConsistentRead: Boolean(consistentRead),
    })
  );
  return Item || null;
}

async function updateOnboardingMeeting(id, updates) {
  const current = await getOnboardingMeetingById(id);
  if (!current) {
    const err = new Error("Meeting not found");
    err.name = "NotFoundError";
    throw err;
  }

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let updateExpr = "SET updatedAt = :updatedAt";
  const allowed = [
    "status",
    "slots",
    "holdExpiresAt",
    "coachNote",
    "durationMinutes",
    "selectedSlotId",
    "requestedSlots",
    "requestedStartAt",
    "requestedEndAt",
    "zoomMeetingId",
    "zoomJoinUrl",
    "zoomStartUrl",
    "confirmedAt",
    "confirmedStartAt",
    "confirmedEndAt",
    "coachId",
  ];

  for (const [key, val] of Object.entries(updates || {})) {
    if (val === undefined || !allowed.includes(key)) continue;
    let value = val;
    if (key === "status") {
      value = normalizeStatus(val, current.status);
      if (!value) {
        const err = new Error("Invalid meeting status");
        err.name = "ValidationError";
        throw err;
      }
    }
    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = value;
    updateExpr += `, #${key} = :${key}`;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id: String(id) },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: Object.keys(exprNames).length ? exprNames : undefined,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(id)",
    })
  );

  return getOnboardingMeetingById(id, { consistentRead: true });
}

async function listOnboardingMeetingsByUserId(userId, { page = 1, limit = 50, stepKey, status } = {}) {
  if (!userId) {
    return { items: [], pagination: { page: 1, limit, total: 0, pages: 1 } };
  }
  const filterParts = [];
  const extraNames = {};
  const extraValues = {};
  if (stepKey) {
    filterParts.push("stepKey = :stepKey");
    extraValues[":stepKey"] = String(stepKey);
  }
  if (status) {
    filterParts.push("#status = :status");
    extraNames["#status"] = "status";
    extraValues[":status"] = normalizeStatus(status) || String(status);
  }
  return queryPartition({
    tableName: TABLE,
    indexName: "UserIdCreatedAtIndex",
    partitionKeyName: "userId",
    partitionKeyValue: String(userId),
    filterExpression: filterParts.length ? filterParts.join(" AND ") : undefined,
    exprNames: extraNames,
    exprValues: extraValues,
    page,
    limit,
    scanIndexForward: false,
  });
}

async function listOnboardingMeetingsByCoachId(coachId, { page = 1, limit = 100, status } = {}) {
  if (!coachId) {
    return { items: [], pagination: { page: 1, limit, total: 0, pages: 1 } };
  }
  const filterParts = [];
  const extraNames = {};
  const extraValues = {};
  if (status) {
    filterParts.push("#status = :status");
    extraNames["#status"] = "status";
    extraValues[":status"] = normalizeStatus(status) || String(status);
  }
  return queryPartition({
    tableName: TABLE,
    indexName: "CoachIdCreatedAtIndex",
    partitionKeyName: "coachId",
    partitionKeyValue: String(coachId),
    filterExpression: filterParts.length ? filterParts.join(" AND ") : undefined,
    exprNames: extraNames,
    exprValues: extraValues,
    page,
    limit,
    scanIndexForward: false,
  });
}

async function listOnboardingMeetingsByUserStepKey(userId, stepKey, { page = 1, limit = 20 } = {}) {
  if (!userId || !stepKey) {
    return { items: [], pagination: { page: 1, limit, total: 0, pages: 1 } };
  }
  return queryPartition({
    tableName: TABLE,
    indexName: "UserStepKeyCreatedAtIndex",
    partitionKeyName: "userStepKey",
    partitionKeyValue: buildUserStepKey(userId, stepKey),
    page,
    limit,
    scanIndexForward: false,
  });
}

async function getActiveMeetingForStep(userId, stepKey) {
  const result = await listOnboardingMeetingsByUserStepKey(userId, stepKey, { limit: 20 });
  const now = Date.now();
  for (const item of result.items || []) {
    if (!ACTIVE_STATUSES.has(item.status)) continue;
    if (
      item.status === "slots_offered" &&
      item.holdExpiresAt &&
      new Date(item.holdExpiresAt).getTime() < now
    ) {
      await updateOnboardingMeeting(item.id, { status: "expired" });
      continue;
    }
    return item;
  }
  return null;
}

async function listMeetingsByStepForUser(userId) {
  const result = await listOnboardingMeetingsByUserId(userId, { limit: 100 });
  const byStep = {};
  for (const key of SCHEDULE_STEP_KEYS) byStep[key] = null;
  const now = Date.now();
  for (const item of result.items || []) {
    if (!isScheduleStepKey(item.stepKey)) continue;
    if (byStep[item.stepKey]) continue;
    if (
      item.status === "slots_offered" &&
      item.holdExpiresAt &&
      new Date(item.holdExpiresAt).getTime() < now
    ) {
      await updateOnboardingMeeting(item.id, { status: "expired" });
      continue;
    }
    byStep[item.stepKey] = toUserFacingMeeting(item);
  }
  return byStep;
}

module.exports = {
  TABLE,
  MEETING_STATUSES,
  ACTIVE_STATUSES,
  MAX_REQUESTED_SLOTS,
  SCHEDULE_STEP_KEYS,
  isScheduleStepKey,
  holdExpiresAtFrom,
  normalizeSlots,
  normalizeRequestedSlots,
  resolveRequestedSlots,
  resolveConfirmedSlot,
  mirrorRequestedSlots,
  parseIsoDate,
  toPublicOnboardingMeeting,
  toUserFacingMeeting,
  createOnboardingMeeting,
  getOnboardingMeetingById,
  updateOnboardingMeeting,
  listOnboardingMeetingsByUserId,
  listOnboardingMeetingsByCoachId,
  getActiveMeetingForStep,
  listMeetingsByStepForUser,
};
