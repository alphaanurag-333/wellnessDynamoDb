/**
 * Resolve permissions for an Account given the active roleKey.
 */
const { resolvePermissions } = require("./permissions");
const {
  resolveCoachPermissions,
  permissionMapToList,
  resolveCoachPermissionMap,
} = require("./coachPermissions");
const { getRoleById } = require("../models/roleModel");
const { getMembership, hasActiveMembership } = require("../models/accountModel");
const {
  normalizeRoleKey,
  scopeForRoleKey,
  DEFAULT_ROLE_PRIORITY,
} = require("../config/accountRoles");
const {
  ALL_ASSISTANT_PERMISSIONS,
  isValidAssistantPermission,
  allTrueAssistantPermissionMap,
} = require("../config/assistantPermissionCatalog");
const {
  ALL_TRAINEE_PERMISSIONS,
  isValidTraineePermission,
  allTrueTraineePermissionMap,
} = require("../config/traineePermissionCatalog");
const {
  ALL_SUPPORT_PERMISSIONS,
  isValidSupportPermission,
  allTrueSupportPermissionMap,
} = require("../config/supportPermissionCatalog");

function coachLikeFromMembership(account, membership) {
  return {
    ...account,
    roleId: membership?.roleId || null,
    permissionOverrides: membership?.permissionOverrides || null,
  };
}

function resolveScopedPermissionMap({
  membership,
  allKeys,
  isValid,
  allTrueMap,
  role,
}) {
  if (!membership?.roleId) {
    return allTrueMap();
  }
  const granted = new Set(
    (Array.isArray(role?.permissions) ? role.permissions : []).filter(isValid)
  );
  const overrides =
    membership.permissionOverrides && typeof membership.permissionOverrides === "object"
      ? membership.permissionOverrides
      : {};
  const map = {};
  for (const key of allKeys) {
    let allowed = granted.has(key);
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      allowed = Boolean(overrides[key]);
    }
    map[key] = allowed;
  }
  return map;
}

function permissionMapToSlugList(map) {
  return Object.entries(map || {})
    .filter(([, v]) => Boolean(v))
    .map(([k]) => k);
}

async function resolveAccountPermissions(account, activeRoleKey, { req } = {}) {
  const roleKey = normalizeRoleKey(activeRoleKey);
  if (!account || !roleKey || !hasActiveMembership(account, roleKey)) {
    return { permissions: [], isSuperAdmin: false, roleId: null, permissionMap: null };
  }

  const membership = getMembership(account, roleKey);

  if (roleKey === "admin") {
    const isSuperAdmin = Boolean(account.isSuperAdmin);
    const role = !isSuperAdmin && membership?.roleId ? await getRoleById(membership.roleId) : null;
    const adminView = {
      ...account,
      isSuperAdmin,
      roleId: membership?.roleId || null,
    };
    const permissions = resolvePermissions(adminView, role);
    return {
      permissions,
      isSuperAdmin,
      roleId: membership?.roleId || null,
      permissionMap: null,
    };
  }

  if (roleKey === "wellness_coach") {
    const coachView = coachLikeFromMembership(account, membership);
    const permissionMap = await resolveCoachPermissions(coachView, { req });
    return {
      permissions: permissionMapToList(permissionMap),
      isSuperAdmin: false,
      roleId: membership?.roleId || null,
      permissionMap,
    };
  }

  const scope = scopeForRoleKey(roleKey);
  const role = membership?.roleId ? await getRoleById(membership.roleId) : null;
  if (role && scope && String(role.scope || "").toUpperCase() !== scope) {
    // Ignore mismatched template
  }

  if (roleKey === "assistant_wellness_coach") {
    const map = resolveScopedPermissionMap({
      membership,
      allKeys: ALL_ASSISTANT_PERMISSIONS,
      isValid: isValidAssistantPermission,
      allTrueMap: allTrueAssistantPermissionMap,
      role: role && String(role.scope || "").toUpperCase() === "ASSISTANT" ? role : null,
    });
    return {
      permissions: permissionMapToSlugList(map),
      isSuperAdmin: false,
      roleId: membership?.roleId || null,
      permissionMap: map,
    };
  }

  if (roleKey === "trainee") {
    const map = resolveScopedPermissionMap({
      membership,
      allKeys: ALL_TRAINEE_PERMISSIONS,
      isValid: isValidTraineePermission,
      allTrueMap: allTrueTraineePermissionMap,
      role: role && String(role.scope || "").toUpperCase() === "TRAINEE" ? role : null,
    });
    return {
      permissions: permissionMapToSlugList(map),
      isSuperAdmin: false,
      roleId: membership?.roleId || null,
      permissionMap: map,
    };
  }

  if (roleKey === "support") {
    const map = resolveScopedPermissionMap({
      membership,
      allKeys: ALL_SUPPORT_PERMISSIONS,
      isValid: isValidSupportPermission,
      allTrueMap: allTrueSupportPermissionMap,
      role: role && String(role.scope || "").toUpperCase() === "SUPPORT" ? role : null,
    });
    return {
      permissions: permissionMapToSlugList(map),
      isSuperAdmin: false,
      roleId: membership?.roleId || null,
      permissionMap: map,
    };
  }

  return { permissions: [], isSuperAdmin: false, roleId: null, permissionMap: null };
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
  resolveCoachPermissionMap,
};
