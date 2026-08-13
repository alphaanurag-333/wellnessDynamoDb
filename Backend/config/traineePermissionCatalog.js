/**
 * Trainee permission catalog — read-heavy subset of coach client hub + dashboard.
 */
const { CLIENT_TAB_PERMISSIONS } = require("./coachPermissionCatalog");

const TRAINEE_NAV = [
  { key: "nav.dashboard", label: "Dashboard" },
  { key: "nav.my-users", label: "My Clients" },
  { key: "nav.profile", label: "Profile" },
];

const TRAINEE_CLIENT_TABS = CLIENT_TAB_PERMISSIONS.filter((p) =>
  String(p.key).startsWith("clientTab.")
);

const ALL_TRAINEE_PERMISSIONS = [
  ...TRAINEE_NAV.map((p) => p.key),
  ...TRAINEE_CLIENT_TABS.map((p) => p.key),
];

const TRAINEE_PERMISSION_SET = new Set(ALL_TRAINEE_PERMISSIONS);

function isValidTraineePermission(key) {
  return TRAINEE_PERMISSION_SET.has(String(key || "").trim());
}

function allTrueTraineePermissionMap() {
  const map = {};
  for (const key of ALL_TRAINEE_PERMISSIONS) map[key] = true;
  return map;
}

function getTraineePermissionCatalog() {
  return {
    scope: "TRAINEE",
    permissions: [...ALL_TRAINEE_PERMISSIONS],
    nav: TRAINEE_NAV,
    clientTabs: TRAINEE_CLIENT_TABS,
  };
}

module.exports = {
  ALL_TRAINEE_PERMISSIONS,
  isValidTraineePermission,
  allTrueTraineePermissionMap,
  getTraineePermissionCatalog,
};
