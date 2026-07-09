const AppError = require("../utils/AppError");
const { asyncHandler } = require("../utils/asyncHandler");
const { verifyAccessToken } = require("../utils/jwt");
const { getAdminById } = require("../models/adminModel");
const { getUserById } = require("../models/userModel");
const { getWellnessCoachRecordById } = require("../models/wellnessCoachModel");
const { getAssistantWellnessCoachRecordById } = require("../models/assistantWellnessCoachModel");

function readBearer(req) {
  const h = req.headers.authorization;
  return h?.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

function resolveSubjectFromPayload(payload) {
  const candidate = payload?.sub ?? payload?.id ?? payload?._id ?? null;
  if (typeof candidate !== "string") {
    return null;
  }
  const normalized = candidate.trim();
  return normalized || null;
}

function assertActiveAccount(doc) {
  if (doc.status === "blocked") {
    throw new AppError("Account is blocked", 403);
  }
  if (doc.status === "inactive") {
    throw new AppError("Account is inactive", 403);
  }
}

const protectAdmin = asyncHandler(async (req, res, next) => {
  const token = readBearer(req);
  if (!token) {
    throw new AppError("Authentication required", 401);
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }

  if (payload.role !== "admin") {
    throw new AppError("Forbidden", 403);
  }

  const subject = resolveSubjectFromPayload(payload);
  if (!subject) {
    throw new AppError("Invalid token payload", 401);
  }

  const account = await getAdminById(subject);
  if (!account) {
    throw new AppError("Account not found", 401);
  }

  assertActiveAccount(account);

  req.user = account;
  req.auth = { role: "admin", sub: subject };
  next();
});

const protectUser = asyncHandler(async (req, res, next) => {
  const token = readBearer(req);
  if (!token) {
    throw new AppError("Authentication required", 401);
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }

  if (payload.role !== "user") {
    throw new AppError("Forbidden", 403);
  }

  const subject = resolveSubjectFromPayload(payload);
  if (!subject) {
    throw new AppError("Invalid token payload", 401);
  }

  const account = await getUserById(subject);
  if (!account) {
    throw new AppError("Account not found", 401);
  }

  assertActiveAccount(account);
  req.user = account;
  req.auth = { role: "user", sub: subject };
  next();
});

const protectWellnessCoach = asyncHandler(async (req, res, next) => {
  const token = readBearer(req);
  if (!token) {
    throw new AppError("Authentication required", 401);
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }

  if (payload.role !== "wellness_coach") {
    throw new AppError("Forbidden", 403);
  }

  const subject = resolveSubjectFromPayload(payload);
  if (!subject) {
    throw new AppError("Invalid token payload", 401);
  }

  const account = await getWellnessCoachRecordById(subject);
  if (!account) {
    throw new AppError("Account not found", 401);
  }

  assertActiveAccount(account);

  req.user = account;
  req.auth = { role: "wellness_coach", sub: subject };
  next();
});

const protectAssistantWellnessCoach = asyncHandler(async (req, res, next) => {
  const token = readBearer(req);
  if (!token) {
    throw new AppError("Authentication required", 401);
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }

  if (payload.role !== "assistant_wellness_coach") {
    throw new AppError("Forbidden", 403);
  }

  const subject = resolveSubjectFromPayload(payload);
  if (!subject) {
    throw new AppError("Invalid token payload", 401);
  }

  const account = await getAssistantWellnessCoachRecordById(subject);
  if (!account) {
    throw new AppError("Account not found", 401);
  }

  assertActiveAccount(account);

  req.user = account;
  req.auth = { role: "assistant_wellness_coach", sub: subject };
  next();
});

module.exports = {
  protectAdmin,
  protectUser,
  protectWellnessCoach,
  protectAssistantWellnessCoach,
};
