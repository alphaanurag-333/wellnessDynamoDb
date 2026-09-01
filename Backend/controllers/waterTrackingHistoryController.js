const AppError = require("../utils/AppError");
const { asyncHandler } = require("../utils/asyncHandler");
const { getUserById } = require("../models/userModel");
const { getUserWaterHistory, setDayGoal, unlockGoalSettings } = require("../models/waterTrackingModel");
const { isValidDateOnly, todayDateOnly } = require("../utils/dateOnly");
const { enrichUser } = require("./userController/userProfileHelpers");
const { normalizeUserTier } = require("../models/userAssignmentLogic");
const { assertStaffCanAccessUser } = require("./staffAccess");

function toHistoryUser(user) {
  return {
    id: user.id,
    _id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    phoneCountryCode: user.phoneCountryCode,
    userTier: normalizeUserTier(user.userTier),
    assignmentStatus: user.assignmentStatus || null,
    assignedCoach: user.assignedCoach || null,
    assignedCoachId: user.assignedCoachId || null,
    assignedCoachType: user.assignedCoachType || null,
    parentCoach: user.parentCoach || null,
    parentCoachId: user.parentCoachId || null,
    profileImage: user.profileImage || null,
    presentablePic: user.presentablePic || null,
    convertedAt: user.convertedAt || null,
    createdAt: user.createdAt || null,
  };
}

exports.getUserWaterTrackingHistoryController = asyncHandler(async (req, res) => {
  const userId = req.params.id || req.params.userId;
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);

  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 366);
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

exports.getStaffHealUserWaterTrackingController = asyncHandler(async (req, res) => {
  const userId = req.params.id || req.params.userId;
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);

  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 366);
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

exports.updateStaffHealUserWaterGoalController = asyncHandler(async (req, res) => {
  const userId = req.params.id || req.params.userId;
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);

  const goalGlasses = req.body?.goalGlasses ?? req.body?.goal_glasses;
  if (goalGlasses == null || goalGlasses === "") {
    throw new AppError("goalGlasses is required", 400);
  }

  const dateCandidate = req.body?.date ?? req.query?.date ?? todayDateOnly();
  const date = String(dateCandidate).trim();
  if (!isValidDateOnly(date)) {
    throw new AppError("date must be YYYY-MM-DD", 400);
  }

  let result;
  try {
    result = await setDayGoal(userId, date, goalGlasses, { lockGoal: true });
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Daily water goal updated",
    data: result,
  });
});

exports.unlockStaffHealUserWaterGoalController = asyncHandler(async (req, res) => {
  const userId = req.params.id || req.params.userId;
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);

  const settings = await unlockGoalSettings(userId);

  return res.status(200).json({
    status: true,
    message: "Client can edit water goal",
    data: { settings },
  });
});

exports.getCoachHealUserWaterTrackingController = exports.getStaffHealUserWaterTrackingController;
exports.getAssistantHealUserWaterTrackingController = exports.getStaffHealUserWaterTrackingController;
