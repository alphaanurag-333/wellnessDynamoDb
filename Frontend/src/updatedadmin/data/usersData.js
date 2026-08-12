export const WC_OPTIONS = ["— Unassigned —", "Anita Rao", "Priya Nair", "Vikram Sethi", "Meera Joshi", "Nikhil Rao", "Sneha Kaur"];
export const AWC_OPTIONS = ["— Unassigned —", "Ishita Sen", "Rohan Das", "Neha Pillai", "Aman Gupta", "Tara Iyer", "Zoya Khan", "Karan Mehta", "Divya Nair"];

export const USER_TYPE_TABS = [
  { id: "all", label: "All users", count: 16 },
  { id: "individual", label: "Individual clients", count: 9 },
  { id: "team", label: "Team members", count: 3 },
  { id: "app", label: "App users", count: 4 },
];

const AVATAR_COLORS = ["#34a56a", "#5e6ad2", "#0d9488", "#ec7a45", "#c2661d", "#7c8aa5"];

export const USERS = [
  { n: 1, name: "Madhupriya Bilas", email: "te.madhupriyabilas@gmail.com", tier: "HEAL", type: "individual", goal: "Fat Loss", coach: "Anita Rao", awc: "Ishita Sen", lastActive: "2h ago", status: "Active" },
  { n: 2, name: "Dipti Patil", email: "te.diptipatil@gmail.com", tier: "HEAL", type: "individual", goal: "Fat Loss", coach: "Anita Rao", awc: "Ishita Sen", lastActive: "5h ago", status: "Active" },
  { n: 3, name: "Banita Acharya", email: "banitaacharyamishra@gmail.com", tier: "HEAL", type: "individual", goal: "Fat Loss", coach: "Priya Nair", awc: "Neha Pillai", lastActive: "1d ago", status: "Active" },
  { n: 4, name: "Bikash Sharma", email: "bikashbilas@gmail.com", tier: "HEAL", type: "individual", goal: "Diabetes Reversal", coach: "Priya Nair", awc: "Neha Pillai", lastActive: "3h ago", status: "Active" },
  { n: 5, name: "Hetu Mehra", email: "haha@gmail.com", tier: "HEAL", type: "individual", goal: "PCOD / PCOS", coach: "Vikram Sethi", awc: "Tara Iyer", lastActive: "1h ago", status: "Active" },
  { n: 6, name: "Dheer Barve", email: "dheer.balphawizz@gmail.com", tier: "SEEK", type: "app", goal: "Thyroid Care", coach: "Vikram Sethi", awc: "", lastActive: "2d ago", status: "Active" },
  { n: 7, name: "Rhea Kapoor", email: "rhea.k@gmail.com", tier: "PWC", type: "individual", goal: "PCOD / PCOS", coach: "Meera Joshi", awc: "Karan Mehta", lastActive: "6h ago", status: "Active" },
  { n: 8, name: "Arjun Verma", email: "arjun.v@gmail.com", tier: "HEAL", type: "team", goal: "Diabetes Reversal", coach: "Meera Joshi", awc: "Karan Mehta", lastActive: "4h ago", status: "Active" },
];

export function tierStyle(tier) {
  if (tier === "HEAL") return { bg: "#e7f6ee", color: "#2b8f5b" };
  if (tier === "PWC") return { bg: "#fdf3dd", color: "#c2891b" };
  return { bg: "#eef1f7", color: "#5a6b85" };
}

export function userInitials(name) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("");
}

export function avatarColor(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}
