/**
 * Legacy -> unified permission slug mapping.
 *
 * Used once by the M3 backfill (`Backend/scripts/remapRolePermissions.js`) to
 * rewrite existing `Role.permissions` arrays onto `Backend/config/staffPermissionCatalog.js`
 * slugs, and as a live fallback inside `Backend/utils/permissions.js` so a Role
 * that has not been remapped yet still resolves correctly during the M2-M3
 * dual-write window.
 *
 * - Admin slugs (`Backend/config/permissionCatalog.js`) are unchanged 1:1,
 *   except `users.clientHub.*` which moves to `clientHub.*` (bare, no action
 *   suffix — matches `staffPermissionCatalog.js`, which keeps the same
 *   "group key as the slug itself" convention the legacy catalogs used for
 *   client-hub tabs).
 * - Coach slugs (`Backend/config/coachPermissionCatalog.js`) move from
 *   `nav.<to>` -> `<to>.view` and `clientTab.<g>[.<t>]` -> `clientHub.<g>[.<t>]`.
 *   `nav.profile` has no unified equivalent (profile is never permission-gated,
 *   same rule as admin) and maps to null.
 */

const legacyAdminCatalog = require("./permissionCatalog");
const legacyCoachCatalog = require("./coachPermissionCatalog");
const staffCatalog = require("./staffPermissionCatalog");

/** Legacy admin slug -> unified slug (identity, except clientHub remap). */
const ADMIN_SLUG_MAP = new Map();
for (const slug of legacyAdminCatalog.ALL_PERMISSIONS) {
  const parentHub = legacyAdminCatalog.parentClientHubPermissionKey(slug);
  if (slug.startsWith("users.clientHub.")) {
    // users.clientHub.tracking -> clientHub.tracking ; users.clientHub.tracking.water -> clientHub.tracking.water
    const rest = slug.replace(/^users\.clientHub\./, "");
    ADMIN_SLUG_MAP.set(slug, `clientHub.${rest}`);
    continue;
  }
  void parentHub;
  ADMIN_SLUG_MAP.set(slug, slug);
}

/** Legacy coach slug -> unified slug. */
const COACH_SLUG_MAP = new Map();
for (const slug of legacyCoachCatalog.ALL_COACH_PERMISSIONS) {
  if (slug === "nav.profile") {
    COACH_SLUG_MAP.set(slug, null);
    continue;
  }
  if (slug.startsWith("nav.")) {
    const to = slug.slice("nav.".length);
    COACH_SLUG_MAP.set(slug, staffCatalog.toSlug(to, "view"));
    continue;
  }
  if (slug.startsWith("clientTab.")) {
    const rest = slug.slice("clientTab.".length);
    COACH_SLUG_MAP.set(slug, `clientHub.${rest}`);
    continue;
  }
  COACH_SLUG_MAP.set(slug, null);
}

/**
 * Remap one legacy slug. `legacyScope` is `"ADMIN"` or `"COACH"` (matches
 * `Role.scope`). Returns the unified slug, or null when there is no
 * equivalent (e.g. `nav.profile`) or the slug is already a unified slug
 * (returned unchanged so this function is idempotent/safe to re-run).
 */
function remapLegacySlug(slug, legacyScope) {
  const key = String(slug || "");
  if (!key) return null;
  if (staffCatalog.isValidPermission(key)) return key; // already unified
  if (String(legacyScope).toUpperCase() === "COACH") {
    return COACH_SLUG_MAP.has(key) ? COACH_SLUG_MAP.get(key) : null;
  }
  return ADMIN_SLUG_MAP.has(key) ? ADMIN_SLUG_MAP.get(key) : null;
}

/** Remap a full `Role.permissions` array; drops slugs with no equivalent. */
function remapLegacySlugList(slugs, legacyScope) {
  if (!Array.isArray(slugs)) return [];
  const out = new Set();
  for (const slug of slugs) {
    const mapped = remapLegacySlug(slug, legacyScope);
    if (mapped) out.add(mapped);
  }
  return Array.from(out);
}

/**
 * Remap a legacy `permissionOverrides` boolean map (keys = legacy slugs) onto
 * unified slugs — used by `protectWellnessCoachLegacy` so per-coach overrides
 * set through the still-legacy admin UI (`Backend/controllers/adminController/
 * wellnessCoachController.js`, validated against `coachPermissionCatalog.js`)
 * keep working against `resolveStaffPermissions`, which only recognizes
 * unified-slug override keys.
 */
function remapLegacyOverrides(overrides, legacyScope) {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) return overrides;
  const out = {};
  for (const [key, value] of Object.entries(overrides)) {
    const mapped = remapLegacySlug(key, legacyScope);
    if (mapped) out[mapped] = value;
  }
  return out;
}

/**
 * Reverse of `remapLegacySlugList` for the coach boolean-map surface
 * (`GET /coach/auth/me/permissions`, still consumed by the pre-M7 frontend's
 * `CoachPermissionsProvider`). Given an already-resolved *unified*
 * permission list (from `resolveStaffPermissions`), returns the legacy
 * `{ "nav.dashboard": true, ... }`-shaped boolean map so that surface keeps
 * working unchanged until the frontend migrates to the unified list directly.
 */
function unifiedListToLegacyCoachMap(unifiedPermissions) {
  const unifiedSet = new Set(Array.isArray(unifiedPermissions) ? unifiedPermissions : []);
  const map = {};
  for (const legacySlug of legacyCoachCatalog.ALL_COACH_PERMISSIONS) {
    const unifiedSlug = remapLegacySlug(legacySlug, "COACH");
    map[legacySlug] = Boolean(unifiedSlug && unifiedSet.has(unifiedSlug));
  }
  return map;
}

module.exports = {
  ADMIN_SLUG_MAP,
  COACH_SLUG_MAP,
  remapLegacySlug,
  remapLegacySlugList,
  remapLegacyOverrides,
  unifiedListToLegacyCoachMap,
};
