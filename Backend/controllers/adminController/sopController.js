const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { normalizeRoleKey } = require("../../config/accountRoles");
const {
  createSop,
  getSopById,
  updateSop,
  deleteSop,
  listSops,
  normalizeStatus,
  normalizeCategory,
  normalizeContentType,
  normalizeSteps,
  ALLOWED_CATEGORIES,
  ALLOWED_CONTENT_TYPES,
} = require("../../models/sopModel");
const {
  resolveAudienceRoleForStorage,
  loadConsoleRolesIndex,
  sopMatchesAudienceRole,
  AUDIENCE_ALL,
} = require("../../utils/sopAudienceRole");
const {
  uploadFileFromRequest,
  deleteStoredMedia,
  parseMediaKeyFromBody,
  uploadMulterField,
} = require("../../utils/s3");
const { isImageMime } = require("../../utils/mediaUploadLimits");

const S3_FOLDER = "sops";
const TITLE_MIN_LEN = 3;
const TITLE_MAX_LEN = 100;
const STEP_MIN_COUNT = 1;
const STEP_MAX_COUNT = 20;
const STEP_MAX_LEN = 240;

const WORD_MIME = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const PDF_MIME = new Set(["application/pdf"]);
const VIDEO_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
]);

function assertAdminOnly(req) {
  const role = normalizeRoleKey(req.auth?.role);
  if (req.auth?.isSuperAdmin || role === "admin") return;
  throw new AppError("Only Admin can upload or manage SOPs", 403);
}

function resolveStaffRoleKey(req) {
  return normalizeRoleKey(req.auth?.role || req.account?.activeRole || req.user?.role);
}

function canViewAllSops(req) {
  if (req.auth?.isSuperAdmin) return true;
  return resolveStaffRoleKey(req) === "admin";
}

function resolveViewerAudience(req) {
  return {
    roleId: req.auth?.roleId || null,
    roleKey: resolveStaffRoleKey(req),
  };
}

function assertSopVisibleToViewer(sop, req, roleIndex) {
  if (!sop) return;
  if (canViewAllSops(req)) return;
  if (sopMatchesAudienceRole(sop, resolveViewerAudience(req), roleIndex)) return;
  throw new AppError("SOP not found", 404);
}

function assertTitle(title) {
  if (!title) throw new AppError("title is required", 400);
  if (title.length < TITLE_MIN_LEN) {
    throw new AppError(`title must be at least ${TITLE_MIN_LEN} characters`, 400);
  }
  if (title.length > TITLE_MAX_LEN) {
    throw new AppError(`title cannot exceed ${TITLE_MAX_LEN} characters`, 400);
  }
}

function assertSteps(steps) {
  if (steps.length < STEP_MIN_COUNT) {
    throw new AppError("at least one step is required", 400);
  }
  if (steps.length > STEP_MAX_COUNT) {
    throw new AppError(`at most ${STEP_MAX_COUNT} steps are allowed`, 400);
  }
  const tooLong = steps.findIndex((step) => String(step).length > STEP_MAX_LEN);
  if (tooLong !== -1) {
    throw new AppError(`step ${tooLong + 1} cannot exceed ${STEP_MAX_LEN} characters`, 400);
  }
}

function resolveAuthor(req) {
  const fromBody = String(req.body?.author || "").trim();
  if (fromBody) return fromBody;
  const name = String(req.user?.name || req.account?.name || req.auth?.name || "").trim();
  return name || "Admin desk";
}

function pickUploadedFile(req) {
  if (req?.file) return req.file;
  return req?.files?.file?.[0] || null;
}

function pickThumbnailFile(req) {
  return req?.files?.thumbnailFile?.[0] || null;
}

function assertCoverImage(file) {
  if (!file) return;
  const mime = String(file.mimetype || "").toLowerCase();
  const name = String(file.originalname || "").toLowerCase();
  if (isImageMime(mime) || /\.(jpe?g|png|gif|webp)$/.test(name)) return;
  throw new AppError("Upload a JPEG, PNG, GIF, or WebP cover image", 400);
}

function assertFileForContentType(contentType, file) {
  if (!file) return;
  const mime = String(file.mimetype || "").toLowerCase();
  const name = String(file.originalname || "").toLowerCase();
  if (contentType === "word") {
    if (WORD_MIME.has(mime) || /\.(doc|docx)$/.test(name)) return;
    throw new AppError("Upload a Word document (.doc or .docx)", 400);
  }
  if (contentType === "pdf") {
    if (PDF_MIME.has(mime) || name.endsWith(".pdf")) return;
    throw new AppError("Upload a PDF file", 400);
  }
  if (contentType === "video") {
    if (VIDEO_MIME.has(mime) || /\.(mp4|webm|mov|avi)$/.test(name)) return;
    throw new AppError("Upload an MP4, WebM, or MOV video", 400);
  }
}

function isYoutubeOrVimeoUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    return (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtu.be" ||
      host === "vimeo.com" ||
      host.endsWith(".vimeo.com")
    );
  } catch {
    return false;
  }
}

function assertContentPayload({ contentType, steps, file, linkUrl, existing }) {
  if (contentType === "text") {
    assertSteps(steps);
    return;
  }
  if (contentType === "word" || contentType === "pdf") {
    if (!file && !existing?.fileKey) {
      throw new AppError(
        contentType === "pdf" ? "PDF file is required" : "Word document is required",
        400
      );
    }
    assertFileForContentType(contentType, file);
    return;
  }
  if (contentType === "video") {
    const link = String(linkUrl || "").trim();
    if (file) {
      assertFileForContentType("video", file);
      return;
    }
    if (link) {
      if (!isYoutubeOrVimeoUrl(link)) {
        throw new AppError("Use a valid YouTube or Vimeo link", 400);
      }
      return;
    }
    if (existing?.fileKey || existing?.linkUrl) return;
    throw new AppError("Upload a video file or paste a YouTube / Vimeo link", 400);
  }
  throw new AppError("invalid content type", 400);
}

exports.listSopsController = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const status = req.query.status ? String(req.query.status).trim() : undefined;
  const category = req.query.category ? String(req.query.category).trim() : undefined;
  const audienceRole = req.query.audienceRole ? String(req.query.audienceRole).trim() : undefined;
  const search = req.query.search ? String(req.query.search).trim() : undefined;

  const data = await listSops({ page, limit, status, category, audienceRole, search });
  let sops = data.sops;
  if (!canViewAllSops(req)) {
    const roleIndex = await loadConsoleRolesIndex();
    const viewer = resolveViewerAudience(req);
    sops = sops.filter((row) => sopMatchesAudienceRole(row, viewer, roleIndex));
  }

  return res.status(200).json({
    status: true,
    sops,
    pagination: canViewAllSops(req)
      ? data.pagination
      : {
          ...data.pagination,
          total: sops.length,
        },
  });
});

exports.getSopByIdController = asyncHandler(async (req, res) => {
  const sop = await getSopById(req.params.id);
  if (!sop) {
    throw new AppError("SOP not found", 404);
  }
  assertSopVisibleToViewer(sop, req, await loadConsoleRolesIndex());

  return res.status(200).json({
    status: true,
    sop,
  });
});

exports.createSopController = asyncHandler(async (req, res) => {
  assertAdminOnly(req);

  const title = String(req.body.title || "").trim();
  const category = normalizeCategory(req.body.category, "onboarding");
  const contentType = normalizeContentType(req.body.contentType, "text");
  const audienceRole = await resolveAudienceRoleForStorage(req.body.audienceRole, {
    fallback: AUDIENCE_ALL,
  });
  const steps = normalizeSteps(req.body.steps);
  const linkUrl = String(req.body.linkUrl || req.body.videoLink || "").trim();
  const status = normalizeStatus(req.body.status, "active");
  const author = resolveAuthor(req);
  const file = pickUploadedFile(req);

  if (!ALLOWED_CATEGORIES.has(category)) {
    throw new AppError("invalid category", 400);
  }
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new AppError("invalid content type", 400);
  }
  assertTitle(title);
  assertContentPayload({ contentType, steps, file, linkUrl });

  let fileKey = null;
  let fileName = null;
  if (file) {
    fileKey = await uploadFileFromRequest(req, S3_FOLDER);
    if (!fileKey) throw new AppError("Failed to upload file", 500);
    fileName = String(file.originalname || "").trim() || null;
  }

  let thumbnailKey = null;
  const coverFile = pickThumbnailFile(req);
  if (contentType === "video" && coverFile) {
    assertCoverImage(coverFile);
    thumbnailKey = await uploadMulterField(req, "thumbnailFile", S3_FOLDER);
    if (!thumbnailKey) throw new AppError("Failed to upload cover image", 500);
  }

  const sop = await createSop({
    title,
    category,
    contentType,
    audienceRole,
    steps: contentType === "text" ? steps : [],
    fileKey: contentType === "text" ? null : fileKey,
    fileName: contentType === "text" ? null : fileName,
    thumbnailKey: contentType === "video" ? thumbnailKey : null,
    linkUrl: contentType === "video" && !fileKey ? linkUrl || null : null,
    author,
    status,
  });

  return res.status(201).json({
    status: true,
    message: "SOP created successfully",
    sop,
  });
});

