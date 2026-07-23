/**
 * Unified RBAC permission catalog for the merged Staff panel (Admin +
 * Wellness Coach + Assistant Wellness Coach).
 *
 * Every module uses the same `view` / `edit` / `delete` action shape,
 * regardless of which account type(s) it applies to — this replaces the old
 * split between `Backend/config/permissionCatalog.js` (admin, view/edit/delete)
 * and `Backend/config/coachPermissionCatalog.js` (coach, single boolean
 * "access"). Slug shape is unchanged for admin modules:
 *
 *   slug = to.replace(/\//g, ".") + "." + action
 *
 * Coach-only nav modules and the shared "client hub" tabs are expressed the
 * same way, e.g. `my-users.view`, `clientHub.tracking.water.view`.
 *
 * Each module also declares `accountTypes`: the staff account type(s) it is
 * assignable to. The Role editor and `/staff/permissions` catalog endpoint use
 * this to show only the modules relevant to the account type(s) a role targets.
 *
 * See `Backend/config/staffPermissionSlugMap.js` for the legacy → unified slug
 * mapping used once during the M3 backfill (and as a live fallback in
 * `Backend/utils/permissions.js` until every Role row has been remapped).
 */

const ADMIN = "admin";
const WELLNESS_COACH = "wellness_coach";
const ASSISTANT_WELLNESS_COACH = "assistant_wellness_coach";
/**
 * Generic staff account type for custom roles that don't map to a legacy
 * table (Marketing Manager, Trainer, Supervisor, etc.) — lives only in
 * `StaffAccount`, no dual-write mirror, no legacy full-access fallback.
 */
const STAFF = "staff";

const ACCOUNT_TYPES = [ADMIN, WELLNESS_COACH, ASSISTANT_WELLNESS_COACH, STAFF];
const ALL_STAFF_TYPES = [...ACCOUNT_TYPES];
const COACH_AND_ASSISTANT = [WELLNESS_COACH, ASSISTANT_WELLNESS_COACH];

/**
 * Every module in the catalog is assignable to every staff account type — a
 * Super Admin can hand ANY role (Wellness Coach, Assistant, Admin, or a
 * custom Staff role) ANY mix of modules, with no per-account-type catalog
 * restriction. The underlying *data* for a module still scopes itself the
 * same way regardless of who's granted it (e.g. "My Clients" always filters
 * by the viewer's own `req.auth.sub` server-side) — opening the catalog here
 * only affects what a role's checkbox tree offers, never what data a
 * request actually returns.
 */
function withStaffAccess() {
  return ALL_STAFF_TYPES;
}

function isValidAccountType(value) {
  return ACCOUNT_TYPES.includes(String(value || ""));
}

const VIEW = "view";
const EDIT = "edit";
const DELETE = "delete";

/**
 * Admin sidebar modules (unchanged from the legacy admin catalog). A handful
 * of `to` leaves also existed as coach nav items under the same conceptual
 * feature (e.g. `consultancy/transactions`) — those get the extra account
 * types listed here instead of a duplicate module definition.
 */
const SHARED_TO_ACCOUNT_TYPES = {
  dashboard: ALL_STAFF_TYPES,
  "client-testimonials": ALL_STAFF_TYPES,
  "commitment-letters": ALL_STAFF_TYPES,
  "monthly-champions": ALL_STAFF_TYPES,
  "consultancy/transactions": ALL_STAFF_TYPES,
  // Assistants had no role concept pre-migration, so `resolveCoachPermissionMap`
  // fell back to `allTruePermissionMap()` (see coachPermissionCatalog.js) —
  // full access to every coach nav item, this one included. Tagged for
  // assistants too so the M3 default "Assistant — Full Access" role replicates
  // that exactly; a super admin can still create a more restrictive custom
  // role that omits it.
  "consultancy/enrolled-users": ALL_STAFF_TYPES,
};

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
      { to: "awcs", label: "Assistant Coaches", actions: [VIEW, EDIT, DELETE] },
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

/**
 * Modules that only ever existed in the coach catalog (no admin equivalent
 * `to`). Assignable to any account type's role (catalog is fully open — see
 * `withStaffAccess`), though the underlying pages currently only exist under
 * `/coach/*` and `/assistant/*` — see `Frontend/src/panel/data/navConfig.js`
 * for how the sidebar resolves that.
 */
const STAFF_ONLY_NAV_GROUP = {
  id: "staffTeam",
  label: "My Team (Coach/Assistant)",
  items: [
    { to: "my-users", label: "My Clients", actions: [VIEW], accountTypes: withStaffAccess() },
    {
      to: "meal-approvals",
      label: "Meal Approvals",
      actions: [VIEW, EDIT],
      accountTypes: withStaffAccess(),
    },
    {
      to: "my-assistants",
      label: "Assistants (AWC)",
      actions: [VIEW, EDIT, DELETE],
      accountTypes: withStaffAccess(),
    },
  ],
};

