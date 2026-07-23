/**
 * Canonical RBAC permission catalog.
 *
 * Mirrors the structure of Frontend/src/admin/data/navItems.js 1:1 (same group
 * ids/labels and the same leaf `to` paths) — keep the two files in sync by hand
 * whenever the sidebar nav changes. Slugs are derived as:
 *
 *   slug = to.replace(/\//g, ".") + "." + action
 *
 * e.g. `consultancy/transactions` + `view` -> `consultancy.transactions.view`.
 *
 * `.view` is only listed when the module has a real read/list or detail "View"
 * affordance (or is a view-only module). `.edit` / `.delete` match the admin
 * UI: POST/PATCH (edit, including create) and DELETE. If a leaf has no `.view`,
 * list/sidebar access is granted by `.edit` or `.delete` instead.
 *
 * Deliberately excluded from the catalog:
 *  - `profile` (Admin Profile) — self-service account management. Every
 *    authenticated admin can always view/edit their own account; it is never
 *    permission-gated.
 *  - `health-tools`, `coupons` — currently commented out of navItems.js, so
 *    they aren't part of the live sidebar structure this catalog is
 *    generated from. Their routes are left on `protectAdmin` only (unchanged
 *    behavior) until/unless they're re-enabled in the nav.
 */

const VIEW = "view";
const EDIT = "edit";
const DELETE = "delete";

