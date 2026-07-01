export const LAUNCH_SCORE_ZONES = [
  { min: 0, max: 150, label: "Needs attention", color: "#ef4444", emoji: "😢" },
  { min: 151, max: 300, label: "Below average", color: "#f97316", emoji: "😕" },
  { min: 301, max: 450, label: "Average", color: "#eab308", emoji: "🙂" },
  { min: 451, max: 600, label: "Good", color: "#84cc16", emoji: "🤩" },
  { min: 601, max: 750, label: "Excellent", color: "#16a34a", emoji: "🎉" },
];

export const LAUNCH_MAX_REFERENCE_SCORE = 750;
export const LAUNCH_MIN_REFERENCE_SCORE = 0;

export function sanitizeLaunchScoreInput(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "").slice(0, 3);
  if (digits === "") return "";
  const n = Number(digits);
  if (n > LAUNCH_MAX_REFERENCE_SCORE) return String(LAUNCH_MAX_REFERENCE_SCORE);
  return digits;
}

export function validateLaunchScore(value) {
  if (value === "" || value === null || value === undefined) {
    return "Final lifestyle score is required.";
  }
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) {
    return "Score must be a whole number.";
  }
  const score = Number(text);
  if (score < LAUNCH_MIN_REFERENCE_SCORE || score > LAUNCH_MAX_REFERENCE_SCORE) {
    return `Score must be between ${LAUNCH_MIN_REFERENCE_SCORE} and ${LAUNCH_MAX_REFERENCE_SCORE}.`;
  }
  return "";
}

export function clampLaunchScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(LAUNCH_MAX_REFERENCE_SCORE, Math.max(LAUNCH_MIN_REFERENCE_SCORE, Math.round(n)));
}

export function getLaunchScoreZone(score) {
  const n = Number(score) || 0;
  return LAUNCH_SCORE_ZONES.find((zone) => n >= zone.min && n <= zone.max) || LAUNCH_SCORE_ZONES[0];
}

export function formatAssessmentDate(value) {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" });
}

export function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}
