const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  uploadMulterField,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const {
  createYoga,
  getYogaById,
  getYogaRecordById,
  updateYoga,
  deleteYoga,
  listYoga,
  normalizeType,
  YOGA_ALLOWED_STATUS,
  YOGA_ALLOWED_TYPE,
} = require("../../models/yogaModel");
const { dispatchBroadcastNotification } = require("../../services/notificationDispatchService");

const S3_FOLDER = "yoga";

/** ytlink = YouTube URL in ytLink, no S3 video. video = S3 file only. */
function resolveYogaVideoField(body, uploadedVideo, type) {
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

async function uploadYogaMedia(req) {
  const thumbnail =
    (await uploadMulterField(req, "thumbnailFile", S3_FOLDER)) ||
    (await uploadMulterField(req, "file", S3_FOLDER));
  const video = await uploadMulterField(req, "videoFile", S3_FOLDER);
  return { thumbnail, video };
}

exports.listYogaController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, type, search } = req.query;
  const data = await listYoga({ page, limit, status, type, search });
  return res.status(200).json({ status: true, yoga: data.yoga, pagination: data.pagination });
});

exports.getYogaByIdController = asyncHandler(async (req, res) => {
  const item = await getYogaById(req.params.id);
  if (!item) throw new AppError("Yoga not found", 404);
  return res.status(200).json({ status: true, yoga: item });
});

exports.createYogaController = asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim();
  const { thumbnail: uploadedThumb, video: uploadedVideo } = await uploadYogaMedia(req);
  const thumbnail = uploadedThumb ?? parseMediaKeyFromBody(req.body.thumbnail, "thumbnail");
  const rawType = String(req.body.type || "ytlink").trim().toLowerCase();
  const type = normalizeType(rawType);
  const ytLink = String(req.body.ytLink || req.body.ytlink || "").trim();
  const video = resolveYogaVideoField(req.body, uploadedVideo, type);
  const status = String(req.body.status || "active").trim().toLowerCase();

  if (!title) throw new AppError("title is required", 400);
  if (!thumbnail) throw new AppError("thumbnail is required", 400);
  if (!YOGA_ALLOWED_TYPE.includes(rawType)) throw new AppError("type must be ytlink or video", 400);
  if (!YOGA_ALLOWED_STATUS.includes(status)) throw new AppError("status must be active or inactive", 400);
  if (type === "ytlink" && !ytLink) throw new AppError("ytLink is required when type is ytlink", 400);
  if (type === "video" && !video) throw new AppError("video is required when type is video", 400);

  const yoga = await createYoga({ title, thumbnail, type, ytLink, video, status });

  if (status === "active") {
    dispatchBroadcastNotification({
      kind: "yoga",
      message: `New yoga session: ${title}`,
      image: thumbnail,
      title,
      referenceId: yoga.id || yoga._id,
      referenceType: "yoga",
    }).catch((err) => console.error("Yoga notification failed:", err?.message || err));
  }

  return res.status(201).json({ status: true, message: "Yoga created successfully", yoga });
});

exports.updateYogaController = asyncHandler(async (req, res) => {
  const current = await getYogaRecordById(req.params.id);
  if (!current) throw new AppError("Yoga not found", 404);

  const updates = {};
  if (req.body.title !== undefined) {
    const title = String(req.body.title || "").trim();
    if (!title) throw new AppError("title cannot be empty", 400);
    updates.title = title;
  }
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!YOGA_ALLOWED_STATUS.includes(status)) throw new AppError("status must be active or inactive", 400);
    updates.status = status;
  }
  if (req.body.type !== undefined) {
    const rawType = String(req.body.type || "").trim().toLowerCase();
    if (!YOGA_ALLOWED_TYPE.includes(rawType)) throw new AppError("type must be ytlink or video", 400);
    updates.type = normalizeType(rawType);
  }
  if (req.body.ytLink !== undefined || req.body.ytlink !== undefined) {
    updates.ytLink = String(req.body.ytLink ?? req.body.ytlink ?? "").trim();
  }
  if (req.body.thumbnail !== undefined) {
    updates.thumbnail = parseMediaKeyFromBody(req.body.thumbnail, "thumbnail") ?? "";
  }
  const { thumbnail: uploadedThumb, video: uploadedVideo } = await uploadYogaMedia(req);
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
    const newVideo = resolveYogaVideoField(req.body, uploadedVideo, nextTypeEarly);
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

  let yoga;
  try {
    yoga = await updateYoga(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") throw new AppError("Yoga not found", 404);
    throw err;
  }
  return res.status(200).json({ status: true, message: "Yoga updated successfully", yoga });
});

exports.deleteYogaController = asyncHandler(async (req, res) => {
  const current = await getYogaRecordById(req.params.id);
  if (!current) throw new AppError("Yoga not found", 404);
  if (current.thumbnail) await deleteStoredMedia(current.thumbnail);
  if (current.video) await deleteStoredMedia(current.video);

  try {
    await deleteYoga(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") throw new AppError("Yoga not found", 404);
    throw err;
  }
  return res.status(200).json({ status: true, message: "Yoga deleted successfully" });
});
