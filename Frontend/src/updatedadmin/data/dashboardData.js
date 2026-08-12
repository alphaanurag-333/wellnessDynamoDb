export const GRADIENT_GREEN = "linear-gradient(135deg, rgb(52, 165, 106), rgb(75, 184, 124))";

export const UPDATED_ADMIN_PATHS = {
  dashboard: "/updatedadmin",
  users: "/updatedadmin/users",
  userDetail: (id) => `/updatedadmin/users/${id}`,
  access: "/updatedadmin/access",
  teams: "/updatedadmin/teams",
  calendar: "/updatedadmin/calendar",
  configs: "/updatedadmin/configs",
};

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "grid", path: UPDATED_ADMIN_PATHS.dashboard },
  { id: "users", label: "User Management", icon: "users", path: UPDATED_ADMIN_PATHS.users },
  { id: "access", label: "Access Control", icon: "shield", path: UPDATED_ADMIN_PATHS.access },
  { id: "teams", label: "Teams", icon: "layers", path: UPDATED_ADMIN_PATHS.teams },
  { id: "calendar", label: "Calendar", icon: "calendar", path: UPDATED_ADMIN_PATHS.calendar },
  { id: "configs", label: "Configs", icon: "settings", path: UPDATED_ADMIN_PATHS.configs },
];

export const COACH_TIERS = [
  { label: "Seek", value: 3, pct: "8%", color: "#3d5afe", tierFilter: "Seek" },
  { label: "PWC only", value: 5, pct: "14%", color: "#f0a91b", tierFilter: "Consultancy" },
  { label: "Heal", value: 27, pct: "73%", color: "#2b8f5b", tierFilter: "Seek to Heal" },
  { label: "Maintenance", value: 2, pct: "5%", color: "#5e6ad2", tierFilter: "Maintenance" },
];

export const COACH_TIER_TOTAL = COACH_TIERS.reduce((sum, t) => sum + t.value, 0);

export const APP_CLIENT_STATS = [
  { short: "Eagles", value: 3, tag: "Corporate & family", bar: "#a855f7", accent: "#9333ea", bg: "#a855f7", iconKey: "eagles", link: `${UPDATED_ADMIN_PATHS.users}?tab=team`, tierFilter: "" },
  { short: "Maintenance", value: 2, tag: "Post-heal upkeep", bar: "#ec7a45", accent: "#c2661d", bg: "#ec7a45", iconKey: "users", link: UPDATED_ADMIN_PATHS.users, tierFilter: "Maintenance" },
];

export const EXP_CARDS = [
  { label: "Subscription", value: 4, sub: "soonest in 4 days", color: "#c0392b" },
];

export const EXP_TOTAL = 4;
export const EXP_NOTE = "Subscription renewals due within the next 15 days. Click to see who.";

export const USER_STATS = [
  { label: "Total users", value: 37, sub: "All registered accounts", bar: "#4361e8", iconKey: "users", accent: "#4361e8", bg: "#4361e8", link: UPDATED_ADMIN_PATHS.users },
  { label: "Seek users", value: 9, sub: "App downloaded, no program", bar: "#f0a91b", iconKey: "seek", accent: "#c2891b", bg: "#f0a91b", link: `${UPDATED_ADMIN_PATHS.users}?tab=app` },
  { label: "Active clients", value: 19, sub: "Enrolled in a wellness program", bar: "#2e9e5f", iconKey: "active", accent: "#2b8f5b", bg: "#2e9e5f", link: `${UPDATED_ADMIN_PATHS.users}?tab=individual` },
  { label: "PWC pending", value: 7, sub: "Programme-wise consults to confirm", bar: "#ec7a45", iconKey: "pending", accent: "#c2661d", bg: "#ec7a45", link: UPDATED_ADMIN_PATHS.calendar },
];

export const APP_USER_STATS = APP_CLIENT_STATS;

