import { DEFAULT_GRANTS, DEFAULT_VIEWS, PERM_CATALOG, ROLE_META } from "../data/accessData.js";

const CONSOLE_SLUG_RE = /^console\.([a-z0-9_-]+)\.([a-z]+)$/i;

/** featureId → nav section id */
const FEATURE_SECTION = new Map(PERM_CATALOG.map((row) => [row[2], row[4]]));

export const ALL_CONSOLE_PERMISSIONS = PERM_CATALOG.flatMap(
  ([, , featureId, actions]) => actions.map((action) => `console.${featureId}.${action}`),
);

export function parseConsoleSlug(slug) {
  const match = CONSOLE_SLUG_RE.exec(String(slug || "").trim());
  if (!match) return null;
  return { featureId: match[1], action: match[2] };
}

/** Access Control grants map ({ featureId: [action] }, null = full access) → slugs. */
export function grantsToPermissions(grants) {
  if (grants == null) return [...ALL_CONSOLE_PERMISSIONS];
  return Object.entries(grants).flatMap(([featureId, actions]) =>
    (actions || []).map((action) => `console.${featureId}.${action}`),
  );
}

/** Baseline slugs for a UI role id — mirrors the backend DEFAULT_CONSOLE_GRANTS fallback. */
export function baselinePermissionsForRole(roleId) {
  const grants = Object.prototype.hasOwnProperty.call(DEFAULT_GRANTS, roleId)
    ? DEFAULT_GRANTS[roleId]
    : {};
  return grantsToPermissions(grants);
}

/** Roster width a role falls back to before the API reports its live dataScope. */
export function baselineDataScopeForRole(roleId) {
  return String(ROLE_META[roleId]?.scope || "assigned").toLowerCase();
}

export function hasConsolePermission(permissions, slug) {
  if (!slug) return false;
  return Array.isArray(permissions) && permissions.includes(slug);
}

/** A nav section opens as soon as the role holds any permission inside it. */
export function sectionsFromPermissions(permissions) {
  const sections = new Set();
  for (const slug of permissions || []) {
    const parsed = parseConsoleSlug(slug);
    const sectionId = parsed && FEATURE_SECTION.get(parsed.featureId);
    if (sectionId) sections.add(sectionId);
  }
  return sections;
}

export function baselineNavForRole(roleId) {
  return [...(DEFAULT_VIEWS[roleId] || [])];
}

const CONFIG_PERM_SLUG_RE = /^console\.(ct|bn|cf|rp)\./i;
const ROLES_WITHOUT_CONFIGS = new Set(["wc", "awc", "trainee", "support"]);

/** Drop Configs slugs for system roles whose Access Control baseline excludes them. */
export function stripConfigPermissionSlugsForRole(permissions, roleId) {
  const list = Array.isArray(permissions) ? permissions : [];
  if (!ROLES_WITHOUT_CONFIGS.has(roleId)) return list;
  return list.filter((slug) => !CONFIG_PERM_SLUG_RE.test(String(slug || "")));
}

/** Keep sections that Access Control has ticked open. */
export function intersectNavSections(permissionSections, tickList) {
  const sections = permissionSections instanceof Set
    ? new Set(permissionSections)
    : sectionsFromPermissions(permissionSections);
  if (!Array.isArray(tickList) || tickList.length === 0) return sections;
  const allowed = new Set(tickList);
  for (const id of [...sections]) {
    if (!allowed.has(id)) sections.delete(id);
  }
  return sections;
}

/**
 * Live left-nav: granted permissions ∩ Access Control section ticks.
 * Admin view always opens every operational section.
 */
export function resolveLiveNavSections({
  permissions,
  tickList,
  roleId,
  isAdminView = false,
  includeAccess = false,
} = {}) {
  if (isAdminView) return defaultAdminNavSections({ includeAccess });
  const fromPerms = sectionsFromPermissions(permissions);
  const ticks = Array.isArray(tickList) && tickList.length
    ? tickList
    : baselineNavForRole(roleId);
  const sections = intersectNavSections(fromPerms, ticks);
  if (includeAccess) sections.add("access");
  return sections;
}

/** Admin always opens every operational section; Access Control is Super Admin only. */
export function defaultAdminNavSections({ includeAccess = false } = {}) {
  const sections = new Set(DEFAULT_VIEWS.admin || []);
  if (includeAccess) sections.add("access");
  return sections;
}
