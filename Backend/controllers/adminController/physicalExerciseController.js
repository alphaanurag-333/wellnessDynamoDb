const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  uploadMulterField,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const {
  createPhysicalExercise,
  getPhysicalExerciseById,
  getPhysicalExerciseRecordById,
  updatePhysicalExercise,
  deletePhysicalExercise,
  listPhysicalExercises,
  PHYSICAL_EXERCISE_ALLOWED_STATUS,
  PHYSICAL_EXERCISE_ALLOWED_TYPE,
} = require("../../models/physicalExerciseModel");
const {
  normalizeDuration,
  isValidYoutubeUrl,
  resolveLibraryType,
  resolveDuration,
} = require("../../utils/wellnessLibraryFields");

const S3_FOLDER = "physical-exercise";

async function uploadPhysicalExerciseMedia(req) {
  const thumbnail =
    (await uploadMulterField(req, "thumbnailFile", S3_FOLDER)) ||
    (await uploadMulterField(req, "thumbnail", S3_FOLDER));
  const video =
    (await uploadMulterField(req, "videoFile", S3_FOLDER)) ||
    (await uploadMulterField(req, "file", S3_FOLDER));
  return { thumbnail, video };
}

function readYtLink(body) {
  const explicit = String(body.ytLink || body.ytlink || "").trim();
  if (explicit) return explicit;
  const link = String(body.link || "").trim();
  return isValidYoutubeUrl(link) ? link : "";
}

exports.listPhysicalExerciseController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, type, search } = req.query;
  const data = await listPhysicalExercises({ page, limit, status, type, search });
  return res.status(200).json({
    status: true,
    physicalExercises: data.physicalExercises,
    pagination: data.pagination,
  });
});

exports.getPhysicalExerciseByIdController = asyncHandler(async (req, res) => {
  const item = await getPhysicalExerciseById(req.params.id);
  if (!item) throw new AppError("Physical exercise not found", 404);
  return res.status(200).json({ status: true, physicalExercise: item });
});

exports.createPhysicalExerciseController = asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const type = resolveLibraryType(req.body.type, "ytlink");
  const status = String(req.body.status || "active").trim().toLowerCase();
  const rawDuration = req.body.duration || req.body.videoTime || "";
  const { thumbnail: uploadedThumb, video: uploadedVideo } = await uploadPhysicalExerciseMedia(req);
  const thumbnail = uploadedThumb ?? parseMediaKeyFromBody(req.body.thumbnail, "thumbnail") ?? "";

  if (!title) throw new AppError("title is required", 400);
  if (!PHYSICAL_EXERCISE_ALLOWED_TYPE.includes(type)) {
    throw new AppError("type must be video, audio, or ytlink", 400);
  }
  if (!PHYSICAL_EXERCISE_ALLOWED_STATUS.includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }
  if (!thumbnail) throw new AppError("thumbnail is required", 400);
  if (String(rawDuration).trim() && !normalizeDuration(rawDuration)) {
    throw new AppError("time must look like 5:12 (minutes:seconds), not a number", 400);
  }

  let link = "";
  let ytLink = "";
  let duration = "";

  if (type === "ytlink") {
    ytLink = readYtLink(req.body);
    if (!isValidYoutubeUrl(ytLink)) throw new AppError("A valid YouTube URL is required", 400);
    link = ytLink;
    duration = await resolveDuration({ duration: rawDuration, ytLink });
  } else {
    link = uploadedVideo ?? parseMediaKeyFromBody(req.body.link, "link") ?? "";
    if (!link || isValidYoutubeUrl(link)) {
      throw new AppError(type === "audio" ? "Upload an audio file" : "Upload a video file", 400);
    }
    duration = normalizeDuration(rawDuration);
  }

  if (!duration) {
    throw new AppError("Could not detect media time. Enter time as 5:12 (minutes:seconds).", 400);
  }

  const physicalExercise = await createPhysicalExercise({
    title,
    description,
    type,
    link,
    ytLink,
    thumbnail,
    duration,
    status,
  });

  return res.status(201).json({
    status: true,
    message: "Physical exercise created successfully",
    physicalExercise,
  });
});

