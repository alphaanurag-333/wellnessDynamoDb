/**
 * Canonical coach RBAC permission catalog.
 *
 * Mirrors Frontend coach nav + client-hub tabs:
 *  - Frontend/src/wellnessCoach/data/navItems.js (coachNavItems / flattenNavLinks)
 *  - Frontend/src/components/clientHubShared.js (CLIENT_HUB_TAB_GROUPS / CLIENT_HUB_TABS)
 *
 * Keys are boolean access slugs (presence in Role.permissions = allowed):
 *   nav.<to>                  e.g. nav.dashboard, nav.consultancy/transactions
 *   clientTab.<group>         e.g. clientTab.tracking
 *   clientTab.<group>.<tab>   e.g. clientTab.tracking.water
 *
 * Keep in sync with Frontend/src/wellnessCoach/data/coachPermissionKeys.js
 */

const COACH_NAV_ITEMS = [
  { to: "dashboard", label: "Dashboard" },
  { to: "my-users", label: "My Clients" },
  { to: "meal-approvals", label: "Meal Approvals" },
  { to: "client-testimonials", label: "Client Testimonials" },
  { to: "commitment-letters", label: "Commitment Letters" },
  { to: "monthly-champions", label: "Monthly Champions" },
  { to: "consultancy/transactions", label: "Consultancy Payments" },
  { to: "consultancy/enrolled-users", label: "Consultancy Users" },
  { to: "my-assistants", label: "Assistants (AWC)" },
  { to: "profile", label: "Profile" },
];

const CLIENT_HUB_TAB_META = {
  water: "Water",
  steps: "Steps",
  reminders: "Reminders",
  "diet-plan": "Diet plan",
  "wellness-prescriptions": "Prescriptions",
  "commitment-letter": "Commitment",
  "coach-message": "Coach message",
  "internal-parameters": "Internal params",
  "physical-exercises": "Exercises",
  "mental-wellbeing": "Mental wellbeing",
  "daily-reflection": "Daily reflection",
  "supplement-recommendations": "Supplements",
  "supplement-dosage": "Dosage",
  "meal-tracking": "Meals",
  "health-progress": "Health progress",
  "metabolic-metrics": "Metabolic",
  consultancy: "Consultancy",
  "launch-assessment": "LAUNCH",
  "prakruti-assessment": "Prakruti",
};

const CLIENT_HUB_TAB_GROUPS = [
  {
    id: "tracking",
    label: "Tracking",
    tabIds: ["water", "steps", "meal-tracking", "health-progress"],
  },
  {
    id: "metabolic-health",
    label: "Metabolic health",
    tabIds: ["metabolic-metrics"],
  },
  {
    id: "care",
    label: "Care plans",
    tabIds: [
      "reminders",
      "diet-plan",
      "wellness-prescriptions",
      "commitment-letter",
      "coach-message",
      "internal-parameters",
      "consultancy",
    ],
  },
  {
    id: "wellness",
    label: "Wellness",
    tabIds: [
      "physical-exercises",
      "mental-wellbeing",
      "daily-reflection",
      "supplement-recommendations",
      "supplement-dosage",
    ],
  },
  {
    id: "assessments",
    label: "Assessments",
    tabIds: ["launch-assessment", "prakruti-assessment"],
  },
];

function navKey(to) {
  return `nav.${to}`;
}

function clientTabGroupKey(groupId) {
  return `clientTab.${groupId}`;
}

function clientTabChildKey(groupId, tabId) {
  return `clientTab.${groupId}.${tabId}`;
}

/** Parent group key for a child clientTab.* key, or null. */
function parentPermissionKey(slug) {
  const key = String(slug || "");
  if (!key.startsWith("clientTab.")) return null;
  const parts = key.split(".");
  if (parts.length < 3) return null;
  return `${parts[0]}.${parts[1]}`;
}

const NAV_PERMISSIONS = COACH_NAV_ITEMS.map((item) => ({
  key: navKey(item.to),
  label: item.label,
  to: item.to,
  surface: "nav",
}));

