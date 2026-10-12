const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listBirthdayPosts,
  getBirthdayPostById,
  updateBirthdayPost,
  normalizeStatus,
} = require("../../models/birthdayPostModel");
const {
  listBirthdayPostComments,
  deleteBirthdayPostComment,
  getBirthdayPostCommentRecordById,
  countCommentsForPost,
} = require("../../models/birthdayPostCommentModel");
const { getUserById, toPublicUser } = require("../../models/userModel");
const {
  isCommunityBirthdayUser,
  communityBirthdayTierLabel,
} = require("../../models/userAssignmentLogic");
const { getBirthdayNotificationById } = require("../../models/birthdayNotificationModel");

async function enrichBirthdayPost(post) {
  if (!post) return null;
  const user = await getUserById(post.userId);
  const { comments, pagination } = await listBirthdayPostComments({
    birthdayPostId: post.id,
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

function pageRows(rows, page, limit) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 200));
  const safePage = Math.max(1, Number(page) || 1);
  const total = rows.length;
  const start = (safePage - 1) * safeLimit;
  return {
    rows: rows.slice(start, start + safeLimit),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.max(1, Math.ceil(total / safeLimit) || 1),
    },
  };
}

exports.listBirthdayPostsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, postDate } = req.query;
  const data = await listBirthdayPosts({ status, postDate, unpaginated: true });

  const enriched = await Promise.all(
    data.birthdayPosts.map(async (post) => {
      const user = await getUserById(post.userId);
      const commentCount = await countCommentsForPost(post.id);
      return { post, user, commentCount };
    })
  );
  const eligible = enriched
    .filter(({ user }) => isCommunityBirthdayUser(user))
    .map(({ post, user, commentCount }) => {
      const birthdayTier = communityBirthdayTierLabel(user);
      const publicUser = toPublicUser(user);
      return {
        ...post,
        birthdayTier,
        user: publicUser ? { ...publicUser, birthdayTier } : null,
        commentCount,
      };
    });
  const paged = pageRows(eligible, page, limit);

  return res.status(200).json({
    status: true,
    birthdayPosts: paged.rows,
    pagination: paged.pagination,
  });
});

exports.getBirthdayPostByIdController = asyncHandler(async (req, res) => {
  const post = await getBirthdayPostById(req.params.id);
  if (!post) {
    throw new AppError("Birthday post not found", 404);
  }

  const enriched = await enrichBirthdayPost(post);
  let notification = null;
  if (post.notificationId) {
    notification = await getBirthdayNotificationById(post.notificationId);
  }

  return res.status(200).json({
    status: true,
    birthdayPost: enriched,
    notification,
  });
});

exports.updateBirthdayPostController = asyncHandler(async (req, res) => {
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

  let birthdayPost;
  try {
    birthdayPost = await updateBirthdayPost(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Birthday post not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Birthday post updated successfully",
    birthdayPost,
  });
});

exports.deleteBirthdayPostCommentController = asyncHandler(async (req, res) => {
  const comment = await getBirthdayPostCommentRecordById(req.params.commentId);
  if (!comment) {
    throw new AppError("Comment not found", 404);
  }
  if (comment.birthdayPostId !== req.params.postId) {
    throw new AppError("Comment not found on this post", 404);
  }

  try {
    await deleteBirthdayPostComment(req.params.commentId);
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
