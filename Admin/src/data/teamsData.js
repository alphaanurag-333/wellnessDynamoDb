/** Teams page role chrome — live data comes from Account APIs. */

export const TEAM_ROLE_TABS_BASE = [
  { id: "wc", label: "Wellness Coach" },
  { id: "awc", label: "Assistant WC" },
  { id: "support", label: "Support" },
  { id: "trainee", label: "Trainee" },
];

export const TEAM_ROLE_META = {
  wc: {
    id: "wc",
    name: "Wellness Coach",
    roleColor: "#a855f7",
    roleBg: "#f6ecfe",
    roleBorder: "#eed4fb",
    accountRole: "wellness_coach",
  },
  awc: {
    id: "awc",
    name: "Assistant WC",
    roleColor: "#6366f1",
    roleBg: "#eef0fc",
    roleBorder: "#dcdff7",
    accountRole: "assistant_wellness_coach",
  },
  support: {
    id: "support",
    name: "Support",
    roleColor: "#0d9488",
    roleBg: "#e6f6f2",
    roleBorder: "#c3e8e1",
    accountRole: "support",
  },
  trainee: {
    id: "trainee",
    name: "Trainee",
    roleColor: "#b8860b",
    roleBg: "#fbf3df",
    roleBorder: "#f2e2a8",
    accountRole: "trainee",
  },
  admin: {
    id: "admin",
    name: "Admin",
    roleColor: "#ec7a45",
    roleBg: "#fdefe7",
    roleBorder: "#f6dcc4",
    accountRole: "admin",
  },
};

export const STAFF_AVATARS = ["#34a56a", "#5e6ad2", "#0d9488", "#ec7a45", "#c2661d", "#7c8aa5"];

export const STAFF_COL3 = {
  wc: "Load",
  awc: "Reports to",
  support: "Area",
  admin: "Level",
  trainee: "Mentor",
};

/** @deprecated mock roster — dashboard may still reference until wired */
export const STAFF_BY_ROLE = {
  wc: [],
  awc: [],
  support: [],
  admin: [],
  trainee: [],
};

export const TEAM_ROLE_TABS = TEAM_ROLE_TABS_BASE.map((t) => ({ ...t, count: 0 }));

export function staffInitials(name) {
  return String(name || "")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
