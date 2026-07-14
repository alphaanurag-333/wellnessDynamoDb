const { computeMonthlyRankings } = require("./monthlyChampionScoreService");
const {
  findMonthlyChampionPostByUserAndMonth,
  createMonthlyChampionPost,
  updateMonthlyChampionPost,
  listMonthlyChampionPostsByMonth,
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

function buildChampionMessage({ monthLbl, averageScore }) {
  return `Champion of ${monthLbl}! Average daily reflection score: ${averageScore}%.`;
}

async function upsertChampionPost({ userId, monthYear, rank, averageScore, daysSubmitted }) {
  const existing = await findMonthlyChampionPostByUserAndMonth(userId, monthYear);
  const monthLbl = monthLabel(monthYear);
  const message = buildChampionMessage({ monthLbl, averageScore });

  if (existing) {
    const needsUpdate =
      existing.rank !== rank ||
      existing.averageScore !== averageScore ||
      existing.daysSubmitted !== daysSubmitted ||
      existing.message !== message ||
      existing.status !== "active";

    const post = needsUpdate
      ? await updateMonthlyChampionPost(existing.id, {
          rank,
          averageScore,
          daysSubmitted,
          message,
          status: "active",
        })
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

async function notifyChampion(post, { monthLbl, averageScore }) {
  try {
    await dispatchMonthlyChampionNotification({
      userId: post.userId,
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
 * Deactivate active posts for the month that are no longer top scorers
 * (e.g. former rank 2/3 posts after switching to top-only champions).
 */
async function deactivateNonWinners(monthYear, winnerUserIds) {
  const { monthlyChampionPosts } = await listMonthlyChampionPostsByMonth({
    monthYear,
    page: 1,
    limit: 200,
    status: "active",
  });

  let deactivated = 0;
  for (const post of monthlyChampionPosts) {
    if (winnerUserIds.has(post.userId)) continue;
    try {
      await updateMonthlyChampionPost(post.id, { status: "inactive" });
      deactivated += 1;
    } catch (err) {
      console.error("Failed to deactivate non-winner champion post:", post.id, err?.message || err);
    }
  }
  return deactivated;
}

/**
 * Computes and persists Monthly Champion posts for a given month (default: previous
 * calendar month, since the job is meant to run on the 1st of the following month).
 * Only top scorers are champions; ties for the highest score all win.
 * Idempotent: re-running for the same month updates existing posts instead of duplicating,
 * and only sends the "you won" notification the first time a post is created.
 */
async function runMonthlyChampionJob(options = {}) {
  const monthYear = options.monthYear || previousMonthYear();
  const rankings = await computeMonthlyRankings(monthYear);

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
        await notifyChampion(post, { monthLbl, averageScore: row.averageScore });
      }

      results.push({ userId: row.userId, rank: row.rank, averageScore: row.averageScore, isNew, postId: post.id });
    } catch (err) {
      console.error("Monthly champion job user failed:", row.userId, err?.message || err);
      results.push({ userId: row.userId, error: err?.message || "processing_failed" });
    }
  }

  const winnerUserIds = new Set(rankings.map((row) => row.userId));
  const deactivated = await deactivateNonWinners(monthYear, winnerUserIds);

  const created = results.filter((r) => r.isNew).length;
  const updated = results.filter((r) => r.isNew === false).length;
  const failed = results.filter((r) => r.error).length;

  return {
    monthYear,
    matchedUsers: rankings.length,
    created,
    updated,
    failed,
    deactivated,
    results,
  };
}

module.exports = {
  previousMonthYear,
  runMonthlyChampionJob,
};
