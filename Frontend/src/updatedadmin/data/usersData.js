export const WC_OPTIONS = ["— Unassigned —", "Anita Rao", "Priya Nair", "Vikram Sethi", "Meera Joshi", "Nikhil Rao", "Sneha Kaur"];
export const AWC_OPTIONS = ["— Unassigned —", "Ishita Sen", "Rohan Das", "Neha Pillai", "Aman Gupta", "Tara Iyer", "Zoya Khan", "Karan Mehta", "Divya Nair"];

export const AWC_DEFAULT = {
  "Anita Rao": "Ishita Sen",
  "Priya Nair": "Neha Pillai",
  "Vikram Sethi": "Tara Iyer",
  "Meera Joshi": "Karan Mehta",
};

export const TIER_OPTIONS = [
  { value: "", label: "All tiers" },
  { value: "Seek to Heal", label: "HEAL" },
  { value: "Consultancy", label: "PWC" },
  { value: "Seek", label: "SEEK" },
  { value: "Maintenance", label: "MAINTENANCE" },
];

export const USER_TYPE_TAB_DEFS = [
  { id: "", label: "All users" },
  { id: "individual", label: "Program clients" },
  { id: "team", label: "Eagles" },
  { id: "app", label: "Maintenance" },
];

const AVATAR_COLORS = ["#34a56a", "#5e6ad2", "#0d9488", "#ec7a45", "#c2661d", "#7c8aa5"];
const AGE_DAYS = [3, 2, 19, 26, 5, 33, 12, 40, 6, 47, 54, 61, 1, 68, 9, 15];

const RAW_USERS = [
  ["Madhupriya Bilas", "te.madhupriyabilas@gmail.com", "Seek to Heal", "Fat Loss", "Anita Rao", "2h ago"],
  ["Dipti Patil", "te.diptipatil@gmail.com", "Seek to Heal", "Fat Loss", "Anita Rao", "5h ago"],
  ["Banita Acharya", "banitaacharyamishra@gmail.com", "Seek to Heal", "Fat Loss", "Priya Nair", "1d ago"],
  ["Bikash Sharma", "bikashbilas@gmail.com", "Seek to Heal", "Diabetes Reversal", "Priya Nair", "3h ago"],
  ["Hetu Mehra", "haha@gmail.com", "Seek to Heal", "PCOD / PCOS", "Vikram Sethi", "1h ago"],
  ["Dheer Barve", "dheer.balphawizz@gmail.com", "Seek", "Thyroid Care", "Vikram Sethi", "2d ago"],
  ["Rhea Kapoor", "rhea.k@gmail.com", "Consultancy", "PCOD / PCOS", "Meera Joshi", "6h ago"],
  ["Arjun Verma", "arjun.v@gmail.com", "Seek to Heal", "Diabetes Reversal", "Meera Joshi", "4h ago"],
  ["Sana Iqbal", "sana.i@gmail.com", "Consultancy", "Fat Loss", "Anita Rao", "30m ago"],
  ["Kabir Shah", "kabir.s@gmail.com", "Seek to Heal", "Thyroid Care", "Priya Nair", "1d ago"],
  ["Ananya Rao", "ananya.r@gmail.com", "Seek", "Everyday Wellness", "Anita Rao", "2h ago"],
  ["Farhan Qureshi", "farhan.q@gmail.com", "Seek", "Everyday Wellness", "Priya Nair", "1d ago"],
  ["Ishaan Kulkarni", "ishaan.k@gmail.com", "Seek to Heal", "Everyday Wellness", "Meera Joshi", "7h ago"],
  ["Trisha Menon", "trisha.m@gmail.com", "Seek to Heal", "Overall Wellbeing", "Anita Rao", "3h ago"],
  ["Divya Gupta", "divya.g@gmail.com", "Consultancy", "Overall Wellbeing", "Meera Joshi", "2d ago"],
  ["Lata Pawar", "lata.p@gmail.com", "Seek to Heal", "Hypertension", "Vikram Sethi", "5h ago"],
  ["Rohit Ambekar", "rohit.a@gmail.com", "Seek to Heal", "Overall Wellbeing", "Anita Rao", "4h ago"],
];