export const DASH_ROLE_CARDS = [
  {
    label: "Wellness Coach",
    roleId: "wc",
    value: 6,
    accent: "#a855f7",
    bar: "#a855f7",
    pending: [
      { label: "3 assignments pending", bg: "#fdf3ec", color: "#c2661d" },
      { label: "2 pwc pending", bg: "#fdf3ec", color: "#c2661d" },
    ],
  },
  {
    label: "Assistant WC",
    roleId: "awc",
    value: 8,
    accent: "#6366f1",
    bar: "#6366f1",
    pending: [
      { label: "4 assignments pending", bg: "#fdf3ec", color: "#c2661d" },
      { label: "1 pwc pending", bg: "#fdf3ec", color: "#c2661d" },
    ],
  },
  {
    label: "Support",
    roleId: "support",
    value: 3,
    accent: "#2b8f5b",
    bar: "#34a56a",
    pending: [
      { label: "19 feedback open", bg: "#fdf3ec", color: "#c2661d" },
      { label: "5 content pending", bg: "#eef0fc", color: "#5e6ad2" },
    ],
  },
  {
    label: "Trainee",
    roleId: "trainee",
    value: 3,
    accent: "#c2891b",
    bar: "#e5a020",
    pending: [
      { label: "1 mentor pending", bg: "#fdf3ec", color: "#c2661d" },
      { label: "4 shadow sessions", bg: "#eef0fc", color: "#5e6ad2" },
    ],
  },
];

export const TEAM_CARDS = DASH_ROLE_CARDS;

export const CHAMP_CLIENTS = [
  { name: "Madhupriya Bilas", score: 279 },
  { name: "Arjun Verma", score: 271 },
];

export const CHAMP_COACHES = [
  { name: "Anita Rao", score: "96%" },
];

export const BIRTHDAYS = [
  { mark: "🎉", name: "Hetu Mehra", when: "Today", isCoach: false },
  { mark: "🎂", name: "Dipti Patil", when: "27 Jul", isCoach: false },
  { mark: "🩺", name: "Vikram Sethi", when: "26 Jul", isCoach: true },
  { mark: "🎂", name: "Rhea Kapoor", when: "29 Jul", isCoach: false },
  { mark: "🩺", name: "Meera Joshi", when: "02 Aug", isCoach: true },
];

export const FAT_METRICS = [
  { label: "6–10 kg down", count: 4 },
  { label: "Halfway to goal", count: 3 },
  { label: "At / 2 kg short", count: 1 },
];

export const A1C_METRICS = [
  { label: "2+ points down", count: 3 },
  { label: "Below 6.5", count: 3 },
];

export const PROG_CATS = [
  { label: "Fat Loss", count: 4, icon: "🏃", animClass: "pgi-fatloss", accent: "#c2661d", bg: "#fff9f4", border: "#f6dcc4" },
  { label: "Diabetes Reversal", count: 2, icon: "🩸", animClass: "pgi-diabetes", accent: "#2b8f5b", bg: "#f7fbf9", border: "#cdeede" },
  { label: "Thyroid Care", count: 2, icon: "🦋", animClass: "pgi-thyroid", accent: "#0d9488", bg: "#f0fdfa", border: "#ccfbf1" },
  { label: "PCOD / PCOS", count: 2, icon: "🌸", animClass: "pgi-pcod", accent: "#c2559a", bg: "#fdf6fb", border: "#f3d5ea" },
  { label: "Overall Wellbeing", count: 2, icon: "✨", accent: "#c2891b", bg: "#fffdf5", border: "#f2d675" },
  { label: "Hypertension", count: 1, icon: "❤️", animClass: "pgi-hypertension", accent: "#e5484d", bg: "#fef2f2", border: "#fecaca" },
];

export const APP_USER_PROG_CARD = {
  label: "Everyday Wellness",
  count: 3,
  icon: "🌿",
  accent: "#5e6ad2",
  bg: "#f4f5fe",
  border: "#e3e6fa",
};

