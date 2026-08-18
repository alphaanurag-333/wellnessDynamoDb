const { getUserById, TABLE: USER_TABLE } = require("../models/userModel");
const { getWellnessCoachById } = require("../models/wellnessCoachModel");
const {
  listMonthlyChampionPostsByMonth,
  findLatestMonthWithChampions,
  monthLabel,
} = require("../models/monthlyChampionPostModel");
const { computeUserAveragesForMonth } = require("./monthlyChampionScoreService");
const { listScopedUsers } = require("./pendingTasksService");
const { listByPartitionKey } = require("../utils/dynamoList");
const { todayInTimezone } = require("../utils/birthdayTimezone");
const { parseDateOnly } = require("../utils/dateOnly");
const { computeDobMonthDay, pad2, isLeapYear } = require("../utils/dobMonthDay");

const IST_TZ = "Asia/Kolkata";
const BIRTHDAY_LIMIT = 10;
const CLIENT_CARD_LIMIT = 3;
const COACH_CARD_LIMIT = 2;
const LEADERBOARD_LIMIT = 10;
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
  return {
    id: row.userId,
    name: displayName(user),
    score: formatScoreDisplay(row.averageScore),
    averageScore: formatScoreNumber(row.averageScore),
    daysSubmitted: Number(row.daysSubmitted) || 0,
  };
}

function toLeaderboardRow(row, user, rank) {
  const score = formatScoreNumber(row.averageScore);
  return {
    rank,
    userId: row.userId,
    name: displayName(user),
    score,
    days: Number(row.daysSubmitted) || 0,
    medal: medalForRank(rank),
    highlight: rank === 2,
  };
}

function buildCoachCards(ranked, usersById, coachNames, limit = COACH_CARD_LIMIT) {
  const byCoach = new Map();
  for (const row of ranked || []) {
    const user = usersById.get(row.userId);
    const coachId = String(user?.parentCoachId || "").trim();
    if (!coachId) continue;
    const bucket = byCoach.get(coachId) || { coachId, scores: [] };
    bucket.scores.push(Number(row.averageScore) || 0);
    byCoach.set(coachId, bucket);
  }

  return [...byCoach.values()]
    .map((bucket) => {
      const total = bucket.scores.reduce((sum, n) => sum + n, 0);
      const averageScore = bucket.scores.length ? total / bucket.scores.length : 0;
      return {
        id: bucket.coachId,
        name: coachNames.get(bucket.coachId) || "Wellness coach",
        score: formatScoreDisplay(averageScore),
        averageScore: formatScoreNumber(averageScore),
      };
    })
    .filter((row) => row.name)
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, limit);
}

async function rankingsFromChampionPosts(monthYear, allowedIds) {
  if (!monthYear) return { monthYear: null, rows: [] };
  const { monthlyChampionPosts } = await listMonthlyChampionPostsByMonth({
    monthYear,
    status: "active",
    page: 1,
    limit: 50,
  });
  const rows = (monthlyChampionPosts || [])
    .filter((post) => !allowedIds || allowedIds.has(String(post.userId || "").trim()))
    .map((post) => ({
      userId: String(post.userId || "").trim(),
      averageScore: Number(post.averageScore) || 0,
      daysSubmitted: Number(post.daysSubmitted) || 0,
    }))
    .filter((row) => row.userId)
    .sort((a, b) => b.averageScore - a.averageScore);
  return { monthYear, rows };
}

async function loadChampionRankings(allowedIds) {
  const liveMonth = currentMonthYear();
  let monthYear = liveMonth;
  let rows = [];

  try {
    const averaged = await computeUserAveragesForMonth(liveMonth);
    rows = (averaged || [])
      .filter((row) => row?.userId && (!allowedIds || allowedIds.has(String(row.userId).trim())))
      .map((row) => ({
        userId: String(row.userId).trim(),
        averageScore: Number(row.averageScore) || 0,
        daysSubmitted: Number(row.daysSubmitted) || 0,
      }));
  } catch (err) {
    console.warn("[dashboardCommunity] live rankings failed:", err?.message || err);
  }

  if (!rows.length) {
    const latest = await findLatestMonthWithChampions();
    const fallback = await rankingsFromChampionPosts(latest, allowedIds);
    monthYear = fallback.monthYear || liveMonth;
    rows = fallback.rows;
  }

  return { monthYear, rows };
}

async function loadChampionsAndLeaderboard(allowedIds) {
  const { monthYear, rows } = await loadChampionRankings(allowedIds);
  const monthLbl = monthYear ? formatMonthShort(monthYear) || monthLabel(monthYear) : "";
  const sample = rows.slice(0, Math.max(LEADERBOARD_LIMIT, COACH_RANK_SAMPLE));
  const usersById = await enrichUsers(sample.map((row) => row.userId));
  const ranked = sample.filter((row) => usersById.has(row.userId));
  const coachNames = await loadCoachNames(
    ranked.map((row) => usersById.get(row.userId)?.parentCoachId).filter(Boolean),
  );

  const leaderboardRows = ranked.slice(0, LEADERBOARD_LIMIT).map((row, index) => (
    toLeaderboardRow(row, usersById.get(row.userId), index + 1)
  ));

  return {
    champions: {
      monthYear,
      monthLabel: monthLbl,
      clients: ranked.slice(0, CLIENT_CARD_LIMIT).map((row) => toClientCard(row, usersById.get(row.userId))),
      coaches: buildCoachCards(ranked, usersById, coachNames),
    },
    leaderboard: {
      monthYear,
      monthLabel: monthLbl,
      months: monthYear ? [{ value: monthYear, label: monthLbl }] : [],
      rows: leaderboardRows,
    },
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
  formatBirthdayWhen,
  formatScoreDisplay,
  nextBirthdayFromDob,
  pickUpcomingBirthdays,
  emptyCommunity,
};