const UTYPES = ["individual", "individual", "team", "team", "individual", "app", "individual", "team", "individual", "app", "app", "app", "individual", "individual", "individual", "individual", "team"];
const TEAMS = ["—", "—", "Acharya Family", "Infosys Wellness", "—", "—", "—", "Infosys Wellness", "—", "—", "—", "—", "—", "—", "—", "—", "Infosys Wellness"];

export const USERS = RAW_USERS.map((row, i) => {
  const utype = UTYPES[i];
  return {
    n: i + 1,
    name: row[0],
    email: row[1],
    tier: row[2],
    goal: row[3],
    coach: row[4],
    awc: AWC_DEFAULT[row[4]] || "",
    lastActive: row[5],
    status: "Active",
    utype,
    team: TEAMS[i],
    phone: `+91 ${String(90000 + i * 137).slice(0, 5)} ${String(10000 + i * 911).slice(0, 5)}`,
    ageDays: AGE_DAYS[i % AGE_DAYS.length],
  };
});

export function enrichUser(user, overrides) {
  const tier = overrides.tierOverrides[user.name] ?? user.tier;
  const off = overrides.disabledUsers.includes(user.name);
  const coach = overrides.coachOverrides[user.name] ?? user.coach;
  const awcOverride = overrides.awcOverrides[user.name];
  return {
    ...user,
    tier,
    converted: Boolean(overrides.tierOverrides[user.name]),
    coach,
    awc: awcOverride != null ? awcOverride : (AWC_DEFAULT[coach] || user.awc || ""),
    off,
    status: off ? "Disabled" : user.status,
  };
}

export function filterUsers(list, filters) {
  const q = filters.search?.trim().toLowerCase() ?? "";
  let result = list;

  if (q) {
    result = result.filter((u) => `${u.name}${u.email}${u.phone}`.toLowerCase().includes(q));
  }
  if (filters.tierFilter) result = result.filter((u) => u.tier === filters.tierFilter);
  if (filters.statusFilter) result = result.filter((u) => u.status === filters.statusFilter);
  if (filters.typeTab && filters.typeTab !== "all") {
    result = result.filter((u) => u.utype === filters.typeTab);
  }
  if (filters.coachFilter) result = result.filter((u) => u.coach === filters.coachFilter);
  return result;
}

export function buildUserTypeTabs(pool, activeTab, countPool = pool) {
  return USER_TYPE_TAB_DEFS.map((def) => {
    const count = def.id ? countPool.filter((u) => u.utype === def.id).length : countPool.length;
    return { id: def.id || "all", label: def.label, count };
  }).filter((tab, idx) => {
    if (idx === 0) return true;
    const def = USER_TYPE_TAB_DEFS[idx];
    const count = def.id ? countPool.filter((u) => u.utype === def.id).length : countPool.length;
    return count > 0 || ["team", "app"].includes(def.id) || activeTab === def.id;
  });
}

export function tierStyle(tier) {
  if (tier === "Seek to Heal") return { bg: "#e7f6ee", color: "#2b8f5b" };
  if (tier === "Consultancy") return { bg: "#fdf3dd", color: "#c2891b" };
  if (tier === "Maintenance") return { bg: "#eef0fc", color: "#5e6ad2" };
  return { bg: "#eef1f7", color: "#5a6b85" };
}

export function tierLabel(tier) {
  if (tier === "Seek to Heal") return "HEAL";
  if (tier === "Consultancy") return "PWC";
  if (tier === "Maintenance") return "MAINTENANCE";
  return "SEEK";
}

export function nextTier(tier) {
  if (tier === "Seek to Heal") return "Maintenance";
  if (tier === "Seek") return "Consultancy";
  return "Seek to Heal";
}

export function prevTier(tier) {
  if (tier === "Maintenance") return "Seek to Heal";
  return "Seek";
}

export function canDowngradeTier(tier, ageDays) {
  return (tier === "Consultancy" && ageDays > 7) || tier === "Maintenance";
}

export function lastActiveMinutes(value) {
  const match = /(\d+)\s*(m|h|d)/.exec(String(value) || "");
  if (!match) return /just/i.test(value) ? 0 : 1e9;
  const amount = Number(match[1]);
  if (match[2] === "m") return amount;
  if (match[2] === "h") return amount * 60;
  return amount * 1440;
}

export function userInitials(name) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("");
}

export function avatarColor(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function statusTone(user) {
  if (user.off) return "red";
  if (user.status === "Active") return "green";
  return "muted";
}
