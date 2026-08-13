/**
 * Support permission catalog — configs / ops oriented (no clinical write by default).
 */
const SUPPORT_NAV = [
  { key: "nav.dashboard", label: "Dashboard" },
  { key: "nav.profile", label: "Profile" },
];

const SUPPORT_OPS = [
  { key: "support.configs.view", label: "View configs" },
  { key: "support.tickets.view", label: "View support queue" },
  { key: "support.tickets.edit", label: "Edit support queue" },
];

const ALL_SUPPORT_PERMISSIONS = [
  ...SUPPORT_NAV.map((p) => p.key),
  ...SUPPORT_OPS.map((p) => p.key),
];

const SUPPORT_PERMISSION_SET = new Set(ALL_SUPPORT_PERMISSIONS);

function isValidSupportPermission(key) {
  return SUPPORT_PERMISSION_SET.has(String(key || "").trim());
}

function allTrueSupportPermissionMap() {
  const map = {};
  for (const key of ALL_SUPPORT_PERMISSIONS) map[key] = true;
  return map;
}

function getSupportPermissionCatalog() {
  return {
    scope: "SUPPORT",
    permissions: [...ALL_SUPPORT_PERMISSIONS],
    nav: SUPPORT_NAV,
    ops: SUPPORT_OPS,
  };
}

module.exports = {
  ALL_SUPPORT_PERMISSIONS,
  isValidSupportPermission,
  allTrueSupportPermissionMap,
  getSupportPermissionCatalog,
};
