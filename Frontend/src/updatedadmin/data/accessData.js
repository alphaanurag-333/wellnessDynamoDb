export const ACCESS_TABS = [
  { id: "roles", label: "Roles & permissions" },
  { id: "policies", label: "Policy library" },
  { id: "simulator", label: "View as… simulator" },
  { id: "approvals", label: "Approvals", badge: 1 },
  { id: "audit", label: "Audit log" },
];

export const ROLES = [
  { id: "admin", name: "Admin", scope: "All", userCount: 3, color: "#5e6ad2" },
  { id: "wc", name: "Wellness Coach", scope: "Assigned", userCount: 8, color: "#a855f7" },
  { id: "awc", name: "Assistant WC", scope: "Team", userCount: 14, color: "#6366f1" },
  { id: "support", name: "Support", scope: "All", userCount: 5, color: "#0d9488" },
];

export const ACTION_COLS = ["View", "Create", "Edit", "Delete", "Upload", "Export", "Toggle"];

export const MATRIX_FEATURES = [
  { id: "dash", name: "Global dashboard", section: "Dashboard", cells: ["allow", "inherit", "inherit", "deny", "inherit", "allow", "inherit"] },
  { id: "cl", name: "Client list", section: "Clients", cells: ["allow", "allow", "allow", "deny", "inherit", "allow", "inherit"] },
  { id: "pii", name: "Client PII", section: "Clients", cells: ["allow", "deny", "allow", "deny", "inherit", "deny", "inherit"] },
  { id: "ct", name: "Testimonials & media", section: "Content", cells: ["allow", "allow", "allow", "allow", "allow", "inherit", "toggle"] },
  { id: "cf", name: "App & web configs", section: "Config", cells: ["allow", "deny", "allow", "deny", "inherit", "inherit", "allow"] },
];

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
  { kind: "Activity", text: "Broadcast sent to all users", detail: "Community message", subject: "Global", subjectMeta: "—", actor: "Admin", when: "3d ago" },
  { kind: "Role", text: "New trainee account created", detail: "Ritu Sharma", subject: "Ritu Sharma", subjectMeta: "IRW-1098", actor: "Anita Rao", when: "4d ago" },
];

export function cellVisual(state) {
  if (state === "allow") return { label: "✓", bg: "#e7f6ee", border: "#bfe6cf", color: "#2b8f5b" };
  if (state === "deny") return { label: "✕", bg: "#fdecec", border: "#f5c6c6", color: "#d64545" };
  return { label: "—", bg: "#f3f5f9", border: "#e3e8f0", color: "#8a97ac" };
}
