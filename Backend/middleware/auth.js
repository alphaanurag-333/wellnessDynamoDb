const AppError = require("../utils/AppError");
const { asyncHandler } = require("../utils/asyncHandler");
const { verifyAccessToken } = require("../utils/jwt");
const { getAccountById, deriveAccountType } = require("../models/accountModel");
const { getRoleById } = require("../models/roleModel");
const { resolvePermissions } = require("../utils/permissions");
const { getUserById } = require("../models/userModel");

const PANEL_JWT_ROLES = new Set([
  "account",
  "admin",
  "wellness_coach",
  "assistant_wellness_coach",
]);

function readBearer(req) {
  const h = req.headers.authorization;
  return h?.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

function resolveSubjectFromPayload(payload) {
  const candidate = payload?.sub ?? payload?.id ?? payload?._id ?? null;
  if (typeof candidate !== "string") return null;
  const normalized = candidate.trim();
  return normalized || null;
}

function assertActiveAccount(doc) {
  if (doc.status === "blocked") throw new AppError("Account is blocked", 403);
  if (doc.status === "inactive") throw new AppError("Account is inactive", 403);
}

function assertCareApproved(doc, accountType) {
  if (accountType !== "wellness_coach" && accountType !== "assistant_wellness_coach") return;
  if (doc.approvalStatus === "pending") {
    throw new AppError("Your account is pending admin approval. Please wait for approval.", 403);
  }
  if (doc.approvalStatus === "rejected") {
    throw new AppError("Your account registration has been rejected. Please contact admin.", 403);
  }
}

/**
 * Panel auth against global Accounts table.
 * accountType is derived from parentAccountId + role care permissions (and accountKind fallback).
 */
const protectAdmin = asyncHandler(async (req, res, next) => {
  const token = readBearer(req);
  if (!token) throw new AppError("Authentication required", 401);

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }

  const jwtRole = String(payload.role || payload.accountType || "").trim();
  if (!PANEL_JWT_ROLES.has(jwtRole)) {
    throw new AppError("Forbidden", 403);
  }

  const subject = resolveSubjectFromPayload(payload);
  if (!subject) throw new AppError("Invalid token payload", 401);

  const account = await getAccountById(subject);
  if (!account) throw new AppError("Account not found", 401);
  assertActiveAccount(account);

  const isSuperAdmin = Boolean(account.isSuperAdmin);
  const role = !isSuperAdmin && account.roleId ? await getRoleById(account.roleId) : null;
  const accountType = deriveAccountType(account, role);
  assertCareApproved(account, accountType);

  const permissions = resolvePermissions(account, role, accountType);

  req.user = account;
  req.auth = {
    role: accountType,
    accountType,
    sub: subject,
    isSuperAdmin,
    roleId: account.roleId || null,
    permissions,
    parentCoachId:
      accountType === "assistant_wellness_coach"
        ? account.parentAccountId || null
        : accountType === "wellness_coach"
          ? account.id
          : null,
    wellnessCoachId: account.parentAccountId || null,
    accountKind: account.accountKind || null,
  };
  return next();
});

const protectUser = asyncHandler(async (req, res, next) => {
  const token = readBearer(req);
  if (!token) throw new AppError("Authentication required", 401);

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }

  if (payload.role !== "user") throw new AppError("Forbidden", 403);

  const subject = resolveSubjectFromPayload(payload);
  if (!subject) throw new AppError("Invalid token payload", 401);

  const account = await getUserById(subject);
  if (!account) throw new AppError("Account not found", 401);
  assertActiveAccount(account);
  req.user = account;
  req.auth = { role: "user", sub: subject };
  next();
});

const protectWellnessCoach = (req, res, next) => {
  protectAdmin(req, res, (err) => {
    if (err) return next(err);
    if (req.auth?.accountType !== "wellness_coach") {
      return next(new AppError("Forbidden", 403));
    }
    return next();
  });
};

const protectAssistantWellnessCoach = (req, res, next) => {
  protectAdmin(req, res, (err) => {
    if (err) return next(err);
    if (req.auth?.accountType !== "assistant_wellness_coach") {
      return next(new AppError("Forbidden", 403));
    }
    return next();
  });
};

module.exports = {
  protectAdmin,
  protectUser,
  protectWellnessCoach,
  protectAssistantWellnessCoach,
  PANEL_JWT_ROLES,
};
