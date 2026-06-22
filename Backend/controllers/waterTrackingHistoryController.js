const AppError = require("../utils/AppError");
const { asyncHandler } = require("../utils/asyncHandler");
const { getUserById } = require("../models/userModel");
const { getUserWaterHistory } = require("../models/waterTrackingModel");
const { enrichUser } = require("./userController/userProfileHelpers");
const { normalizeUserTier } = require("../models/userAssignmentLogic");

function toHistoryUser(user) {
  return {
    id: user.id,
    _id: user.id,
    name: user.name,
    email: user.email,
    userTier: normalizeUserTier(user.userTier),
  };
}

exports.getUserWaterTrackingHistoryController = asyncHandler(async (req, res) => {
  const userId = req.params.id || req.params.userId;
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);

  const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 366);
  const fromDate = req.query.from || req.query.fromDate || req.query.startDate;
  const toDate = req.query.to || req.query.toDate || req.query.endDate;

  let data;
  try {
    data = await getUserWaterHistory(userId, {
      fromDate: fromDate ? String(fromDate).trim() : undefined,
      toDate: toDate ? String(toDate).trim() : undefined,
      days,
    });
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Water tracking history fetched",
    user: toHistoryUser(user),
    data,
  });
});

exports.getCoachHealUserWaterTrackingController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub || req.user?.id;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = req.params.id || req.params.userId;
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);

  if (String(user.parentCoachId || "") !== String(actingCoachId)) {
    throw new AppError("User is not under your coaching hierarchy", 403);
  }

  const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 366);
  const fromDate = req.query.from || req.query.fromDate || req.query.startDate;
  const toDate = req.query.to || req.query.toDate || req.query.endDate;

  let data;
  try {
    data = await getUserWaterHistory(userId, {
      fromDate: fromDate ? String(fromDate).trim() : undefined,
      toDate: toDate ? String(toDate).trim() : undefined,
      days,
    });
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  const enriched = await enrichUser(user);

  return res.status(200).json({
    status: true,
    message: "Water tracking history fetched",
    user: toHistoryUser(enriched),
    data,
  });
});

exports.getAssistantHealUserWaterTrackingController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub || req.user?.id;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const userId = req.params.id || req.params.userId;
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);

  if (String(user.assignedCoachId || "") !== String(assistantId)) {
    throw new AppError("User is not assigned to you", 403);
  }

  const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 366);
  const fromDate = req.query.from || req.query.fromDate || req.query.startDate;
  const toDate = req.query.to || req.query.toDate || req.query.endDate;

  let data;
  try {
    data = await getUserWaterHistory(userId, {
      fromDate: fromDate ? String(fromDate).trim() : undefined,
      toDate: toDate ? String(toDate).trim() : undefined,
      days,
    });
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  const enriched = await enrichUser(user);

  return res.status(200).json({
    status: true,
    message: "Water tracking history fetched",
    user: toHistoryUser(enriched),
    data,
  });
});
