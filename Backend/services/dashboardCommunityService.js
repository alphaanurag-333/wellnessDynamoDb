const { getUserById, TABLE: USER_TABLE } = require("../models/userModel");
const { getWellnessCoachById } = require("../models/wellnessCoachModel");
const { monthLabel } = require("../models/monthlyChampionPostModel");
const { computeUserAveragesForMonth } = require("./monthlyChampionScoreService");
const { listScopedUsers } = require("./pendingTasksService");
const { listByPartitionKey } = require("../utils/dynamoList");
const { todayInTimezone } = require("../utils/birthdayTimezone");
const { parseDateOnly } = require("../utils/dateOnly");
const { computeDobMonthDay, pad2, isLeapYear } = require("../utils/dobMonthDay");

const IST_TZ = "Asia/Kolkata";
const BIRTHDAY_LIMIT = 10;
const CLIENT_CARD_LIMIT = 2;
const COACH_CARD_LIMIT = 1;
const LEADERBOARD_LIMIT = 10;
const LEADERBOARD_MONTHS = 6;
const COACH_RANK_SAMPLE = 40;
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isAdminLike(actor) {
  return actor?.role === "admin" || actor?.role === "support";
}

function currentMonthYear(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TZ,
    year: "numeric",
    month: "2-digit",
  }).format(now);
}

function formatMonthShort(monthYear) {
  const [year, month] = String(monthYear || "").split("-").map(Number);
  if (!year || !month) return String(monthYear || "");
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Last N calendar months in IST (current month first). */
function recentLeaderboardMonths(count = LEADERBOARD_MONTHS, now = new Date()) {
  const [currentYear, currentMonth] = currentMonthYear(now).split("-").map(Number);
  const months = [];
  let year = currentYear;
  let month = currentMonth;
  for (let i = 0; i < count; i += 1) {
    const monthYear = `${year}-${String(month).padStart(2, "0")}`;
    months.push({
      value: monthYear,
      label: formatMonthShort(monthYear) || monthLabel(monthYear),
    });
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }
  return months;
}

function formatBirthdayWhen(offset, dateOnly) {
  if (offset === 0) return "Today";
  const dt = parseDateOnly(dateOnly);
  if (!dt) return "";
  return `${dt.getUTCDate()} ${MONTHS_SHORT[dt.getUTCMonth()]}`;
}

function formatScoreDisplay(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0%";
  const shown = Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
  return `${shown}%`;
}

function formatScoreNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Number.isInteger(n) ? n : Math.round(n * 10) / 10;
}

function formatClientScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

function inferredTotalScore(row) {
  const stored = Number(row?.totalScore);
  if (Number.isFinite(stored) && stored > 0) return formatScoreNumber(stored);
  const avg = Number(row?.averageScore) || 0;
  if (avg > 100) return formatScoreNumber(avg);
  const days = Number(row?.daysSubmitted) || 0;
  if (days > 0 && avg > 0) return formatScoreNumber(avg * days);
  return formatScoreNumber(avg);
}

function userIdOf(row) {
  return String(row?.id || row?._id || row?.userId || "").trim();
}

function displayName(row) {
  return String(row?.name || "").trim() || "Client";
}

function medalForRank(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}

