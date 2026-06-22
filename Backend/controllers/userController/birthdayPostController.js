const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { todayInTimezone } = require("../../utils/birthdayTimezone");
const { isValidDateOnly } = require("../../utils/dateOnly");
const {
  listBirthdayPosts,
  listBirthdayPostsByPostDate,
  getBirthdayPostById,
  normalizeStatus,
} = require("../../models/birthdayPostModel");
const {
  listBirthdayPostComments,
  countCommentsForPost,
} = require("../../models/birthdayPostCommentModel");
const { getUserById, toPublicUser } = require("../../models/userModel");

function readPaging(query, defaultLimit = 20) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(query.limit) || defaultLimit));
  return { page, limit };
}

async function enrichPostSummary(post) {
  const user = await getUserById(post.userId);
  const commentCount = await countCommentsForPost(post.id);
  return {
    ...post,
    user: user ? toPublicUser(user) : null,
    commentCount,
  };
}

exports.listBirthdayPostsController = asyncHandler(async (req, res) => {
  const { page, limit } = readPaging(req.query);
  const postDate =
    String(req.query.postDate || "").trim() || todayInTimezone().dateOnly;

  if (!isValidDateOnly(postDate)) {
    throw new AppError("postDate must be YYYY-MM-DD", 400);
  }

  const data = await listBirthdayPostsByPostDate({
    postDate,
    page,
    limit,
    status: "active",
  });

  const birthdayPosts = await Promise.all(data.birthdayPosts.map(enrichPostSummary));

  return res.status(200).json({
    status: true,
    birthdayPosts,
    pagination: data.pagination,
  });
});

exports.getBirthdayPostByIdController = asyncHandler(async (req, res) => {
  const post = await getBirthdayPostById(req.params.id);
  if (!post) {
    throw new AppError("Birthday post not found", 404);
  }
  if (normalizeStatus(post.status) !== "active") {
    throw new AppError("Birthday post not found", 404);
  }

  const user = await getUserById(post.userId);
  const { comments, pagination } = await listBirthdayPostComments({
    birthdayPostId: post.id,
    page: 1,
    limit: 200,
  });

  return res.status(200).json({
    status: true,
    birthdayPost: {
      ...post,
      user: user ? toPublicUser(user) : null,
      comments,
      commentCount: pagination?.total ?? comments.length,
    },
  });
});
