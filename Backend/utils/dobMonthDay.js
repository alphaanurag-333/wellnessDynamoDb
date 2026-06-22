function pad2(n) {
  return String(n).padStart(2, "0");
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Extract MM-DD from stored dob (prefers YYYY-MM-DD calendar part to avoid timezone drift). */
function computeDobMonthDay(dobIso) {
  if (dobIso === undefined || dobIso === null || dobIso === "") return null;
  const raw = String(dobIso).trim();
  const datePrefix = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (datePrefix) {
    return `${datePrefix[2]}-${datePrefix[3]}`;
  }
  const d = dobIso instanceof Date ? dobIso : new Date(dobIso);
  if (Number.isNaN(d.getTime())) return null;
  return `${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** True when user's dob calendar month-day matches the job date (incl. Feb 29 rule). */
function userBirthdayMatchesDate(dobIso, dateOnly) {
  const userMonthDay = computeDobMonthDay(dobIso);
  if (!userMonthDay) return false;
  const targetMonthDays = birthdayQueryMonthDays(dateOnly);
  return targetMonthDays.includes(userMonthDay);
}

/**
 * Month-day keys to query for users with birthdays on `dateOnly` (YYYY-MM-DD).
 * On Feb 28 in a non-leap year, also includes Feb 29 birthdays.
 */
function birthdayQueryMonthDays(dateOnly) {
  const raw = String(dateOnly || "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return [];

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const monthDays = [`${pad2(month)}-${pad2(day)}`];

  if (month === 2 && day === 28 && !isLeapYear(year)) {
    monthDays.push("02-29");
  }

  return [...new Set(monthDays)];
}

module.exports = {
  pad2,
  isLeapYear,
  computeDobMonthDay,
  birthdayQueryMonthDays,
  userBirthdayMatchesDate,
};
