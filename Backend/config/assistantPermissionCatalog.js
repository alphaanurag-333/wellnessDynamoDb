/**
 * Assistant WC permission catalog — subset of coach nav/clientTab keys.
 * Presence in Role.permissions (scope ASSISTANT) = allowed.
 */
const {
  NAV_PERMISSIONS,
  CLIENT_TAB_PERMISSIONS,
  isValidCoachPermission,
  parentPermissionKey,
} = require("./coachPermissionCatalog");

/** Assistants do not manage other assistants or commercial program screens by default. */
const ASSISTANT_BLOCKED_NAV = new Set([
  "nav.my-assistants",
  "nav.consultancy/transactions",
  "nav.consultancy/enrolled-users",
]);

const ALL_ASSISTANT_PERMISSIONS = [
  ...NAV_PERMISSIONS.map((p) => p.key).filter((k) => !ASSISTANT_BLOCKED_NAV.has(k)),
  ...CLIENT_TAB_PERMISSIONS.map((p) => p.key),
];

const ASSISTANT_PERMISSION_SET = new Set(ALL_ASSISTANT_PERMISSIONS);

function isValidAssistantPermission(key) {
  return ASSISTANT_PERMISSION_SET.has(String(key || "").trim());
}

function allTrueAssistantPermissionMap() {
  const map = {};
  for (const key of ALL_ASSISTANT_PERMISSIONS) map[key] = true;
  return map;
}

function getAssistantPermissionCatalog() {
  return {
    scope: "ASSISTANT",
    permissions: [...ALL_ASSISTANT_PERMISSIONS],
    nav: NAV_PERMISSIONS.filter((p) => !ASSISTANT_BLOCKED_NAV.has(p.key)),
    clientTabs: CLIENT_TAB_PERMISSIONS,
  };
}

module.exports = {
  ALL_ASSISTANT_PERMISSIONS,
  isValidAssistantPermission,
  allTrueAssistantPermissionMap,
  getAssistantPermissionCatalog,
  parentPermissionKey,
  isValidCoachPermission,
};
