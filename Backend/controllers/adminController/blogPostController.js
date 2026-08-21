const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  uploadMulterField,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const {
  createBlogPost,
  getBlogPostById,
  getBlogPostRecordById,
  updateBlogPost,
  deleteBlogPost,
  listBlogPosts,
  reorderBlogPosts,
  normalizeStatus,
  normalizeSortOrder,
  normalizeVisibleFlag,
  SORT_ORDER_MIN,
  SORT_ORDER_MAX,
} = require("../../models/blogPostModel");

const S3_FOLDER = "blogs";

function validateSortOrder(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < SORT_ORDER_MIN || n > SORT_ORDER_MAX) {
    throw new AppError(
      `sortOrder must be a whole number between ${SORT_ORDER_MIN} and ${SORT_ORDER_MAX}`,
      400
    );
  }
  return normalizeSortOrder(n);
}

exports.listBlogPostsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, search } = req.query;
  const data = await listBlogPosts({ page, limit, status, search });
  return res.status(200).json({
    status: true,
    posts: data.posts,
    pagination: data.pagination,
  });
});

exports.getBlogPostByIdController = asyncHandler(async (req, res) => {
  const post = await getBlogPostById(req.params.id);
  if (!post) throw new AppError("Blog post not found", 404);
  return res.status(200).json({ status: true, post });
});

exports.createBlogPostController = asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const status = normalizeStatus(req.body.status, "active");
  const sortOrder = validateSortOrder(req.body.sortOrder);
  const webVisible =
    req.body.webVisible !== undefined ? normalizeVisibleFlag(req.body.webVisible, true) : true;
  const appVisible =
    req.body.appVisible !== undefined ? normalizeVisibleFlag(req.body.appVisible, true) : true;
  const uploadedCover =
    (await uploadMulterField(req, "coverFile", S3_FOLDER)) ||
    (await uploadMulterField(req, "file", S3_FOLDER));
  const coverImage = uploadedCover ?? parseMediaKeyFromBody(req.body.coverImage, "coverImage") ?? "";

  if (!title) throw new AppError("title is required", 400);
  if (!description) throw new AppError("description is required", 400);
  if (!["active", "inactive"].includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }

  const post = await createBlogPost({
    title,
    description,
    coverImage,
    status,
    sortOrder,
    webVisible,
    appVisible,
  });

  return res.status(201).json({
    status: true,
    message: "Blog post created successfully",
    post,
  });
});

exports.updateBlogPostController = asyncHandler(async (req, res) => {
  const current = await getBlogPostRecordById(req.params.id);
  if (!current) throw new AppError("Blog post not found", 404);

  const updates = {};
  if (req.body.title !== undefined) {
    const title = String(req.body.title || "").trim();
    if (!title) throw new AppError("title cannot be empty", 400);
    updates.title = title;
  }
  if (req.body.description !== undefined) {
    const description = String(req.body.description || "").trim();
    if (!description) throw new AppError("description cannot be empty", 400);
    updates.description = description;
  }
  if (req.body.status !== undefined) {
    const status = normalizeStatus(req.body.status, "");
    if (!["active", "inactive"].includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }
  if (req.body.sortOrder !== undefined) {
    updates.sortOrder = validateSortOrder(req.body.sortOrder);
  }
  if (req.body.webVisible !== undefined) {
    updates.webVisible = normalizeVisibleFlag(req.body.webVisible, true);
  }
  if (req.body.appVisible !== undefined) {
    updates.appVisible = normalizeVisibleFlag(req.body.appVisible, true);
  }
  if (req.body.coverImage !== undefined) {
    updates.coverImage = parseMediaKeyFromBody(req.body.coverImage, "coverImage") ?? "";
  }

  const uploadedCover =
    (await uploadMulterField(req, "coverFile", S3_FOLDER)) ||
    (await uploadMulterField(req, "file", S3_FOLDER));
  if (uploadedCover) {
    if (current.coverImage) await deleteStoredMedia(current.coverImage);
    updates.coverImage = uploadedCover;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let post;
  try {
    post = await updateBlogPost(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") throw new AppError("Blog post not found", 404);
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Blog post updated successfully",
    post,
  });
});

exports.deleteBlogPostController = asyncHandler(async (req, res) => {
  const current = await getBlogPostRecordById(req.params.id);
  if (!current) throw new AppError("Blog post not found", 404);
  if (current.coverImage) await deleteStoredMedia(current.coverImage);

  try {
    await deleteBlogPost(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") throw new AppError("Blog post not found", 404);
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Blog post deleted successfully",
  });
});

exports.reorderBlogPostsController = asyncHandler(async (req, res) => {
  const orderedIds = req.body.orderedIds ?? req.body.order ?? req.body.ids;
  if (!Array.isArray(orderedIds) || !orderedIds.length) {
    throw new AppError("orderedIds must be a non-empty array", 400);
  }

  try {
    const posts = await reorderBlogPosts(orderedIds);
    return res.status(200).json({
      status: true,
      message: "Blog posts reordered",
      posts,
    });
  } catch (err) {
    if (err?.statusCode === 404) throw new AppError(err.message, 404);
    throw err;
  }
});
