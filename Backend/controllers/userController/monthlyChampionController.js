const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listMonthlyChampionPostsByMonth,
  getMonthlyChampionPostById,
  listMonthlyChampionPostsForUser,
  findLatestMonthWithChampions,
  normalizeMonthYear,
} = require("../../models/monthlyChampionPostModel");
const { listMonthlyChampionPostComments, findMonthlyChampionPostCommentByUser, countCommentsForPost } = require("../../models/monthlyChampionPostCommentModel");
const { getUserById, toPublicUser } = require("../../models/userModel");
const { getCurrentMonthStandingForUser } = require("../../services/monthlyChampionScoreService");

async function enrichPost(post, viewerUserId) {
  const user = await getUserById(post.userId);
  const [commentCount, ownComment] = await Promise.all([
    countCommentsForPost(post.id),
    viewerUserId
      ? findMonthlyChampionPostCommentByUser(post.id, viewerUserId)
      : Promise.resolve(null),
  ]);
  return {
    ...post,
    user: user ? toPublicUser(user) : null,
    commentCount,
    hasCommented: Boolean(ownComment),
  };
}

exports.listUserMonthlyChampionsController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  let monthYear = normalizeMonthYear(req.query.monthYear);
  if (!monthYear) {
    monthYear = await findLatestMonthWithChampions();
  }
  if (!monthYear) {
    return res.status(200).json({
      status: true,
      monthYear: null,
      monthlyChampions: [],
    });
  }

  const { monthlyChampionPosts } = await listMonthlyChampionPostsByMonth({
    monthYear,
    page: 1,
    limit: 50,
    status: "active",
  });

  const monthlyChampions = await Promise.all(
    monthlyChampionPosts.map((post) => enrichPost(post, userId))
  );

  return res.status(200).json({
    status: true,
    monthYear,
    monthlyChampions,
  });
});

exports.getMyMonthlyChampionStandingController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const monthYear = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const standing = await getCurrentMonthStandingForUser(userId, monthYear);

  return res.status(200).json({
    status: true,
    ...standing,
  });
});

exports.getMyMonthlyChampionHistoryController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const posts = await listMonthlyChampionPostsForUser(userId, { limit: 24 });
  const activeOnly = posts.filter((row) => row.status === "active");

  return res.status(200).json({
    status: true,
    monthlyChampions: activeOnly,
  });
});

exports.getUserMonthlyChampionByIdController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const post = await getMonthlyChampionPostById(req.params.id);
  if (!post || post.status !== "active") {
    throw new AppError("Monthly champion post not found", 404);
  }

  const { comments, pagination } = await listMonthlyChampionPostComments({
    monthlyChampionPostId: post.id,
    page: 1,
    limit: 200,
  });

  const enriched = await enrichPost(post, userId);

  return res.status(200).json({
    status: true,
    monthlyChampion: {
      ...enriched,
      comments,
      commentCount: pagination?.total ?? comments.length,
      hasCommented:
        enriched.hasCommented ||
        comments.some(
          (c) => c.commenterUserId === userId || c.commenter?.id === userId
        ),
    },
  });
});
