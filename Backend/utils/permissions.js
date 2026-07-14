const { ALL_PERMISSIONS, isValidPermission } = require("../config/permissionCatalog");

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

function hasPermission(auth, slug) {
  if (!auth) return false;
  if (auth.isSuperAdmin) return true;
  return Array.isArray(auth.permissions) && auth.permissions.includes(slug);
}

module.exports = { resolvePermissions, hasPermission };
