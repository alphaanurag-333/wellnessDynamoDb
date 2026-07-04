const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listMonthlyChampionPosts,
  getMonthlyChampionPostById,
  findLatestMonthWithChampions,
} = require("../../models/monthlyChampionPostModel");
const {
  listMonthlyChampionPostComments,
  countCommentsForPost,
} = require("../../models/monthlyChampionPostCommentModel");
const { getUserById, toPublicUser } = require("../../models/userModel");

exports.listAssistantMonthlyChampionPostsController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  let { page = 1, limit = 20, monthYear } = req.query;
  if (!monthYear) {
    monthYear = (await findLatestMonthWithChampions()) || undefined;
  }

  const data = await listMonthlyChampionPosts({ page, limit, status: "active", monthYear });

  const monthlyChampionPosts = await Promise.all(
    data.monthlyChampionPosts.map(async (post) => {
      const user = await getUserById(post.userId);
      const commentCount = await countCommentsForPost(post.id);
      return {
        ...post,
        user: user ? toPublicUser(user) : null,
        commentCount,
      };
    })
  );

  return res.status(200).json({
    status: true,
    monthlyChampionPosts,
    monthYear: monthYear || null,
    pagination: data.pagination,
  });
});

exports.getAssistantMonthlyChampionPostByIdController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const post = await getMonthlyChampionPostById(req.params.id);
  if (!post || post.status !== "active") {
    throw new AppError("Monthly champion post not found", 404);
  }

  const user = await getUserById(post.userId);
  const { comments, pagination } = await listMonthlyChampionPostComments({
    monthlyChampionPostId: post.id,
    page: 1,
    limit: 200,
  });

  return res.status(200).json({
    status: true,
    monthlyChampionPost: {
      ...post,
      user: user ? toPublicUser(user) : null,
      comments,
      commentCount: pagination?.total ?? comments.length,
    },
  });
});
