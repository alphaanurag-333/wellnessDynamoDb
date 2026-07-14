const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  uploadMulterField,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const {
  readProfileImageKey,
  parseProfileImageFromBody,
} = require("../../utils/mediaFieldAliases");
const {
  createCofounderMessageShell,
  getCofounderMessage,
  getCofounderMessageRecord,
  updateCofounderMessage,
} = require("../../models/cofounderMessageModel");

const ALLOWED_STATUS = ["active", "inactive"];
const S3_FOLDER = "cofounder-messages";
const MESSAGE_MAX_LEN = 5000;

function buildCreateUpdates(req) {
  const name = String(req.body.name || "").trim();
  const message = String(req.body.message || "").trim();
  const status = String(req.body.status || "active").trim().toLowerCase();

  if (!name) throw new AppError("name is required", 400);
  if (!message) throw new AppError("message is required", 400);
  if (message.length > MESSAGE_MAX_LEN) {
    throw new AppError(`message cannot exceed ${MESSAGE_MAX_LEN} characters`, 400);
  }
  if (!ALLOWED_STATUS.includes(status)) throw new AppError("status must be active or inactive", 400);

  return { name, message, status };
}

async function applyProfileUpload(req, current, updates) {
  const uploadedProfile = await uploadMulterField(req, "profileImage", S3_FOLDER);
  const profileImageRaw = parseProfileImageFromBody(req.body);

  if (profileImageRaw !== undefined) {
    updates.profileImage = parseMediaKeyFromBody(profileImageRaw, "profileImage") ?? "";
  }

  if (uploadedProfile) {
    const currentProfileImage = readProfileImageKey(current);
    if (currentProfileImage) await deleteStoredMedia(currentProfileImage);
    updates.profileImage = uploadedProfile;
  }

  return uploadedProfile;
}

function validateProfile(updates, current) {
  const nextProfile = updates.profileImage !== undefined ? updates.profileImage : readProfileImageKey(current);
  if (!String(nextProfile || "").trim()) {
    throw new AppError("profileImage is required", 400);
  }
}

exports.getCofounderMessageController = asyncHandler(async (_req, res) => {
  const cofounderMessage = await getCofounderMessage();
  return res.status(200).json({
    status: true,
    message: cofounderMessage ? "Cofounder message fetched" : "No cofounder message configured yet",
    data: cofounderMessage,
  });
});

exports.createCofounderMessageController = asyncHandler(async (req, res) => {
  const existing = await getCofounderMessageRecord();
  if (existing) {
    throw new AppError(
      "Cofounder message already exists. Use PATCH /api/admin/cofounder-message to update.",
      409
    );
  }

  const base = buildCreateUpdates(req);
  await createCofounderMessageShell();

  const updates = { ...base, profileImage: "" };
  const uploadedProfile = await applyProfileUpload(req, null, updates);

  if (!uploadedProfile) throw new AppError("profileImage is required", 400);
  validateProfile(updates, null);

  const cofounderMessage = await updateCofounderMessage(updates);

  return res.status(201).json({
    status: true,
    message: "Cofounder message created successfully",
    data: cofounderMessage,
  });
});

exports.updateCofounderMessageController = asyncHandler(async (req, res) => {
  const current = await getCofounderMessageRecord();
  if (!current) {
    throw new AppError(
      "Cofounder message not found. Use POST /api/admin/cofounder-message to create.",
      404
    );
  }

  const updates = {};

  if (req.body.name !== undefined) {
    const name = String(req.body.name || "").trim();
    if (!name) throw new AppError("name cannot be empty", 400);
    updates.name = name;
  }
  if (req.body.message !== undefined) {
    const message = String(req.body.message || "").trim();
    if (!message) throw new AppError("message cannot be empty", 400);
    if (message.length > MESSAGE_MAX_LEN) {
      throw new AppError(`message cannot exceed ${MESSAGE_MAX_LEN} characters`, 400);
    }
    updates.message = message;
  }
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!ALLOWED_STATUS.includes(status)) throw new AppError("status must be active or inactive", 400);
    updates.status = status;
  }

  await applyProfileUpload(req, current, updates);

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  validateProfile(updates, current);

  let cofounderMessage;
  try {
    cofounderMessage = await updateCofounderMessage(updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Cofounder message not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Cofounder message updated successfully",
    data: cofounderMessage,
  });
});
