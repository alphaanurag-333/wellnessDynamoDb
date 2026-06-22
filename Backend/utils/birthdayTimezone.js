const { pad2, birthdayQueryMonthDays } = require("./dobMonthDay");
const { isValidDateOnly, parseDateOnly } = require("./dateOnly");

const DEFAULT_TIMEZONE = process.env.BIRTHDAY_JOB_TIMEZONE || "Asia/Kolkata";

/**
 * Today's calendar date in the configured timezone.
 * @returns {{ dateOnly: string, monthDay: string, year: number }}
 */
function todayInTimezone(timezone = DEFAULT_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);

  return {
    dateOnly: `${map.year}-${map.month}-${map.day}`,
    monthDay: `${pad2(month)}-${pad2(day)}`,
    year,
    timezone,
  };
}

/**
 * Resolve the job run date. Defaults to today (app timezone) when omitted.
 * @param {string} [dateOnly] YYYY-MM-DD
 */
function resolveJobDate(dateOnly) {
  const raw = String(dateOnly ?? "").trim();
  if (!raw) {
    const today = todayInTimezone();
    return {
      ...today,
      monthDays: birthdayQueryMonthDays(today.dateOnly),
    };
  }
  if (!isValidDateOnly(raw)) {
    const err = new Error("dateOnly must be YYYY-MM-DD");
    err.name = "ValidationError";
    throw err;
  }
  const dt = parseDateOnly(raw);
  return {
    dateOnly: raw,
    monthDay: `${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`,
    year: dt.getUTCFullYear(),
    timezone: DEFAULT_TIMEZONE,
    monthDays: birthdayQueryMonthDays(raw),
  };
}

module.exports = {
  DEFAULT_TIMEZONE,
  todayInTimezone,
  resolveJobDate,
};
