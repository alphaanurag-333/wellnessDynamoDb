const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listMonthlyChampionPostsByMonth,
  getMonthlyChampionPostById,
  listMonthlyChampionPostsForUser,
  findLatestMonthWithChampions,
  normalizeMonthYear,
} = require("../../models/monthlyChampionPostModel");
const { listMonthlyChampionPostComments } = require("../../models/monthlyChampionPostCommentModel");
const { getUserById, toPublicUser } = require("../../models/userModel");

async function enrichPost(post) {
  const user = await getUserById(post.userId);
  return { ...post, user: user ? toPublicUser(user) : null };
}

exports.listUserMonthlyChampionsController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
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

  const monthlyChampions = await Promise.all(monthlyChampionPosts.map(enrichPost));

  return res.status(200).json({
    status: true,
    monthYear,
    monthlyChampions,
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
  const userId = req.auth?.sub;
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

  const enriched = await enrichPost(post);

  return res.status(200).json({
    status: true,
    monthlyChampion: {
      ...enriched,
      comments,
      commentCount: pagination?.total ?? comments.length,
    },
  });
});
