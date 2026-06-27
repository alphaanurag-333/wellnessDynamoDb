const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  getBirthdayPostById,
  normalizeStatus,
} = require("../../models/birthdayPostModel");
const {
  listBirthdayPostComments,
  createBirthdayPostComment,
  deleteBirthdayPostComment,
  getBirthdayPostCommentRecordById,
} = require("../../models/birthdayPostCommentModel");
const { getUserById } = require("../../models/userModel");
const { dispatchBirthdayWishNotification } = require("../../services/notificationDispatchService");

function readPaging(query, defaultLimit = 50) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(query.limit) || defaultLimit));
  return { page, limit };
}

async function assertActivePost(postId) {
  const post = await getBirthdayPostById(postId);
  if (!post || normalizeStatus(post.status) !== "active") {
    throw new AppError("Birthday post not found", 404);
  }
  return post;
}

exports.listBirthdayPostCommentsController = asyncHandler(async (req, res) => {
  await assertActivePost(req.params.postId);
  const { page, limit } = readPaging(req.query);
  const data = await listBirthdayPostComments({
    birthdayPostId: req.params.postId,
    page,
    limit,
  });

  return res.status(200).json({
    status: true,
    comments: data.comments,
    pagination: data.pagination,
  });
});

exports.createBirthdayPostCommentController = asyncHandler(async (req, res) => {
  const post = await assertActivePost(req.params.postId);

  const comment = String(req.body.comment || "").trim();
  if (!comment) {
    throw new AppError("comment is required", 400);
  }
  if (comment.length > 2000) {
    throw new AppError("comment cannot exceed 2000 characters", 400);
  }

  const commenterUserId = req.user.id;
  const created = await createBirthdayPostComment({
    birthdayPostId: req.params.postId,
    commenterUserId,
    comment,
  });

  if (post.userId && post.userId !== commenterUserId) {
    const commenter = await getUserById(commenterUserId);
    const commenterName = commenter?.name || "Someone";
    dispatchBirthdayWishNotification({
      recipientUserId: post.userId,
      actorUserId: commenterUserId,
      postId: req.params.postId,
      message: `${commenterName} commented on your birthday post: "${comment}"`,
      comment,
    }).catch((err) => console.error("Birthday wish notification failed:", err?.message || err));
  }

  return res.status(201).json({
    status: true,
    message: "Comment added successfully",
    comment: created,
  });
});

exports.deleteBirthdayPostCommentController = asyncHandler(async (req, res) => {
  await assertActivePost(req.params.postId);

  const row = await getBirthdayPostCommentRecordById(req.params.id);
  if (!row || row.birthdayPostId !== req.params.postId) {
    throw new AppError("Comment not found", 404);
  }
  if (row.commenterUserId !== req.user.id) {
    throw new AppError("You can only delete your own comments", 403);
  }

  try {
    await deleteBirthdayPostComment(req.params.id);
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
