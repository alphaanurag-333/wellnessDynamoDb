export const GRADIENT_GREEN = "linear-gradient(135deg, rgb(52, 165, 106), rgb(75, 184, 124))";

export const UPDATED_ADMIN_PATHS = {
  login: "/login",
  dashboard: "/dashboard",
  users: "/users",
  userDetail: (id) => `/users/${id}`,
  access: "/access",
  teams: "/teams",
  calendar: "/calendar",
  configs: "/configs",
  pending: "/pending",
  sop: "/sop",
  myContent: "/my-content",
  commitmentLetters: (coachId = "anita-rao") => `/my-content/letters/${coachId}`,
};

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "grid", path: UPDATED_ADMIN_PATHS.dashboard },
  { id: "users", label: "User Management", icon: "users", path: UPDATED_ADMIN_PATHS.users },
  { id: "access", label: "Access Control", icon: "shield", path: UPDATED_ADMIN_PATHS.access, adminOnly: true },
  { id: "teams", label: "Teams", icon: "layers", path: UPDATED_ADMIN_PATHS.teams },
  { id: "calendar", label: "Calendar", icon: "calendar", path: UPDATED_ADMIN_PATHS.calendar },
  { id: "configs", label: "Configs", icon: "settings", path: UPDATED_ADMIN_PATHS.configs, adminOnly: true },
  { id: "pending", label: "Pending Tasks", icon: "bell", path: UPDATED_ADMIN_PATHS.pending },
  { id: "sop", label: "SOP", icon: "file", path: UPDATED_ADMIN_PATHS.sop },
];

export const VIEW_AS_ROLES = [
  { id: "admin", name: "Admin", color: "#5e6ad2", bg: "#eceefc", live: 2, switchable: true },
  { id: "wc", name: "Wellness Coach", color: "#7c3aed", bg: "#f3e8ff", live: 6, switchable: true },
  { id: "awc", name: "Assistant WC", color: "#6366f1", bg: "#eef0fc", live: 8, switchable: true },
  { id: "trainee", name: "Trainee", color: "#b8860b", bg: "#fdf8ec", live: 3, switchable: false },
  { id: "support", name: "Support", color: "#0d9488", bg: "#e6f6f2", live: 3, switchable: true },
];

export const VIEW_AS_STAFF_TOTAL = VIEW_AS_ROLES.reduce((sum, role) => sum + role.live, 0);

export const DASH_SCOPE_LABELS = {
  admin: "Global",
  wc: "Your assigned clients",
  awc: "Your team's clients",
  support: "Content overview",
  trainee: "Learning view",
};

export const ROLE_AVATAR_INITIALS = {
  admin: "A",
  wc: "W",
  awc: "A",
  trainee: "T",
  support: "S",
};

/** Support role — quick insights on content dashboard */
export const SUPPORT_QUICK_INSIGHTS = [
  { label: "Testimonials", value: 214, sub: null, iconKey: "star", bar: "#2e9e5f", accent: "#2b8f5b", bg: "#2e9e5f" },
  { label: "Banners live", value: 8, sub: null, iconKey: "image", bar: "#4361e8", accent: "#4361e8", bg: "#4361e8" },
  { label: "Videos", value: 47, sub: null, iconKey: "video", bar: "#a855f7", accent: "#9333ea", bg: "#a855f7" },
  { label: "Feedback open", value: 19, sub: "Client reviews awaiting moderation", iconKey: "bell", bar: "#f0a91b", accent: "#c2891b", bg: "#f0a91b" },
  { label: "Published today", value: 5, sub: null, iconKey: "zap", bar: "#ec7a45", accent: "#c2661d", bg: "#ec7a45" },
];

export const WC_COACH_TIERS = [
  { label: "PWC ONLY", value: 1, pct: "17%", color: "#f0a91b", tierFilter: "Consultancy" },
  { label: "HEAL", value: 3, pct: "50%", color: "#2b8f5b", tierFilter: "Seek to Heal" },
  { label: "MAINTENANCE", value: 2, pct: "33%", color: "#5e6ad2", tierFilter: "Maintenance" },
];

export const WC_COACH_TIER_TOTAL = WC_COACH_TIERS.reduce((sum, t) => sum + t.value, 0);

