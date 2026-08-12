export const ACCESS_TABS = [
  { id: "roles", label: "Roles & permissions" },
  { id: "members", label: "Members" },
  { id: "policies", label: "Policies" },
  { id: "simulator", label: "Simulator" },
  { id: "approvals", label: "Approvals", badge: 1 },
  { id: "audit", label: "Audit log" },
];

export const PERM_ACTS = ["view", "create", "edit", "delete", "upload", "export", "toggle"];

/** [sectionLabel, featureName, featureId, actions[], sectionId] */
export const PERM_CATALOG = [
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
  ["Configs", "App & web configs", "cf", ["view", "edit", "toggle"], "configs"],
  ["Configs", "Roles & policies", "rp", ["view", "create", "edit", "delete"], "configs"],
];

export const AC_SECTIONS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "users", label: "User Management" },
  { id: "teams", label: "Teams" },
  { id: "calendar", label: "Calendar" },
  { id: "pending", label: "Pending Tasks" },
  { id: "sop", label: "SOP" },
  { id: "configs", label: "Configs" },
];

export const TOTAL_PERM_SLOTS = PERM_CATALOG.reduce((n, row) => n + row[3].length, 0);

/** Role id → list of section ids openable in left nav */
export const DEFAULT_VIEWS = {
  admin: ["dashboard", "users", "teams", "calendar", "pending", "sop", "configs"],
  wc: ["dashboard", "users", "teams", "calendar", "pending", "sop"],
  awc: ["dashboard", "users", "calendar", "pending", "sop"],
  trainee: ["dashboard", "users", "sop"],
  support: ["dashboard", "configs"],
};

/** Role id → parent role id (null = standalone) */
export const DEFAULT_PARENTS = {
  admin: null,
  wc: "awc",
  awc: null,
  trainee: "awc",
  support: null,
};

/**
 * Baseline grants per role (null = all actions on all features — Admin).
 * Feature id → granted action list.
 */
export const DEFAULT_GRANTS = {
  admin: null,
  awc: {
    dash: ["view"],
    cl: ["view", "edit"],
    body: ["view"],
    rep: ["view"],
    diet: ["view"],
    cal: ["view", "create", "edit"],
    avail: ["view"],
    pt: ["view", "edit", "toggle"],
    sop: ["view"],
  },
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
  },
  trainee: {
    dash: ["view"],
    cl: ["view"],
    sop: ["view"],
    body: ["view"],
  },
  support: {
    dash: ["view"],
    ct: ["view", "create", "upload", "delete"],
    bn: ["view", "create", "edit", "toggle"],
    cf: ["view", "edit"],
  },
};

export const ROLE_META = {
  admin: {
    id: "admin",
    name: "Admin",
    color: "#5e6ad2",
    bg: "#eceefc",
    bd: "#dcdff7",
    scope: "All",
    locked: true,
    system: true,
    memberCount: 3,
    desc: "Full read and write across every section. Owns roles, policies and section visibility.",
  },
  wc: {
    id: "wc",
    name: "Wellness Coach",
    color: "#a855f7",
    bg: "#f6ecfe",
    bd: "#eed4fb",
    scope: "Assigned",
    locked: false,
    system: true,
    memberCount: 8,
    desc: "Dashboards and profiles for the clients assigned directly to them.",
  },
  awc: {
    id: "awc",
    name: "Assistant WC",
    color: "#6366f1",
    bg: "#eef0fc",
    bd: "#dcdff7",
    scope: "Team",
    locked: false,
    system: true,
    memberCount: 14,
    desc: "Inherits their Wellness Coach's roster. Sensitive data points can be withheld.",
  },
  trainee: {
    id: "trainee",
    name: "Trainee",
    color: "#b8860b",
    bg: "#fbf3df",
    bd: "#f2e2a8",
    scope: "Team",
    locked: false,
    system: true,
    memberCount: 3,
    desc: "Shadowing a coach. Read-only across the sections they can open.",
  },
  support: {
    id: "support",
    name: "Support",
    color: "#0d9488",
    bg: "#e6f6f2",
    bd: "#c3e8e1",
    scope: "All",
    locked: false,
    system: true,
    memberCount: 5,
    desc: "Content operations only — testimonials, banners, media. No client PII.",
  },
};

export const ROLE_ORDER = ["admin", "wc", "awc", "trainee", "support"];

