const AppError = require("../utils/AppError");
const { asyncHandler } = require("../utils/asyncHandler");
const { getUserById } = require("../models/userModel");
const { getUserStepsHistory, upsertSettings } = require("../models/stepsTrackingModel");
const { enrichUser } = require("./userController/userProfileHelpers");
const { normalizeUserTier } = require("../models/userAssignmentLogic");
const { assertStaffCanAccessUser } = require("./staffAccess");

function toHistoryUser(user) {
  return {
    id: user.id,
    _id: user.id,
    name: user.name,
    email: user.email,
    userTier: normalizeUserTier(user.userTier),
  };
}

async function fetchStepsHistory(userId, query) {
  const days = Math.min(Math.max(Number(query.days) || 7, 1), 366);
  const fromDate = query.from || query.fromDate || query.startDate;
  const toDate = query.to || query.toDate || query.endDate;

  try {
    return await getUserStepsHistory(userId, {
      fromDate: fromDate ? String(fromDate).trim() : undefined,
      toDate: toDate ? String(toDate).trim() : undefined,
      days,
    });
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }
}

exports.getUserStepsTrackingHistoryController = asyncHandler(async (req, res) => {
  const userId = req.params.id || req.params.userId;
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);

  const data = await fetchStepsHistory(userId, req.query);

  return res.status(200).json({
    status: true,
    message: "Steps tracking history fetched",
    user: toHistoryUser(user),
    data,
  });
});

exports.getStaffHealUserStepsTrackingController = asyncHandler(async (req, res) => {
  const userId = req.params.id || req.params.userId;
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);

  const data = await fetchStepsHistory(userId, req.query);
  const enriched = await enrichUser(user);

  return res.status(200).json({
    status: true,
    message: "Steps tracking history fetched",
    user: toHistoryUser(enriched),
    data,
  });
});

exports.updateStaffHealUserStepsGoalController = asyncHandler(async (req, res) => {
  const userId = req.params.id || req.params.userId;
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);

  const goalSteps = req.body?.goalSteps ?? req.body?.goal_steps;
  if (goalSteps == null || goalSteps === "") {
    throw new AppError("goalSteps is required", 400);
  }

  let settings;
  try {
    settings = await upsertSettings(userId, { goalSteps });
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Daily steps goal updated",
    data: { settings },
  });
});

exports.getCoachHealUserStepsTrackingController = exports.getStaffHealUserStepsTrackingController;
exports.getAssistantHealUserStepsTrackingController = exports.getStaffHealUserStepsTrackingController;