function emptyCommunity() {
  return {
    birthdays: [],
    champions: {
      monthYear: null,
      monthLabel: "",
      clients: [],
      coaches: [],
    },
    leaderboard: {
      monthYear: null,
      monthLabel: "",
      months: [],
      rows: [],
    },
  };
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function occurrenceOnYear(year, month, day) {
  let nextDay = day;
  const dim = daysInMonth(year, month);
  if (month === 2 && day === 29 && !isLeapYear(year)) nextDay = 28;
  if (nextDay > dim) return null;
  return `${year}-${pad2(month)}-${pad2(nextDay)}`;
}

function nextBirthdayFromDob(dobIso, todayDateOnly) {
  const monthDay = computeDobMonthDay(dobIso);
  if (!monthDay) return null;
  const [month, day] = monthDay.split("-").map(Number);
  const today = parseDateOnly(todayDateOnly);
  if (!month || !day || !today) return null;

  const year = today.getUTCFullYear();
  let dateOnly = occurrenceOnYear(year, month, day);
  if (!dateOnly || dateOnly < todayDateOnly) {
    dateOnly = occurrenceOnYear(year + 1, month, day);
  }
  if (!dateOnly) return null;

  const next = parseDateOnly(dateOnly);
  const offset = Math.round((next.getTime() - today.getTime()) / 86400000);
  return { dateOnly, offset };
}

function pickUpcomingBirthdays(users, limit = BIRTHDAY_LIMIT, todayDateOnly = todayInTimezone().dateOnly) {
  const byId = new Map();
  for (const user of users || []) {
    const id = userIdOf(user);
    if (!id || byId.has(id)) continue;
    const next = nextBirthdayFromDob(user.dob, todayDateOnly);
    if (!next) continue;
    byId.set(id, {
      id,
      name: displayName(user),
      when: formatBirthdayWhen(next.offset, next.dateOnly),
      dateOnly: next.dateOnly,
      offset: next.offset,
      isCoach: false,
      mark: next.offset === 0 ? "🎉" : "🎂",
    });
  }

  return [...byId.values()]
    .sort((a, b) => {
      if (a.offset !== b.offset) return a.offset - b.offset;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

async function loadBirthdayUsers(actor) {
  if (isAdminLike(actor)) {
    const { items } = await listByPartitionKey({
      tableName: USER_TABLE,
      indexName: "StatusCreatedAtIndex",
      partitionKeyValue: "active",
      scanIndexForward: false,
      page: 1,
      limit: Number.MAX_SAFE_INTEGER,
      maxLimit: Number.MAX_SAFE_INTEGER,
    });
    return items || [];
  }
  return listScopedUsers(actor);
}

async function resolveAllowedUserIds(actor) {
  if (isAdminLike(actor)) return null;
  const users = await listScopedUsers(actor);
  return new Set((users || []).map(userIdOf).filter(Boolean));
}

async function loadAllowedUserIds(actor, users) {
  if (isAdminLike(actor)) return null;
  return new Set((users || []).map(userIdOf).filter(Boolean));
}

async function enrichUsers(userIds) {
  const unique = [...new Set((userIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  const byId = new Map();
  await Promise.all(
    unique.map(async (id) => {
      try {
        const user = await getUserById(id);
        if (user) byId.set(id, user);
      } catch {
        /* ignore missing users */
      }
    }),
  );
  return byId;
}

async function loadCoachNames(coachIds) {
  const unique = [...new Set((coachIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  const byId = new Map();
  await Promise.all(
    unique.map(async (id) => {
      try {
        const coach = await getWellnessCoachById(id);
        const name = String(coach?.name || "").trim();
        if (name) byId.set(id, name);
      } catch {
        /* ignore */
      }
    }),
  );
  return byId;
}

function toClientCard(row, user) {
  const totalScore = inferredTotalScore(row);
  return {
    id: row.userId,
    name: displayName(user),
    score: formatClientScore(totalScore),
    totalScore: formatClientScore(totalScore),
    averageScore: formatScoreNumber(row.averageScore),
    daysSubmitted: Number(row.daysSubmitted) || 0,
  };
}

function toLeaderboardRow(row, user, rank) {
  const totalScore = formatClientScore(inferredTotalScore(row));
  return {
    rank,
    userId: row.userId,
    name: displayName(user),
    score: totalScore,
    totalScore,
    averageScore: formatScoreNumber(row.averageScore),
    days: Number(row.daysSubmitted) || 0,
    medal: medalForRank(rank),
    highlight: rank === 2,
  };
}

function buildTopClientCoach(topClientRows, usersById, coachNames) {
  if (!topClientRows?.length) return [];

  const topUser = usersById.get(topClientRows[0].userId);
  const coachId = String(topUser?.parentCoachId || "").trim();
  if (!coachId) return [];

  const coachedTopRows = topClientRows.filter(
    (row) => String(usersById.get(row.userId)?.parentCoachId || "").trim() === coachId,
  );
  const scores = coachedTopRows.map((row) => Number(row.averageScore) || 0);
  const averageScore = scores.length ? scores.reduce((sum, n) => sum + n, 0) / scores.length : 0;

  return [{
    id: coachId,
    name: coachNames.get(coachId) || "Wellness coach",
    score: formatScoreDisplay(averageScore),
    averageScore: formatScoreNumber(averageScore),
  }];
}

async function loadChampionRankings(allowedIds, monthYear = currentMonthYear()) {
  const targetMonth = String(monthYear || currentMonthYear()).trim();

  try {
    const averaged = await computeUserAveragesForMonth(targetMonth);
    const rows = (averaged || [])
      .filter((row) => row?.userId && (!allowedIds || allowedIds.has(String(row.userId).trim())))
      .map((row) => ({
        userId: String(row.userId).trim(),
        totalScore: inferredTotalScore(row),
        averageScore: Number(row.averageScore) || 0,
        daysSubmitted: Number(row.daysSubmitted) || 0,
      }));
    return { monthYear: targetMonth, rows, source: "live" };
  } catch (err) {
    console.warn("[dashboardCommunity] live rankings failed:", err?.message || err);
  }

  return { monthYear: targetMonth, rows: [], source: "none" };
}

async function buildLeaderboardRows(allowedIds, monthYear) {
  const { monthYear: resolvedMonth, rows } = await loadChampionRankings(allowedIds, monthYear);
  const monthLbl = resolvedMonth ? formatMonthShort(resolvedMonth) || monthLabel(resolvedMonth) : "";
  const sample = rows.slice(0, Math.max(LEADERBOARD_LIMIT, COACH_RANK_SAMPLE));
  const usersById = await enrichUsers(sample.map((row) => row.userId));
  const ranked = sample.filter((row) => usersById.has(row.userId));
  const leaderboardRows = ranked.slice(0, LEADERBOARD_LIMIT).map((row, index) => (
    toLeaderboardRow(row, usersById.get(row.userId), index + 1)
  ));

  return {
    monthYear: resolvedMonth,
    monthLabel: monthLbl,
    rows: leaderboardRows,
  };
}

async function loadChampionsAndLeaderboard(allowedIds, monthYear = currentMonthYear()) {
  const { monthYear: resolvedMonth, rows } = await loadChampionRankings(allowedIds, monthYear);
  const monthLbl = resolvedMonth ? formatMonthShort(resolvedMonth) || monthLabel(resolvedMonth) : "";
  const sample = rows.slice(0, Math.max(LEADERBOARD_LIMIT, COACH_RANK_SAMPLE));
  const usersById = await enrichUsers(sample.map((row) => row.userId));
  const ranked = sample.filter((row) => usersById.has(row.userId));
  const topClients = ranked.slice(0, CLIENT_CARD_LIMIT);
  const coachNames = await loadCoachNames(
    topClients.map((row) => usersById.get(row.userId)?.parentCoachId).filter(Boolean),
  );
  const leaderboardRows = ranked.slice(0, LEADERBOARD_LIMIT).map((row, index) => (
    toLeaderboardRow(row, usersById.get(row.userId), index + 1)
  ));

  return {
    champions: {
      monthYear: resolvedMonth,
      monthLabel: monthLbl,
      clients: topClients.map((row) => toClientCard(row, usersById.get(row.userId))),
      coaches: buildTopClientCoach(topClients, usersById, coachNames).slice(0, COACH_CARD_LIMIT),
    },
    leaderboard: {
      monthYear: resolvedMonth,
      monthLabel: monthLbl,
      months: recentLeaderboardMonths(LEADERBOARD_MONTHS),
      rows: leaderboardRows,
    },
  };
}

async function getDashboardLeaderboard(actor, monthYear) {
  const allowedIds = await resolveAllowedUserIds(actor);
  const targetMonth = String(monthYear || currentMonthYear()).trim();
  const leaderboard = await buildLeaderboardRows(allowedIds, targetMonth);
  return {
    ...leaderboard,
    months: recentLeaderboardMonths(LEADERBOARD_MONTHS),
  };
}

async function getDashboardCommunity(actor) {
  try {
    const users = await loadBirthdayUsers(actor);
    const allowedIds = await loadAllowedUserIds(actor, users);
    const champData = await loadChampionsAndLeaderboard(allowedIds);
    return {
      birthdays: pickUpcomingBirthdays(users, BIRTHDAY_LIMIT),
      champions: champData.champions,
      leaderboard: champData.leaderboard,
    };
  } catch (err) {
    console.warn("[dashboardCommunity] failed:", err?.message || err);
    return emptyCommunity();
  }
}

module.exports = {
  getDashboardCommunity,
  getDashboardLeaderboard,
  formatBirthdayWhen,
  formatScoreDisplay,
  nextBirthdayFromDob,
  pickUpcomingBirthdays,
  recentLeaderboardMonths,
  emptyCommunity,
};
