const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { normalizePrakrutiType, PRAKRUTI_TYPES } = require("../../utils/prakrutiConstants");
const {
  createPrakrutiThingToAvoid,
  getPrakrutiThingToAvoidById,
  getPrakrutiThingToAvoidRecordById,
  updatePrakrutiThingToAvoid,
  deletePrakrutiThingToAvoid,
  listPrakrutiThingsToAvoid,
  PRAKRUTI_THING_TO_AVOID_ALLOWED_STATUS,
} = require("../../models/prakrutiThingToAvoidModel");

const TITLE_MAX_LEN = 300;
const SORT_ORDER_MIN = 0;
const SORT_ORDER_MAX = 100000;

function validateSortOrder(value) {
  if (value === undefined || value === null || value === "") return;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < SORT_ORDER_MIN || n > SORT_ORDER_MAX) {
    throw new AppError(`sortOrder must be a whole number between ${SORT_ORDER_MIN} and ${SORT_ORDER_MAX}`, 400);
  }
}

exports.listPrakrutiThingsToAvoidController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search, prakrutiType } = req.query;
  const data = await listPrakrutiThingsToAvoid({ page, limit, status, search, prakrutiType });
  return res.status(200).json({ status: true, thingsToAvoid: data.thingsToAvoid, pagination: data.pagination });
});

exports.getPrakrutiThingToAvoidByIdController = asyncHandler(async (req, res) => {
  const thingToAvoid = await getPrakrutiThingToAvoidById(req.params.id);
  if (!thingToAvoid) throw new AppError("Thing to avoid not found", 404);
  return res.status(200).json({ status: true, thingToAvoid });
});

exports.createPrakrutiThingToAvoidController = asyncHandler(async (req, res) => {
  const prakrutiType = normalizePrakrutiType(req.body.prakrutiType);
  const title = String(req.body.title || "").trim();
  const status = String(req.body.status || "active").trim().toLowerCase();

  if (!prakrutiType) {
    throw new AppError(`prakrutiType is required (${PRAKRUTI_TYPES.join(", ")})`, 400);
  }
  if (!title) throw new AppError("title is required", 400);
  if (title.length > TITLE_MAX_LEN) throw new AppError(`title cannot exceed ${TITLE_MAX_LEN} characters`, 400);
  if (!PRAKRUTI_THING_TO_AVOID_ALLOWED_STATUS.includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }
  validateSortOrder(req.body.sortOrder);

  let thingToAvoid;
  try {
    thingToAvoid = await createPrakrutiThingToAvoid({
      prakrutiType,
      title,
      sortOrder: req.body.sortOrder,
      status,
    });
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  return res.status(201).json({
    status: true,
    message: "Thing to avoid created successfully",
    thingToAvoid,
  });
});

exports.updatePrakrutiThingToAvoidController = asyncHandler(async (req, res) => {
  const current = await getPrakrutiThingToAvoidRecordById(req.params.id);
  if (!current) throw new AppError("Thing to avoid not found", 404);

  const updates = {};
  if (req.body.prakrutiType !== undefined) {
    const prakrutiType = normalizePrakrutiType(req.body.prakrutiType);
    if (!prakrutiType) {
      throw new AppError(`Invalid prakrutiType (${PRAKRUTI_TYPES.join(", ")})`, 400);
    }
    updates.prakrutiType = prakrutiType;
  }
  if (req.body.title !== undefined) {
    const title = String(req.body.title || "").trim();
    if (!title) throw new AppError("title cannot be empty", 400);
    if (title.length > TITLE_MAX_LEN) throw new AppError(`title cannot exceed ${TITLE_MAX_LEN} characters`, 400);
    updates.title = title;
  }
  if (req.body.sortOrder !== undefined) {
    validateSortOrder(req.body.sortOrder);
    updates.sortOrder = req.body.sortOrder;
  }
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!PRAKRUTI_THING_TO_AVOID_ALLOWED_STATUS.includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let thingToAvoid;
  try {
    thingToAvoid = await updatePrakrutiThingToAvoid(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Thing to avoid not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Thing to avoid updated successfully",
    thingToAvoid,
  });
});

exports.deletePrakrutiThingToAvoidController = asyncHandler(async (req, res) => {
  const current = await getPrakrutiThingToAvoidRecordById(req.params.id);
  if (!current) throw new AppError("Thing to avoid not found", 404);

  try {
    await deletePrakrutiThingToAvoid(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Thing to avoid not found", 404);
    }
    throw err;
  }

  return res.status(200).json({ status: true, message: "Thing to avoid deleted successfully" });
});
