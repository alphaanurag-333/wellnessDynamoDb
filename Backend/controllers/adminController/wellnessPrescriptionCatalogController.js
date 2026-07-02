const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createWellnessPrescriptionCatalog,
  getWellnessPrescriptionCatalogById,
  getWellnessPrescriptionCatalogRecordById,
  updateWellnessPrescriptionCatalog,
  deleteWellnessPrescriptionCatalog,
  listWellnessPrescriptionCatalog,
  ALLOWED_STATUS,
  normalizePrescriptionId,
  normalizePoints,
} = require("../../models/wellnessPrescriptionCatalogModel");
const {
  isWellnessPrescriptionCatalogReferenced,
} = require("../../models/coachAssignedWellnessPrescriptionModel");

exports.listWellnessPrescriptionCatalogController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search, category } = req.query;
  const data = await listWellnessPrescriptionCatalog({ page, limit, status, search, category });
  return res.status(200).json({
    status: true,
    prescriptions: data.prescriptions,
    pagination: data.pagination,
  });
});

exports.getWellnessPrescriptionCatalogByIdController = asyncHandler(async (req, res) => {
  const prescription = await getWellnessPrescriptionCatalogById(req.params.id);
  if (!prescription) throw new AppError("Wellness prescription catalog entry not found", 404);
  return res.status(200).json({ status: true, prescription });
});

exports.createWellnessPrescriptionCatalogController = asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim();
  const prescriptionId = req.body.prescriptionId
    ? normalizePrescriptionId(req.body.prescriptionId)
    : normalizePrescriptionId(title);
  const category = String(req.body.category || "").trim();
  const status = String(req.body.status || "active").toLowerCase();
  const sequence = Number(req.body.sequence) || 0;

  if (!title) throw new AppError("title is required", 400);
  if (!category) throw new AppError("category is required", 400);
  if (!ALLOWED_STATUS.includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }

  let points;
  try {
    points = normalizePoints(req.body.points);
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  let prescription;
  try {
    prescription = await createWellnessPrescriptionCatalog({
      prescriptionId,
      title,
      category,
      points,
      status,
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
    message: "Wellness prescription catalog entry created successfully",
    prescription,
  });
});

exports.updateWellnessPrescriptionCatalogController = asyncHandler(async (req, res) => {
  const current = await getWellnessPrescriptionCatalogRecordById(req.params.id);
  if (!current) throw new AppError("Wellness prescription catalog entry not found", 404);

  const updates = {};
  if (req.body.title !== undefined) updates.title = req.body.title;
  if (req.body.prescriptionId !== undefined) updates.prescriptionId = req.body.prescriptionId;
  if (req.body.category !== undefined) updates.category = req.body.category;
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").toLowerCase();
    if (!ALLOWED_STATUS.includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }
  if (req.body.sequence !== undefined) updates.sequence = req.body.sequence;
  if (req.body.points !== undefined) updates.points = req.body.points;

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let prescription;
  try {
    prescription = await updateWellnessPrescriptionCatalog(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Wellness prescription catalog entry not found", 404);
    }
    if (err?.name === "ConflictError") throw new AppError(err.message, 409);
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Wellness prescription catalog entry updated successfully",
    prescription,
  });
});

exports.deleteWellnessPrescriptionCatalogController = asyncHandler(async (req, res) => {
  const current = await getWellnessPrescriptionCatalogRecordById(req.params.id);
  if (!current) throw new AppError("Wellness prescription catalog entry not found", 404);

  const referenced = await isWellnessPrescriptionCatalogReferenced(current.prescriptionId);
  if (referenced) {
    throw new AppError(
      "This prescription is referenced in coach assignments. Deactivate it instead of deleting.",
      400
    );
  }

  try {
    await deleteWellnessPrescriptionCatalog(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Wellness prescription catalog entry not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Wellness prescription catalog entry deleted successfully",
  });
});
