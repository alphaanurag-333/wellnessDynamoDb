import { COMMITMENT_LETTER_CONTENT } from "./configDetailData.js";

export const COMMITMENT_LETTER_VERSION = 1;

export const COMMITMENT_LETTER_LEGACY_DEFAULT =
  "I commit to following my personalised wellness protocol, logging my daily reflection, and partnering with my wellness coach for the full duration of my program.";

export const COMMITMENT_LETTER_DEFAULT = [
  COMMITMENT_LETTER_CONTENT.intro,
  ...COMMITMENT_LETTER_CONTENT.bullets.map((item) => `• ${item}`),
].join("\n\n");

export const COMMITMENT_COACH_SIGNOFFS = [
  { id: "cl-anita", name: "Anita Rao", initials: "AR", color: "#22c55e", status: "pending" },
  { id: "cl-priya", name: "Priya Nair", initials: "PN", color: "#8b5cf6", status: "pending" },
  { id: "cl-vikram", name: "Vikram Sethi", initials: "VS", color: "#14b8a6", status: "pending" },
  { id: "cl-meera", name: "Meera Joshi", initials: "MJ", color: "#f97316", status: "pending" },
  { id: "cl-nikhil", name: "Nikhil Rao", initials: "NR", color: "#a78bfa", status: "pending" },
  { id: "cl-sneha", name: "Sneha Kaur", initials: "SK", color: "#a16207", status: "pending" },
];

export function normalizeCommitmentLetterText(value) {
  const text = String(value || "").trim();
  if (!text || text === COMMITMENT_LETTER_LEGACY_DEFAULT) return COMMITMENT_LETTER_DEFAULT;
  return text;
}

export function parseCommitmentLetterBlocks(value, clientName = "{name}") {
  const source = normalizeCommitmentLetterText(value).replaceAll("{name}", clientName || "{name}");
  const chunks = source.split(/\n\s*\n/).map((chunk) => chunk.trim()).filter(Boolean);

  return chunks.map((chunk) => {
    const lines = chunk
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const bulletLines = lines.filter((line) => /^[•\-–*]/.test(line));
    if (lines.length && bulletLines.length === lines.length) {
      return {
        type: "list",
        items: lines.map((line) => line.replace(/^[•\-–*]+\s*/, "")),
      };
    }
    return { type: "para", text: chunk };
  });
}

export function commitmentRemindMessage(coachName, version = COMMITMENT_LETTER_VERSION) {
  const first = coachName.split(" ")[0];
  return `Hi ${first}, commitment letter v${version} is waiting for your signature. Please sign it when you get a moment.`;
}

export function pendingCoachCount(coaches) {
  return coaches.filter((entry) => entry.status === "pending").length;
}
