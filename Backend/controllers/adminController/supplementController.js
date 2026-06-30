const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  uploadFileFromRequest,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const {
  createSupplement,
  getSupplementById,
  getSupplementRecordById,
  updateSupplement,
  deleteSupplement,
  listSupplements,
  SUPPLEMENT_ALLOWED_STATUS,
} = require("../../models/supplementModel");

const S3_FOLDER = "supplement";

const NAME_MAX_LEN = 60;
const UNIT_MAX_LEN = 20;
const DESCRIPTION_MAX_LEN = 1000;

function parsePositiveNumber(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new AppError(`${field} must be a non-negative number`, 400);
  return n;
}

exports.listSupplementsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const data = await listSupplements({ page, limit, status, search });
  return res.status(200).json({ status: true, supplements: data.supplements, pagination: data.pagination });
});

exports.getSupplementByIdController = asyncHandler(async (req, res) => {
  const supplement = await getSupplementById(req.params.id);
  if (!supplement) throw new AppError("Supplement not found", 404);
  return res.status(200).json({ status: true, supplement });
});

exports.createSupplementController = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const description = String(req.body.description || "").trim();
  const unit = String(req.body.unit || "").trim();
  const status = String(req.body.status || "active").trim().toLowerCase();
  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  const image = uploadedKey ?? parseMediaKeyFromBody(req.body.image, "image");

  if (!name) throw new AppError("name is required", 400);
  if (name.length > NAME_MAX_LEN) throw new AppError(`name cannot exceed ${NAME_MAX_LEN} characters`, 400);
  if (!description) throw new AppError("description is required", 400);
  if (description.length > DESCRIPTION_MAX_LEN) throw new AppError(`description cannot exceed ${DESCRIPTION_MAX_LEN} characters`, 400);
  if (!unit) throw new AppError("unit is required", 400);
  if (unit.length > UNIT_MAX_LEN) throw new AppError(`unit cannot exceed ${UNIT_MAX_LEN} characters`, 400);
  const packSize = parsePositiveNumber(req.body.packSize, "packSize");
  const price = parsePositiveNumber(req.body.price, "price");
  if (!image) throw new AppError("image is required", 400);
  if (!SUPPLEMENT_ALLOWED_STATUS.includes(status)) throw new AppError("status must be active or inactive", 400);

  const supplement = await createSupplement({ name, description, packSize, unit, price, image, status });

  return res.status(201).json({ status: true, message: "Supplement created successfully", supplement });
});

exports.updateSupplementController = asyncHandler(async (req, res) => {
  const current = await getSupplementRecordById(req.params.id);
  if (!current) throw new AppError("Supplement not found", 404);

  const updates = {};
  if (req.body.name !== undefined) {
    const name = String(req.body.name || "").trim();
    if (!name) throw new AppError("name cannot be empty", 400);
    if (name.length > NAME_MAX_LEN) throw new AppError(`name cannot exceed ${NAME_MAX_LEN} characters`, 400);
    updates.name = name;
  }
  if (req.body.description !== undefined) {
    const description = String(req.body.description || "").trim();
    if (!description) throw new AppError("description cannot be empty", 400);
    if (description.length > DESCRIPTION_MAX_LEN) throw new AppError(`description cannot exceed ${DESCRIPTION_MAX_LEN} characters`, 400);
    updates.description = description;
  }
  if (req.body.unit !== undefined) {
    const unit = String(req.body.unit || "").trim();
    if (!unit) throw new AppError("unit cannot be empty", 400);
    if (unit.length > UNIT_MAX_LEN) throw new AppError(`unit cannot exceed ${UNIT_MAX_LEN} characters`, 400);
    updates.unit = unit;
  }
  if (req.body.packSize !== undefined) {
    updates.packSize = parsePositiveNumber(req.body.packSize, "packSize");
  }
  if (req.body.price !== undefined) {
    updates.price = parsePositiveNumber(req.body.price, "price");
  }
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!SUPPLEMENT_ALLOWED_STATUS.includes(status)) throw new AppError("status must be active or inactive", 400);
    updates.status = status;
  }
  if (req.body.image !== undefined) {
    updates.image = parseMediaKeyFromBody(req.body.image, "image") ?? "";
  }

  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (uploadedKey) {
    if (current.image) await deleteStoredMedia(current.image);
    updates.image = uploadedKey;
  }

  if (Object.keys(updates).length === 0) throw new AppError("At least one field is required for update", 400);

  let supplement;
  try {
    supplement = await updateSupplement(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") throw new AppError("Supplement not found", 404);
    throw err;
  }
  return res.status(200).json({ status: true, message: "Supplement updated successfully", supplement });
});

exports.deleteSupplementController = asyncHandler(async (req, res) => {
  const current = await getSupplementRecordById(req.params.id);
  if (!current) throw new AppError("Supplement not found", 404);
  if (current.image) await deleteStoredMedia(current.image);

  try {
    await deleteSupplement(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") throw new AppError("Supplement not found", 404);
    throw err;
  }
  return res.status(200).json({ status: true, message: "Supplement deleted successfully" });
});
