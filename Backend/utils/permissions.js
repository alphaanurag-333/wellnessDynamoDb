const { ALL_PERMISSIONS, isValidPermission } = require("../config/permissionCatalog");
const { parentPermissionKey } = require("../config/coachPermissionCatalog");

/**
 * Effective permissions for an admin: super admins implicitly have every
 * permission in the catalog; everyone else gets exactly their role's list
 * (filtered against the live catalog so stale/removed slugs never leak in).
 */
function resolvePermissions(admin, role) {
  if (admin?.isSuperAdmin) {
    return [...ALL_PERMISSIONS];
  }
  if (!role || !Array.isArray(role.permissions)) {
    return [];
  }
  return role.permissions.filter((slug) => isValidPermission(slug));
}

/**
 * True when `auth.permissions` includes `slug`.
 * Super admins always pass.
 * For coach clientTab child keys, the parent group key must also be present.
 */
function hasPermission(auth, slug) {
  if (!auth) return false;
  if (auth.isSuperAdmin) return true;
  if (!Array.isArray(auth.permissions) || !auth.permissions.includes(slug)) {
    return false;
  }
  const parent = parentPermissionKey(slug);
  if (parent && !auth.permissions.includes(parent)) {
    return false;
  }
  return true;
}

module.exports = { resolvePermissions, hasPermission };