exports.updatePhysicalExerciseController = asyncHandler(async (req, res) => {
  const current = await getPhysicalExerciseRecordById(req.params.id);
  if (!current) throw new AppError("Physical exercise not found", 404);

  const updates = {};
  if (req.body.title !== undefined) {
    const title = String(req.body.title || "").trim();
    if (!title) throw new AppError("title cannot be empty", 400);
    updates.title = title;
  }
  if (req.body.description !== undefined) {
    updates.description = String(req.body.description || "").trim();
  }
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!PHYSICAL_EXERCISE_ALLOWED_STATUS.includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }
  if (req.body.type !== undefined) {
    const type = resolveLibraryType(req.body.type, current.type);
    if (!PHYSICAL_EXERCISE_ALLOWED_TYPE.includes(type)) {
      throw new AppError("type must be video, audio, or ytlink", 400);
    }
    updates.type = type;
  }

  const nextType = updates.type || current.type;
  const typeChanged = Boolean(updates.type && updates.type !== current.type);
  const { thumbnail: uploadedThumb, video: uploadedVideo } = await uploadPhysicalExerciseMedia(req);

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

  let ytLink = current.ytLink || (current.type === "ytlink" ? current.link : "");
  if (req.body.ytLink !== undefined || req.body.ytlink !== undefined || req.body.link !== undefined) {
    ytLink = readYtLink(req.body);
  }

  let newLink = current.link;
  if (nextType === "ytlink") {
    if (!isValidYoutubeUrl(ytLink)) throw new AppError("A valid YouTube URL is required", 400);
    newLink = ytLink;
  } else if (uploadedVideo) {
    newLink = uploadedVideo;
    ytLink = "";
  } else if (req.body.link !== undefined && !isValidYoutubeUrl(String(req.body.link || ""))) {
    newLink = parseMediaKeyFromBody(req.body.link, "link") ?? "";
    ytLink = "";
  } else if (typeChanged) {
    newLink = (current.type === "video" || current.type === "audio") ? current.link : "";
    ytLink = "";
  }
  if ((nextType === "video" || nextType === "audio") && !newLink) {
    throw new AppError(nextType === "audio" ? "Upload an audio file" : "Upload a video file", 400);
  }

  if (typeChanged || newLink !== current.link || uploadedVideo || ytLink !== (current.ytLink || "")) {
    updates.link = newLink;
    updates.ytLink = nextType === "ytlink" ? ytLink : "";
  }

  if ((current.type === "video" || current.type === "audio") && current.link && current.link !== newLink) {
    await deleteStoredMedia(current.link);
  }

  const rawDuration = req.body.duration ?? req.body.videoTime;
  const ytLinkChanged = nextType === "ytlink" && ytLink !== (current.ytLink || current.link || "");
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

  let physicalExercise;
  try {
    physicalExercise = await updatePhysicalExercise(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Physical exercise not found", 404);
    }
    throw err;
  }
  return res.status(200).json({
    status: true,
    message: "Physical exercise updated successfully",
    physicalExercise,
  });
});

exports.deletePhysicalExerciseController = asyncHandler(async (req, res) => {
  const current = await getPhysicalExerciseRecordById(req.params.id);
  if (!current) throw new AppError("Physical exercise not found", 404);
  if (current.type === "video" && current.link) await deleteStoredMedia(current.link);
  if (current.thumbnail) await deleteStoredMedia(current.thumbnail);

  try {
    await deletePhysicalExercise(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Physical exercise not found", 404);
    }
    throw err;
  }
  return res.status(200).json({ status: true, message: "Physical exercise deleted successfully" });
});

