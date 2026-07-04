const {
  todayDateOnly,
  addDaysDateOnly,
  parseDateOnly,
  dayLabel,
} = require("../utils/dateOnly");
const { listDayLogsBetween, listDayLogsForMonth, monthDateRange } = require("../models/dailyReflectionModel");

const MAX_SCORE = 100;

const SCORE_THRESHOLDS = [
  { value: 0, label: null },
  { value: 50, label: "Average" },
  { value: 80, label: "Good" },
  { value: 100, label: "Excellent" },
];

const SCORE_BANDS = [
  {
    min: 0,
    max: 49,
    key: "needs_improvement",
    statusLabel: "Keep Going",
    primaryMessage: "Every step counts.",
    secondaryMessage: "Tomorrow is a fresh start.",
    color: "#f97316",
  },
  {
    min: 50,
    max: 79,
    key: "average",
    statusLabel: "On Track",
    primaryMessage: "You're building momentum.",
    secondaryMessage: "Stay consistent!",
    color: "#eab308",
  },
  {
    min: 80,
    max: 89,
    key: "good",
    statusLabel: "Great Going",
    primaryMessage: "You're making great progress today.",
    secondaryMessage: "Keep it up!",
    color: "#16a34a",
  },
  {
    min: 90,
    max: 100,
    key: "excellent",
    statusLabel: "Excellent",
    primaryMessage: "Outstanding work today!",
    secondaryMessage: "You're crushing it!",
    color: "#15803d",
  },
];

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ANALYTICS_RANGES = new Set(["last-6-months", "last-4-weeks", "month-to-date"]);

function roundScore(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function resolveScoreBand(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return SCORE_BANDS[0];
  const clamped = Math.min(MAX_SCORE, Math.max(0, Math.round(value)));
  return SCORE_BANDS.find((band) => clamped >= band.min && clamped <= band.max) || SCORE_BANDS[0];
}

function buildScorePresentation(score, { date, isToday = false, submittedToday = false } = {}) {
  const numericScore = roundScore(score);
  const band = resolveScoreBand(numericScore);

  return {
    date: date || null,
    score: numericScore,
    maxScore: MAX_SCORE,
    isToday: Boolean(isToday),
    submittedToday: Boolean(submittedToday),
    statusLabel: band.statusLabel,
    primaryMessage: band.primaryMessage,
    secondaryMessage: band.secondaryMessage,
    band: {
      key: band.key,
      label:
        band.key === "excellent"
          ? "Excellent"
          : band.key === "good"
            ? "Good"
            : band.key === "average"
              ? "Average"
              : "Below Average",
      color: band.color,
    },
    thresholds: SCORE_THRESHOLDS,
  };
}

function formatDateLabel(dateOnly) {
  const dt = parseDateOnly(dateOnly);
  if (!dt) return "";
  const day = dt.getUTCDate();
  const month = MONTH_LABELS[dt.getUTCMonth()] || "";
  return `${day} ${month}`.trim();
}

function monthLabel(monthYear) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(monthYear || "").trim());
  if (!match) return "";
  const month = Number(match[2]);
  return MONTH_LABELS[month - 1] || match[2];
}

function addMonthsDateOnly(monthYear, deltaMonths) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(monthYear || "").trim());
  if (!match) return null;
  let year = Number(match[1]);
  let month = Number(match[2]) - 1 + deltaMonths;
  while (month < 0) {
    month += 12;
    year -= 1;
  }
  while (month > 11) {
    month -= 12;
    year += 1;
  }
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function listRecentMonthKeys(count, endMonthYear) {
  const total = Math.max(1, Math.min(Number(count) || 6, 24));
  const end = endMonthYear || todayDateOnly().slice(0, 7);
  const months = [];
  for (let i = total - 1; i >= 0; i -= 1) {
    months.push(addMonthsDateOnly(end, -i));
  }
  return months.filter(Boolean);
}

function getMondayOfWeek(dateOnly) {
  const dt = parseDateOnly(dateOnly);
  if (!dt) return null;
  const weekday = dt.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  return addDaysDateOnly(dateOnly, diff);
}

function scoreMapFromLogs(logs) {
  return new Map(
    (logs || [])
      .filter((row) => row?.submittedAt)
      .map((row) => [row.date, roundScore(row.score)])
  );
}

