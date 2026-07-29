const {
  ALL_PERMISSIONS,
  isValidPermission,
  parentClientHubPermissionKey,
  normalizePermissionList,
  getDefaultCoachPermissionList,
  mapLegacyCoachPermission,
} = require("../config/permissionCatalog");

/**
 * Effective permissions for a panel account:
 * - Super admins → full catalog
 * - Admin/coach/assistant with role → role permissions (legacy coach slugs remapped)
 * - Coach/assistant with no roleId → default care-operator permission set
 */
function resolvePermissions(account, role, accountType = "admin") {
  if (account?.isSuperAdmin) {
    return [...ALL_PERMISSIONS];
  }
  if (!account?.roleId) {
    if (accountType === "wellness_coach" || accountType === "assistant_wellness_coach") {
      return getDefaultCoachPermissionList(accountType);
    }
    return [];
  }
  if (!role || !Array.isArray(role.permissions)) {
    return [];
  }
  return normalizePermissionList(role.permissions).filter((slug) => isValidPermission(slug));
}

function parentPermissionKey(slug) {
  const key = String(slug || "").trim();
  const mapped = mapLegacyCoachPermission(key);
  if (mapped && mapped.startsWith("users.clientHub.")) {
    return parentClientHubPermissionKey(mapped);
  }
  return parentClientHubPermissionKey(key);
}

/**
 * True when `auth.permissions` includes `slug` (or its remapped global equivalent).
 * Super admins always pass.
 * For users.clientHub child keys, the parent group key must also be present.
 */
function hasPermission(auth, slug) {
  if (!auth) return false;
  if (auth.isSuperAdmin) return true;
  if (!Array.isArray(auth.permissions)) return false;

  const raw = String(slug || "").trim();
  const mapped = mapLegacyCoachPermission(raw);
  const candidates = [raw];
  if (mapped && mapped !== raw) candidates.push(mapped);

  const matched = candidates.find((s) => auth.permissions.includes(s));
  if (!matched) return false;

  const parent = parentPermissionKey(matched);
  if (parent && !auth.permissions.includes(parent)) {
    return false;
  }
  return true;
}

module.exports = { resolvePermissions, hasPermission, parentPermissionKey };