const CLIENT_TAB_PERMISSIONS = [];
for (const group of CLIENT_HUB_TAB_GROUPS) {
  const groupKey = clientTabGroupKey(group.id);
  CLIENT_TAB_PERMISSIONS.push({
    key: groupKey,
    label: group.label,
    groupId: group.id,
    surface: "clientTab",
    isGroup: true,
  });
  for (const tabId of group.tabIds) {
    CLIENT_TAB_PERMISSIONS.push({
      key: clientTabChildKey(group.id, tabId),
      label: CLIENT_HUB_TAB_META[tabId] || tabId,
      groupId: group.id,
      tabId,
      surface: "clientTab",
      isGroup: false,
      parentKey: groupKey,
    });
  }
}

const ALL_COACH_PERMISSIONS = [
  ...NAV_PERMISSIONS.map((p) => p.key),
  ...CLIENT_TAB_PERMISSIONS.map((p) => p.key),
];

const COACH_PERMISSION_SET = new Set(ALL_COACH_PERMISSIONS);

function isValidCoachPermission(slug) {
  return COACH_PERMISSION_SET.has(String(slug || "").trim());
}

function areValidCoachPermissions(slugs) {
  return Array.isArray(slugs) && slugs.every((slug) => isValidCoachPermission(slug));
}

/** Full-access map for coaches with no role assigned. */
function allTruePermissionMap() {
  const map = {};
  for (const key of ALL_COACH_PERMISSIONS) map[key] = true;
  return map;
}

/**
 * Checkbox-tree shape compatible with PermissionCheckboxTree (single "access" action).
 */
function getCoachPermissionCatalog() {
  const navGroup = {
    id: "nav",
    label: "Sidebar navigation",
    items: NAV_PERMISSIONS.map((item) => ({
      to: item.to,
      label: item.label,
      actions: ["access"],
      permissions: [{ action: "access", slug: item.key }],
    })),
  };

  const clientGroups = CLIENT_HUB_TAB_GROUPS.map((group) => {
    const groupKey = clientTabGroupKey(group.id);
    const items = [
      {
        to: group.id,
        label: `${group.label} (section)`,
        actions: ["access"],
        permissions: [{ action: "access", slug: groupKey }],
      },
      ...group.tabIds.map((tabId) => ({
        to: `${group.id}/${tabId}`,
        label: CLIENT_HUB_TAB_META[tabId] || tabId,
        actions: ["access"],
        permissions: [{ action: "access", slug: clientTabChildKey(group.id, tabId) }],
      })),
    ];
    return {
      id: `clientTab.${group.id}`,
      label: `Client tabs · ${group.label}`,
      items,
    };
  });

  return {
    scope: "COACH",
    groups: [navGroup, ...clientGroups],
    permissions: [...ALL_COACH_PERMISSIONS],
    nav: NAV_PERMISSIONS,
    clientTabs: CLIENT_TAB_PERMISSIONS,
  };
}

/** Map tab id → permission key (child). */
const TAB_ID_TO_PERMISSION = {};
for (const group of CLIENT_HUB_TAB_GROUPS) {
  for (const tabId of group.tabIds) {
    TAB_ID_TO_PERMISSION[tabId] = clientTabChildKey(group.id, tabId);
  }
}

function permissionKeyForClientTab(tabId) {
  return TAB_ID_TO_PERMISSION[tabId] || null;
}

module.exports = {
  COACH_NAV_ITEMS,
  CLIENT_HUB_TAB_GROUPS,
  NAV_PERMISSIONS,
  CLIENT_TAB_PERMISSIONS,
  ALL_COACH_PERMISSIONS,
  navKey,
  clientTabGroupKey,
  clientTabChildKey,
  parentPermissionKey,
  isValidCoachPermission,
  areValidCoachPermissions,
  allTruePermissionMap,
  getCoachPermissionCatalog,
  permissionKeyForClientTab,
  TAB_ID_TO_PERMISSION,
};
