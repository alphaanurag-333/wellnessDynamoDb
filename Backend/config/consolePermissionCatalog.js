/**
 * Staff console permission catalog for updatedadmin Access Control.
 * Slug shape: console.<featureId>.<action>
 * Mirrors Frontend/src/updatedadmin/data/accessData.js PERM_CATALOG.
 */

const PERM_ACTS = ["view", "create", "edit", "delete", "upload", "export", "toggle"];

/** [sectionLabel, featureName, featureId, actions[], sectionId] */
const PERM_CATALOG = [
  ["Dashboard", "Global dashboard", "dash", ["view", "export"], "dashboard"],
  ["Dashboard", "Revenue analytics", "rev", ["view", "export"], "dashboard"],
  ["User Management", "Client list", "cl", ["view", "create", "edit", "delete", "export"], "users"],
  ["User Management", "Client PII", "pii", ["view", "edit"], "users"],
  ["User Management", "Body analytics", "body", ["view", "edit", "upload"], "users"],
  ["User Management", "Blood reports", "rep", ["view", "upload", "edit", "export"], "users"],
  ["User Management", "Program assignment", "pg", ["view", "create", "edit", "delete", "toggle"], "users"],
  ["User Management", "Diet & protocol", "diet", ["view", "create", "edit", "delete"], "users"],
  ["Teams", "Team members", "tm", ["view", "create", "edit", "delete"], "teams"],
  ["Teams", "Coach reassignment", "ra", ["view", "edit", "toggle"], "teams"],
  ["Calendar", "Consultation slots", "cal", ["view", "create", "edit", "delete"], "calendar"],
  ["Calendar", "Coach availability", "avail", ["view", "edit", "toggle"], "calendar"],
  ["Pending Tasks", "Task queue", "pt", ["view", "edit", "toggle"], "pending"],
  ["SOP", "SOP library", "sop", ["view", "create", "edit", "delete", "upload"], "sop"],
  ["Configs", "Testimonials & media", "ct", ["view", "create", "upload", "delete"], "configs"],
  ["Configs", "Banners & slots", "bn", ["view", "create", "edit", "toggle"], "configs"],
  ["Configs", "App & web configs", "cf", ["view", "edit", "toggle", "delete"], "configs"],
  ["Configs", "Roles & policies", "rp", ["view", "create", "edit", "delete"], "configs"],
  ["Referral Tree", "Referral genealogy", "rt", ["view"], "referral-tree"],
  ["Contact Inquiries", "Contact inquiries", "ci", ["view", "edit", "delete"], "contact-inquiries"],
];

const AC_SECTIONS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "users", label: "User Management" },
  { id: "teams", label: "Teams" },
  { id: "calendar", label: "Calendar" },
  { id: "pending", label: "Pending Tasks" },
  { id: "sop", label: "SOP" },
  { id: "configs", label: "Configs" },
  { id: "referral-tree", label: "Referral Tree" },
  { id: "contact-inquiries", label: "Contact Inquiries" },
  { id: "access", label: "Access Control" },
];

function consoleSlug(featureId, action) {
  return `console.${featureId}.${action}`;
}

function parseConsoleSlug(slug) {
  const s = String(slug || "").trim();
  const m = /^console\.([a-z0-9_-]+)\.([a-z]+)$/i.exec(s);
  if (!m) return null;
  return { featureId: m[1], action: m[2] };
}

const ALL_CONSOLE_PERMISSIONS = [];
for (const row of PERM_CATALOG) {
  const featureId = row[2];
  for (const action of row[3]) {
    ALL_CONSOLE_PERMISSIONS.push(consoleSlug(featureId, action));
  }
}

const CONSOLE_PERMISSION_SET = new Set(ALL_CONSOLE_PERMISSIONS);
const TOTAL_PERM_SLOTS = ALL_CONSOLE_PERMISSIONS.length;

function isValidConsolePermission(slug) {
  return CONSOLE_PERMISSION_SET.has(String(slug || "").trim());
}

function grantsMapToPermissions(grantsMap) {
  if (grantsMap == null) return [...ALL_CONSOLE_PERMISSIONS];
  const out = [];
  for (const [featureId, actions] of Object.entries(grantsMap || {})) {
    for (const action of actions || []) {
      const slug = consoleSlug(featureId, action);
      if (isValidConsolePermission(slug)) out.push(slug);
    }
  }
  return out;
}

function permissionsToGrantsMap(permissions) {
  if (!Array.isArray(permissions)) return {};
  if (
    permissions.length >= TOTAL_PERM_SLOTS &&
    ALL_CONSOLE_PERMISSIONS.every((p) => permissions.includes(p))
  ) {
    return null; // full access
  }
  const map = {};
  for (const slug of permissions) {
    const parsed = parseConsoleSlug(slug);
    if (!parsed) continue;
    if (!map[parsed.featureId]) map[parsed.featureId] = [];
    if (!map[parsed.featureId].includes(parsed.action)) {
      map[parsed.featureId].push(parsed.action);
    }
  }
  return map;
}

