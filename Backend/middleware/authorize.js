const AppError = require("../utils/AppError");
const { hasPermission } = require("../utils/permissions");

/**
 * Gate a route behind a permission slug.
 * Must run after `protectAdmin` or `protectWellnessCoach`
 * (relies on `req.auth.permissions` / `req.auth.isSuperAdmin`).
 *
 * Super admins always pass. Everyone else must have `permissionSlug` in their
 * resolved permissions, otherwise the request is rejected with 403.
 * For coach clientTab child keys, the parent group key is also required.
 */
function authorize(permissionSlug) {
  return (req, res, next) => {
    if (!req.auth) {
      return next(new AppError("Authentication required", 401));
    }
    if (hasPermission(req.auth, permissionSlug)) {
      return next();
    }
    return next(new AppError("You do not have permission to perform this action", 403));
  };
}

/**
 * Pass if the admin has any of the listed permission slugs (or is Super Admin).
 * Used for list/read routes on modules that have no dedicated `.view` action.
 */
function authorizeAny(...permissionSlugs) {
  const slugs = permissionSlugs.flat().filter(Boolean);
  return (req, res, next) => {
    if (!req.auth) {
      return next(new AppError("Authentication required", 401));
    }
    if (slugs.some((slug) => hasPermission(req.auth, slug))) {
      return next();
    }
    return next(new AppError("You do not have permission to perform this action", 403));
  };
}

/**
 * Gate a route to the Super Admin only — used for role management,
 * which must never be reachable via delegated role permissions.
 */
function requireSuperAdmin(req, res, next) {
  if (!req.auth) {
    return next(new AppError("Authentication required", 401));
  }
  if (req.auth.isSuperAdmin) {
    return next();
  }
  return next(new AppError("Only the Super Admin can perform this action", 403));
}

module.exports = { authorize, authorizeAny, requireSuperAdmin };