export const LEADERBOARD = [
  { rank: 1, name: "Madhupriya Bilas", score: 279, days: 24, medal: "🥇", highlight: false },
  { rank: 2, name: "Banita Acharya", score: 261, days: 22, medal: "🔥", highlight: true },
  { rank: 3, name: "Bikash Sharma", score: 248, days: 21, medal: "", highlight: false },
  { rank: 4, name: "Hetu Mehra", score: 235, days: 20, medal: "", highlight: false },
  { rank: 5, name: "Dipti Patil", score: 228, days: 19, medal: "", highlight: false },
  { rank: 6, name: "Ananya Singh", score: 215, days: 18, medal: "", highlight: false },
  { rank: 7, name: "Rohit Verma", score: 202, days: 17, medal: "", highlight: false },
  { rank: 8, name: "Priya Nair", score: 198, days: 16, medal: "", highlight: false },
  { rank: 9, name: "Karan Mehta", score: 185, days: 15, medal: "", highlight: false },
  { rank: 10, name: "Sneha Das", score: 172, days: 14, medal: "", highlight: false },
];

export const REVENUE_CARDS = [
  { label: "Wellness program", value: "Rs. 32.34L", share: "81% of total", pct: 81, color: "#2b8f5b", delta: "+4%" },
  { label: "PWC", value: "Rs. 1.83L", share: "5% of total", pct: 5, color: "#0d9488", delta: "+2%" },
  { label: "App users", value: "Rs. 5.82L", share: "15% of total", pct: 15, color: "#ec7a45", delta: "+8%" },
  { label: "Avg. per client", value: "Rs. 21,047", share: null, pct: 0, color: "#a855f7", delta: "+3%", isAvg: true },
];

export const REVENUE_TREND = [
  { label: "Apr", total: "Rs. 2.54L", prog: 68, cons: 42, active: false },
  { label: "May", total: "Rs. 2.70L", prog: 72, cons: 45, active: false },
  { label: "Jun", total: "Rs. 2.82L", prog: 76, cons: 48, active: false },
  { label: "Jul", total: "Rs. 2.95L", prog: 82, cons: 52, active: true },
];

export const PRODUCT_BARS = [
  { label: "Wellness programs", value: "Rs. 2.80L", pct: 81, color: "#2b8f5b" },
  { label: "PWC", value: "Rs. 0.15L", pct: 4, color: "#5e6ad2" },
  { label: "App users", value: "Rs. 0.50L", pct: 14, color: "#ec7a45" },
];

export const ONBOARD_DATA = [
  { label: "Apr", count: 23, active: false },
  { label: "May", count: 17, active: false },
  { label: "Jun", count: 26, active: false },
  { label: "Jul", count: 31, active: true },
];

export const TIER_DATA = [
  { label: "Seek (free)", value: 3, color: "#5e6ad2" },
  { label: "Heal (paid)", value: 29, color: "#34a56a" },
  { label: "Consultancy only", value: 5, color: "#e56d34" },
];

export const INITIAL_NOTIFICATIONS = [
  { id: 1, icon: "👤", kind: "Assignment", time: "2m ago", title: "New client pending coach assignment", from: "System", unread: true },
  { id: 2, icon: "💬", kind: "Feedback", time: "18m ago", title: "Support queue: 3 new feedback items", from: "Support bot", unread: true },
  { id: 3, icon: "📅", kind: "Calendar", time: "1h ago", title: "Hetu Mehra's birthday is today", from: "Community", unread: true },
  { id: 4, icon: "💰", kind: "Payment", time: "3h ago", title: "Program payment received – Rs. 12,500", from: "Billing", unread: false },
  { id: 5, icon: "🏆", kind: "Champion", time: "5h ago", title: "Madhupriya Bilas leads Jul 2026 leaderboard", from: "Daily Reflection", unread: false },
];

export const CHAMP_MONTHS = {
  "2026-07": { label: "Jul 2026", champion: "Madhupriya Bilas", score: 279 },
  "2026-06": { label: "Jun 2026", champion: "Banita Acharya", score: 255 },
  "2026-05": { label: "May 2026", champion: "Hetu Mehra", score: 241 },
};

export function buildTierGradient(data) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  return data
    .map((item) => {
      const start = cursor;
      cursor += (item.value / total) * 100;
      return `${item.color} ${start}% ${cursor}%`;
    })
    .join(", ");
}