/** Default baselines matching updatedadmin accessData DEFAULT_GRANTS */
const DEFAULT_CONSOLE_GRANTS = {
  admin: null,
  wc: {
    dash: ["view", "export"],
    rev: ["view"],
    cl: ["view", "create", "edit", "export"],
    pii: ["view", "edit"],
    body: ["view", "edit", "upload"],
    rep: ["view", "upload", "edit", "export"],
    pg: ["view", "create", "edit", "toggle"],
    diet: ["view", "create", "edit", "delete"],
    tm: ["view", "edit"],
    ra: ["view", "edit"],
    cal: ["view", "create", "edit", "delete"],
    avail: ["view", "edit", "toggle"],
    pt: ["view", "edit", "toggle"],
    sop: ["view"],
    rt: ["view"],
  },
  awc: {
    dash: ["view"],
    cl: ["view", "edit"],
    body: ["view"],
    rep: ["view"],
    diet: ["view"],
    tm: ["view"],
    cal: ["view", "create", "edit"],
    avail: ["view"],
    pt: ["view", "edit", "toggle"],
    sop: ["view"],
  },
  trainee: {
    dash: ["view"],
    cl: ["view"],
    pt: ["view"],
    sop: ["view"],
    body: ["view"],
  },
  support: {
    dash: ["view"],
    pt: ["view"],
    ci: ["view", "edit", "delete"],
  },
};

const DEFAULT_NAV_SECTIONS = {
  admin: ["dashboard", "users", "access", "teams", "calendar", "pending", "sop", "configs", "referral-tree", "contact-inquiries"],
  wc: ["dashboard", "users", "teams", "calendar", "pending", "sop", "referral-tree"],
  awc: ["dashboard", "users", "teams", "calendar", "pending", "sop"],
  trainee: ["dashboard", "users", "pending", "sop"],
  support: ["dashboard", "pending", "contact-inquiries"],
};

const ROLE_KEY_META = {
  admin: {
    name: "Admin",
    slug: "console-admin",
    description: "Full read and write across every section. Owns roles, policies and section visibility.",
    dataScope: "all",
    locked: true,
    color: "#5e6ad2",
  },
  wc: {
    name: "Wellness Coach",
    slug: "console-wellness-coach",
    description: "Dashboards and profiles for the clients assigned directly to them.",
    dataScope: "assigned",
    locked: false,
    color: "#a855f7",
  },
  awc: {
    name: "Assistant WC",
    slug: "console-assistant-wc",
    description: "Inherits their Wellness Coach's roster. Sensitive data points can be withheld.",
    dataScope: "team",
    locked: false,
    color: "#6366f1",
  },
  trainee: {
    name: "Trainee",
    slug: "console-trainee",
    description: "Shadowing a coach. Read-only across the sections they can open.",
    dataScope: "team",
    locked: false,
    color: "#b8860b",
  },
  support: {
    name: "Support",
    slug: "console-support",
    description: "Content operations only — testimonials, banners, media. No client PII.",
    dataScope: "all",
    locked: false,
    color: "#0d9488",
  },
};

/** UI role key ↔ Account membership roleKey */
const UI_TO_ACCOUNT_ROLE = {
  admin: "admin",
  wc: "wellness_coach",
  awc: "assistant_wellness_coach",
  trainee: "trainee",
  support: "support",
};

const ACCOUNT_TO_UI_ROLE = Object.fromEntries(
  Object.entries(UI_TO_ACCOUNT_ROLE).map(([ui, acc]) => [acc, ui])
);

function getConsolePermissionCatalog() {
  return {
    scope: "CONSOLE",
    actions: [...PERM_ACTS],
    sections: AC_SECTIONS,
    features: PERM_CATALOG.map(([sectionLabel, featureName, featureId, actions, sectionId]) => ({
      sectionLabel,
      featureName,
      featureId,
      actions,
      sectionId,
    })),
    permissions: [...ALL_CONSOLE_PERMISSIONS],
    totalSlots: TOTAL_PERM_SLOTS,
  };
}

module.exports = {
  PERM_ACTS,
  PERM_CATALOG,
  AC_SECTIONS,
  ALL_CONSOLE_PERMISSIONS,
  TOTAL_PERM_SLOTS,
  DEFAULT_CONSOLE_GRANTS,
  DEFAULT_NAV_SECTIONS,
  ROLE_KEY_META,
  UI_TO_ACCOUNT_ROLE,
  ACCOUNT_TO_UI_ROLE,
  consoleSlug,
  parseConsoleSlug,
  isValidConsolePermission,
  grantsMapToPermissions,
  permissionsToGrantsMap,
  getConsolePermissionCatalog,
};
