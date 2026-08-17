import { DEFAULT_GRANTS, PERM_CATALOG, ROLE_META } from "../data/accessData.js";

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
