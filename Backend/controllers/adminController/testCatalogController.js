const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createTestCatalog,
  getTestCatalogById,
  getTestCatalogRecordById,
  updateTestCatalog,
  deleteTestCatalog,
  listTestCatalog,
  ALLOWED_STATUS,
  ALLOWED_TYPES,
  normalizeTestId,
  normalizeParameters,
} = require("../../models/testCatalogModel");
const { isTestCatalogReferenced } = require("../../models/coachRecommendedTestModel");

exports.listTestCatalogController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search, category } = req.query;
  const data = await listTestCatalog({ page, limit, status, search, category });
  return res.status(200).json({
    status: true,
    tests: data.tests,
    pagination: data.pagination,
  });
});

exports.getTestCatalogByIdController = asyncHandler(async (req, res) => {
  const test = await getTestCatalogById(req.params.id);
  if (!test) throw new AppError("Test catalog entry not found", 404);
  return res.status(200).json({ status: true, test });
});

exports.createTestCatalogController = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const testId = req.body.testId ? normalizeTestId(req.body.testId) : normalizeTestId(name);
  const type = String(req.body.type || "SINGLE").toUpperCase();
  const category = String(req.body.category || "").trim();
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

  let parameters;
  try {
    parameters = normalizeParameters(req.body.parameters, { type });
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  let test;
  try {
    test = await createTestCatalog({
      testId,
      name,
      type,
      category,
      status,
      parameters,
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
    message: "Test catalog entry created successfully",
    test,
  });
});

exports.updateTestCatalogController = asyncHandler(async (req, res) => {
  const current = await getTestCatalogRecordById(req.params.id);
  if (!current) throw new AppError("Test catalog entry not found", 404);

  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.testId !== undefined) updates.testId = req.body.testId;
  if (req.body.type !== undefined) {
    const type = String(req.body.type || "").toUpperCase();
    if (!ALLOWED_TYPES.includes(type)) {
      throw new AppError(`type must be one of: ${ALLOWED_TYPES.join(", ")}`, 400);
    }
    updates.type = type;
  }
  if (req.body.category !== undefined) updates.category = req.body.category;
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").toLowerCase();
    if (!ALLOWED_STATUS.includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }
  if (req.body.sequence !== undefined) updates.sequence = req.body.sequence;
  if (req.body.parameters !== undefined) updates.parameters = req.body.parameters;

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let test;
  try {
    test = await updateTestCatalog(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Test catalog entry not found", 404);
    }
    if (err?.name === "ConflictError") throw new AppError(err.message, 409);
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Test catalog entry updated successfully",
    test,
  });
});

exports.deleteTestCatalogController = asyncHandler(async (req, res) => {
  const current = await getTestCatalogRecordById(req.params.id);
  if (!current) throw new AppError("Test catalog entry not found", 404);

  const referenced = await isTestCatalogReferenced(current.testId);
  if (referenced) {
    throw new AppError(
      "This test is referenced in coach recommendations. Deactivate it instead of deleting.",
      400
    );
  }

  try {
    await deleteTestCatalog(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Test catalog entry not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Test catalog entry deleted successfully",
  });
});
