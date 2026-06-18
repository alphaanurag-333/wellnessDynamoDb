const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  uploadMulterField,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const {
  createHealthRecipe,
  getHealthRecipeById,
  getHealthRecipeRecordById,
  updateHealthRecipe,
  deleteHealthRecipe,
  listHealthRecipes,
  normalizeType,
  HEALTH_RECIPE_ALLOWED_STATUS,
  HEALTH_RECIPE_ALLOWED_TYPE,
} = require("../../models/healthRecipeModel");
const { parseVideoSpecificationFromBody } = require("../../utils/mediaFieldAliases");

const S3_FOLDER = "health-recipe";

function resolveRecipeVideoField(body, uploadedVideo, type) {
  if (type === "ytlink") {
    return "";
  }
  if (uploadedVideo) {
    return uploadedVideo;
  }
  if (body.video === undefined || body.video === null) {
    return "";
  }
  return parseMediaKeyFromBody(body.video, "video") ?? "";
}

async function uploadRecipeMedia(req) {
  const thumbnail =
    (await uploadMulterField(req, "thumbnailFile", S3_FOLDER)) ||
    (await uploadMulterField(req, "file", S3_FOLDER));
  const video = await uploadMulterField(req, "videoFile", S3_FOLDER);
  return { thumbnail, video };
}

function parseVideoSpecification(value) {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value.map((x) => String(x || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x || "").trim()).filter(Boolean);
      }
    } catch {
      /* comma / newline separated */
    }
    return raw.split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

exports.listHealthRecipesController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, type, healthConcernId, search } = req.query;
  const data = await listHealthRecipes({ page, limit, status, type, healthConcernId, search });
  return res.status(200).json({ status: true, healthRecipes: data.healthRecipes, pagination: data.pagination });
});

exports.getHealthRecipeByIdController = asyncHandler(async (req, res) => {
  const healthRecipe = await getHealthRecipeById(req.params.id);
  if (!healthRecipe) throw new AppError("Health recipe not found", 404);
  return res.status(200).json({ status: true, healthRecipe });
});

exports.createHealthRecipeController = asyncHandler(async (req, res) => {
  const healthConcernId = String(req.body.healthConcernId || req.body.health_concern_id || "").trim();
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const { thumbnail: uploadedThumb, video: uploadedVideo } = await uploadRecipeMedia(req);
  const thumbnail = uploadedThumb ?? parseMediaKeyFromBody(req.body.thumbnail, "thumbnail");
  const rawType = String(req.body.type || "ytlink").trim().toLowerCase();
  const type = normalizeType(rawType);
  const ytLink = String(req.body.ytLink || req.body.ytlink || "").trim();
  const video = resolveRecipeVideoField(req.body, uploadedVideo, type);
  const videoSpecification = parseVideoSpecification(req.body.videoSpecification ?? req.body.video_specification);
  const status = String(req.body.status || "active").trim().toLowerCase();

  if (!healthConcernId) throw new AppError("healthConcernId is required", 400);
  if (!title) throw new AppError("title is required", 400);
  if (!description) throw new AppError("description is required", 400);
  if (!thumbnail) throw new AppError("thumbnail is required", 400);
  if (!HEALTH_RECIPE_ALLOWED_TYPE.includes(rawType)) throw new AppError("type must be ytlink or video", 400);
  if (!HEALTH_RECIPE_ALLOWED_STATUS.includes(status)) throw new AppError("status must be active or inactive", 400);
  if (type === "ytlink" && !ytLink) throw new AppError("ytLink is required when type is ytlink", 400);
  if (type === "video" && !video) throw new AppError("video is required when type is video", 400);

  const healthRecipe = await createHealthRecipe({
    healthConcernId,
    title,
    description,
    thumbnail,
    type,
    ytLink,
    video,
    videoSpecification: videoSpecification || [],
    status,
  });

  return res.status(201).json({ status: true, message: "Health recipe created successfully", healthRecipe });
});

exports.updateHealthRecipeController = asyncHandler(async (req, res) => {
  const current = await getHealthRecipeRecordById(req.params.id);
  if (!current) throw new AppError("Health recipe not found", 404);

  const updates = {};
  if (req.body.healthConcernId !== undefined || req.body.health_concern_id !== undefined) {
    const phc = String(req.body.healthConcernId ?? req.body.health_concern_id ?? "").trim();
    if (!phc) throw new AppError("healthConcernId cannot be empty", 400);
    updates.healthConcernId = phc;
  }
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
    if (!HEALTH_RECIPE_ALLOWED_STATUS.includes(status)) throw new AppError("status must be active or inactive", 400);
    updates.status = status;
  }
  if (req.body.type !== undefined) {
    const rawType = String(req.body.type || "").trim().toLowerCase();
    if (!HEALTH_RECIPE_ALLOWED_TYPE.includes(rawType)) throw new AppError("type must be ytlink or video", 400);
    updates.type = normalizeType(rawType);
  }
  if (req.body.ytLink !== undefined || req.body.ytlink !== undefined) {
    updates.ytLink = String(req.body.ytLink ?? req.body.ytlink ?? "").trim();
  }
  if (req.body.thumbnail !== undefined) {
    updates.thumbnail = parseMediaKeyFromBody(req.body.thumbnail, "thumbnail") ?? "";
  }
  const specRaw = parseVideoSpecificationFromBody(req.body);
  if (specRaw !== undefined) {
    updates.videoSpecification = parseVideoSpecification(specRaw);
  }

  const { thumbnail: uploadedThumb, video: uploadedVideo } = await uploadRecipeMedia(req);
  const nextTypeEarly = updates.type || current.type;

  if (uploadedThumb) {
    if (current.thumbnail) await deleteStoredMedia(current.thumbnail);
    updates.thumbnail = uploadedThumb;
  }

  const videoTouched =
    req.body.video !== undefined ||
    uploadedVideo ||
    (updates.type === "ytlink" && current.type === "video");
  if (videoTouched) {
    const newVideo = resolveRecipeVideoField(req.body, uploadedVideo, nextTypeEarly);
    if (current.video && newVideo !== current.video) {
      await deleteStoredMedia(current.video);
    }
    updates.video = newVideo;
  }

  const nextType = updates.type || current.type;
  const nextYtLink = updates.ytLink !== undefined ? updates.ytLink : current.ytLink;
  const nextVideo = updates.video !== undefined ? updates.video : current.video;
  if (nextType === "ytlink" && !String(nextYtLink || "").trim()) {
    throw new AppError("ytLink is required when type is ytlink", 400);
  }
  if (nextType === "video" && !String(nextVideo || "").trim()) {
    throw new AppError("video is required when type is video", 400);
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let healthRecipe;
  try {
    healthRecipe = await updateHealthRecipe(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") throw new AppError("Health recipe not found", 404);
    throw err;
  }
  return res.status(200).json({ status: true, message: "Health recipe updated successfully", healthRecipe });
});

exports.deleteHealthRecipeController = asyncHandler(async (req, res) => {
  const current = await getHealthRecipeRecordById(req.params.id);
  if (!current) throw new AppError("Health recipe not found", 404);
  if (current.thumbnail) await deleteStoredMedia(current.thumbnail);
  if (current.video) await deleteStoredMedia(current.video);

  try {
    await deleteHealthRecipe(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") throw new AppError("Health recipe not found", 404);
    throw err;
  }
  return res.status(200).json({ status: true, message: "Health recipe deleted successfully" });
});
