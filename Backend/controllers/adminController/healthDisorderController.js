const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createHealthDisorder,
  getHealthDisorderById,
  updateHealthDisorder,
  deleteHealthDisorder,
  listHealthDisorders,
  normalizeSymptoms,
  normalizeType,
} = require("../../models/healthDisorderModel");

function parseSymptomsInput(input) {
  if (Array.isArray(input)) return normalizeSymptoms(input);
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return normalizeSymptoms(parsed);
    } catch {
      /* comma / newline separated */
    }
    return normalizeSymptoms(trimmed.split(/[,;\n]+/));
  }
  return [];
}

exports.listHealthDisordersController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, type, search } = req.query;
  const data = await listHealthDisorders({ page, limit, status, type, search });
  return res.status(200).json({
    status: true,
    healthDisorders: data.healthDisorders,
    pagination: data.pagination,
  });
});

exports.getHealthDisorderByIdController = asyncHandler(async (req, res) => {
  const healthDisorder = await getHealthDisorderById(req.params.id);
  if (!healthDisorder) throw new AppError("Health disorder not found", 404);
  return res.status(200).json({ status: true, healthDisorder });
});

exports.createHealthDisorderController = asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const status = String(req.body.status || "active").trim().toLowerCase();
  const type = normalizeType(req.body.type || "acute");
  const symptoms = parseSymptomsInput(req.body.symptoms);

  if (!title) throw new AppError("title is required", 400);
  if (!description) throw new AppError("description is required", 400);
  if (!symptoms.length) throw new AppError("symptoms is required (non-empty array)", 400);
  if (!["active", "inactive"].includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }
  if (!["acute", "chronic"].includes(type)) {
    throw new AppError("type must be acute or chronic", 400);
  }

  const healthDisorder = await createHealthDisorder({
    title,
    description,
    symptoms,
    type,
    status,
  });

  return res.status(201).json({
    status: true,
    message: "Health disorder created successfully",
    healthDisorder,
  });
});

exports.updateHealthDisorderController = asyncHandler(async (req, res) => {
  const current = await getHealthDisorderById(req.params.id);
  if (!current) throw new AppError("Health disorder not found", 404);

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
  if (req.body.symptoms !== undefined) {
    const symptoms = parseSymptomsInput(req.body.symptoms);
    if (!symptoms.length) throw new AppError("symptoms cannot be empty", 400);
    updates.symptoms = symptoms;
  }
  if (req.body.type !== undefined) {
    const type = normalizeType(req.body.type);
    if (!["acute", "chronic"].includes(type)) {
      throw new AppError("type must be acute or chronic", 400);
    }
    updates.type = type;
  }
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!["active", "inactive"].includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let healthDisorder;
  try {
    healthDisorder = await updateHealthDisorder(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Health disorder not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Health disorder updated successfully",
    healthDisorder,
  });
});

exports.deleteHealthDisorderController = asyncHandler(async (req, res) => {
  const current = await getHealthDisorderById(req.params.id);
  if (!current) throw new AppError("Health disorder not found", 404);

  try {
    await deleteHealthDisorder(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Health disorder not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Health disorder deleted successfully",
  });
});
