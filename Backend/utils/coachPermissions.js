const {
  ALL_COACH_PERMISSIONS,
  isValidCoachPermission,
  allTruePermissionMap,
  parentPermissionKey,
} = require("../config/coachPermissionCatalog");
const { getRoleById } = require("../models/roleModel");

function normalizeOverrides(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!isValidCoachPermission(key)) continue;
    out[key] = Boolean(raw);
  }
  return out;
}

/**
 * Resolve a coach's effective permission map (boolean per catalog key).
 * - No roleId → full access (every key true).
 * - With role → role permissions as base (missing → false), then shallow-merge overrides.
 * - Parent gate: child clientTab.* is false unless its parent group key is true.
 */
function resolveCoachPermissionMap(coach, role) {
  if (!coach?.roleId) {
    return allTruePermissionMap();
  }

  const granted = new Set(
    (Array.isArray(role?.permissions) ? role.permissions : []).filter(isValidCoachPermission)
  );
  const overrides = normalizeOverrides(coach.permissionOverrides);
  const map = {};

  for (const key of ALL_COACH_PERMISSIONS) {
    let allowed = granted.has(key);
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      allowed = Boolean(overrides[key]);
    }
    map[key] = allowed;
  }

  for (const key of ALL_COACH_PERMISSIONS) {
    const parent = parentPermissionKey(key);
    if (parent && !map[parent]) {
      map[key] = false;
    }
  }

  return map;
}

function permissionMapToList(map) {
  return ALL_COACH_PERMISSIONS.filter((key) => map?.[key] === true);
}

/**
 * Load role if needed and resolve. Caches on `req` when provided.
 */
async function resolveCoachPermissions(coach, { req } = {}) {
  if (req?.coachPermissionMap) {
    return req.coachPermissionMap;
  }

  let role = null;
  if (coach?.roleId) {
    role = await getRoleById(coach.roleId);
    if (role && String(role.scope || "ADMIN").toUpperCase() !== "COACH") {
      role = null;
    }
  }

  const map = resolveCoachPermissionMap(coach, role);
  if (req) {
    req.coachPermissionMap = map;
    req.coachPermissionList = permissionMapToList(map);
  }
  return map;
}

module.exports = {
  normalizeOverrides,
  resolveCoachPermissionMap,
  permissionMapToList,
  resolveCoachPermissions,
};
