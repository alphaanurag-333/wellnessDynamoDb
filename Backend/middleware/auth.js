const AppError = require("../utils/AppError");
const { asyncHandler } = require("../utils/asyncHandler");
const { verifyAccessToken } = require("../utils/jwt");
const { getAdminById } = require("../models/adminModel");
const { getRoleById } = require("../models/roleModel");
const { resolvePermissions } = require("../utils/permissions");
const { getUserById } = require("../models/userModel");
const { getWellnessCoachRecordById } = require("../models/wellnessCoachModel");
const { getAssistantWellnessCoachRecordById } = require("../models/assistantWellnessCoachModel");
const {
  resolveCoachPermissions,
  permissionMapToList,
} = require("../utils/coachPermissions");
const { getAccountById, hasActiveMembership, getMembership } = require("../models/accountModel");
const {
  resolveAccountPermissions,
  isRoleEligibleForActivation,
} = require("../utils/accountPermissions");
const {
  asLegacyAdminView,
  asLegacyCoachView,
  asLegacyAssistantView,
} = require("../services/accountResolver");
const { normalizeRoleKey } = require("../config/accountRoles");
const config = require("../config");

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
  if (doc.status === "deleted") {
    throw new AppError("Account has been deleted", 401);
  }
  if (doc.status === "blocked") {
    throw new AppError("Account is blocked", 403);
  }
  if (doc.status === "inactive") {
    throw new AppError("Account is inactive", 403);
  }
}

function parseAccessToken(req) {
  const token = readBearer(req);
  if (!token) {
    throw new AppError("Authentication required", 401);
  }
  try {
    return verifyAccessToken(token);
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }
}

/**
 * Unified staff Account protector.
 * JWT.role = active role; permissions resolved live from Account memberships.
 */
const protectAccount = asyncHandler(async (req, res, next) => {
  const payload = parseAccessToken(req);
  const activeRole = normalizeRoleKey(payload.role);
  if (!activeRole) {
    throw new AppError("Forbidden", 403);
  }

  const subject = resolveSubjectFromPayload(payload);
  if (!subject) {
    throw new AppError("Invalid token payload", 401);
  }

  let account = await getAccountById(subject);
  if (!account && config.accountDualRead !== false) {
    // Fall back via role-specific legacy loaders shaped as Account is handled below
    if (activeRole === "admin") {
      const admin = await getAdminById(subject);
      if (admin) {
        account = {
          ...admin,
          memberships: [
            {
              roleKey: "admin",
              roleId: admin.roleId || null,
              status: "active",
              parentAccountId: null,
            },
          ],
          roleKeys: ["admin"],
          isSuperAdmin: Boolean(admin.isSuperAdmin),
        };
      }
    } else if (activeRole === "wellness_coach") {
      const coach = await getWellnessCoachRecordById(subject);
      if (coach) {
        account = {
          ...coach,
          memberships: [
            {
              roleKey: "wellness_coach",
              roleId: coach.roleId || null,
              permissionOverrides: coach.permissionOverrides || null,
              status: "active",
              parentAccountId: null,
            },
          ],
          roleKeys: ["wellness_coach"],
        };
      }
    } else if (activeRole === "assistant_wellness_coach") {
      const assistant = await getAssistantWellnessCoachRecordById(subject);
      if (assistant) {
        account = {
          ...assistant,
          parentAccountId: assistant.wellnessCoachId || null,
          memberships: [
            {
              roleKey: "assistant_wellness_coach",
              roleId: null,
              status: "active",
              parentAccountId: assistant.wellnessCoachId || null,
            },
          ],
          roleKeys: ["assistant_wellness_coach"],
          wellnessCoachId: assistant.wellnessCoachId || null,
        };
      }
    }
  }

  if (!account) {
    throw new AppError("Account not found", 401);
  }

  assertActiveAccount(account);

  if (!isRoleEligibleForActivation(account, activeRole)) {
    throw new AppError("Forbidden", 403);
  }

  const resolved = await resolveAccountPermissions(account, activeRole, { req });

  let view = account;
  if (activeRole === "admin") view = asLegacyAdminView(account);
  else if (activeRole === "wellness_coach") view = asLegacyCoachView(account);
  else if (activeRole === "assistant_wellness_coach") view = asLegacyAssistantView(account);

  req.account = account;
  req.user = view;
  req.auth = {
    role: activeRole,
    roles: Array.isArray(payload.roles) ? payload.roles : account.roleKeys || [],
    sub: subject,
    isSuperAdmin: activeRole === "admin" ? Boolean(resolved.isSuperAdmin) : false,
    roleId: resolved.roleId || null,
    permissions: resolved.permissions,
  };
  next();
});