function buildDayCell(date, scoreByDate, today) {
  const isFuture = date > today;
  const hasScore = scoreByDate.has(date);
  return {
    date,
    dayLabel: dayLabel(date),
    dateLabel: formatDateLabel(date),
    score: isFuture ? null : hasScore ? scoreByDate.get(date) : null,
    submitted: !isFuture && hasScore,
  };
}

function buildWeekRow(weekMonday, scoreByDate, today, { monthStart, monthEnd } = {}) {
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const date = addDaysDateOnly(weekMonday, i);
    if (!date) continue;
    if (monthStart && date < monthStart) continue;
    if (monthEnd && date > monthEnd) continue;
    if (date > today) {
      days.push(buildDayCell(date, scoreByDate, today));
      continue;
    }
    days.push(buildDayCell(date, scoreByDate, today));
  }

  const weekEnd = addDaysDateOnly(weekMonday, 6);
  return {
    weekStart: weekMonday,
    weekEnd,
    weekLabel: `${formatDateLabel(weekMonday)} – ${formatDateLabel(weekEnd)}`,
    days,
  };
}

function averageFromScores(scores) {
  const values = scores.filter((value) => value != null && Number.isFinite(value));
  if (!values.length) return null;
  return roundScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

async function buildMonthlyAnalytics(userId, monthCount = 6) {
  const today = todayDateOnly();
  const endMonth = today.slice(0, 7);
  const monthKeys = listRecentMonthKeys(monthCount, endMonth);

  const months = await Promise.all(
    monthKeys.map(async (month) => {
      const logs = await listDayLogsForMonth(userId, month);
      const scores = logs.map((row) => roundScore(row.score));
      const averageScore = averageFromScores(scores);

      return {
        month,
        label: monthLabel(month),
        averageScore,
        daysSubmitted: scores.length,
      };
    })
  );

  return {
    range: "last-6-months",
    months,
  };
}

async function buildLast4WeeksAnalytics(userId) {
  const today = todayDateOnly();
  const currentWeekMonday = getMondayOfWeek(today);
  const weekMondays = [];
  for (let i = 0; i < 4; i += 1) {
    weekMondays.push(addDaysDateOnly(currentWeekMonday, -7 * i));
  }

  const startDate = weekMondays[weekMondays.length - 1];
  const logs = await listDayLogsBetween(userId, startDate, today);
  const scoreByDate = scoreMapFromLogs(logs);

  const weeks = weekMondays
    .filter(Boolean)
    .map((weekMonday) => buildWeekRow(weekMonday, scoreByDate, today))
    .filter((week) => week.days.length > 0);

  return {
    range: "last-4-weeks",
    weeks,
  };
}

async function buildMonthToDateAnalytics(userId, monthYear) {
  const today = todayDateOnly();
  const month = monthYear || today.slice(0, 7);
  const range = monthDateRange(month);
  if (!range) {
    return { range: "month-to-date", month, weeks: [] };
  }

  const monthEnd = range.endDate > today ? today : range.endDate;
  const logs = await listDayLogsBetween(userId, range.startDate, monthEnd);
  const scoreByDate = scoreMapFromLogs(logs);

  let weekMonday = getMondayOfWeek(range.startDate);
  const weeks = [];

  while (weekMonday && weekMonday <= monthEnd) {
    const row = buildWeekRow(weekMonday, scoreByDate, today, {
      monthStart: range.startDate,
      monthEnd,
    });
    if (row.days.length > 0) {
      weeks.unshift(row);
    }
    weekMonday = addDaysDateOnly(weekMonday, 7);
  }

  weeks.reverse();

  return {
    range: "month-to-date",
    month,
    monthLabel: monthLabel(month),
    weeks,
  };
}

async function buildDailyReflectionAnalytics(userId, range, options = {}) {
  switch (range) {
    case "last-6-months":
      return buildMonthlyAnalytics(userId, options.monthCount || 6);
    case "last-4-weeks":
      return buildLast4WeeksAnalytics(userId);
    case "month-to-date":
      return buildMonthToDateAnalytics(userId, options.month);
    default:
      return null;
  }
}

function isValidAnalyticsRange(range) {
  return ANALYTICS_RANGES.has(String(range || "").trim());
}

module.exports = {
  MAX_SCORE,
  SCORE_THRESHOLDS,
  SCORE_BANDS,
  ANALYTICS_RANGES,
  roundScore,
  resolveScoreBand,
  buildScorePresentation,
  buildDailyReflectionAnalytics,
  isValidAnalyticsRange,
  formatDateLabel,
  monthLabel,
};
