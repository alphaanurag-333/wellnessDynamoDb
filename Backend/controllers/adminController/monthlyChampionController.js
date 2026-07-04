const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listMonthlyChampionPosts,
  getMonthlyChampionPostById,
  updateMonthlyChampionPost,
  normalizeStatus,
} = require("../../models/monthlyChampionPostModel");
const {
  listMonthlyChampionPostComments,
  deleteMonthlyChampionPostComment,
  getMonthlyChampionPostCommentRecordById,
  countCommentsForPost,
} = require("../../models/monthlyChampionPostCommentModel");
const { getUserById, toPublicUser } = require("../../models/userModel");
const { runMonthlyChampionJob } = require("../../services/monthlyChampionJobService");

async function enrichMonthlyChampionPost(post) {
  if (!post) return null;
  const user = await getUserById(post.userId);
  const { comments, pagination } = await listMonthlyChampionPostComments({
    monthlyChampionPostId: post.id,
    page: 1,
    limit: 200,
  });
  return {
    ...post,
    user: user ? toPublicUser(user) : null,
    comments,
    commentCount: pagination?.total ?? comments.length,
  };
}

exports.listMonthlyChampionPostsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, monthYear } = req.query;
  const data = await listMonthlyChampionPosts({ page, limit, status, monthYear });

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
    pagination: data.pagination,
  });
});

exports.getMonthlyChampionPostByIdController = asyncHandler(async (req, res) => {
  const post = await getMonthlyChampionPostById(req.params.id);
  if (!post) {
    throw new AppError("Monthly champion post not found", 404);
  }

  const enriched = await enrichMonthlyChampionPost(post);

  return res.status(200).json({
    status: true,
    monthlyChampionPost: enriched,
  });
});

exports.updateMonthlyChampionPostController = asyncHandler(async (req, res) => {
  const updates = {};

  if (req.body.message !== undefined) {
    const message = String(req.body.message).trim();
    if (!message) throw new AppError("message cannot be empty", 400);
    if (message.length > 1000) throw new AppError("message cannot exceed 1000 characters", 400);
    updates.message = message;
  }

  if (req.body.status !== undefined) {
    const status = normalizeStatus(req.body.status, "");
    if (!["active", "inactive"].includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let monthlyChampionPost;
  try {
    monthlyChampionPost = await updateMonthlyChampionPost(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Monthly champion post not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Monthly champion post updated successfully",
    monthlyChampionPost,
  });
});

exports.deleteMonthlyChampionPostCommentController = asyncHandler(async (req, res) => {
  const comment = await getMonthlyChampionPostCommentRecordById(req.params.commentId);
  if (!comment) {
    throw new AppError("Comment not found", 404);
  }
  if (comment.monthlyChampionPostId !== req.params.postId) {
    throw new AppError("Comment not found on this post", 404);
  }

  try {
    await deleteMonthlyChampionPostComment(req.params.commentId);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Comment not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Comment deleted successfully",
  });
});

exports.runMonthlyChampionJobController = asyncHandler(async (req, res) => {
  const monthYear = String(req.body?.monthYear || "").trim() || undefined;
  if (monthYear && !/^\d{4}-\d{2}$/.test(monthYear)) {
    throw new AppError("monthYear must be YYYY-MM", 400);
  }

  const result = await runMonthlyChampionJob({ monthYear });

  return res.status(200).json({
    status: true,
    message: "Monthly champion job executed",
    result,
  });
});