export const WC_APP_CLIENT_STATS = [
  { short: "Eagles", value: 4, tag: "Corporate & family", bar: "#a855f7", accent: "#9333ea", bg: "#a855f7", iconKey: "eagles", link: `${UPDATED_ADMIN_PATHS.users}?tab=team`, tierFilter: "" },
  { short: "Maintenance", value: 8, tag: "Post-heal upkeep", bar: "#ec7a45", accent: "#c2661d", bg: "#ec7a45", iconKey: "users", link: UPDATED_ADMIN_PATHS.users, tierFilter: "Maintenance" },
];

export const WC_EXP_TOTAL = 2;

export const WC_COMM_ONB_COUNT = 2;

export const WC_FAT_METRICS = [
  { label: "6–10 kg down", count: 3 },
  { label: "Halfway to goal", count: 2 },
  { label: "At / 2 kg short", count: 1 },
];

export const WC_A1C_METRICS = [
  { label: "2+ points down", count: 0 },
  { label: "Below 6.5", count: 0 },
];

export const WC_TEAM_CARDS = [
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

export const WC_PENDING_GROUPS = [
  {
    title: "Reviews & approvals",
    total: "5 pending",
    cells: [
      {
        id: "counselling",
        short: "Counselling",
        count: 3,
        chip: "overdue",
        color: "#c0392b",
        tipTitle: "Counselling overdue",
        people: [
          { name: "Bikash Sharma", detail: "16 days ago", initial: "BS", color: "#34a56a" },
          { name: "Hetu Mehra", detail: "20 days ago", initial: "HM", color: "#5e6ad2" },
          { name: "Dipti Patil", detail: "24 days ago", initial: "DP", color: "#ec7a45" },
        ],
      },
      {
        id: "blood-report",
        short: "Blood report",
        count: 1,
        chip: "this week",
        color: "#0d9488",
        tipTitle: "Blood report pending",
        people: [
          { name: "Kabir Shah", detail: "Due this week", initial: "KS", color: "#0d9488" },
        ],
      },
      {
        id: "meal-pics",
        short: "Meal pics",
        count: 1,
        chip: "awaiting",
        color: "#a855f7",
        tipTitle: "Meal pics to review",
        people: [
          { name: "Sana Iqbal", detail: "3 photos", initial: "SI", color: "#a855f7" },
        ],
      },
    ],
  },
  {
    title: "Overdue",
    total: "3 pending",
    cells: [
      {
        id: "orders",
        short: "Orders",
        count: 2,
        chip: "not placed",
        color: "#2b8f5b",
        tipTitle: "Orders not placed",
        people: [
          { name: "Bikash Sharma", detail: "Requested 3d ago", initial: "BS", color: "#34a56a" },
          { name: "Hetu Mehra", detail: "Requested today", initial: "HM", color: "#5e6ad2" },
        ],
      },
      {
        id: "delivery",
        short: "Delivery",
        count: 1,
        chip: "not delivered",
        color: "#c0392b",
        tipTitle: "Delivery overdue",
        people: [
          { name: "Dipti Patil", detail: "ETA passed 2d ago", initial: "DP", color: "#ec7a45" },
        ],
      },
    ],
  },
  {
    title: "Schedule",
    total: "3 pending",
    cells: [
      {
        id: "meetings",
        short: "Meetings",
        count: 3,
        chip: "scheduled",
        color: "#5e6ad2",
        tipTitle: "Upcoming meetings",
        people: [
          { name: "Madhupriya Bilas", detail: "Thu 11 AM", initial: "MB", color: "#a855f7" },
          { name: "Arjun Verma", detail: "Fri 3 PM", initial: "AV", color: "#2b8f5b" },
          { name: "Banita Acharya", detail: "Mon 10 AM", initial: "BA", color: "#6366f1" },
        ],
      },
    ],
  },
];

export const WC_STALE_RECORDS = [
  { id: "blood-test", label: "Blood test", count: 2, note: "Older than 6 months", color: "#0d9488" },
  { id: "gut-reset", label: "Gut reset", count: 2, note: "No reset in 60 days", color: "#a855f7" },
];

export const WC_STALE_TOTAL = "5 due";

export const WC_LEADERBOARD = [
  { rank: 1, name: "Madhupriya Bilas", score: 279, days: 20, medal: "🥇", highlight: false },
  { rank: 2, name: "Dipti Patil", score: 276, days: 18, medal: "🥈", highlight: false },
  { rank: 3, name: "Banita Acharya", score: 261, days: 22, medal: "🥉", highlight: false },
  { rank: 4, name: "Bikash Sharma", score: 258, days: 17, medal: "", highlight: false },
  { rank: 5, name: "Hetu Mehra", score: 243, days: 21, medal: "", highlight: true },
  { rank: 6, name: "Ananya Singh", score: 215, days: 18, medal: "", highlight: false },
  { rank: 7, name: "Rohit Verma", score: 202, days: 17, medal: "", highlight: false },
  { rank: 8, name: "Priya Nair", score: 198, days: 16, medal: "", highlight: false },
  { rank: 9, name: "Karan Mehta", score: 185, days: 15, medal: "", highlight: false },
  { rank: 10, name: "Sneha Das", score: 172, days: 14, medal: "", highlight: false },
];

/** Assistant WC — team roster tiers (no Seek) */
export const AWC_COACH_TIERS = [
  { label: "PWC ONLY", value: 2, pct: "18%", color: "#f0a91b", tierFilter: "Consultancy" },
  { label: "HEAL", value: 3, pct: "27%", color: "#2b8f5b", tierFilter: "Seek to Heal" },
  { label: "MAINTENANCE", value: 6, pct: "55%", color: "#5e6ad2", tierFilter: "Maintenance" },
];

export const AWC_COACH_TIER_TOTAL = AWC_COACH_TIERS.reduce((sum, t) => sum + t.value, 0);

export const AWC_APP_CLIENT_STATS = WC_APP_CLIENT_STATS;

export const AWC_EXP_TOTAL = 4;

export const AWC_COMM_ONB_COUNT = 5;

export const AWC_FAT_METRICS = [
  { label: "6–10 kg down", count: 4 },
  { label: "Halfway to goal", count: 3 },
  { label: "At / 2 kg short", count: 1 },
];

export const AWC_A1C_METRICS = [
  { label: "2+ points down", count: 1 },
  { label: "Below 6.5", count: 2 },
];

export const AWC_PENDING_GROUPS = [
  {
    title: "Reviews & approvals",
    total: "9 pending",
    cells: [
      {
        id: "counselling",
        short: "Counselling",
        count: 4,
        chip: "overdue",
        color: "#c0392b",
        tipTitle: "Counselling overdue",
        people: [
          { name: "Bikash Sharma", detail: "16 days ago", initial: "BS", color: "#34a56a" },
          { name: "Hetu Mehra", detail: "20 days ago", initial: "HM", color: "#5e6ad2" },
          { name: "Dipti Patil", detail: "24 days ago", initial: "DP", color: "#ec7a45" },
          { name: "Banita Acharya", detail: "28 days ago", initial: "BA", color: "#a855f7" },
        ],
      },
      {
        id: "blood-report",
        short: "Blood report",
        count: 2,
        chip: "this week",
        color: "#0d9488",
        tipTitle: "Blood report pending",
        people: [
          { name: "Kabir Shah", detail: "Due this week", initial: "KS", color: "#0d9488" },
          { name: "Arjun Verma", detail: "Due this week", initial: "AV", color: "#2b8f5b" },
        ],
      },
      {
        id: "meal-pics",
        short: "Meal pics",
        count: 3,
        chip: "awaiting",
        color: "#a855f7",
        tipTitle: "Meal pics to review",
        people: [
          { name: "Sana Iqbal", detail: "3 photos", initial: "SI", color: "#a855f7" },
          { name: "Rhea Kapoor", detail: "2 photos", initial: "RK", color: "#6366f1" },
          { name: "Madhupriya Bilas", detail: "4 photos", initial: "MB", color: "#ec7a45" },
        ],
      },
    ],
  },
  {
    title: "Overdue",
    total: "4 pending",
    cells: [
      {
        id: "orders",
        short: "Orders",
        count: 2,
        chip: "not placed",
        color: "#2b8f5b",
        tipTitle: "Orders not placed",
        people: [
          { name: "Bikash Sharma", detail: "Requested 3d ago", initial: "BS", color: "#34a56a" },
          { name: "Hetu Mehra", detail: "Requested today", initial: "HM", color: "#5e6ad2" },
        ],
      },
      {
        id: "delivery",
        short: "Delivery",
        count: 2,
        chip: "not delivered",
        color: "#c0392b",
        tipTitle: "Delivery overdue",
        people: [
          { name: "Dipti Patil", detail: "ETA passed 2d ago", initial: "DP", color: "#ec7a45" },
          { name: "Banita Acharya", detail: "ETA passed 5d ago", initial: "BA", color: "#a855f7" },
        ],
      },
    ],
  },
  {
    title: "Schedule",
    total: "4 pending",
    cells: [
      {
        id: "meetings",
        short: "Meetings",
        count: 4,
        chip: "scheduled",
        color: "#5e6ad2",
        tipTitle: "Upcoming meetings",
        people: [
          { name: "Madhupriya Bilas", detail: "Thu 11 AM", initial: "MB", color: "#a855f7" },
          { name: "Arjun Verma", detail: "Fri 3 PM", initial: "AV", color: "#2b8f5b" },
          { name: "Banita Acharya", detail: "Mon 10 AM", initial: "BA", color: "#6366f1" },
          { name: "Hetu Mehra", detail: "Tue 2 PM", initial: "HM", color: "#5e6ad2" },
        ],
      },
    ],
  },
];

export const AWC_STALE_RECORDS = [
  { id: "blood-test", label: "Blood test", count: 4, note: "Older than 6 months", color: "#0d9488" },
  { id: "gut-reset", label: "Gut reset", count: 3, note: "No reset in 60 days", color: "#a855f7" },
];

export const AWC_STALE_TOTAL = "9 due";

export const AWC_LEADERBOARD = WC_LEADERBOARD;

export const COACH_TIERS = [
  { label: "SEEK", value: 3, pct: "8%", color: "#3d5afe", tierFilter: "Seek" },
  { label: "PWC ONLY", value: 5, pct: "14%", color: "#f0a91b", tierFilter: "Consultancy" },
  { label: "HEAL", value: 27, pct: "73%", color: "#2b8f5b", tierFilter: "Seek to Heal" },
  { label: "MAINTENANCE", value: 2, pct: "5%", color: "#5e6ad2", tierFilter: "Maintenance" },
];

export const COACH_TIER_TOTAL = COACH_TIERS.reduce((sum, t) => sum + t.value, 0);

export const TIER_DATA = COACH_TIERS.map((t) => ({
  label: t.label === "PWC ONLY" ? "Consultancy only" : t.label === "HEAL" ? "Heal (paid)" : t.label === "SEEK" ? "Seek (free)" : "Maintenance",
  value: t.value,
  color: t.color,
}));

export const APP_CLIENT_STATS = [
  { short: "Eagles", value: 3, tag: "Corporate & family", bar: "#a855f7", accent: "#9333ea", bg: "#a855f7", iconKey: "eagles", link: `${UPDATED_ADMIN_PATHS.users}?tab=team`, tierFilter: "" },
  { short: "Maintenance", value: 2, tag: "Post-heal upkeep", bar: "#ec7a45", accent: "#c2661d", bg: "#ec7a45", iconKey: "users", link: UPDATED_ADMIN_PATHS.users, tierFilter: "Maintenance" },
];

export const EXP_CARDS = [
  { label: "Subscription", value: 4, sub: "soonest in 4 days", color: "#c0392b" },
];

export const EXP_TOTAL = 4;
export const EXP_NOTE = "Subscription renewals due within the next 15 days. Click to see who.";

export const COMM_ONB_COUNT = 6;

export const CLIENT_ALERTS = [
  { name: "Bikash Sharma", severity: "serious", label: "Needs attention", msg: "Fasting glucose spiked to 168 mg/dL — 3 high readings this week", time: "3h ago", initial: "BS" },
  { name: "Hetu Mehra", severity: "serious", label: "Needs attention", msg: "Missed check-ins for 4 days · cycle log overdue", time: "1h ago", initial: "HM" },
  { name: "Madhupriya Bilas", severity: "watch", label: "Watch", msg: "Weight plateaued for 2 weeks — protocol review suggested", time: "2h ago", initial: "MB" },
  { name: "Kabir Shah", severity: "watch", label: "Watch", msg: "Uploaded new blood report — awaiting AI analysis", time: "1d ago", initial: "KS" },
  { name: "Sana Iqbal", severity: "good", label: "On track", msg: "Hit 7-day streak on all daily reflections", time: "30m ago", initial: "SI" },
  { name: "Arjun Verma", severity: "good", label: "On track", msg: "HbA1c down to 6.4% — excellent response", time: "4h ago", initial: "AV" },
];

export const ALERT_SERIOUS_COUNT = CLIENT_ALERTS.filter((a) => a.severity === "serious").length;

export const REVENUE_HERO = {
  total: "Rs. 39.79L",
  scope: "All time · till 25 Jul 2026",
  monthLabel: "Jul 2026",
  monthValue: "Rs. 3.45L",
  delta: "+5%",
  deltaUp: true,
};

export const FY_OPTIONS = ["FY 2026-27", "FY 2025-26"];

export const FY_MONTH_OPTIONS = ["Jul 2026", "Jun 2026", "May 2026", "Apr 2026"];

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

export const OPS_OVERDUE = {
  title: "Overdue",
  total: "4 pending",
  cells: [
    {
      id: "orders",
      short: "Orders",
      count: 2,
      chip: "not placed",
      color: "#2b8f5b",
      tipTitle: "Orders not placed",
      people: [
        { name: "Bikash Sharma", detail: "Requested 3d ago", initial: "BS", color: "#34a56a" },
        { name: "Hetu Mehra", detail: "Requested today", initial: "HM", color: "#5e6ad2" },
      ],
    },
    {
      id: "delivery",
      short: "Delivery",
      count: 2,
      chip: "not delivered",
      color: "#c0392b",
      tipTitle: "Delivery overdue",
      people: [
        { name: "Dipti Patil", detail: "ETA passed 2d ago", initial: "DP", color: "#ec7a45" },
        { name: "Banita Acharya", detail: "ETA passed 5d ago", initial: "BA", color: "#a855f7" },
      ],
    },
  ],
};

export const CHALLENGE_DAY_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "21", label: "21 days" },
  { value: "30", label: "30 days" },
];

