const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createSop,
  getSopById,
  updateSop,
  deleteSop,
  listSops,
  normalizeStatus,
  normalizeCategory,
  normalizeSteps,
  ALLOWED_CATEGORIES,
} = require("../../models/sopModel");

function resolveAuthor(req) {
  const fromBody = String(req.body?.author || "").trim();
  if (fromBody) return fromBody;
  const name = String(req.user?.name || req.auth?.name || "").trim();
  return name || "Admin desk";
}

exports.listSopsController = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const status = req.query.status ? String(req.query.status).trim() : undefined;
  const category = req.query.category ? String(req.query.category).trim() : undefined;
  const search = req.query.search ? String(req.query.search).trim() : undefined;

  const data = await listSops({ page, limit, status, category, search });

  return res.status(200).json({
    status: true,
    sops: data.sops,
    pagination: data.pagination,
  });
});

exports.getSopByIdController = asyncHandler(async (req, res) => {
  const sop = await getSopById(req.params.id);
  if (!sop) {
    throw new AppError("SOP not found", 404);
  }

  return res.status(200).json({
    status: true,
    sop,
  });
});

exports.createSopController = asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim();
  const category = normalizeCategory(req.body.category, "onboarding");
  const steps = normalizeSteps(req.body.steps);
  const status = normalizeStatus(req.body.status, "active");
  const author = resolveAuthor(req);

  if (!title) {
    throw new AppError("title is required", 400);
  }
  if (!ALLOWED_CATEGORIES.has(category)) {
    throw new AppError("invalid category", 400);
  }
  if (steps.length === 0) {
    throw new AppError("at least one step is required", 400);
  }

  const sop = await createSop({ title, category, steps, author, status });

  return res.status(201).json({
    status: true,
    message: "SOP created successfully",
    sop,
  });
});

exports.updateSopController = asyncHandler(async (req, res) => {
  const updates = {};

  if (req.body.title !== undefined) {
    const title = String(req.body.title).trim();
    if (!title) throw new AppError("title cannot be empty", 400);
    updates.title = title;
  }

  if (req.body.category !== undefined) {
    const category = String(req.body.category).toLowerCase().trim();
    if (!ALLOWED_CATEGORIES.has(category)) {
      throw new AppError("invalid category", 400);
    }
    updates.category = category;
  }

  if (req.body.steps !== undefined) {
    const steps = normalizeSteps(req.body.steps);
    if (steps.length === 0) throw new AppError("at least one step is required", 400);
    updates.steps = steps;
  }

  if (req.body.status !== undefined) {
    const status = String(req.body.status).toLowerCase().trim();
    if (!["active", "inactive"].includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }

  if (req.body.author !== undefined) {
    const author = String(req.body.author).trim();
    if (!author) throw new AppError("author cannot be empty", 400);
    updates.author = author;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let sop;
  try {
    sop = await updateSop(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("SOP not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "SOP updated successfully",
    sop,
  });
});

exports.deleteSopController = asyncHandler(async (req, res) => {
  try {
    await deleteSop(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("SOP not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "SOP deleted successfully",
  });
});
