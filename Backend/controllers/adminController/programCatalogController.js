const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createProgramCatalog,
  getProgramCatalogById,
  getProgramCatalogRecordById,
  updateProgramCatalog,
  deleteProgramCatalog,
  listProgramCatalog,
  ALLOWED_STATUS,
  normalizeProgramType,
  normalizePrice,
} = require("../../models/programCatalogModel");
const { isProgramCatalogReferenced } = require("../../models/userProgramModel");

exports.listProgramCatalogController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search, isActive } = req.query;
  const data = await listProgramCatalog({ page, limit, status, search, isActive });
  return res.status(200).json({
    status: true,
    programs: data.programs,
    pagination: data.pagination,
  });
});

exports.getProgramCatalogByIdController = asyncHandler(async (req, res) => {
  const program = await getProgramCatalogById(req.params.id);
  if (!program) throw new AppError("Program catalog entry not found", 404);
  return res.status(200).json({ status: true, program });
});

exports.createProgramCatalogController = asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim();
  const programType = normalizeProgramType(req.body.programType ?? req.body.program_type);
  const description = req.body.description;
  const price = req.body.price;
  const currency = req.body.currency || "INR";
  const isActive = req.body.isActive !== false && req.body.isActive !== "false";

  if (!title) throw new AppError("title is required", 400);
  if (price == null) throw new AppError("price is required", 400);

  let program;
  try {
    program = await createProgramCatalog({
      title,
      programType,
      description,
      price,
      currency,
      isActive,
      createdBy: req.auth?.sub,
    });
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  return res.status(201).json({
    status: true,
    message: "Program catalog entry created successfully",
    program,
  });
});

exports.updateProgramCatalogController = asyncHandler(async (req, res) => {
  const current = await getProgramCatalogRecordById(req.params.id);
  if (!current) throw new AppError("Program catalog entry not found", 404);

  const updates = {};
  if (req.body.title !== undefined) updates.title = req.body.title;
  if (req.body.programType !== undefined || req.body.program_type !== undefined) {
    updates.programType = normalizeProgramType(req.body.programType ?? req.body.program_type);
  }
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.price !== undefined) {
    try {
      updates.price = normalizePrice(req.body.price);
    } catch (err) {
      if (err?.name === "ValidationError") throw new AppError(err.message, 400);
      throw err;
    }
  }
  if (req.body.currency !== undefined) updates.currency = req.body.currency;
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").toLowerCase();
    if (!ALLOWED_STATUS.includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }
  if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let program;
  try {
    program = await updateProgramCatalog(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Program catalog entry not found", 404);
    }
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Program catalog entry updated successfully",
    program,
  });
});

exports.deleteProgramCatalogController = asyncHandler(async (req, res) => {
  const current = await getProgramCatalogRecordById(req.params.id);
  if (!current) throw new AppError("Program catalog entry not found", 404);

  const referenced = await isProgramCatalogReferenced(req.params.id);
  if (referenced) {
    throw new AppError(
      "Cannot delete — program is referenced by user assignments. Deactivate instead.",
      409
    );
  }

  await deleteProgramCatalog(req.params.id);
  return res.status(200).json({
    status: true,
    message: "Program catalog entry deleted successfully",
  });
});
