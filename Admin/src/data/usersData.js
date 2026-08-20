export const UNASSIGNED_COACH = "— Unassigned —";

/** @deprecated Prefer live team members from /account/access/members */
export const WC_OPTIONS = [UNASSIGNED_COACH, "Anita Rao", "Priya Nair", "Vikram Sethi", "Meera Joshi", "Nikhil Rao", "Sneha Kaur"];
export const AWC_OPTIONS = [UNASSIGNED_COACH, "Ishita Sen", "Rohan Das", "Neha Pillai", "Aman Gupta", "Tara Iyer", "Zoya Khan", "Karan Mehta", "Divya Nair"];

/** @deprecated Prefer assignedCoach from API / team roster */
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

export function userOverrideKey(user) {
  return String(user?.id || user?.name || "");
}

export function enrichUser(user, overrides) {
  const key = userOverrideKey(user);
  const tier = overrides.tierOverrides[key] ?? overrides.tierOverrides[user.name] ?? user.tier;
  const off =
    overrides.disabledUsers.includes(key) ||
    overrides.disabledUsers.includes(user.name) ||
    user.status === "Disabled" ||
    String(user.rawStatus || "").toLowerCase() === "inactive";
  const coach = overrides.coachOverrides[key] ?? overrides.coachOverrides[user.name] ?? user.coach;
  const awcOverride = key in (overrides.awcOverrides || {})
    ? overrides.awcOverrides[key]
    : (user.name in (overrides.awcOverrides || {}) ? overrides.awcOverrides[user.name] : undefined);
  return {
    ...user,
    tier,
    converted: Boolean(overrides.tierOverrides[key] ?? overrides.tierOverrides[user.name]),
    coach,
    awc: awcOverride != null ? awcOverride : (user.awc || ""),
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

const TIER_ALIASES = {
  HEAL: "Seek to Heal",
  MAINTENANCE: "Maintenance",
  PWC: "Consultancy",
  SEEK: "Seek",
};

export function normalizeTier(tier) {
  if (!tier) return tier;
  return TIER_ALIASES[tier] || tier;
}

export function tierStyle(tier) {
  const t = normalizeTier(tier);
  if (t === "Seek to Heal") return { bg: "#e7f6ee", color: "#2b8f5b", border: "#cdeede" };
  if (t === "Consultancy") return { bg: "#fdf3dd", color: "#c2891b", border: "#f6e2c2" };
  if (t === "Maintenance") return { bg: "#eef0fc", color: "#5e6ad2", border: "#dcdff7" };
  return { bg: "#eef1f7", color: "#5a6b85", border: "#e6ebf2" };
}

export function tierBadgeStyle(tier) {
  const tone = tierStyle(tier);
  return {
    background: tone.bg,
    color: tone.color,
    border: `1px solid ${tone.border}`,
  };
}

export function tierLabel(tier) {
  const t = normalizeTier(tier);
  if (t === "Seek to Heal") return "HEAL";
  if (t === "Consultancy") return "PWC";
  if (t === "Maintenance") return "MAINTENANCE";
  return "SEEK";
}

export function tierBadgeClass(tier) {
  const t = normalizeTier(tier);
  if (t === "Seek to Heal") return "heal";
  if (t === "Maintenance") return "maintenance";
  if (t === "Consultancy") return "pwc";
  return "seek";
}

export function nextTier(tier) {
  const t = normalizeTier(tier);
  if (t === "Seek to Heal") return "Maintenance";
  return "Seek to Heal";
}

export function canConvertTier(tier) {
  const t = normalizeTier(tier);
  return t === "Seek" || t === "Consultancy" || t === "Seek to Heal";
}

export function conversionPrompt(user, direction) {
  const name = String(user?.name || "this client").trim() || "this client";
  const t = normalizeTier(user?.tier);
  if (direction === "up") {
    if (t === "Seek to Heal") {
      return {
        title: `Move ${name} from HEAL to MAINTENANCE?`,
        body: `${name} stays on the roster without an active Heal program. Use this when every goal has been achieved.`,
        confirm: "Move to MAINTENANCE",
        kicker: "Conversion",
      };
    }
    if (t === "Consultancy") {
      return {
        title: `Convert ${name} from PWC to HEAL?`,
        body: `${name} already completed consultancy. This upgrades them into the Heal program with full coaching entitlements.`,
        confirm: "Convert to HEAL",
        kicker: "Conversion",
      };
    }
    return {
      title: `Convert ${name} from SEEK to HEAL?`,
      body: `This is a manual upgrade when payment did not go through. ${name} becomes a Heal client with coaching entitlements. Assign a coach afterwards if they are still unassigned.`,
      confirm: "Convert to HEAL",
      kicker: "Conversion",
    };
  }
  if (t === "Maintenance") {
    return {
      title: `Move ${name} back from MAINTENANCE to HEAL?`,
      body: `Use this if maintenance was started too early. ${name} returns to an active Heal program.`,
      confirm: "Move to HEAL",
      kicker: "Conversion",
    };
  }
  if (t === "Consultancy") {
    return {
      title: `Move ${name} from PWC to SEEK?`,
      body: `This ends consultancy entitlements. ${name}’s history stays on the account.`,
      confirm: "Move to SEEK",
      kicker: "Conversion",
    };
  }
  return {
    title: `Move ${name} from HEAL to SEEK?`,
    body: `This ends paid coaching entitlements. ${name}’s history stays on the account.`,
    confirm: "Move to SEEK",
    kicker: "Conversion",
  };
}

export function prevTier(tier) {
  const t = normalizeTier(tier);
  if (t === "Maintenance") return "Seek to Heal";
  return "Seek";
}

export function canDowngradeTier(tier, ageDays) {
  const t = normalizeTier(tier);
  // Heal → Seek, PWC → Seek, and Maintenance → Heal are the downgrade paths.
  void ageDays;
  return t === "Seek to Heal" || t === "Maintenance" || t === "Consultancy";
}

/** Inline TIER-column actions: current badge stays put; these are the move options. */
export function listTierMoveOptions(tier, ageDays) {
  const t = normalizeTier(tier);
  const options = [];
  if (canConvertTier(t)) {
    const target = nextTier(t);
    options.push({
      direction: "up",
      target,
      label: `→ ${tierLabel(target)}`,
      title: t === "Seek to Heal"
        ? "Move this client into MAINTENANCE — for when every goal has been achieved"
        : t === "Consultancy"
          ? "Convert this client from PWC to HEAL"
          : "Convert this client from SEEK to HEAL when payment did not go through",
    });
  }
  if (canDowngradeTier(t, ageDays)) {
    const target = prevTier(t);
    options.push({
      direction: "down",
      target,
      label: `↓ ${tierLabel(target)}`,
      title: t === "Maintenance"
        ? "Move this client back to HEAL — for when maintenance was entered too early"
        : t === "Consultancy"
          ? "Move this client back down to SEEK — ends consultancy entitlements"
          : "Move this client back down to SEEK — ends paid coaching entitlements",
    });
  }
  return options;
}

/** Heal ↔ Maintenance is the only cleanly reversible pair for session Undo. */
export function canUndoTierMove(fromTier, toTier) {
  const from = normalizeTier(fromTier);
  const to = normalizeTier(toTier);
  return (
    (from === "Seek to Heal" && to === "Maintenance")
    || (from === "Maintenance" && to === "Seek to Heal")
  );
}

export function lastActiveMinutes(value) {
  if (!value || value === "—") return 1e9;
  const match = /(\d+)\s*(m|h|d)/.exec(String(value) || "");
  if (!match) return /just/i.test(value) ? 0 : 1e9;
  const amount = Number(match[1]);
  if (match[2] === "m") return amount;
  if (match[2] === "h") return amount * 60;
  return amount * 1440;
}

export function userInitials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
}

export function avatarColor(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function statusTone(user) {
  if (user.off) return "red";
  if (user.status === "Active") return "green";
  return "muted";
}
