const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  uploadMulterField,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const {
  createTransformation,
  getTransformationById,
  getTransformationRecordById,
  updateTransformation,
  deleteTransformation,
  listTransformations,
} = require("../../models/transformationModel");

const S3_FOLDER = "transformation";
const TIME_TAKEN_MIN = 1;
const TIME_TAKEN_MAX = 120;
const INCHES_LOST_MIN = 1;
const INCHES_LOST_MAX = 50;

function normalizeTimeTaken(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num < TIME_TAKEN_MIN || num > TIME_TAKEN_MAX) {
    throw new AppError(
      `timeTaken must be a whole number between ${TIME_TAKEN_MIN} and ${TIME_TAKEN_MAX} months`,
      400
    );
  }
  return num;
}

function normalizeInchesLost(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < INCHES_LOST_MIN || num > INCHES_LOST_MAX) {
    throw new AppError(
      `inchesLost must be a number between ${INCHES_LOST_MIN} and ${INCHES_LOST_MAX}`,
      400
    );
  }
  // Allow one decimal place (e.g. 2.5)
  return Math.round(num * 10) / 10;
}

exports.listTransformationsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const data = await listTransformations({ page, limit, status, search });
  return res.status(200).json({
    status: true,
    transformations: data.transformations,
    pagination: data.pagination,
  });
});

exports.getTransformationByIdController = asyncHandler(async (req, res) => {
  const transformation = await getTransformationById(req.params.id);
  if (!transformation) {
    throw new AppError("Transformation not found", 404);
  }
  return res.status(200).json({ status: true, transformation });
});

exports.createTransformationController = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const timeTaken = normalizeTimeTaken(req.body.timeTaken);
  const inchesLost = normalizeInchesLost(req.body.inchesLost);
  const achievements = String(req.body.achievements || "").trim();
  const description = String(req.body.description || "").trim();
  const status = String(req.body.status || "active").trim().toLowerCase();
  const uploadedOld = await uploadMulterField(req, "oldImage", S3_FOLDER);
  const uploadedNew = await uploadMulterField(req, "newImage", S3_FOLDER);
  const oldImage = uploadedOld ?? parseMediaKeyFromBody(req.body.oldImage, "oldImage");
  const newImage = uploadedNew ?? parseMediaKeyFromBody(req.body.newImage, "newImage");

  if (!name) throw new AppError("name is required", 400);
  if (!achievements) throw new AppError("achievements is required", 400);
  if (!description) throw new AppError("description is required", 400);
  if (!oldImage || !newImage) throw new AppError("oldImage and newImage are required", 400);
  if (!["active", "inactive"].includes(status)) throw new AppError("status must be active or inactive", 400);

  const transformation = await createTransformation({
    name,
    timeTaken,
    inchesLost,
    achievements,
    oldImage,
    newImage,
    description,
    status,
  });

  return res.status(201).json({
    status: true,
    message: "Transformation created successfully",
    transformation,
  });
});

exports.updateTransformationController = asyncHandler(async (req, res) => {
  const current = await getTransformationRecordById(req.params.id);
  if (!current) throw new AppError("Transformation not found", 404);

  const updates = {};

  if (req.body.timeTaken !== undefined) {
    updates.timeTaken = normalizeTimeTaken(req.body.timeTaken);
  }

  if (req.body.inchesLost !== undefined) {
    updates.inchesLost = normalizeInchesLost(req.body.inchesLost);
  }

  if (req.body.achievements !== undefined) {
    const achievements = String(req.body.achievements || "").trim();
    if (!achievements) throw new AppError("achievements cannot be empty", 400);
    updates.achievements = achievements;
  }

  if (req.body.description !== undefined) {
    const description = String(req.body.description || "").trim();
    if (!description) throw new AppError("description cannot be empty", 400);
    updates.description = description;
  }

  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!["active", "inactive"].includes(status)) throw new AppError("status must be active or inactive", 400);
    updates.status = status;
  }

  if (req.body.name !== undefined) {
    const name = String(req.body.name || "").trim();
    if (!name) throw new AppError("name cannot be empty", 400);
    updates.name = name;
  }

  if (req.body.oldImage !== undefined) {
    updates.oldImage = parseMediaKeyFromBody(req.body.oldImage, "oldImage") ?? "";
  }
  if (req.body.newImage !== undefined) {
    updates.newImage = parseMediaKeyFromBody(req.body.newImage, "newImage") ?? "";
  }

  const uploadedOld = await uploadMulterField(req, "oldImage", S3_FOLDER);
  if (uploadedOld) {
    if (current.oldImage) await deleteStoredMedia(current.oldImage);
    updates.oldImage = uploadedOld;
  }

  const uploadedNew = await uploadMulterField(req, "newImage", S3_FOLDER);
  if (uploadedNew) {
    if (current.newImage) await deleteStoredMedia(current.newImage);
    updates.newImage = uploadedNew;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let transformation;
  try {
    transformation = await updateTransformation(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Transformation not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Transformation updated successfully",
    transformation,
  });
});

exports.deleteTransformationController = asyncHandler(async (req, res) => {
  const current = await getTransformationRecordById(req.params.id);
  if (!current) throw new AppError("Transformation not found", 404);

  if (current.oldImage) await deleteStoredMedia(current.oldImage);
  if (current.newImage) await deleteStoredMedia(current.newImage);

  try {
    await deleteTransformation(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Transformation not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Transformation deleted successfully",
  });
});
