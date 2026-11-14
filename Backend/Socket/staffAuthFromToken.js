const AppError = require("../utils/AppError");
const { verifyAccessToken } = require("../utils/jwt");
const config = require("../config");
const { getAccountById, hasActiveMembership, getMembership } = require("../models/accountModel");
const { getAdminById } = require("../models/adminModel");
const { getWellnessCoachRecordById } = require("../models/wellnessCoachModel");
const { getAssistantWellnessCoachRecordById } = require("../models/assistantWellnessCoachModel");
const { resolveAccountPermissions, isRoleEligibleForActivation } = require("../utils/accountPermissions");
const {
  asLegacyAdminView,
  asLegacyCoachView,
  asLegacyAssistantView,
} = require("../services/accountResolver");
const { normalizeRoleKey } = require("../config/accountRoles");

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

/**
 * Build req-like staff auth from a JWT (for WebSocket handshake).
 * @param {string} token
 * @returns {Promise<{ req: { auth: object, user: object, account: object } }>}
 */
async function resolveStaffAuthFromToken(token) {
  const trimmed = String(token || "").trim();
  if (!trimmed) throw new AppError("Authentication required", 401);

  let payload;
  try {
    payload = verifyAccessToken(trimmed);
    if (payload?.purpose === "mfa") {
      throw new AppError("Invalid or expired token", 401);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Invalid or expired token", 401);
  }

  const activeRole = normalizeRoleKey(payload.role);
  if (!activeRole) throw new AppError("Forbidden", 403);

  const subject = String(payload.sub ?? payload.id ?? payload._id ?? "").trim();
  if (!subject) throw new AppError("Invalid token payload", 401);

  let account = await getAccountById(subject);
  if (!account && config.accountDualRead !== false) {
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

  if (!account) throw new AppError("Account not found", 401);
  assertActiveAccount(account);

  if (!isRoleEligibleForActivation(account, activeRole)) {
    throw new AppError("Forbidden", 403);
  }

  const resolved = await resolveAccountPermissions(account, activeRole, { req: {} });

  let view = account;
  if (activeRole === "admin") view = asLegacyAdminView(account);
  else if (activeRole === "wellness_coach") view = asLegacyCoachView(account);
  else if (activeRole === "assistant_wellness_coach") view = asLegacyAssistantView(account);

  const req = {
    account,
    user: view,
    auth: {
      role: activeRole,
      roles: Array.isArray(payload.roles) ? payload.roles : account.roleKeys || [],
      sub: subject,
      isSuperAdmin: activeRole === "admin" ? Boolean(resolved.isSuperAdmin) : false,
      roleId: resolved.roleId || getMembership(account, activeRole)?.roleId || null,
      permissions: resolved.permissions,
    },
  };

  return { req };
}

module.exports = { resolveStaffAuthFromToken };
