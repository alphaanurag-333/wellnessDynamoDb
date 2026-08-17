/**
 * Resolve permissions for an Account given the active roleKey.
 * Canonical source is CONSOLE roles (Access Control). Legacy ADMIN/COACH catalogs are not used.
 */
const { getRoleById, getRoleBySlug } = require("../models/roleModel");
const { getMembership, hasActiveMembership } = require("../models/accountModel");
const { normalizeRoleKey, DEFAULT_ROLE_PRIORITY, ROLE_KEY_TO_UI } = require("../config/accountRoles");
const {
  ALL_CONSOLE_PERMISSIONS,
  isValidConsolePermission,
  grantsMapToPermissions,
  DEFAULT_CONSOLE_GRANTS,
  ROLE_KEY_META,
} = require("../config/consolePermissionCatalog");

function consoleDataScopeForRoleKey(roleKey) {
  const uiKey = ROLE_KEY_TO_UI[roleKey];
  return ROLE_KEY_META[uiKey]?.dataScope || "assigned";
}

function consolePermissionsForRoleKey(roleKey) {
  const uiKey = ROLE_KEY_TO_UI[roleKey];
  if (!uiKey || !Object.prototype.hasOwnProperty.call(DEFAULT_CONSOLE_GRANTS, uiKey)) {
    return [];
  }
  return grantsMapToPermissions(DEFAULT_CONSOLE_GRANTS[uiKey]);
}

function isConsoleRole(role) {
  return Boolean(role) && String(role.scope || "").toUpperCase() === "CONSOLE";
}

function permissionsFromConsoleRole(role) {
  if (!isConsoleRole(role)) return null;
  return (Array.isArray(role.permissions) ? role.permissions : []).filter(isValidConsolePermission);
}

/** The Access Control template every account of this role key follows. */
async function getConsoleRoleForRoleKey(roleKey) {
  const slug = ROLE_KEY_META[ROLE_KEY_TO_UI[roleKey]]?.slug;
  if (!slug) return null;
  try {
    return await getRoleBySlug(slug, { scope: "CONSOLE" });
  } catch {
    return null;
  }
}

function applyConsoleOverrides(basePermissions, overrides) {
  if (!overrides || typeof overrides !== "object") return basePermissions;
  if (!Object.prototype.hasOwnProperty.call(overrides, "consoleGrants")) return basePermissions;
  return grantsMapToPermissions(overrides.consoleGrants);
}

async function resolveAccountPermissions(account, activeRoleKey) {
  const roleKey = normalizeRoleKey(activeRoleKey);
  if (!account || !roleKey || !hasActiveMembership(account, roleKey)) {
    return {
      permissions: [],
      isSuperAdmin: false,
      roleId: null,
      permissionMap: null,
      dataScope: "assigned",
    };
  }

  const membership = getMembership(account, roleKey);
  const isSuperAdmin = roleKey === "admin" && Boolean(account.isSuperAdmin);

  if (isSuperAdmin) {
    return {
      permissions: [...ALL_CONSOLE_PERMISSIONS],
      isSuperAdmin: true,
      roleId: membership?.roleId || null,
      permissionMap: null,
      dataScope: "all",
    };
  }

  let role = null;
  if (membership?.roleId) {
    role = await getRoleById(membership.roleId);
  }
  // Memberships seeded before Access Control (roleId null) or pointing at a
  // legacy-scope template must still follow their role key's console template,
  // otherwise permission edits made in Access Control never reach the account.
  if (!isConsoleRole(role)) {
    role = await getConsoleRoleForRoleKey(roleKey);
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
    dataScope: String(role?.dataScope || consoleDataScopeForRoleKey(roleKey)).toLowerCase(),
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
