const AppError = require("../utils/AppError");
const { getUserById } = require("../models/userModel");
const { getReminderRecordById } = require("../models/reminderModel");

function readUserIdParam(req) {
  return String(req.params.userId || req.params.id || "").trim();
}

function readReminderIdParam(req) {
  return String(req.params.reminderId || req.params.id || "").trim();
}

function parseReminderBody(body, { partial = false } = {}) {
  const updates = {};

  if (!partial || body.name !== undefined) {
    if (!partial && body.name === undefined) {
      throw new AppError("name is required", 400);
    }
    if (body.name !== undefined) updates.name = body.name;
  }

  if (!partial || body.time !== undefined) {
    if (!partial && body.time === undefined) {
      throw new AppError("time is required", 400);
    }
    if (body.time !== undefined) updates.time = body.time;
  }

  if (!partial || body.days !== undefined) {
    if (!partial && body.days === undefined) {
      throw new AppError("days is required", 400);
    }
    if (body.days !== undefined) updates.days = body.days;
  }

  if (body.isActive !== undefined) {
    updates.isActive = body.isActive;
  }

  return updates;
}

function handleValidationError(err) {
  if (err?.name === "ValidationError") {
    throw new AppError(err.message, 400);
  }
  throw err;
}

async function loadTargetUser(userId) {
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  return user;
}

async function assertCoachCanAccessUser(user, actingCoachId) {
  if (String(user.parentCoachId || "") !== String(actingCoachId)) {
    throw new AppError("User is not under your coaching hierarchy", 403);
  }
}

async function assertAssistantCanAccessUser(user, assistantId) {
  if (String(user.assignedCoachId || "") !== String(assistantId)) {
    throw new AppError("User is not assigned to you", 403);
  }
}

async function loadReminderForUser(reminderId, userId) {
  const reminder = await getReminderRecordById(reminderId);
  if (!reminder || String(reminder.userId || "") !== String(userId)) {
    throw new AppError("Reminder not found", 404);
  }
  return reminder;
}

module.exports = {
  readUserIdParam,
  readReminderIdParam,
  parseReminderBody,
  handleValidationError,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  loadReminderForUser,
};