const PERMISSION_GROUPS_RAW = [
  {
    id: "general",
    label: "General",
    items: [
      { to: "dashboard", label: "Dashboard", actions: [VIEW] },
      { to: "users", label: "User Management", actions: [VIEW, EDIT, DELETE] },
    ],
  },
  {
    id: "consultancy",
    label: "Consultancy Payments",
    items: [
      { to: "consultancy/transactions", label: "Transactions", actions: [VIEW] },
      { to: "consultancy/enrolled-users", label: "Enrolled Users", actions: [VIEW] },
      { to: "consultancy/pending-assignment", label: "Pending Assignment", actions: [VIEW] },
    ],
  },
  {
    id: "energy-exchange",
    label: "Energy Exchange",
    items: [{ to: "energy-exchange/transactions", label: "Transactions", actions: [VIEW] }],
  },
  {
    id: "wellness-program",
    label: "Wellness Programs",
    items: [
      { to: "programs", label: "Catalog", actions: [EDIT, DELETE] },
      { to: "programs/transactions", label: "Transactions", actions: [VIEW] },
    ],
  },
  {
    id: "team",
    label: "Team & Coaches",
    items: [
      { to: "coaches", label: "Wellness Coaches", actions: [VIEW, EDIT, DELETE] },
      { to: "specializations", label: "Specializations", actions: [VIEW, EDIT, DELETE] },
    ],
  },
  {
    id: "health",
    label: "Health Library",
    items: [
      { to: "health-concerns", label: "Health Concerns", actions: [VIEW, EDIT, DELETE] },
      { to: "health-recipes", label: "Health Recipes", actions: [VIEW, EDIT, DELETE] },
      { to: "health-disorders", label: "Health Disorders", actions: [VIEW, EDIT, DELETE] },
      { to: "yoga", label: "Yoga", actions: [VIEW, EDIT, DELETE] },
      { to: "physical-exercises", label: "Physical Exercise", actions: [VIEW, EDIT, DELETE] },
      { to: "supplements", label: "Supplements", actions: [VIEW, EDIT, DELETE] },
      {
        to: "medical-condition-questions",
        label: "Medical Conditions",
        actions: [VIEW, EDIT, DELETE],
      },
    ],
  },
  {
    id: "launchAssessment",
    label: "LAUNCH Assessment",
    items: [
      { to: "launch-questions", label: "Questions", actions: [VIEW, EDIT, DELETE] },
      { to: "launch-focus-areas", label: "Area to Focus", actions: [VIEW, EDIT, DELETE] },
    ],
  },
  {
    id: "prakrutiAssessment",
    label: "Prakruti Assessment",
    items: [
      { to: "prakruti-questions", label: "Questions", actions: [VIEW, EDIT, DELETE] },
      { to: "prakruti-things-to-avoid", label: "Things to Avoid", actions: [VIEW, EDIT, DELETE] },
      { to: "prakruti-recommendations", label: "Recommendations", actions: [VIEW, EDIT, DELETE] },
    ],
  },
  {
    id: "catalogs",
    label: "Catalogs",
    items: [
      { to: "test-catalog", label: "Test Catalog", actions: [VIEW, EDIT, DELETE] },
      { to: "diet-plan-catalog", label: "Diet Plan Catalog", actions: [VIEW, EDIT, DELETE] },
      {
        to: "wellness-prescriptions",
        label: "Wellness Prescriptions",
        actions: [VIEW, EDIT, DELETE],
      },
      { to: "mental-wellbeing", label: "Mental Wellbeing", actions: [VIEW, EDIT, DELETE] },
    ],
  },
  {
    id: "testimonials",
    label: "Testimonials & Media",
    items: [
      { to: "client-testimonials", label: "Client Testimonials", actions: [VIEW, EDIT, DELETE] },
      {
        to: "program-testimonials",
        label: "Program Testimonials",
        actions: [VIEW, EDIT, DELETE],
      },
      {
        to: "real-people-testimonials",
        label: "Real People Testimonials",
        actions: [VIEW, EDIT, DELETE],
      },
      { to: "video-testimonials", label: "Video Testimonials", actions: [VIEW, EDIT, DELETE] },
      { to: "transformations", label: "Transformations", actions: [VIEW, EDIT, DELETE] },
      { to: "commitment-letters", label: "Commitment Letters", actions: [VIEW, EDIT, DELETE] },
    ],
  },
  {
    id: "leadership",
    label: "Leadership Messages",
    items: [
      { to: "leadership-notes", label: "Leadership Notes", actions: [VIEW, EDIT, DELETE] },
      { to: "cofounder-message", label: "Cofounder Message", actions: [VIEW, EDIT] },
    ],
  },
  {
    id: "engagement",
    label: "Engagement",
    items: [
      { to: "banners", label: "Banner Management", actions: [VIEW, EDIT, DELETE] },
      { to: "birthday-posts", label: "Birthday Posts", actions: [VIEW, EDIT, DELETE] },
      { to: "birthday-notifications", label: "Birthday Notifications", actions: [VIEW, EDIT] },
      { to: "monthly-champions", label: "Monthly Champions", actions: [VIEW, EDIT, DELETE] },
      { to: "notifications", label: "Notifications", actions: [VIEW, EDIT, DELETE] },
    ],
  },
  {
    id: "content",
    label: "Site Content",
    items: [
      { to: "faq", label: "FAQ", actions: [VIEW, EDIT, DELETE] },
      { to: "contact-inquiries", label: "Contact Inquiries", actions: [VIEW, EDIT, DELETE] },
      { to: "static-pages", label: "Static Pages", actions: [EDIT, DELETE] },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [{ to: "settings", label: "App Settings", actions: [VIEW, EDIT] }],
  },
];

/** Client Hub tab permissions for admin acting on behalf of coaches. */
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

function clientHubGroupKey(groupId) {
  return `users.clientHub.${groupId}`;
}

function clientHubChildKey(groupId, tabId) {
  return `users.clientHub.${groupId}.${tabId}`;
}

/** Parent group key for users.clientHub.* child slugs, or null. */
function parentClientHubPermissionKey(slug) {
  const key = String(slug || "");
  if (!key.startsWith("users.clientHub.")) return null;
  const parts = key.split(".");
  // users.clientHub.tracking.water → users.clientHub.tracking
  if (parts.length < 4) return null;
  return parts.slice(0, 3).join(".");
}

function permissionKeyForClientHubTab(tabId) {
  for (const group of CLIENT_HUB_TAB_GROUPS) {
    if (group.tabIds.includes(tabId)) {
      return clientHubChildKey(group.id, tabId);
    }
  }
  return null;
}

const CLIENT_HUB_PERMISSION_GROUPS = CLIENT_HUB_TAB_GROUPS.map((group) => {
  const groupKey = clientHubGroupKey(group.id);
  return {
    id: `users.clientHub.${group.id}`,
    label: `Client programs · ${group.label}`,
    items: [
      {
        to: `users/client-hub/${group.id}`,
        label: `${group.label} (section)`,
        actions: ["access"],
        permissions: [{ action: "access", slug: groupKey }],
      },
      ...group.tabIds.map((tabId) => ({
        to: `users/client-hub/${group.id}/${tabId}`,
        label: CLIENT_HUB_TAB_META[tabId] || tabId,
        actions: ["access"],
        permissions: [{ action: "access", slug: clientHubChildKey(group.id, tabId) }],
      })),
    ],
  };
});

function toSlug(to, action) {
  return `${to.replace(/\//g, ".")}.${action}`;
}

const PERMISSION_GROUPS = [
  ...PERMISSION_GROUPS_RAW.map((group) => ({
    id: group.id,
    label: group.label,
    items: group.items.map((item) => ({
      to: item.to,
      label: item.label,
      actions: item.actions,
      permissions: item.actions.map((action) => ({ action, slug: toSlug(item.to, action) })),
    })),
  })),
  ...CLIENT_HUB_PERMISSION_GROUPS,
];

const ALL_PERMISSIONS = Array.from(
  new Set(
    PERMISSION_GROUPS.flatMap((group) =>
      group.items.flatMap((item) => item.permissions.map((p) => p.slug))
    )
  )
).sort();

const PERMISSION_SET = new Set(ALL_PERMISSIONS);

function isValidPermission(slug) {
  return PERMISSION_SET.has(slug);
}

function areValidPermissions(slugs) {
  return Array.isArray(slugs) && slugs.every((slug) => isValidPermission(slug));
}

function getPermissionCatalog() {
  return {
    groups: PERMISSION_GROUPS,
    permissions: ALL_PERMISSIONS,
  };
}

/** All action slugs defined for a nav leaf `to` (e.g. `programs` → edit/delete). */
function permissionSlugsForLeaf(to) {
  const target = String(to || "").trim();
  if (!target) return [];
  for (const group of PERMISSION_GROUPS) {
    for (const item of group.items) {
      if (item.to === target) {
        return item.permissions.map((p) => p.slug);
      }
    }
  }
  return [];
}

module.exports = {
  PERMISSION_GROUPS,
  ALL_PERMISSIONS,
  toSlug,
  isValidPermission,
  areValidPermissions,
  getPermissionCatalog,
  permissionSlugsForLeaf,
  clientHubGroupKey,
  clientHubChildKey,
  parentClientHubPermissionKey,
  permissionKeyForClientHubTab,
  CLIENT_HUB_TAB_GROUPS,
};
