const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createDietPlanBook,
  getDietPlanBookById,
  getDietPlanBookRecordById,
  updateDietPlanBook,
  deleteDietPlanBook,
  listDietPlanBook,
  normalizeStatus,
} = require("../../models/dietPlanBookModel");

exports.listDietPlanBookController = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 200;
  const status = req.query.status ? String(req.query.status).trim() : undefined;
  const search = req.query.search ? String(req.query.search).trim() : undefined;

  const data = await listDietPlanBook({ page, limit, status, search });

  return res.status(200).json({
    status: true,
    plans: data.plans,
    pagination: data.pagination,
  });
});

exports.getDietPlanBookByIdController = asyncHandler(async (req, res) => {
  const plan = await getDietPlanBookById(req.params.id);
  if (!plan) throw new AppError("Diet plan not found", 404);
  return res.status(200).json({ status: true, plan });
});

exports.createDietPlanBookController = asyncHandler(async (req, res) => {
  const title = req.body.title ?? req.body.name;
  const content = req.body.content ?? req.body.description;
  const live = req.body.live;
  const status = live === false
    ? "inactive"
    : live === true
      ? "active"
      : normalizeStatus(req.body.status, "active");

  let plan;
  try {
    plan = await createDietPlanBook({ title, content, status });
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  return res.status(201).json({
    status: true,
    message: "Diet plan created successfully",
    plan,
  });
});

exports.updateDietPlanBookController = asyncHandler(async (req, res) => {
  const current = await getDietPlanBookRecordById(req.params.id);
  if (!current) throw new AppError("Diet plan not found", 404);

  const updates = {};
  if (req.body.title !== undefined || req.body.name !== undefined) {
    updates.title = req.body.title ?? req.body.name;
  }
  if (req.body.content !== undefined || req.body.description !== undefined) {
    updates.content = req.body.content ?? req.body.description;
  }
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").toLowerCase().trim();
    if (!["active", "inactive"].includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  } else if (req.body.live !== undefined) {
    updates.status = req.body.live ? "active" : "inactive";
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let plan;
  try {
    plan = await updateDietPlanBook(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Diet plan not found", 404);
    }
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Diet plan updated successfully",
    plan,
  });
});

exports.deleteDietPlanBookController = asyncHandler(async (req, res) => {
  const current = await getDietPlanBookRecordById(req.params.id);
  if (!current) throw new AppError("Diet plan not found", 404);

  try {
    await deleteDietPlanBook(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Diet plan not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Diet plan deleted successfully",
  });
});