exports.updateSopController = asyncHandler(async (req, res) => {
  assertAdminOnly(req);

  const current = await getSopById(req.params.id);
  if (!current) throw new AppError("SOP not found", 404);

  const updates = {};
  const file = pickUploadedFile(req);
  const coverFile = pickThumbnailFile(req);

  if (req.body.title !== undefined) {
    const title = String(req.body.title).trim();
    assertTitle(title);
    updates.title = title;
  }

  if (req.body.category !== undefined) {
    const category = String(req.body.category).toLowerCase().trim();
    if (!ALLOWED_CATEGORIES.has(category)) {
      throw new AppError("invalid category", 400);
    }
    updates.category = category;
  }

  if (req.body.audienceRole !== undefined) {
    updates.audienceRole = await resolveAudienceRoleForStorage(req.body.audienceRole, {
      fallback: AUDIENCE_ALL,
    });
  }

  const nextContentType = req.body.contentType !== undefined
    ? normalizeContentType(req.body.contentType)
    : current.contentType || "text";
  if (req.body.contentType !== undefined) {
    if (!ALLOWED_CONTENT_TYPES.has(nextContentType)) {
      throw new AppError("invalid content type", 400);
    }
    updates.contentType = nextContentType;
  }

  const nextSteps =
    req.body.steps !== undefined ? normalizeSteps(req.body.steps) : current.steps || [];
  const nextLink =
    req.body.linkUrl !== undefined || req.body.videoLink !== undefined
      ? String(req.body.linkUrl || req.body.videoLink || "").trim()
      : current.linkUrl || "";

  assertContentPayload({
    contentType: nextContentType,
    steps: nextSteps,
    file,
    linkUrl: nextLink,
    existing: current,
  });

  if (nextContentType === "text") {
    updates.steps = nextSteps;
    updates.fileKey = null;
    updates.fileName = null;
    updates.linkUrl = null;
    updates.thumbnailKey = null;
    if (current.thumbnailKey) await deleteStoredMedia(current.thumbnailKey);
  } else if (nextContentType === "word" || nextContentType === "pdf") {
    updates.steps = [];
    updates.linkUrl = null;
    updates.thumbnailKey = null;
    if (current.thumbnailKey) await deleteStoredMedia(current.thumbnailKey);
    if (file) {
      const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
      if (!uploadedKey) throw new AppError("Failed to upload file", 500);
      if (current.fileKey && current.fileKey !== uploadedKey) {
        await deleteStoredMedia(current.fileKey);
      }
      updates.fileKey = uploadedKey;
      updates.fileName = String(file.originalname || "").trim() || null;
    }
  } else if (nextContentType === "video") {
    updates.steps = [];
    if (file) {
      const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
      if (!uploadedKey) throw new AppError("Failed to upload file", 500);
      if (current.fileKey && current.fileKey !== uploadedKey) {
        await deleteStoredMedia(current.fileKey);
      }
      updates.fileKey = uploadedKey;
      updates.fileName = String(file.originalname || "").trim() || null;
      updates.linkUrl = null;
    } else if (req.body.linkUrl !== undefined || req.body.videoLink !== undefined) {
      updates.linkUrl = nextLink || null;
      if (nextLink && current.fileKey) {
        await deleteStoredMedia(current.fileKey);
        updates.fileKey = null;
        updates.fileName = null;
      }
    }
    if (coverFile) {
      assertCoverImage(coverFile);
      const uploadedThumb = await uploadMulterField(req, "thumbnailFile", S3_FOLDER);
      if (!uploadedThumb) throw new AppError("Failed to upload cover image", 500);
      if (current.thumbnailKey && current.thumbnailKey !== uploadedThumb) {
        await deleteStoredMedia(current.thumbnailKey);
      }
      updates.thumbnailKey = uploadedThumb;
    }
  }

  if (req.body.status !== undefined) {
    const status = String(req.body.status).toLowerCase().trim();
    if (!["active", "inactive"].includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }

  if (req.body.author !== undefined) {
    const author = String(req.body.author).trim();
    if (!author) throw new AppError("author cannot be empty", 400);
    updates.author = author;
  }

  if (req.body.fileKey !== undefined && !file) {
    const key = parseMediaKeyFromBody(req.body.fileKey, "fileKey");
    updates.fileKey = key;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let sop;
  try {
    sop = await updateSop(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("SOP not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "SOP updated successfully",
    sop,
  });
});

exports.deleteSopController = asyncHandler(async (req, res) => {
  assertAdminOnly(req);

  const current = await getSopById(req.params.id);
  if (!current) throw new AppError("SOP not found", 404);
  if (current.fileKey) await deleteStoredMedia(current.fileKey);
  if (current.thumbnailKey) await deleteStoredMedia(current.thumbnailKey);

  try {
    await deleteSop(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("SOP not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "SOP deleted successfully",
  });
});