export const POLICIES = [
  {
    name: "Hide medical fields",
    desc: "Field-level deny for sensitive health data",
    scope: "Data point",
    rules: [
      { type: "DENY", text: "view · Medical conditions" },
      { type: "DENY", text: "export · Client Profiles" },
    ],
    attachedCount: "Asst. Coach role",
  },
  {
    name: "Content team full write",
    desc: "Full CRUD over testimonials, banners & videos",
    scope: "Feature",
    rules: [
      { type: "ALLOW", text: "create/edit/upload · Content" },
      { type: "DENY", text: "view · Client Profiles" },
    ],
    attachedCount: "Support role",
  },
  {
    name: "Assigned-only clients",
    desc: "Restrict client data to directly assigned roster",
    scope: "Data scope",
    rules: [
      { type: "ALLOW", text: "view · own assigned clients" },
      { type: "DENY", text: "view · all other clients" },
    ],
    attachedCount: "8 users",
  },
  {
    name: "Read-only auditor",
    desc: "View everything, change nothing",
    scope: "Feature",
    rules: [
      { type: "ALLOW", text: "view · all sections" },
      { type: "DENY", text: "create/edit/delete · all" },
    ],
    attachedCount: "2 users",
  },
];

export const SIMULATOR_ROWS = [
  { feature: "Global dashboard", verdict: "Visible", reason: "visible because: role default allow + no overriding deny" },
  { feature: "Client list", verdict: "Visible", reason: "visible because: explicit allow grant on view" },
  { feature: "Client PII", verdict: "Hidden", reason: "hidden because: explicit deny (policy) overrides all" },
  { feature: "Testimonials & media", verdict: "Hidden", reason: "hidden because: role default deny + no policy grant" },
  { feature: "App & web configs", verdict: "Hidden", reason: "hidden because: role default deny + no policy grant" },
  { feature: "Roles & policies", verdict: "Hidden", reason: "hidden because: role default deny + no policy grant" },
];

export const APPROVALS = [
  {
    kind: "Permission",
    title: "Grant upload on Testimonials & media for Ishita Sen",
    meta: "Requested by Anita Rao · 04 Aug 2026",
    pending: true,
  },
];

export const AUDIT_LOG = [
  { kind: "Role", text: "Promoted Ishita Sen to Assistant WC", detail: "Approved by Admin", subject: "Ishita Sen", subjectMeta: "IRW-1042", actor: "Admin", when: "2h ago" },
  { kind: "Permission", text: "Policy attached: Hide medical fields", detail: "Assistant WC role", subject: "Asst. Coach", subjectMeta: "Role", actor: "Sanjay Mehta", when: "5h ago" },
  { kind: "Activity", text: "Coach reassigned for Madhupriya Bilas", detail: "Anita Rao → Priya Nair", subject: "Madhupriya Bilas", subjectMeta: "IRW-1001", actor: "Admin", when: "1d ago" },
  { kind: "Permission", text: "Denied view on Client PII", detail: "Support role matrix", subject: "Support", subjectMeta: "Role", actor: "Aarti Deshmukh", when: "2d ago" },
  { kind: "Activity", text: "Broadcast sent to all users", detail: "Broadcast sent to all users", subject: "Global", subjectMeta: "—", actor: "Admin", when: "3d ago" },
  { kind: "Role", text: "New trainee account created", detail: "Ritu Sharma", subject: "Ritu Sharma", subjectMeta: "IRW-1098", actor: "Anita Rao", when: "4d ago" },
];

export const MEMBERS = [
  { name: "Sanjay Mehta", email: "sanjay.mehta@irwellness.in", role: "admin", meta: "Super admin", status: "Active" },
  { name: "Aarti Deshmukh", email: "aarti.deshmukh@irwellness.in", role: "admin", meta: "Admin", status: "Active" },
  { name: "Anita Rao", email: "anita.rao@irwellness.in", role: "wc", meta: "12 clients · 2 AWCs", status: "Active" },
  { name: "Priya Nair", email: "priya.nair@irwellness.in", role: "wc", meta: "9 clients · 2 AWCs", status: "Active" },
  { name: "Ishita Sen", email: "ishita.sen@irwellness.in", role: "awc", meta: "under Anita Rao · 6 clients", status: "Active" },
  { name: "Ritu Sharma", email: "ritu.sharma@irwellness.in", role: "trainee", meta: "Shadowing Anita Rao", status: "Active" },
  { name: "Rahul Bose", email: "rahul.bose@irwellness.in", role: "support", meta: "Content ops", status: "Active" },
];

