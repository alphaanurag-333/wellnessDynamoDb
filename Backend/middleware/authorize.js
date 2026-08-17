const AppError = require("../utils/AppError");
const { hasPermission } = require("../utils/permissions");
const { normalizeRoleKey } = require("../config/accountRoles");
const {
  DEFAULT_NAV_SECTIONS,
  DEFAULT_CONSOLE_GRANTS,
  parseConsoleSlug,
  ACCOUNT_TO_UI_ROLE,
} = require("../config/consolePermissionCatalog");

const WRITE_ACTIONS = new Set(["create", "edit", "delete", "upload", "toggle"]);

function flattenLegacySlugs(legacySlugs, role) {
  if (!legacySlugs) return [];
  if (typeof legacySlugs === "string") return [legacySlugs];
  if (Array.isArray(legacySlugs)) return legacySlugs.filter(Boolean);
  if (typeof legacySlugs === "object") {
    const direct = legacySlugs[role];
    const all = legacySlugs["*"];
    return [...(Array.isArray(direct) ? direct : direct ? [direct] : []), ...(Array.isArray(all) ? all : all ? [all] : [])].filter(
      Boolean
    );
  }
  return [];
}

function grantsAllowConsoleSlug(grantsMap, consoleSlug) {
  if (grantsMap == null) return true;
  const parsed = parseConsoleSlug(consoleSlug);
  if (!parsed) return false;
  const actions = grantsMap[parsed.featureId];
  return Array.isArray(actions) && actions.includes(parsed.action);
}

/**
 * Gate a staff Account route by console slug, with legacy catalog fallback.
 * Super admins always pass. Trainees cannot perform write actions.
 */
function authorizeStaff(consoleSlug, legacySlugs) {
  return (req, res, next) => {
    if (!req.auth) {
      return next(new AppError("Authentication required", 401));
    }

    const role = normalizeRoleKey(req.auth.role);
    const parsed = parseConsoleSlug(consoleSlug);
    const isWrite = Boolean(parsed && WRITE_ACTIONS.has(parsed.action));

    if (role === "trainee" && isWrite) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }

    if (hasPermission(req.auth, consoleSlug)) {
      return next();
    }

    const legacy = flattenLegacySlugs(legacySlugs, role);
    if (legacy.some((slug) => hasPermission(req.auth, slug))) {
      return next();
    }

    if (role === "assistant_wellness_coach") {
      const perms = Array.isArray(req.auth.permissions) ? req.auth.permissions : [];
      if (perms.length === 0 && grantsAllowConsoleSlug(DEFAULT_CONSOLE_GRANTS.awc, consoleSlug)) {
        return next();
      }
    }

    const uiKey = ACCOUNT_TO_UI_ROLE[role];
    if (uiKey && Object.prototype.hasOwnProperty.call(DEFAULT_CONSOLE_GRANTS, uiKey)) {
      const grants = DEFAULT_CONSOLE_GRANTS[uiKey];
      const perms = Array.isArray(req.auth.permissions) ? req.auth.permissions : [];
      const hasConsole = perms.some((p) => String(p || "").startsWith("console."));
      if (!hasConsole && grantsAllowConsoleSlug(grants, consoleSlug)) {
        return next();
      }
    }

    return next(new AppError("You do not have permission to perform this action", 403));
  };
}

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
 * Gate a route to the Super Admin only — used for sub-admin/role management,
 * which must never be reachable by a sub-admin even if a role were
 * misconfigured to include a matching-looking permission slug.
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

/** UI role keys that include the Teams section by default. */
const TEAMS_NAV_ACCOUNT_ROLES = new Set(
  Object.entries(DEFAULT_NAV_SECTIONS)
    .filter(([, sections]) => Array.isArray(sections) && sections.includes("teams"))
    .map(([uiKey]) => {
      if (uiKey === "wc") return "wellness_coach";
      if (uiKey === "awc") return "assistant_wellness_coach";
      return uiKey;
    })
);

/**
 * Read access for Teams / Access member directory.
 * Driven by the granted Team members permission, with the console nav default
 * (Admin + Wellness Coach + Assistant WC) as a fallback for accounts whose role
 * template predates the console catalog.
 * Must run after `protectAccount`.
 */
function requireTeamsReadAccess(req, res, next) {
  if (!req.auth) {
    return next(new AppError("Authentication required", 401));
  }
  if (req.auth.isSuperAdmin || hasPermission(req.auth, "console.tm.view")) {
    return next();
  }
  const perms = Array.isArray(req.auth.permissions) ? req.auth.permissions : [];
  const hasConsole = perms.some((p) => String(p || "").startsWith("console."));
  const role = normalizeRoleKey(req.auth.role);
  if (!hasConsole && role && TEAMS_NAV_ACCOUNT_ROLES.has(role)) {
    return next();
  }
  return next(new AppError("Forbidden", 403));
}

module.exports = {
  authorize,
  authorizeAny,
  authorizeStaff,
  requireSuperAdmin,
  requireTeamsReadAccess,
};