function requireActiveRole(...roleKeys) {
  const allowed = new Set(roleKeys.map(normalizeRoleKey).filter(Boolean));
  return (req, res, next) => {
    if (!req.auth) {
      return next(new AppError("Authentication required", 401));
    }
    if (!allowed.has(req.auth.role)) {
      return next(new AppError("Forbidden", 403));
    }
    return next();
  };
}

async function protectLegacyOrAccount(expectedRole, legacyLoader, legacyAuthBuilder) {
  return asyncHandler(async (req, res, next) => {
    if (config.accountAuthEnabled) {
      const payload = parseAccessToken(req);
      if (normalizeRoleKey(payload.role) !== expectedRole) {
        throw new AppError("Forbidden", 403);
      }
      // Reuse protectAccount path
      req.headers.authorization = req.headers.authorization;
      return protectAccount(req, res, next);
    }

    const payload = parseAccessToken(req);
    if (payload.role !== expectedRole) {
      throw new AppError("Forbidden", 403);
    }
    const subject = resolveSubjectFromPayload(payload);
    if (!subject) {
      throw new AppError("Invalid token payload", 401);
    }

    // Prefer Account dual-read even when accountAuthEnabled is false
    if (config.accountDualRead !== false) {
      const account = await getAccountById(subject);
      if (account && hasActiveMembership(account, expectedRole)) {
        assertActiveAccount(account);
        if (!isRoleEligibleForActivation(account, expectedRole)) {
          throw new AppError("Forbidden", 403);
        }
        const resolved = await resolveAccountPermissions(account, expectedRole, { req });
        let view = account;
        if (expectedRole === "admin") view = asLegacyAdminView(account);
        else if (expectedRole === "wellness_coach") view = asLegacyCoachView(account);
        else if (expectedRole === "assistant_wellness_coach") view = asLegacyAssistantView(account);

        req.account = account;
        req.user = view;
        req.auth = {
          role: expectedRole,
          sub: subject,
          isSuperAdmin: expectedRole === "admin" ? Boolean(resolved.isSuperAdmin) : false,
          roleId: resolved.roleId || getMembership(account, expectedRole)?.roleId || null,
          permissions: resolved.permissions,
        };
        return next();
      }
    }

    const doc = await legacyLoader(subject);
    if (!doc) {
      throw new AppError("Account not found", 401);
    }
    assertActiveAccount(doc);
    const auth = await legacyAuthBuilder(doc, subject, req);
    req.user = doc;
    req.auth = auth;
    next();
  });
}

