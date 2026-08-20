const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  uploadFileFromRequest,
  uploadMulterField,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const {
  normalizeDuration,
  isValidYoutubeUrl,
  resolveLibraryType,
  resolveDuration,
} = require("../../utils/wellnessLibraryFields");
const {
  createMentalWellbeing,
  getMentalWellbeingById,
  getMentalWellbeingRecordById,
  updateMentalWellbeing,
  deleteMentalWellbeing,
  listMentalWellbeing,
  MENTAL_WELLBEING_ALLOWED_STATUS,
  MENTAL_WELLBEING_ALLOWED_TYPE,
} = require("../../models/mentalWellbeingModel");

const S3_FOLDER = "mental-wellbeing";
const TITLE_MAX_LEN = 100;

function isFileType(type) {
  return type === "video" || type === "audio";
}

async function uploadMentalWellbeingMedia(req) {
  const thumbnail =
    (await uploadMulterField(req, "thumbnailFile", S3_FOLDER)) ||
    (await uploadMulterField(req, "thumbnail", S3_FOLDER));
  const file =
    (await uploadFileFromRequest(req, S3_FOLDER)) ||
    (await uploadMulterField(req, "videoFile", S3_FOLDER));
  return { thumbnail, file };
}

function readYtLink(body) {
  return String(body.ytLink || body.ytlink || body.link || "").trim();
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
  const type = resolveLibraryType(req.body.type, "ytlink");
  const status = String(req.body.status || "active").trim().toLowerCase();
  const rawDuration = req.body.duration || req.body.videoTime || "";
  const { thumbnail: uploadedThumb, file: uploadedFile } = await uploadMentalWellbeingMedia(req);
  const thumbnail = uploadedThumb ?? parseMediaKeyFromBody(req.body.thumbnail, "thumbnail") ?? "";

  if (!title) throw new AppError("title is required", 400);
  if (title.length > TITLE_MAX_LEN) throw new AppError(`title cannot exceed ${TITLE_MAX_LEN} characters`, 400);
  if (!MENTAL_WELLBEING_ALLOWED_TYPE.includes(type)) {
    throw new AppError("type must be video, audio, or ytlink", 400);
  }
  if (!MENTAL_WELLBEING_ALLOWED_STATUS.includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }
  if (!thumbnail) throw new AppError("thumbnail is required", 400);
  if (String(rawDuration).trim() && !normalizeDuration(rawDuration)) {
    throw new AppError("time must look like 5:12 (minutes:seconds), not a number", 400);
  }

  let ytLink = "";
  let file = "";
  let duration = "";

  if (type === "ytlink") {
    ytLink = readYtLink(req.body);
    if (!isValidYoutubeUrl(ytLink)) throw new AppError("A valid YouTube URL is required", 400);
    duration = await resolveDuration({ duration: rawDuration, ytLink });
  } else {
    file = uploadedFile ?? parseMediaKeyFromBody(req.body.file, "file") ?? "";
    if (!file) {
      throw new AppError(type === "audio" ? "Upload an audio file" : "Upload a video file", 400);
    }
    duration = normalizeDuration(rawDuration);
  }

  if (!duration) {
    throw new AppError("Could not detect media time. Enter time as 5:12 (minutes:seconds).", 400);
  }

  const item = await createMentalWellbeing({ title, type, ytLink, file, thumbnail, duration, status });

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
    const type = resolveLibraryType(req.body.type, current.type);
    if (!MENTAL_WELLBEING_ALLOWED_TYPE.includes(type)) {
      throw new AppError("type must be video, audio, or ytlink", 400);
    }
    updates.type = type;
  }

  const nextType = updates.type || current.type;
  const typeChanged = Boolean(updates.type && updates.type !== current.type);
  const { thumbnail: uploadedThumb, file: uploadedFile } = await uploadMentalWellbeingMedia(req);

  if (uploadedThumb) {
    if (current.thumbnail) await deleteStoredMedia(current.thumbnail);
    updates.thumbnail = uploadedThumb;
  } else if (req.body.thumbnail !== undefined) {
    const nextThumb = parseMediaKeyFromBody(req.body.thumbnail, "thumbnail") ?? "";
    if (!nextThumb && !current.thumbnail) throw new AppError("thumbnail is required", 400);
    if (nextThumb && current.thumbnail && current.thumbnail !== nextThumb) {
      await deleteStoredMedia(current.thumbnail);
    }
    if (nextThumb) updates.thumbnail = nextThumb;
  }

  let ytLink = current.ytLink;
  if (req.body.ytLink !== undefined || req.body.ytlink !== undefined || req.body.link !== undefined) {
    ytLink = readYtLink(req.body);
  }

  if (nextType === "ytlink") {
    if (!isValidYoutubeUrl(ytLink)) throw new AppError("A valid YouTube URL is required", 400);
    updates.ytLink = ytLink;
    if (current.file) {
      await deleteStoredMedia(current.file);
      updates.file = "";
    }
  } else {
    let file;
    if (uploadedFile) {
      file = uploadedFile;
    } else if (req.body.file !== undefined) {
      file = parseMediaKeyFromBody(req.body.file, "file") ?? "";
    } else if (!typeChanged) {
      file = current.file;
    } else {
      file = "";
    }
    if (!file) {
      throw new AppError(nextType === "audio" ? "Upload an audio file" : "Upload a video file", 400);
    }
    if (current.file && current.file !== file) await deleteStoredMedia(current.file);
    if (file !== current.file || typeChanged) updates.file = file;
    updates.ytLink = "";
  }

  const rawDuration = req.body.duration ?? req.body.videoTime;
  const ytLinkChanged = nextType === "ytlink" && ytLink !== (current.ytLink || "");
  if (rawDuration !== undefined) {
    if (String(rawDuration).trim() && !normalizeDuration(rawDuration)) {
      throw new AppError("time must look like 5:12 (minutes:seconds), not a number", 400);
    }
    const duration = nextType === "ytlink"
      ? await resolveDuration({ duration: rawDuration, ytLink })
      : normalizeDuration(rawDuration, current.duration);
    if (!duration) {
      throw new AppError("Could not detect media time. Enter time as 5:12 (minutes:seconds).", 400);
    }
    updates.duration = duration;
  } else if (ytLinkChanged) {
    const duration = await resolveDuration({ ytLink });
    if (duration) updates.duration = duration;
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
  if (current.thumbnail) await deleteStoredMedia(current.thumbnail);

  try {
    await deleteMentalWellbeing(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") throw new AppError("Mental wellbeing item not found", 404);
    throw err;
  }
  return res.status(200).json({ status: true, message: "Mental wellbeing item deleted successfully" });
});

