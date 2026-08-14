/**
 * Resolve permissions for an Account given the active roleKey.
 * Canonical source is CONSOLE roles (Access Control). Legacy ADMIN/COACH catalogs are not used.
 */
const { getRoleById } = require("../models/roleModel");
const { getMembership, hasActiveMembership } = require("../models/accountModel");
const { normalizeRoleKey, DEFAULT_ROLE_PRIORITY, ROLE_KEY_TO_UI } = require("../config/accountRoles");
const {
  ALL_CONSOLE_PERMISSIONS,
  isValidConsolePermission,
  grantsMapToPermissions,
  DEFAULT_CONSOLE_GRANTS,
} = require("../config/consolePermissionCatalog");

function consolePermissionsForRoleKey(roleKey) {
  const uiKey = ROLE_KEY_TO_UI[roleKey];
  if (!uiKey || !Object.prototype.hasOwnProperty.call(DEFAULT_CONSOLE_GRANTS, uiKey)) {
    return [];
  }
  return grantsMapToPermissions(DEFAULT_CONSOLE_GRANTS[uiKey]);
}

function permissionsFromConsoleRole(role) {
  if (!role || String(role.scope || "").toUpperCase() !== "CONSOLE") return null;
  return (Array.isArray(role.permissions) ? role.permissions : []).filter(isValidConsolePermission);
}

function applyConsoleOverrides(basePermissions, overrides) {
  if (!overrides || typeof overrides !== "object") return basePermissions;
  if (!Object.prototype.hasOwnProperty.call(overrides, "consoleGrants")) return basePermissions;
  return grantsMapToPermissions(overrides.consoleGrants);
}

async function resolveAccountPermissions(account, activeRoleKey) {
  const roleKey = normalizeRoleKey(activeRoleKey);
  if (!account || !roleKey || !hasActiveMembership(account, roleKey)) {
    return { permissions: [], isSuperAdmin: false, roleId: null, permissionMap: null };
  }

  const membership = getMembership(account, roleKey);
  const isSuperAdmin = roleKey === "admin" && Boolean(account.isSuperAdmin);

  if (isSuperAdmin) {
    return {
      permissions: [...ALL_CONSOLE_PERMISSIONS],
      isSuperAdmin: true,
      roleId: membership?.roleId || null,
      permissionMap: null,
    };
  }

  let role = null;
  if (membership?.roleId) {
    role = await getRoleById(membership.roleId);
  }

  let permissions = permissionsFromConsoleRole(role);
  if (permissions == null) {
    permissions = consolePermissionsForRoleKey(roleKey);
  }
  permissions = applyConsoleOverrides(permissions, membership?.permissionOverrides);

  return {
    permissions,
    isSuperAdmin: false,
    roleId: membership?.roleId || null,
    permissionMap: null,
  };
}

function isRoleEligibleForActivation(account, roleKey) {
  const key = normalizeRoleKey(roleKey);
  if (!account || !key || !hasActiveMembership(account, key)) return false;
  if (account.status === "inactive" || account.status === "blocked") return false;
  if (key === "wellness_coach") {
    const approval = String(account.approvalStatus || "approved").toLowerCase();
    return approval === "approved";
  }
  return true;
}

function pickDefaultActiveRole(account, requestedRoleKey = null) {
  const requested = normalizeRoleKey(requestedRoleKey);
  if (requested && isRoleEligibleForActivation(account, requested)) {
    return requested;
  }
  const preferred = normalizeRoleKey(account?.defaultRoleKey);
  if (preferred && isRoleEligibleForActivation(account, preferred)) {
    return preferred;
  }
  for (const key of DEFAULT_ROLE_PRIORITY) {
    if (isRoleEligibleForActivation(account, key)) return key;
  }
  return null;
}

function listEligibleRoleKeys(account) {
  return DEFAULT_ROLE_PRIORITY.filter((key) => isRoleEligibleForActivation(account, key));
}

module.exports = {
  resolveAccountPermissions,
  isRoleEligibleForActivation,
  pickDefaultActiveRole,
  listEligibleRoleKeys,
};
