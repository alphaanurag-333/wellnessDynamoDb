const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createDietPlanCatalog,
  getDietPlanCatalogById,
  getDietPlanCatalogRecordById,
  updateDietPlanCatalog,
  deleteDietPlanCatalog,
  listDietPlanCatalog,
  ALLOWED_STATUS,
  ALLOWED_TYPES,
  normalizePlanId,
  normalizeMeals,
} = require("../../models/dietPlanCatalogModel");
const { isDietPlanCatalogReferenced } = require("../../models/coachAssignedDietPlanModel");

exports.listDietPlanCatalogController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search, category, type } = req.query;
  const data = await listDietPlanCatalog({ page, limit, status, search, category, type });
  return res.status(200).json({
    status: true,
    plans: data.plans,
    pagination: data.pagination,
  });
});

exports.getDietPlanCatalogByIdController = asyncHandler(async (req, res) => {
  const plan = await getDietPlanCatalogById(req.params.id);
  if (!plan) throw new AppError("Diet plan catalog entry not found", 404);
  return res.status(200).json({ status: true, plan });
});

exports.createDietPlanCatalogController = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const planId = req.body.planId ? normalizePlanId(req.body.planId) : normalizePlanId(name);
  const type = String(req.body.type || "GENERAL").toUpperCase();
  const category = String(req.body.category || "").trim();
  const description = req.body.description;
  const status = String(req.body.status || "active").toLowerCase();
  const sequence = Number(req.body.sequence) || 0;

  if (!name) throw new AppError("name is required", 400);
  if (!category) throw new AppError("category is required", 400);
  if (!ALLOWED_TYPES.includes(type)) {
    throw new AppError(`type must be one of: ${ALLOWED_TYPES.join(", ")}`, 400);
  }
  if (!ALLOWED_STATUS.includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }

  let meals;
  try {
    meals = normalizeMeals(req.body.meals);
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  let plan;
  try {
    plan = await createDietPlanCatalog({
      planId,
      name,
      type,
      category,
      description,
      status,
      meals,
      sequence,
      createdBy: req.auth?.sub,
    });
  } catch (err) {
    if (err?.name === "ConflictError") throw new AppError(err.message, 409);
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  return res.status(201).json({
    status: true,
    message: "Diet plan catalog entry created successfully",
    plan,
  });
});

exports.updateDietPlanCatalogController = asyncHandler(async (req, res) => {
  const current = await getDietPlanCatalogRecordById(req.params.id);
  if (!current) throw new AppError("Diet plan catalog entry not found", 404);

  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.planId !== undefined) updates.planId = req.body.planId;
  if (req.body.type !== undefined) {
    const type = String(req.body.type || "").toUpperCase();
    if (!ALLOWED_TYPES.includes(type)) {
      throw new AppError(`type must be one of: ${ALLOWED_TYPES.join(", ")}`, 400);
    }
    updates.type = type;
  }
  if (req.body.category !== undefined) updates.category = req.body.category;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").toLowerCase();
    if (!ALLOWED_STATUS.includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }
  if (req.body.sequence !== undefined) updates.sequence = req.body.sequence;
  if (req.body.meals !== undefined) updates.meals = req.body.meals;

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let plan;
  try {
    plan = await updateDietPlanCatalog(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Diet plan catalog entry not found", 404);
    }
    if (err?.name === "ConflictError") throw new AppError(err.message, 409);
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Diet plan catalog entry updated successfully",
    plan,
  });
});

exports.deleteDietPlanCatalogController = asyncHandler(async (req, res) => {
  const current = await getDietPlanCatalogRecordById(req.params.id);
  if (!current) throw new AppError("Diet plan catalog entry not found", 404);

  const referenced = await isDietPlanCatalogReferenced(current.planId);
  if (referenced) {
    throw new AppError(
      "This diet plan is referenced in coach assignments. Deactivate it instead of deleting.",
      400
    );
  }

  try {
    await deleteDietPlanCatalog(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Diet plan catalog entry not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Diet plan catalog entry deleted successfully",
  });
});
