const AppError = require("../utils/AppError");
const {
  readUserIdParam,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  assertAdminCanAccessUser,
  handleValidationError,
  resolveCoachIdForUser,
} = require("./dietPlanControllerHelpers");
const {
  getCoachRecommendedSupplementRecordById,
} = require("../models/coachRecommendedSupplementModel");
const {
  getUserSupplementDosageRecordById,
} = require("../models/userSupplementDosageModel");
const {
  getActiveSupplementsByIds,
  snapshotSupplement,
} = require("../models/supplementModel");
const { normalizeDeliveryOption } = require("../models/coachRecommendedSupplementModel");

function readRecommendationIdParam(req) {
  return String(
    req.params.recommendationId || req.params.id || req.params.assignmentId || ""
  ).trim();
}

function readDosageIdParam(req) {
  return String(req.params.dosageId || req.params.id || "").trim();
}

function assertHealTierUser(user) {
  if (String(user.userTier || "").toLowerCase() !== "heal") {
    throw new AppError("Supplements can only be assigned to Heal (paid) users", 400);
  }
}

function parseRecommendationItems(body) {
  let raw = body?.items;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => ({
      supplementId: String(row?.supplementId || row?.id || "").trim(),
      qty: Number(row?.qty),
    }))
    .filter((row) => row.supplementId);
}

function parseDeliveryOption(body) {
  try {
    return normalizeDeliveryOption(body?.deliveryOption);
  } catch (err) {
    if (err?.name === "ValidationError") {
      throw new AppError(err.message, 400);
    }
    throw err;
  }
}

async function buildRecommendationItemSnapshots(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError("At least one supplement item is required", 400);
  }

  const ids = items.map((row) => row.supplementId);
  const supplements = await getActiveSupplementsByIds(ids);
  if (supplements.length !== ids.length) {
    throw new AppError("One or more selected supplements are invalid or inactive", 400);
  }

  const byId = new Map(supplements.map((row) => [String(row.id || row._id), row]));

  return items.map((row) => {
    const supplement = byId.get(row.supplementId);
    const snapshot = snapshotSupplement(supplement);
    const qty = Number(row.qty);
    if (!Number.isFinite(qty) || qty < 1) {
      throw new AppError("Each item must have qty >= 1", 400);
    }
    return { ...snapshot, qty: Math.floor(qty) };
  });
}

async function loadRecommendationForUser(recommendationId, userId) {
  const record = await getCoachRecommendedSupplementRecordById(recommendationId);
  if (!record || String(record.userId || "") !== String(userId)) {
    throw new AppError("Supplement recommendation not found", 404);
  }
  return record;
}

async function loadDosageForUser(dosageId, userId) {
  const record = await getUserSupplementDosageRecordById(dosageId);
  if (!record || String(record.userId || "") !== String(userId)) {
    throw new AppError("Supplement dosage not found", 404);
  }
  return record;
}

function parseDosagePeriods(body) {
  let raw = body?.periods;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = [];
    }
  }
  return Array.isArray(raw) ? raw : [];
}

module.exports = {
  readUserIdParam,
  readRecommendationIdParam,
  readDosageIdParam,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  assertAdminCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  parseRecommendationItems,
  parseDeliveryOption,
  buildRecommendationItemSnapshots,
  loadRecommendationForUser,
  loadDosageForUser,
  parseDosagePeriods,
};