export const CHALLENGE_AUDIENCE_OPTIONS = [
  { value: "all", label: "All clients" },
  { value: "heal", label: "HEAL clients" },
  { value: "maintenance", label: "Maintenance" },
  { value: "app", label: "App users" },
];

export const PROG_CATS = [
  { value: "fat_loss", label: "Fat Loss", count: 4, icon: "🏃", accent: "#c2661d", bg: "#fff9f4", border: "#f6dcc4" },
  { value: "diabetes_reversal", label: "Diabetes Reversal", count: 2, icon: "🩸", accent: "#2b8f5b", bg: "#f7fbf9", border: "#cdeede" },
  { value: "thyroid_care", label: "Thyroid Care", count: 2, icon: "🦋", accent: "#0d9488", bg: "#f0fdfa", border: "#ccfbf1" },
  { value: "pcod_pcos", label: "PCOD / PCOS", count: 2, icon: "🌸", accent: "#c2559a", bg: "#fdf6fb", border: "#f3d5ea" },
  { value: "overall_wellbeing", label: "Overall Wellbeing", count: 3, icon: "✨", accent: "#c2891b", bg: "#fffdf5", border: "#f2d675" },
  { value: "hypertension", label: "Hypertension", count: 1, icon: "❤️", accent: "#e5484d", bg: "#fef2f2", border: "#fecaca" },
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
  { label: "Wellness program", value: "Rs. 32.34L", share: "81% of total", pct: 81, color: "#2b8f5b" },
  { label: "PWC", value: "Rs. 1.63L", share: "4% of total", pct: 4, color: "#0d9488" },
  { label: "App users", value: "Rs. 5.82L", share: "15% of total", pct: 15, color: "#ec7a45" },
  { label: "Avg. per client", value: "Rs. 20,942", share: null, pct: 0, color: "#a855f7", isAvg: true },
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

export const ONBOARD_FY_TOTAL = 97;

export const ONBOARD_DATA = [
  { label: "Apr", count: 23, active: false },
  { label: "May", count: 17, active: false },
  { label: "Jun", count: 26, active: false },
  { label: "Jul", count: 31, active: true },
];

/** @deprecated Mock feed replaced by GET /admin/inbox */
export const INITIAL_NOTIFICATIONS = [];

export const CHAMP_MONTHS = {
  "2026-07": { label: "Jul 2026", champion: "Madhupriya Bilas", score: 279 },
  "2026-06": { label: "Jun 2026", champion: "Banita Acharya", score: 255 },
  "2026-05": { label: "May 2026", champion: "Hetu Mehra", score: 241 },
};

export function alertStyles(severity) {
  const map = {
    serious: { bg: "#fdeaea", border: "#f6d0d1", fg: "#c0392b", dot: "#e5484d" },
    watch: { bg: "#fdf6e3", border: "#f2e2a8", fg: "#9a7a00", dot: "#f0a91b" },
    good: { bg: "#e7f6ee", border: "#cdeede", fg: "#1f7a4d", dot: "#2b8f5b" },
  };
  return map[severity] ?? map.watch;
}

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
