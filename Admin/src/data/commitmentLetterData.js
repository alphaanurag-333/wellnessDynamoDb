export const COMMITMENT_LETTER_VERSION = 1;

export const COMMITMENT_LETTER_DEFAULT =
  "I commit to following my personalised wellness protocol, logging my daily reflection, and partnering with my wellness coach for the full duration of my program.";

export const COMMITMENT_COACH_SIGNOFFS = [
  { id: "cl-anita", name: "Anita Rao", initials: "AR", color: "#22c55e", status: "pending" },
  { id: "cl-priya", name: "Priya Nair", initials: "PN", color: "#8b5cf6", status: "pending" },
  { id: "cl-vikram", name: "Vikram Sethi", initials: "VS", color: "#14b8a6", status: "pending" },
  { id: "cl-meera", name: "Meera Joshi", initials: "MJ", color: "#f97316", status: "pending" },
  { id: "cl-nikhil", name: "Nikhil Rao", initials: "NR", color: "#a78bfa", status: "pending" },
  { id: "cl-sneha", name: "Sneha Kaur", initials: "SK", color: "#a16207", status: "pending" },
];

export function commitmentRemindMessage(coachName, version = COMMITMENT_LETTER_VERSION) {
  const first = coachName.split(" ")[0];
  return `Hi ${first}, commitment letter v${version} is waiting for your signature. Please sign it when you get a moment.`;
}

export function pendingCoachCount(coaches) {
  return coaches.filter((entry) => entry.status === "pending").length;
}
