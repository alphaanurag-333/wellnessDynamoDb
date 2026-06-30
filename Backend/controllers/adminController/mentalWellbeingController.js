const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  uploadFileFromRequest,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const {
  createMentalWellbeing,
  getMentalWellbeingById,
  getMentalWellbeingRecordById,
  updateMentalWellbeing,
  deleteMentalWellbeing,
  listMentalWellbeing,
  normalizeType,
  MENTAL_WELLBEING_ALLOWED_STATUS,
  MENTAL_WELLBEING_ALLOWED_TYPE,
} = require("../../models/mentalWellbeingModel");

const S3_FOLDER = "mental-wellbeing";
const TITLE_MAX_LEN = 100;

function isFileType(type) {
  return type === "video" || type === "audio";
}

exports.listMentalWellbeingController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, type, search } = req.query;
  const data = await listMentalWellbeing({ page, limit, status, type, search });
  return res.status(200).json({ status: true, items: data.items, pagination: data.pagination });
});

exports.getMentalWellbeingByIdController = asyncHandler(async (req, res) => {
  const item = await getMentalWellbeingById(req.params.id);
  if (!item) throw new AppError("Mental wellbeing item not found", 404);
  return res.status(200).json({ status: true, item });
});

exports.createMentalWellbeingController = asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim();
  const rawType = String(req.body.type || "ytlink").trim().toLowerCase();
  const type = normalizeType(rawType);
  const status = String(req.body.status || "active").trim().toLowerCase();

  if (!title) throw new AppError("title is required", 400);
  if (title.length > TITLE_MAX_LEN) throw new AppError(`title cannot exceed ${TITLE_MAX_LEN} characters`, 400);
  if (!MENTAL_WELLBEING_ALLOWED_TYPE.includes(rawType)) {
    throw new AppError("type must be ytlink, video, or audio", 400);
  }
  if (!MENTAL_WELLBEING_ALLOWED_STATUS.includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }

  let ytLink = "";
  let file = "";
  if (type === "ytlink") {
    ytLink = String(req.body.ytLink || req.body.ytlink || "").trim();
    if (!ytLink) throw new AppError("ytLink is required when type is ytlink", 400);
  } else {
    const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
    file = uploadedKey ?? parseMediaKeyFromBody(req.body.file, "file") ?? "";
    if (!file) throw new AppError(`${type} file is required when type is ${type}`, 400);
  }

  const item = await createMentalWellbeing({ title, type, ytLink, file, status });

  return res.status(201).json({ status: true, message: "Mental wellbeing item created successfully", item });
});

exports.updateMentalWellbeingController = asyncHandler(async (req, res) => {
  const current = await getMentalWellbeingRecordById(req.params.id);
  if (!current) throw new AppError("Mental wellbeing item not found", 404);

  const updates = {};
  if (req.body.title !== undefined) {
    const title = String(req.body.title || "").trim();
    if (!title) throw new AppError("title cannot be empty", 400);
    if (title.length > TITLE_MAX_LEN) throw new AppError(`title cannot exceed ${TITLE_MAX_LEN} characters`, 400);
    updates.title = title;
  }
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!MENTAL_WELLBEING_ALLOWED_STATUS.includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }
  if (req.body.type !== undefined) {
    const rawType = String(req.body.type || "").trim().toLowerCase();
    if (!MENTAL_WELLBEING_ALLOWED_TYPE.includes(rawType)) {
      throw new AppError("type must be ytlink, video, or audio", 400);
    }
    updates.type = normalizeType(rawType);
  }

  const nextType = updates.type || current.type;
  const typeChanged = updates.type && updates.type !== current.type;
  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);

  if (nextType === "ytlink") {
    let ytLink;
    if (req.body.ytLink !== undefined || req.body.ytlink !== undefined) {
      ytLink = String(req.body.ytLink ?? req.body.ytlink ?? "").trim();
    } else if (!typeChanged) {
      ytLink = current.ytLink;
    } else {
      ytLink = "";
    }
    if (!ytLink) throw new AppError("ytLink is required when type is ytlink", 400);
    updates.ytLink = ytLink;
    // Switched away from file type: clean up old media and clear file.
    if (current.file && (typeChanged || uploadedKey)) {
      await deleteStoredMedia(current.file);
      updates.file = "";
    }
  } else {
    let file;
    if (uploadedKey) {
      file = uploadedKey;
    } else if (req.body.file !== undefined) {
      file = parseMediaKeyFromBody(req.body.file, "file") ?? "";
    } else if (!typeChanged) {
      file = current.file;
    } else {
      file = "";
    }
    if (!file) throw new AppError(`${nextType} file is required when type is ${nextType}`, 400);
    if (current.file && current.file !== file) {
      await deleteStoredMedia(current.file);
    }
    if (file !== current.file || typeChanged) updates.file = file;
    // Moving into a file type clears the YouTube link.
    if (typeChanged && current.ytLink) updates.ytLink = "";
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let item;
  try {
    item = await updateMentalWellbeing(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") throw new AppError("Mental wellbeing item not found", 404);
    throw err;
  }
  return res.status(200).json({ status: true, message: "Mental wellbeing item updated successfully", item });
});

exports.deleteMentalWellbeingController = asyncHandler(async (req, res) => {
  const current = await getMentalWellbeingRecordById(req.params.id);
  if (!current) throw new AppError("Mental wellbeing item not found", 404);
  if (isFileType(current.type) && current.file) await deleteStoredMedia(current.file);

  try {
    await deleteMentalWellbeing(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") throw new AppError("Mental wellbeing item not found", 404);
    throw err;
  }
  return res.status(200).json({ status: true, message: "Mental wellbeing item deleted successfully" });
});
