const AppError = require("../utils/AppError");
const {
  resolveHealthProgressSettings,
  HEALTH_PROGRESS_FEATURE_KEYS,
  normalizeHealthProgressFeatures,
  toIsoDateOnly,
  toRecordedAtFromDateOnly,
  toNumberOrNull,
  normalizeGlucoseType,
  normalizeBodyPart,
  isFemaleUser,
} = require("../utils/healthProgressHelpers");
const { getUserById, updateUser, toPublicUser } = require("../models/userModel");
const {
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAdminCanAccessUser,
} = require("./reminderControllerHelpers");
const { assertHealTierUser } = require("./dietPlanControllerHelpers");

function authedUserId(req) {
  return req.auth?.sub || req.user?.id;
}

function readUserIdParam(req) {
  const userId = req.params?.userId;
  if (!userId) throw new AppError("userId is required", 400);
  return String(userId);
}

function readPagination(req) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  return { page, limit };
}

function handleValidationError(err) {
  if (err?.message) {
    throw new AppError(err.message, 400);
  }
  throw err;
}

function getStoredHealthProgressFeatures(user) {
  return normalizeHealthProgressFeatures(user?.healthProgressFeatures);
}

function assertFeatureEnabled(user, featureKey) {
  const settings = resolveHealthProgressSettings(user);
  if (!settings[featureKey]) {
    throw new AppError("This health progress feature is not enabled for your account", 403);
  }
}

function requireHealthProgressFeature(featureKey) {
  return async (req, res, next) => {
    try {
      const user = req.currentUser || (await getUserById(authedUserId(req)));
      if (!user) throw new AppError("User not found", 404);
      assertFeatureEnabled(user, featureKey);
      req.currentUser = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}

function parseRecordedAt(body) {
  const dateOnly = toIsoDateOnly(body?.date || body?.recordedAt);
  return toRecordedAtFromDateOnly(dateOnly);
}

function parseCoachSettingsUpdate(body, user) {
  const current = getStoredHealthProgressFeatures(user);
  const next = { ...current };

  for (const key of HEALTH_PROGRESS_FEATURE_KEYS) {
    if (body?.[key] !== undefined) {
      next[key] = Boolean(body[key]);
    }
    if (body?.healthProgressFeatures?.[key] !== undefined) {
      next[key] = Boolean(body.healthProgressFeatures[key]);
    }
  }

  if (!isFemaleUser(user)) {
    next.menstrualCycle = false;
  }

  return next;
}

module.exports = {
  authedUserId,
  readUserIdParam,
  readPagination,
  handleValidationError,
  getStoredHealthProgressFeatures,
  assertFeatureEnabled,
  requireHealthProgressFeature,
  parseRecordedAt,
  parseCoachSettingsUpdate,
  resolveHealthProgressSettings,
  toNumberOrNull,
  normalizeGlucoseType,
  normalizeBodyPart,
  toIsoDateOnly,
  toRecordedAtFromDateOnly,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAdminCanAccessUser,
  assertHealTierUser,
  updateUser,
  toPublicUser,
  isFemaleUser,
};
