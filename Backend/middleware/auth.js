const AppError = require("../utils/AppError");
const { asyncHandler } = require("../utils/asyncHandler");
const { verifyAccessToken } = require("../utils/jwt");
const config = require("../config");
const { getAdminById } = require("../models/adminModel");
const { getRoleById, roleTargetsAccountType } = require("../models/roleModel");
const { resolveStaffPermissions } = require("../utils/permissions");
const { getUserById } = require("../models/userModel");
const { getWellnessCoachRecordById } = require("../models/wellnessCoachModel");
const { getAssistantWellnessCoachRecordById } = require("../models/assistantWellnessCoachModel");
const { getStaffAccountRecordById } = require("../models/staffAccountModel");
const { remapLegacyOverrides } = require("../config/staffPermissionSlugMap");
const { ADMIN, STAFF } = require("../config/staffPermissionCatalog");

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

// ---------------------------------------------------------------------------
// Legacy, per-table middlewares. Kept exactly as before the Unified Staff
// RBAC Panel migration — each remains reachable by setting the matching
// `STAFF_CUTOVER_*` env var to "false" (see Backend/config/index.js).
// ---------------------------------------------------------------------------

const protectAdminLegacy = asyncHandler(async (req, res, next) => {
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

  // Resolved live (not just from the JWT) so permission edits by the Super
  // Admin take effect on the sub-admin's very next request, not just after
  // their token is refreshed/they log in again.
  //
  // Must use `resolveStaffPermissions` (unified), not the legacy
  // `resolvePermissions` (`Backend/config/permissionCatalog.js`-only): the M3
  // backfill already remapped every Role's `permissions` onto the unified
  // `staffPermissionCatalog` slugs (e.g. `users.clientHub.* -> clientHub.*`),
  // so the legacy resolver would silently drop any remapped Client Hub
  // permission a sub-admin role was granted — same class of bug fixed for
  // coach in M5 (see `protectWellnessCoachLegacy`).
  const isSuperAdmin = Boolean(account.isSuperAdmin);
  let role = !isSuperAdmin && account.roleId ? await getRoleById(account.roleId) : null;
  if (role && !roleTargetsAccountType(role, "admin")) {
    role = null;
  }
  const permissions = resolveStaffPermissions(
    { ...account, accountType: "admin", isSuperAdmin },
    role
  );

  req.user = account;
  req.auth = {
    role: "admin",
    sub: subject,
    isSuperAdmin,
    roleId: account.roleId || null,
    permissions,
  };
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

const protectWellnessCoachLegacy = asyncHandler(async (req, res, next) => {
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

  // `Role.permissions` was remapped onto the unified `staffPermissionCatalog`
  // slugs during the M3 backfill (see `Backend/scripts/backfillStaffAccounts.js`),
  // so resolution here must use `resolveStaffPermissions` (unified), not the
  // legacy `resolveCoachPermissionMap` (`nav.*`/`clientTab.*`) — the latter
  // would find zero matches against an already-unified role and silently
  // deny every permission. The legacy `WellnessCoach` row has no
  // `accountType` field, so it's shimmed in for the resolver.
  let role = account.roleId ? await getRoleById(account.roleId) : null;
  if (role && !roleTargetsAccountType(role, "wellness_coach")) {
    role = null;
  }
  const permissions = resolveStaffPermissions(
    {
      ...account,
      accountType: "wellness_coach",
      isSuperAdmin: false,
      // Per-coach overrides may still be set with legacy slug keys by the
      // not-yet-cut-over admin UI (`Backend/controllers/adminController/
      // wellnessCoachController.js`) — remap before resolving.
      permissionOverrides: remapLegacyOverrides(account.permissionOverrides, "COACH"),
    },
    role
  );

  req.user = account;
  req.auth = {
    role: "wellness_coach",
    sub: subject,
    roleId: account.roleId || null,
    permissions,
  };
  next();
});

const protectAssistantWellnessCoachLegacy = asyncHandler(async (req, res, next) => {
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

// ---------------------------------------------------------------------------
// Unified Staff RBAC Panel: single middleware for every staff account type,
// backed by the `StaffAccount` table + `Role.accountTypes` + the unified
// `staffPermissionCatalog`. Issued only by `POST /api/staff/auth/*`
// (`Backend/controllers/staffController/authController.js`), which signs
// `{ sub, role: "staff", accountType }` — old admin/coach/assistant tokens
// (`role: "admin" | "wellness_coach" | "assistant_wellness_coach"`) are
// intentionally rejected here so a cutover milestone requires re-login
// rather than trying to make old tokens valid against new middleware.
//
// `allowedAccountTypes`, when provided, restricts which staff account
// type(s) may use the route (e.g. `protectStaff(["admin"])`).
// ---------------------------------------------------------------------------
function protectStaff(allowedAccountTypes) {
  const allowed = Array.isArray(allowedAccountTypes) && allowedAccountTypes.length > 0
    ? new Set(allowedAccountTypes)
    : null;

  return asyncHandler(async (req, res, next) => {
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

    if (payload.role !== "staff") {
      throw new AppError("Forbidden", 403);
    }

    const subject = resolveSubjectFromPayload(payload);
    if (!subject) {
      throw new AppError("Invalid token payload", 401);
    }

    const account = await getStaffAccountRecordById(subject);
    if (!account) {
      throw new AppError("Account not found", 401);
    }
    if (payload.accountType && payload.accountType !== account.accountType) {
      throw new AppError("Forbidden", 403);
    }
    if (allowed && !allowed.has(account.accountType)) {
      throw new AppError("Forbidden", 403);
    }

    assertActiveAccount(account);

    const isSuperAdmin = Boolean(account.isSuperAdmin);
    let role = !isSuperAdmin && account.roleId ? await getRoleById(account.roleId) : null;
    // A role reassigned away from this account's type (e.g. via a bulk edit)
    // is treated as "no role" rather than granting the wrong module set.
    if (role && !roleTargetsAccountType(role, account.accountType)) {
      role = null;
    }
    const permissions = resolveStaffPermissions(account, role);

    req.user = account;
    req.auth = {
      role: "staff",
      accountType: account.accountType,
      sub: subject,
      isSuperAdmin,
      roleId: account.roleId || null,
      permissions,
    };
    next();
  });
}

/**
 * Dispatch to the unified `protectStaff` once an account type's milestone has
 * cut over (`config.staffCutover.<accountType>`), otherwise fall back to the
 * legacy per-table middleware. This lets `protectAdmin`/`protectWellnessCoach`/
 * `protectAssistantWellnessCoach` upgrade every existing route/controller call
 * site at once, without editing the ~120 route files that import them.
 *
 * Admin routes also admit the generic `STAFF` account type (custom roles like
 * Marketing Manager/Trainer/Supervisor) — the unified Panel reuses these
 * exact admin-catalog pages/routes for them (see `Frontend/src/panel/utils/navAccess.js`),
 * relying entirely on `authorize(slug)` downstream (already accountType-agnostic)
 * to enforce that a Staff account only gets what its role was actually granted.
 * Coach/Assistant routes intentionally stay admin-catalog-exclusive — a
 * generic Staff account never has the `wellnessCoachId`-shaped client
 * assignment those rely on.
 */
function dispatchProtect(accountType, legacyMiddleware) {
  const allowedTypes = accountType === ADMIN ? [ADMIN, STAFF] : [accountType];
  const staffMiddleware = protectStaff(allowedTypes);
  return (req, res, next) => {
    if (config.staffCutover?.[accountType]) {
      return staffMiddleware(req, res, next);
    }
    return legacyMiddleware(req, res, next);
  };
}

const protectAdmin = dispatchProtect("admin", protectAdminLegacy);
const protectWellnessCoach = dispatchProtect("wellness_coach", protectWellnessCoachLegacy);
const protectAssistantWellnessCoach = dispatchProtect(
  "assistant_wellness_coach",
  protectAssistantWellnessCoachLegacy
);

module.exports = {
  protectAdmin,
  protectUser,
  protectWellnessCoach,
  protectAssistantWellnessCoach,
  protectStaff,
  protectAdminLegacy,
  protectWellnessCoachLegacy,
  protectAssistantWellnessCoachLegacy,
};
