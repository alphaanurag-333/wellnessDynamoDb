const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  uploadFileFromRequest,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const {
  readProfileImageKey,
  parseProfileImageFromBody,
} = require("../../utils/mediaFieldAliases");
const {
  createLeadershipNote,
  getLeadershipNoteById,
  getLeadershipNoteRecordById,
  updateLeadershipNote,
  deleteLeadershipNote,
  listLeadershipNotes,
  normalizeStatus,
  normalizeVisibleFlag,
  DEFAULT_BADGE,
} = require("../../models/leadershipNoteModel");

const ALLOWED_STATUS = ["active", "inactive"];
const S3_FOLDER = "leadership-notes";

exports.listLeadershipNotesController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const data = await listLeadershipNotes({ page, limit, status, search });

  return res.status(200).json({
    status: true,
    leadershipNotes: data.leadershipNotes,
    pagination: data.pagination,
  });
});

exports.getLeadershipNoteByIdController = asyncHandler(async (req, res) => {
  const leadershipNote = await getLeadershipNoteById(req.params.id);
  if (!leadershipNote) throw new AppError("Leadership note not found", 404);

  return res.status(200).json({
    status: true,
    leadershipNote,
  });
});

exports.createLeadershipNoteController = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const designation = String(req.body.designation || "").trim();
  const title = String(req.body.title || "").trim();
  const badge = String(req.body.badge || "").trim() || DEFAULT_BADGE;
  const message = String(req.body.message || "").trim();
  const status = normalizeStatus(req.body.status, "active");
  const webVisible =
    req.body.webVisible !== undefined ? normalizeVisibleFlag(req.body.webVisible, true) : true;
  const appVisible =
    req.body.appVisible !== undefined ? normalizeVisibleFlag(req.body.appVisible, true) : true;

  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  const profileImageRaw = parseProfileImageFromBody(req.body);
  const profileImage =
    uploadedKey ??
    (profileImageRaw !== undefined
      ? parseMediaKeyFromBody(profileImageRaw, "profileImage")
      : undefined);

  if (!name) throw new AppError("name is required", 400);
  if (!designation) throw new AppError("designation is required", 400);
  if (!message) throw new AppError("message is required", 400);
  if (!profileImage) throw new AppError("profileImage is required", 400);
  if (!ALLOWED_STATUS.includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }

  const leadershipNote = await createLeadershipNote({
    name,
    designation,
    title: title || designation,
    badge,
    message,
    profileImage,
    status,
    webVisible,
    appVisible,
  });

  return res.status(201).json({
    status: true,
    message: "Leadership note created successfully",
    leadershipNote,
  });
});

exports.updateLeadershipNoteController = asyncHandler(async (req, res) => {
  const current = await getLeadershipNoteRecordById(req.params.id);
  if (!current) throw new AppError("Leadership note not found", 404);

  const updates = {};
  const currentProfileImage = readProfileImageKey(current);

  if (req.body.name !== undefined) {
    const name = String(req.body.name || "").trim();
    if (!name) throw new AppError("name cannot be empty", 400);
    updates.name = name;
  }
  if (req.body.designation !== undefined) {
    const designation = String(req.body.designation || "").trim();
    if (!designation) throw new AppError("designation cannot be empty", 400);
    updates.designation = designation;
  }
  if (req.body.title !== undefined) {
    updates.title = String(req.body.title || "").trim();
  }
  if (req.body.badge !== undefined) {
    updates.badge = String(req.body.badge || "").trim() || DEFAULT_BADGE;
  }
  if (req.body.message !== undefined) {
    const message = String(req.body.message || "").trim();
    if (!message) throw new AppError("message cannot be empty", 400);
    updates.message = message;
  }

  const profileImageRaw = parseProfileImageFromBody(req.body);
  if (profileImageRaw !== undefined) {
    const profileImage = parseMediaKeyFromBody(profileImageRaw, "profileImage");
    if (profileImage === null && currentProfileImage) {
      await deleteStoredMedia(currentProfileImage);
    }
    if (profileImage === null) {
      throw new AppError("profileImage cannot be empty", 400);
    }
    updates.profileImage = profileImage;
  }

  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (uploadedKey) {
    if (currentProfileImage && currentProfileImage !== uploadedKey) {
      await deleteStoredMedia(currentProfileImage);
    }
    updates.profileImage = uploadedKey;
  }

  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!ALLOWED_STATUS.includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }
  if (req.body.webVisible !== undefined) {
    updates.webVisible = normalizeVisibleFlag(req.body.webVisible, true);
  }
  if (req.body.appVisible !== undefined) {
    updates.appVisible = normalizeVisibleFlag(req.body.appVisible, true);
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let leadershipNote;
  try {
    leadershipNote = await updateLeadershipNote(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Leadership note not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Leadership note updated successfully",
    leadershipNote,
  });
});

exports.deleteLeadershipNoteController = asyncHandler(async (req, res) => {
  const current = await getLeadershipNoteRecordById(req.params.id);
  if (!current) throw new AppError("Leadership note not found", 404);
  const profileImage = readProfileImageKey(current);
  if (profileImage) await deleteStoredMedia(profileImage);

  try {
    await deleteLeadershipNote(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Leadership note not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Leadership note deleted successfully",
  });
});
