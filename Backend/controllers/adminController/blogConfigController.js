const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createBlogConfigShell,
  getBlogConfig,
  getBlogConfigRecord,
  updateBlogConfig,
  parseBool,
} = require("../../models/blogConfigModel");

exports.getBlogConfigController = asyncHandler(async (_req, res) => {
  const config = await getBlogConfig();
  return res.status(200).json({
    status: true,
    message: config ? "Blog config fetched" : "No blog config configured yet",
    data: config,
  });
});

exports.createBlogConfigController = asyncHandler(async (_req, res) => {
  const existing = await getBlogConfigRecord();
  if (existing) {
    throw new AppError("Blog config already exists. Use PATCH /api/admin/blog-config to update.", 409);
  }

  await createBlogConfigShell();
  const config = await getBlogConfig();

  return res.status(201).json({
    status: true,
    message: "Blog config created",
    data: config,
  });
});

exports.updateBlogConfigController = asyncHandler(async (req, res) => {
  const existing = await getBlogConfigRecord();
  if (!existing) {
    throw new AppError("Blog config not found. Use POST /api/admin/blog-config to create.", 404);
  }

  const updates = {};
  if (req.body.appOn !== undefined) updates.appOn = parseBool(req.body.appOn, true);
  if (req.body.webOn !== undefined) updates.webOn = parseBool(req.body.webOn, true);

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let config;
  try {
    config = await updateBlogConfig(updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Blog config not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Blog config updated",
    data: config,
  });
});
