/**
 * Shared panel auth context for Accounts-backed admin / coach / assistant logins.
 */
const { getRoleById } = require("../models/roleModel");
const { deriveAccountType } = require("../models/accountModel");
const { resolvePermissions } = require("./permissions");
const { createTokenPair } = require("./jwt");

const PANEL_JWT_ROLES = new Set([
  "account",
  "admin",
  "wellness_coach",
  "assistant_wellness_coach",
]);

async function resolvePanelAuthContext(account) {
  const isSuperAdmin = Boolean(account.isSuperAdmin);
  const role = !isSuperAdmin && account.roleId ? await getRoleById(account.roleId) : null;
  const accountType = deriveAccountType(account, role);
  const permissions = resolvePermissions(account, role, accountType);
  return {
    isSuperAdmin,
    roleId: account.roleId || null,
    permissions,
    accountType,
    accountKind: account.accountKind || null,
    parentCoachId:
      accountType === "assistant_wellness_coach"
        ? account.parentAccountId || account.wellnessCoachId || null
        : accountType === "wellness_coach"
          ? account.id
          : null,
    wellnessCoachId: account.parentAccountId || account.wellnessCoachId || null,
  };
}

function createPanelTokenPair(account, ctx) {
  return createTokenPair({
    sub: account.id,
    role: ctx.accountType,
    accountType: ctx.accountType,
    isSuperAdmin: ctx.isSuperAdmin,
    roleId: ctx.roleId,
    permissions: ctx.permissions,
  });
}

function isPanelJwtRole(roleOrType) {
  return PANEL_JWT_ROLES.has(String(roleOrType || "").trim());
}

module.exports = {
  PANEL_JWT_ROLES,
  resolvePanelAuthContext,
  createPanelTokenPair,
  isPanelJwtRole,
};
