const { ALL_PERMISSIONS, isValidPermission, parentClientHubPermissionKey } = require("../config/permissionCatalog");
const { parentPermissionKey: parentCoachPermissionKey } = require("../config/coachPermissionCatalog");
const staffCatalog = require("../config/staffPermissionCatalog");

/**
 * Effective permissions for an admin: super admins implicitly have every
 * permission in the catalog; everyone else gets exactly their role's list
 * (filtered against the live catalog so stale/removed slugs never leak in).
 *
 * Legacy resolver — kept unchanged for `protectAdmin` until its M6 cutover.
 * New code (protectStaff) should use `resolveStaffPermissions` below.
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
 * Parent key for any nested/grouped permission slug, across every namespace
 * this codebase has used: legacy coach `clientTab.*`, legacy admin
 * `users.clientHub.*`, and the unified `clientHub.*`. The three prefixes are
 * disjoint, so generalizing this in place is safe for existing callers.
 */
function parentPermissionKey(slug) {
  return (
    parentCoachPermissionKey(slug) ||
    parentClientHubPermissionKey(slug) ||
    staffCatalog.parentPermissionKey(slug)
  );
}

/**
 * True when `auth.permissions` includes `slug`.
 * Super admins always pass.
 * For clientTab / clientHub child keys, the parent group key must also be present.
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

/**
 * Apply a coach-style `permissionOverrides` boolean map on top of a resolved
 * unified permission set (add/remove individual slugs), then re-apply
 * parent-gating so an override can never smuggle in an orphaned child slug.
 */
function applyPermissionOverrides(permissionSlugs, overrides) {
  if (!overrides || typeof overrides !== "object") return permissionSlugs;
  const set = new Set(permissionSlugs);
  for (const [slug, allowed] of Object.entries(overrides)) {
    if (!staffCatalog.isValidPermission(slug)) continue;
    if (allowed) set.add(slug);
    else set.delete(slug);
  }
  for (const slug of Array.from(set)) {
    const parent = parentPermissionKey(slug);
    if (parent && !set.has(parent)) set.delete(slug);
  }
  return Array.from(set);
}

/**
 * Unified resolver for `protectStaff` (StaffAccount + Role.accountTypes).
 *
 * - Super Admin (accountType === "admin" only) implicitly has every unified
 *   permission.
 * - Coach/Assistant accounts with no `roleId` default to full access within
 *   their account type's module set — preserves the pre-RBAC behavior those
 *   two account types have always had (`Backend/utils/coachPermissions.js`).
 * - Everyone else gets exactly their role's permissions, filtered to slugs
 *   valid for their account type, then `permissionOverrides` (if any) applied.
 */
function resolveStaffPermissions(account, role) {
  const accountType = account?.accountType;
  if (account?.isSuperAdmin) {
    return [...staffCatalog.ALL_PERMISSIONS];
  }

  const allowedForType = new Set(staffCatalog.permissionsForAccountType(accountType));
  let base;
  if (!account?.roleId) {
    const isCoachLike =
      accountType === staffCatalog.WELLNESS_COACH ||
      accountType === staffCatalog.ASSISTANT_WELLNESS_COACH;
    base = isCoachLike ? Array.from(allowedForType) : [];
  } else if (!role || !Array.isArray(role.permissions)) {
    base = [];
  } else {
    base = role.permissions.filter(
      (slug) => staffCatalog.isValidPermission(slug) && allowedForType.has(slug)
    );
  }

  return applyPermissionOverrides(base, account?.permissionOverrides);
}

module.exports = {
  resolvePermissions,
  hasPermission,
  parentPermissionKey,
  applyPermissionOverrides,
  resolveStaffPermissions,
};
