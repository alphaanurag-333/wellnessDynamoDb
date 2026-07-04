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
 * Assigns "competition ranking" (ties share a rank, next rank skips accordingly,
 * e.g. scores [90, 90, 80] -> ranks [1, 1, 3]) and keeps only rows with rank <= 3.
 * If multiple users tie for rank 3, all of them are included (per business rule:
 * "if someone's score is same then include multiple users in similar rank").
 */
function assignCompetitionRanks(sortedRows, { topN = 3 } = {}) {
  const result = [];
  let currentRank = 0;
  let previousScore = null;

  sortedRows.forEach((row, index) => {
    if (previousScore === null || row.averageScore !== previousScore) {
      currentRank = index + 1;
      previousScore = row.averageScore;
    }
    result.push({ ...row, rank: currentRank });
  });

  return result.filter((row) => row.rank <= topN);
}

/**
 * Full pipeline: scan -> average -> rank -> keep top N (with ties).
 */
async function computeMonthlyRankings(monthYear, { topN = 3 } = {}) {
  const averaged = await computeUserAveragesForMonth(monthYear);
  return assignCompetitionRanks(averaged, { topN });
}

module.exports = {
  scanDailyReflectionLogsForMonth,
  computeUserAveragesForMonth,
  assignCompetitionRanks,
  computeMonthlyRankings,
  roundScore,
};