export function cloneGrants(source = DEFAULT_GRANTS) {
  const out = {};
  for (const [rk, val] of Object.entries(source)) {
    if (val == null) out[rk] = null;
    else {
      out[rk] = {};
      for (const [fid, acts] of Object.entries(val)) out[rk][fid] = [...acts];
    }
  }
  return out;
}

export function roleHas(grants, _parents, roleId, featureId, action) {
  if (roleId === "admin") return true;
  const g = grants[roleId];
  if (g === null) return true;
  return !!(g && Array.isArray(g[featureId]) && g[featureId].includes(action));
}

export function countGranted(grants, parents, roleId) {
  let n = 0;
  for (const row of PERM_CATALOG) {
    for (const act of row[3]) {
      if (roleHas(grants, parents, roleId, row[2], act)) n += 1;
    }
  }
  return n;
}

export function sectionStats(grants, parents, roleId, views) {
  return AC_SECTIONS.map((sec) => {
    const features = PERM_CATALOG.filter((r) => r[4] === sec.id);
    let total = 0;
    let granted = 0;
    for (const row of features) {
      for (const act of row[3]) {
        total += 1;
        if (roleHas(grants, parents, roleId, row[2], act)) granted += 1;
      }
    }
    return {
      ...sec,
      granted,
      total,
      open: (views[roleId] || []).includes(sec.id),
    };
  });
}

export function featureGrantedCount(grants, parents, roleId, featureId, actions) {
  let n = 0;
  for (const act of actions) {
    if (roleHas(grants, parents, roleId, featureId, act)) n += 1;
  }
  return n;
}

/** Compare own grant vs parent for delta legend: added | removed | inherited | off | na | on */
export function cellKind(grants, parents, roleId, featureId, action, applicable) {
  if (!applicable) return "na";
  const own = roleHas(grants, parents, roleId, featureId, action);
  const parentId = parents[roleId];
  if (!parentId) return own ? "on" : "off";
  const inherited = roleHas(grants, parents, parentId, featureId, action);
  if (own && inherited) return "inherited";
  if (own && !inherited) return "added";
  if (!own && inherited) return "removed";
  return "off";
}

export function vsParentDelta(grants, parents, roleId) {
  const parentId = parents[roleId];
  if (!parentId) return { added: 0, removed: 0, standalone: true };
  let added = 0;
  let removed = 0;
  for (const row of PERM_CATALOG) {
    for (const act of row[3]) {
      const own = roleHas(grants, parents, roleId, row[2], act);
      const base = roleHas(grants, parents, parentId, row[2], act);
      if (own && !base) added += 1;
      if (!own && base) removed += 1;
    }
  }
  return { added, removed, standalone: false };
}

export function copyRoleGrants(grants, fromRoleId) {
  if (fromRoleId === "admin" || grants[fromRoleId] === null) {
    const all = {};
    for (const row of PERM_CATALOG) all[row[2]] = [...row[3]];
    return all;
  }
  const src = grants[fromRoleId] || {};
  const out = {};
  for (const [fid, acts] of Object.entries(src)) out[fid] = [...acts];
  return out;
}

export function toggleGrant(grants, parents, roleId, featureId, action) {
  if (roleId === "admin") return grants;
  const next = cloneGrants(grants);
  if (next[roleId] == null) next[roleId] = copyRoleGrants(grants, roleId);

  const map = { ...next[roleId] };
  const current = new Set(map[featureId] || []);
  if (current.has(action)) current.delete(action);
  else current.add(action);

  const allowed = PERM_CATALOG.find((r) => r[2] === featureId)?.[3] || [];
  const ordered = allowed.filter((a) => current.has(a));
  if (ordered.length) map[featureId] = ordered;
  else delete map[featureId];

  next[roleId] = map;
  return next;
}

export function setColumnForSection(grants, parents, roleId, sectionId, action, turnOn) {
  if (roleId === "admin") return grants;
  let next = grants;
  for (const row of PERM_CATALOG) {
    if (row[4] !== sectionId) continue;
    if (!row[3].includes(action)) continue;
    const has = roleHas(next, parents, roleId, row[2], action);
    if (turnOn !== has) next = toggleGrant(next, parents, roleId, row[2], action);
  }
  return next;
}
