export const LAUNCH_FOCUS_AREA_PAGE_SIZE = 8;
export const LAUNCH_QUESTION_PAGE_SIZE = 10;
export const LAUNCH_LIST_SEARCH_MAX_LEN = 50;
export const LAUNCH_HISTORY_DEFAULT_DAYS = 7;

export const LAUNCH_HISTORY_PERIOD_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: 0, label: "All time" },
];

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

function parseDateOnlyUtc(value) {
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function addDaysToDateOnly(value, days) {
  const d = parseDateOnlyUtc(value);
  if (!d) return value;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatAssessmentDateRange(start, end) {
  const startLabel = formatAssessmentDate(start);
  const endLabel = formatAssessmentDate(end);
  if (!start || !end || startLabel === "—" || endLabel === "—") return "—";
  if (start === end) return startLabel;
  return `${startLabel} – ${endLabel}`;
}

export function getLaunchHistoryWindow(rangeEnd, windowDays = LAUNCH_HISTORY_DEFAULT_DAYS) {
  const end = String(rangeEnd || todayDateInputValue()).slice(0, 10);
  const days = Math.max(1, Number(windowDays) || LAUNCH_HISTORY_DEFAULT_DAYS);
  const start = addDaysToDateOnly(end, -(days - 1));
  return { rangeStart: start, rangeEnd: end };
}

export function getLaunchHistoryPeriodWindow(
  periodDays,
  { anchorEnd = todayDateInputValue(), earliestDate = anchorEnd } = {}
) {
  const end = String(anchorEnd || todayDateInputValue()).slice(0, 10);
  const days = Number(periodDays);
  if (!Number.isFinite(days) || days <= 0) {
    return { rangeStart: String(earliestDate || end).slice(0, 10), rangeEnd: end };
  }
  return getLaunchHistoryWindow(end, days);
}

export function filterHistoryByDateRange(history, rangeStart, rangeEnd) {
  const start = String(rangeStart || "");
  const end = String(rangeEnd || "");
  return (history || [])
    .filter((row) => {
      const d = String(row.assessmentDate || "").slice(0, 10);
      return d && d >= start && d <= end;
    })
    .sort((a, b) => String(a.assessmentDate).localeCompare(String(b.assessmentDate)));
}

export function getLatestAssessmentDate(history) {
  const dates = (history || [])
    .map((row) => String(row.assessmentDate || "").slice(0, 10))
    .filter(Boolean)
    .sort();
  return dates.length ? dates[dates.length - 1] : todayDateInputValue();
}

export function getEarliestAssessmentDate(history) {
  const dates = (history || [])
    .map((row) => String(row.assessmentDate || "").slice(0, 10))
    .filter(Boolean)
    .sort();
  return dates.length ? dates[0] : todayDateInputValue();
}
