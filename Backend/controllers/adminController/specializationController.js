const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createSpecialization,
  getSpecializationById,
  updateSpecialization,
  deleteSpecialization,
  listSpecializations,
  normalizeStatus,
  ALLOWED_STATUS,
} = require("../../models/specializationModel");

exports.listSpecializationsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const data = await listSpecializations({ page, limit, status, search });

  return res.status(200).json({
    status: true,
    specializations: data.specializations,
    pagination: data.pagination,
  });
});

exports.getSpecializationByIdController = asyncHandler(async (req, res) => {
  const specialization = await getSpecializationById(req.params.id);
  if (!specialization) throw new AppError("Specialization not found", 404);

  return res.status(200).json({
    status: true,
    specialization,
  });
});

exports.createSpecializationController = asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim();
  const description =
    req.body.description !== undefined ? String(req.body.description).trim() || null : null;
  const status = normalizeStatus(req.body.status, "active");

  if (!title) throw new AppError("title is required", 400);
  if (req.body.status !== undefined && !ALLOWED_STATUS.has(status)) {
    throw new AppError("status must be active or inactive", 400);
  }

  let specialization;
  try {
    specialization = await createSpecialization({ title, description, status });
  } catch (err) {
    if (err?.code === "DUPLICATE_TITLE") {
      throw new AppError("A specialization with this title already exists", 409);
    }
    throw err;
  }

  return res.status(201).json({
    status: true,
    message: "Specialization created successfully",
    specialization,
  });
});

exports.updateSpecializationController = asyncHandler(async (req, res) => {
  const existing = await getSpecializationById(req.params.id);
  if (!existing) throw new AppError("Specialization not found", 404);

  const updates = {};

  if (req.body.title !== undefined) {
    const title = String(req.body.title || "").trim();
    if (!title) throw new AppError("title cannot be empty", 400);
    updates.title = title;
  }
  if (req.body.description !== undefined) {
    updates.description = String(req.body.description || "").trim() || null;
  }
  if (req.body.status !== undefined) {
    const status = normalizeStatus(req.body.status);
    if (!ALLOWED_STATUS.has(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let specialization;
  try {
    specialization = await updateSpecialization(req.params.id, updates);
  } catch (err) {
    if (err?.code === "DUPLICATE_TITLE") {
      throw new AppError("A specialization with this title already exists", 409);
    }
    if (err?.name === "ConditionalCheckFailedException" || err?.name === "NotFoundError") {
      throw new AppError("Specialization not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Specialization updated successfully",
    specialization,
  });
});

exports.deleteSpecializationController = asyncHandler(async (req, res) => {
  try {
    await deleteSpecialization(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Specialization not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Specialization deleted successfully",
  });
});
