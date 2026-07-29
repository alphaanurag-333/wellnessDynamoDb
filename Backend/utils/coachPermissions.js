/**
 * @deprecated Coach-specific permission maps are retired.
 * Re-exports global resolvePermissions helpers for any leftover callers.
 */
const { resolvePermissions, hasPermission } = require("./permissions");
const {
  ALL_PERMISSIONS,
  getDefaultCoachPermissionList,
  normalizePermissionList,
} = require("../config/permissionCatalog");
const { getRoleById } = require("../models/roleModel");

function allTruePermissionMap() {
  const map = {};
  for (const key of getDefaultCoachPermissionList()) map[key] = true;
  return map;
}

function resolveCoachPermissionMap(coach, role) {
  const list = resolvePermissions(coach, role, "wellness_coach");
  const map = {};
  for (const key of ALL_PERMISSIONS) map[key] = false;
  for (const key of list) map[key] = true;
  return map;
}

function permissionMapToList(map) {
  return Object.keys(map || {}).filter((key) => map[key] === true);
}

async function resolveCoachPermissions(coach, { req } = {}) {
  if (req?.coachPermissionMap) {
    return req.coachPermissionMap;
  }

  let role = null;
  if (coach?.roleId) {
    role = await getRoleById(coach.roleId);
  }

  const map = resolveCoachPermissionMap(coach, role);
  if (req) {
    req.coachPermissionMap = map;
    req.coachPermissionList = permissionMapToList(map);
  }
  return map;
}

function normalizeOverrides() {
  return {};
}

module.exports = {
  normalizeOverrides,
  resolveCoachPermissionMap,
  permissionMapToList,
  resolveCoachPermissions,
  allTruePermissionMap,
  normalizePermissionList,
  hasPermission,
};
