export const AI_ENABLE_COACHES = [
  { id: "ai-wc-anita", name: "Anita Rao", initials: "AR", color: "#22c55e", role: "Wellness Coach", enabled: true },
  { id: "ai-wc-priya", name: "Priya Nair", initials: "PN", color: "#8b5cf6", role: "Wellness Coach", enabled: true },
  { id: "ai-wc-vikram", name: "Vikram Sethi", initials: "VS", color: "#14b8a6", role: "Wellness Coach", enabled: true },
  { id: "ai-wc-meera", name: "Meera Joshi", initials: "MJ", color: "#f97316", role: "Wellness Coach", enabled: true },
  { id: "ai-wc-nikhil", name: "Nikhil Rao", initials: "NR", color: "#a78bfa", role: "Wellness Coach", enabled: true },
  { id: "ai-wc-sneha", name: "Sneha Kaur", initials: "SK", color: "#a16207", role: "Wellness Coach", enabled: true },
];

export const AI_ENABLE_ASSISTANTS = [
  { id: "ai-awc-ishita", name: "Ishita Sen", initials: "IS", color: "#5e6ad2", reportsTo: "Anita Rao", enabled: true },
  { id: "ai-awc-rohan", name: "Rohan Das", initials: "RD", color: "#0d9488", reportsTo: "Anita Rao", enabled: true },
  { id: "ai-awc-neha", name: "Neha Pillai", initials: "NP", color: "#ec7a45", reportsTo: "Priya Nair", enabled: true },
  { id: "ai-awc-aman", name: "Aman Gupta", initials: "AG", color: "#6366f1", reportsTo: "Vikram Sethi", enabled: true },
  { id: "ai-awc-tara", name: "Tara Iyer", initials: "TI", color: "#c2661d", reportsTo: "Meera Joshi", enabled: true },
  { id: "ai-awc-zoya", name: "Zoya Khan", initials: "ZK", color: "#7c8aa5", reportsTo: "Nikhil Rao", enabled: true },
  { id: "ai-awc-karan", name: "Karan Mehta", initials: "KM", color: "#34a56a", reportsTo: "Sneha Kaur", enabled: true },
  { id: "ai-awc-divya", name: "Divya Nair", initials: "DN", color: "#a855f7", reportsTo: "Priya Nair", enabled: true },
];

export function aiEnabledCount(people) {
  return people.filter((entry) => entry.enabled).length;
}