/**
 * Client hub tabs — identical group/tab structure previously duplicated
 * between admin's `users.clientHub.*` and coach's `clientTab.*`. Unified here
 * under one `clientHub.<group>[.<tab>]` slug, usable from any staff portal.
 * Action is `view` only (matches the old boolean "access"/"can view" semantic).
 */
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
  return `clientHub.${groupId}`;
}

function clientHubChildKey(groupId, tabId) {
  return `clientHub.${groupId}.${tabId}`;
}

/** Parent group key for a `clientHub.<group>.<tab>` child slug, or null. */
function parentClientHubPermissionKey(slug) {
  const key = String(slug || "");
  if (!key.startsWith("clientHub.")) return null;
  const parts = key.split(".");
  if (parts.length < 3) return null;
  return `${parts[0]}.${parts[1]}`;
}

function permissionKeyForClientHubTab(tabId) {
  for (const group of CLIENT_HUB_TAB_GROUPS) {
    if (group.tabIds.includes(tabId)) return clientHubChildKey(group.id, tabId);
  }
  return null;
}

const CLIENT_HUB_PERMISSION_GROUPS = CLIENT_HUB_TAB_GROUPS.map((group) => {
  const groupKey = clientHubGroupKey(group.id);
  return {
    id: `clientHub.${group.id}`,
    label: `Client Hub · ${group.label}`,
    items: [
      {
        to: `client-hub/${group.id}`,
        label: `${group.label} (section)`,
        actions: [VIEW],
        accountTypes: ALL_STAFF_TYPES,
        permissions: [{ action: VIEW, slug: groupKey }],
      },
      ...group.tabIds.map((tabId) => ({
        to: `client-hub/${group.id}/${tabId}`,
        label: CLIENT_HUB_TAB_META[tabId] || tabId,
        actions: [VIEW],
        accountTypes: ALL_STAFF_TYPES,
        permissions: [{ action: VIEW, slug: clientHubChildKey(group.id, tabId) }],
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
      accountTypes: withStaffAccess(item.accountTypes || SHARED_TO_ACCOUNT_TYPES[item.to] || [ADMIN]),
      permissions: item.actions.map((action) => ({ action, slug: toSlug(item.to, action) })),
    })),
  })),
  {
    id: STAFF_ONLY_NAV_GROUP.id,
    label: STAFF_ONLY_NAV_GROUP.label,
    items: STAFF_ONLY_NAV_GROUP.items.map((item) => ({
      to: item.to,
      label: item.label,
      actions: item.actions,
      accountTypes: item.accountTypes,
      permissions: item.actions.map((action) => ({ action, slug: toSlug(item.to, action) })),
    })),
  },
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
  return PERMISSION_SET.has(String(slug || ""));
}

function areValidPermissions(slugs) {
  return Array.isArray(slugs) && slugs.every((slug) => isValidPermission(slug));
}

/** Parent key for any nested slug family in the unified catalog (currently just clientHub.*). */
function parentPermissionKey(slug) {
  return parentClientHubPermissionKey(slug);
}

/** Permission slugs assignable to a given account type (drives the Role editor's module list). */
function permissionsForAccountType(accountType) {
  if (!isValidAccountType(accountType)) return [];
  const slugs = [];
  for (const group of PERMISSION_GROUPS) {
    for (const item of group.items) {
      if (item.accountTypes.includes(accountType)) {
        slugs.push(...item.permissions.map((p) => p.slug));
      }
    }
  }
  return Array.from(new Set(slugs));
}

/** Catalog filtered to modules relevant to one or more account types (or the full catalog when omitted). */
function getStaffPermissionCatalog({ accountType } = {}) {
  if (!accountType) {
    return { groups: PERMISSION_GROUPS, permissions: ALL_PERMISSIONS };
  }
  const groups = PERMISSION_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.accountTypes.includes(accountType)),
  })).filter((group) => group.items.length > 0);
  return { groups, permissions: permissionsForAccountType(accountType) };
}

/** All action slugs defined for a nav leaf `to` (e.g. `programs` -> edit/delete). */
function permissionSlugsForLeaf(to) {
  const target = String(to || "").trim();
  if (!target) return [];
  for (const group of PERMISSION_GROUPS) {
    for (const item of group.items) {
      if (item.to === target) return item.permissions.map((p) => p.slug);
    }
  }
  return [];
}

module.exports = {
  ADMIN,
  WELLNESS_COACH,
  ASSISTANT_WELLNESS_COACH,
  STAFF,
  ACCOUNT_TYPES,
  ALL_STAFF_TYPES,
  COACH_AND_ASSISTANT,
  isValidAccountType,
  PERMISSION_GROUPS,
  ALL_PERMISSIONS,
  toSlug,
  isValidPermission,
  areValidPermissions,
  parentPermissionKey,
  permissionsForAccountType,
  getStaffPermissionCatalog,
  permissionSlugsForLeaf,
  CLIENT_HUB_TAB_GROUPS,
  CLIENT_HUB_TAB_META,
  clientHubGroupKey,
  clientHubChildKey,
  parentClientHubPermissionKey,
  permissionKeyForClientHubTab,
};