const protectAdmin = asyncHandler(async (req, res, next) => {
  if (config.accountAuthEnabled) {
    const payload = parseAccessToken(req);
    if (payload.role !== "admin") throw new AppError("Forbidden", 403);
    return protectAccount(req, res, next);
  }

  const payload = parseAccessToken(req);
  if (payload.role !== "admin") {
    throw new AppError("Forbidden", 403);
  }

  const subject = resolveSubjectFromPayload(payload);
  if (!subject) {
    throw new AppError("Invalid token payload", 401);
  }

  if (config.accountDualRead !== false) {
    const account = await getAccountById(subject);
    if (account && hasActiveMembership(account, "admin")) {
      assertActiveAccount(account);
      const resolved = await resolveAccountPermissions(account, "admin", { req });
      req.account = account;
      req.user = asLegacyAdminView(account);
      req.auth = {
        role: "admin",
        sub: subject,
        isSuperAdmin: Boolean(resolved.isSuperAdmin),
        roleId: resolved.roleId || null,
        permissions: resolved.permissions,
      };
      return next();
    }
  }

  const account = await getAdminById(subject);
  if (!account) {
    throw new AppError("Account not found", 401);
  }

  assertActiveAccount(account);

  const isSuperAdmin = Boolean(account.isSuperAdmin);
  const role = !isSuperAdmin && account.roleId ? await getRoleById(account.roleId) : null;
  const permissions = resolvePermissions(account, role);

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
  const payload = parseAccessToken(req);

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
  if (config.accountAuthEnabled) {
    const payload = parseAccessToken(req);
    if (payload.role !== "wellness_coach") throw new AppError("Forbidden", 403);
    return protectAccount(req, res, next);
  }

  const payload = parseAccessToken(req);
  if (payload.role !== "wellness_coach") {
    throw new AppError("Forbidden", 403);
  }

  const subject = resolveSubjectFromPayload(payload);
  if (!subject) {
    throw new AppError("Invalid token payload", 401);
  }

  if (config.accountDualRead !== false) {
    const account = await getAccountById(subject);
    if (account && hasActiveMembership(account, "wellness_coach")) {
      assertActiveAccount(account);
      if (!isRoleEligibleForActivation(account, "wellness_coach")) {
        throw new AppError("Forbidden", 403);
      }
      const resolved = await resolveAccountPermissions(account, "wellness_coach", { req });
      req.account = account;
      req.user = asLegacyCoachView(account);
      req.auth = {
        role: "wellness_coach",
        sub: subject,
        roleId: resolved.roleId || null,
        permissions: resolved.permissions,
      };
      return next();
    }
  }

  const account = await getWellnessCoachRecordById(subject);
  if (!account) {
    throw new AppError("Account not found", 401);
  }

  assertActiveAccount(account);

  const permissionMap = await resolveCoachPermissions(account, { req });
  req.user = account;
  req.auth = {
    role: "wellness_coach",
    sub: subject,
    roleId: account.roleId || null,
    permissions: permissionMapToList(permissionMap),
  };
  next();
});

const protectAssistantWellnessCoach = asyncHandler(async (req, res, next) => {
  if (config.accountAuthEnabled) {
    const payload = parseAccessToken(req);
    if (payload.role !== "assistant_wellness_coach") throw new AppError("Forbidden", 403);
    return protectAccount(req, res, next);
  }

  const payload = parseAccessToken(req);
  if (payload.role !== "assistant_wellness_coach") {
    throw new AppError("Forbidden", 403);
  }

  const subject = resolveSubjectFromPayload(payload);
  if (!subject) {
    throw new AppError("Invalid token payload", 401);
  }

  if (config.accountDualRead !== false) {
    const account = await getAccountById(subject);
    if (account && hasActiveMembership(account, "assistant_wellness_coach")) {
      assertActiveAccount(account);
      const resolved = await resolveAccountPermissions(account, "assistant_wellness_coach", { req });
      req.account = account;
      req.user = asLegacyAssistantView(account);
      req.auth = {
        role: "assistant_wellness_coach",
        sub: subject,
        roleId: resolved.roleId || null,
        permissions: resolved.permissions,
      };
      return next();
    }
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
  protectAccount,
  requireActiveRole,
  protectAdmin,
  protectUser,
  protectWellnessCoach,
  protectAssistantWellnessCoach,
  // unused helper kept for clarity / future
  protectLegacyOrAccount,
};
