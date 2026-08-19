const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");

const DAILY_REFLECTION_TABLE = "DailyReflection";

/**
 * Full-table scan of DailyReflection, filtered to day-logs of a given month that
 * were actually submitted. There is no GSI on this table (PK is userId only),
 * so a Scan is the only way to aggregate across all users for a month.
 */
async function scanDailyReflectionLogsForMonth(monthYear) {
  const prefix = `day#${monthYear}`;
  const items = [];
  let lastKey;

  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: DAILY_REFLECTION_TABLE,
        FilterExpression: "begins_with(recordKey, :prefix) AND attribute_exists(submittedAt)",
        ExpressionAttributeValues: { ":prefix": prefix },
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of Items || []) {
      if (item.submittedAt) items.push(item);
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return items;
}

function roundScore(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

/**
 * Groups day logs by userId and computes the average score per user for the month.
 * Returns rows sorted by averageScore desc (no ranks assigned yet).
 */
async function computeUserAveragesForMonth(monthYear) {
  const logs = await scanDailyReflectionLogsForMonth(monthYear);

  const byUser = new Map();
  for (const log of logs) {
    const userId = String(log.userId || "").trim();
    if (!userId) continue;
    const score = Number(log.score) || 0;
    if (!byUser.has(userId)) byUser.set(userId, { userId, scores: [] });
    byUser.get(userId).scores.push(score);
  }

  const rows = [...byUser.values()].map(({ userId, scores }) => {
    const daysSubmitted = scores.length;
    const total = scores.reduce((sum, s) => sum + s, 0);
    const averageScore = daysSubmitted > 0 ? roundScore(total / daysSubmitted) : 0;
    return { userId, averageScore, daysSubmitted };
  });

  rows.sort((a, b) => b.averageScore - a.averageScore);
  return rows;
}

/**
 * Keeps only users with the highest average score for the month.
 * All tied top scorers are included and marked rank 1 (no 2nd/3rd place).
 * Example: scores [90, 90, 80] -> only the two users with 90.
 */
function assignCompetitionRanks(sortedRows) {
  if (!sortedRows.length) return [];

  const topScore = sortedRows[0].averageScore;
  return sortedRows
    .filter((row) => row.averageScore === topScore)
    .map((row) => ({ ...row, rank: 1 }));
}

/**
 * Full pipeline: scan -> average -> keep only top scorers (ties included).
 */
async function computeMonthlyRankings(monthYear) {
  const averaged = await computeUserAveragesForMonth(monthYear);
  return assignCompetitionRanks(averaged);
}

const STANDING_CACHE_TTL_MS = 5 * 60 * 1000;
let standingCache = { monthYear: "", at: 0, rows: [] };

async function getCachedUserAveragesForMonth(monthYear) {
  const key = String(monthYear || "").trim();
  if (
    standingCache.monthYear === key &&
    Date.now() - standingCache.at < STANDING_CACHE_TTL_MS
  ) {
    return standingCache.rows;
  }

  const rows = await computeUserAveragesForMonth(key);
  standingCache = { monthYear: key, at: Date.now(), rows };
  return rows;
}

function buildStandingForUser(rows, userId) {
  const id = String(userId || "").trim();
  const me = rows.find((row) => row.userId === id) || null;
  const averageScore = me ? me.averageScore : null;
  const daysSubmitted = me ? me.daysSubmitted : 0;
  const positionsAway = me
    ? rows.filter((row) => row.averageScore > me.averageScore).length
    : null;

  return {
    averageScore,
    daysSubmitted,
    rank: me ? positionsAway + 1 : null,
    positionsAway,
    totalParticipants: rows.length,
    isLeading: Boolean(me && positionsAway === 0),
  };
}

async function getCurrentMonthStandingForUser(userId, monthYear) {
  const rows = await getCachedUserAveragesForMonth(monthYear);
  return {
    monthYear,
    ...buildStandingForUser(rows, userId),
  };
}

module.exports = {
  scanDailyReflectionLogsForMonth,
  computeUserAveragesForMonth,
  assignCompetitionRanks,
  computeMonthlyRankings,
  roundScore,
  getCurrentMonthStandingForUser,
};
