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

function isGutResetLog(log) {
  if (!log || typeof log !== "object") return false;
  if (log.gutReset === true || log.excludedFromChampionship === true) return true;
  const kind = String(log.dayType || log.mode || log.protocol || "").toLowerCase();
  return kind.includes("gut_reset") || kind.includes("gut-reset") || kind === "gutreset";
}

function compareChampionRows(a, b) {
  const totalDelta = (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0);
  if (totalDelta) return totalDelta;
  const avgDelta = (Number(b.averageScore) || 0) - (Number(a.averageScore) || 0);
  if (avgDelta) return avgDelta;
  return (Number(b.daysSubmitted) || 0) - (Number(a.daysSubmitted) || 0);
}

/**
 * Groups submitted DRF day logs by user for the month.
 * totalScore = sum of daily DRF scores (0–100 each). Load Preset days are skipped.
 * Sorted by totalScore desc (no ranks assigned yet).
 */
async function computeUserAveragesForMonth(monthYear) {
  const logs = await scanDailyReflectionLogsForMonth(monthYear);

  const byUser = new Map();
  for (const log of logs) {
    if (isGutResetLog(log)) continue;
    const userId = String(log.userId || "").trim();
    if (!userId) continue;
    const score = Number(log.score) || 0;
    if (!byUser.has(userId)) byUser.set(userId, { userId, scores: [] });
    byUser.get(userId).scores.push(score);
  }

  const rows = [...byUser.values()].map(({ userId, scores }) => {
    const daysSubmitted = scores.length;
    const totalScore = roundScore(scores.reduce((sum, s) => sum + s, 0));
    const averageScore = daysSubmitted > 0 ? roundScore(totalScore / daysSubmitted) : 0;
    return { userId, totalScore, averageScore, daysSubmitted };
  });

  rows.sort(compareChampionRows);
  return rows;
}

/**
 * Keeps only users with the highest monthly DRF total.
 * All tied top scorers are included and marked rank 1.
 */
function assignCompetitionRanks(sortedRows) {
  if (!sortedRows.length) return [];

  const topScore = Number(sortedRows[0].totalScore) || 0;
  return sortedRows
    .filter((row) => (Number(row.totalScore) || 0) === topScore)
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
  const totalScore = me ? me.totalScore : null;
  const averageScore = me ? me.averageScore : null;
  const daysSubmitted = me ? me.daysSubmitted : 0;
  const positionsAway = me
    ? rows.filter((row) => (Number(row.totalScore) || 0) > (Number(me.totalScore) || 0)).length
    : null;

  return {
    totalScore,
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
