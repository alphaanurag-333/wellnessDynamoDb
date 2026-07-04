const { computeMonthlyRankings } = require("./monthlyChampionScoreService");
const {
  findMonthlyChampionPostByUserAndMonth,
  createMonthlyChampionPost,
  updateMonthlyChampionPost,
  monthLabel,
} = require("../models/monthlyChampionPostModel");
const { dispatchMonthlyChampionNotification } = require("./notificationDispatchService");

function previousMonthYear(reference = new Date()) {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth(); // 0-based; subtracting 1 month from "this month" index
  const prevDate = new Date(Date.UTC(year, month - 1, 1));
  const y = prevDate.getUTCFullYear();
  const m = String(prevDate.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function buildChampionMessage({ rank, monthLbl, averageScore }) {
  const rankLabel = rank === 1 ? "🥇 Rank #1" : rank === 2 ? "🥈 Rank #2" : "🥉 Rank #3";
  return `${rankLabel} Champion of ${monthLbl}! Average daily reflection score: ${averageScore}%.`;
}

async function upsertChampionPost({ userId, monthYear, rank, averageScore, daysSubmitted }) {
  const existing = await findMonthlyChampionPostByUserAndMonth(userId, monthYear);
  const monthLbl = monthLabel(monthYear);
  const message = buildChampionMessage({ rank, monthLbl, averageScore });

  if (existing) {
    const needsUpdate =
      existing.rank !== rank ||
      existing.averageScore !== averageScore ||
      existing.daysSubmitted !== daysSubmitted;

    const post = needsUpdate
      ? await updateMonthlyChampionPost(existing.id, { rank, averageScore, daysSubmitted })
      : existing;

    return { post, isNew: false, monthLbl };
  }

  const post = await createMonthlyChampionPost({
    userId,
    monthYear,
    rank,
    averageScore,
    daysSubmitted,
    message,
    status: "active",
  });

  return { post, isNew: true, monthLbl };
}

async function notifyChampion(post, { rank, monthLbl, averageScore }) {
  try {
    await dispatchMonthlyChampionNotification({
      userId: post.userId,
      rank,
      monthLabel: monthLbl,
      averageScore,
      postId: post.id,
    });
    await updateMonthlyChampionPost(post.id, { notifiedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Monthly champion notification failed:", post.userId, err?.message || err);
  }
}

/**
 * Computes and persists Monthly Champion posts for a given month (default: previous
 * calendar month, since the job is meant to run on the 1st of the following month).
 * Idempotent: re-running for the same month updates existing posts instead of duplicating,
 * and only sends the "you won" notification the first time a post is created.
 */
async function runMonthlyChampionJob(options = {}) {
  const monthYear = options.monthYear || previousMonthYear();
  const rankings = await computeMonthlyRankings(monthYear, { topN: 3 });

  const results = [];
  for (const row of rankings) {
    try {
      const { post, isNew, monthLbl } = await upsertChampionPost({
        userId: row.userId,
        monthYear,
        rank: row.rank,
        averageScore: row.averageScore,
        daysSubmitted: row.daysSubmitted,
      });

      if (isNew) {
        await notifyChampion(post, { rank: row.rank, monthLbl, averageScore: row.averageScore });
      }

      results.push({ userId: row.userId, rank: row.rank, averageScore: row.averageScore, isNew, postId: post.id });
    } catch (err) {
      console.error("Monthly champion job user failed:", row.userId, err?.message || err);
      results.push({ userId: row.userId, error: err?.message || "processing_failed" });
    }
  }

  const created = results.filter((r) => r.isNew).length;
  const updated = results.filter((r) => r.isNew === false).length;
  const failed = results.filter((r) => r.error).length;

  return {
    monthYear,
    matchedUsers: rankings.length,
    created,
    updated,
    failed,
    results,
  };
}

module.exports = {
  previousMonthYear,
  runMonthlyChampionJob,
};
