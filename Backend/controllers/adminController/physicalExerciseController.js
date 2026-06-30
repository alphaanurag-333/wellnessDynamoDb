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
  normalizeType,
  PHYSICAL_EXERCISE_ALLOWED_STATUS,
  PHYSICAL_EXERCISE_ALLOWED_TYPE,
} = require("../../models/physicalExerciseModel");

const S3_FOLDER = "physical-exercise";

async function uploadPhysicalExerciseVideo(req) {
  return (
    (await uploadMulterField(req, "videoFile", S3_FOLDER)) ||
    (await uploadMulterField(req, "file", S3_FOLDER))
  );
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
  const rawType = String(req.body.type || "ytlink").trim().toLowerCase();
  const type = normalizeType(rawType);
  const status = String(req.body.status || "active").trim().toLowerCase();

  if (!title) throw new AppError("title is required", 400);
  if (!description) throw new AppError("description is required", 400);
  if (!PHYSICAL_EXERCISE_ALLOWED_TYPE.includes(rawType)) {
    throw new AppError("type must be ytlink or video", 400);
  }
  if (!PHYSICAL_EXERCISE_ALLOWED_STATUS.includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }

  let link;
  if (type === "video") {
    const uploadedVideo = await uploadPhysicalExerciseVideo(req);
    link = uploadedVideo ?? parseMediaKeyFromBody(req.body.link, "link") ?? "";
    if (!link) throw new AppError("video file is required when type is video", 400);
  } else {
    link = String(req.body.link || "").trim();
    if (!link) throw new AppError("link is required when type is ytlink", 400);
  }

  const physicalExercise = await createPhysicalExercise({ title, description, type, link, status });

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
    const description = String(req.body.description || "").trim();
    if (!description) throw new AppError("description cannot be empty", 400);
    updates.description = description;
  }
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!PHYSICAL_EXERCISE_ALLOWED_STATUS.includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }
  if (req.body.type !== undefined) {
    const rawType = String(req.body.type || "").trim().toLowerCase();
    if (!PHYSICAL_EXERCISE_ALLOWED_TYPE.includes(rawType)) {
      throw new AppError("type must be ytlink or video", 400);
    }
    updates.type = normalizeType(rawType);
  }

  const nextType = updates.type || current.type;
  const typeChanged = updates.type && updates.type !== current.type;
  const uploadedVideo = await uploadPhysicalExerciseVideo(req);

  let newLink;
  if (nextType === "video") {
    if (uploadedVideo) {
      newLink = uploadedVideo;
    } else if (req.body.link !== undefined) {
      newLink = parseMediaKeyFromBody(req.body.link, "link") ?? "";
    } else if (!typeChanged) {
      newLink = current.link;
    } else {
      newLink = "";
    }
    if (!newLink) throw new AppError("video file is required when type is video", 400);
  } else {
    if (req.body.link !== undefined) {
      newLink = String(req.body.link || "").trim();
    } else if (!typeChanged) {
      newLink = current.link;
    } else {
      newLink = "";
    }
    if (!newLink) throw new AppError("link is required when type is ytlink", 400);
  }

  const linkChanged = newLink !== current.link;
  if (typeChanged || linkChanged || uploadedVideo) {
    updates.link = newLink;
  }

  if (current.type === "video" && current.link && current.link !== newLink) {
    await deleteStoredMedia(current.link);
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
