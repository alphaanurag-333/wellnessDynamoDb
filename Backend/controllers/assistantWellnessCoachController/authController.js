const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { comparePassword, hashPassword } = require("../../utils/password");
const {
  uploadFileFromRequest,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const { createTokenPair, verifyRefreshToken } = require("../../utils/jwt");
const {
  getAssistantByEmail,
  getAssistantWellnessCoachById,
  updateAssistantWellnessCoach,
  populateWellnessCoach,
  toPublicAssistant,
} = require("../../models/assistantWellnessCoachModel");

const S3_FOLDER = "assistant-wellness-coach";
const ROLE = "assistant_wellness_coach";

function sendAuthResponse(res, statusCode, assistant) {
  const { accessToken, refreshToken } = createTokenPair({
    sub: assistant.id,
    role: ROLE,
  });
  return res.status(statusCode).json({
    status: true,
    message: "Authentication successful",
    accessToken,
    refreshToken,
    assistant: toPublicAssistant(assistant),
  });
}

exports.loginAssistantWellnessCoach = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const assistant = await getAssistantByEmail(email);
  if (!assistant) {
    throw new AppError("Invalid credentials", 401);
  }

  if (!assistant.password) {
    throw new AppError("Password login is not set up for this account. Contact admin.", 400);
  }

  const passwordMatched = await comparePassword(password, assistant.password);
  if (!passwordMatched) {
    throw new AppError("Invalid credentials", 401);
  }

  if (assistant.status === "inactive") {
    throw new AppError("Account is inactive", 403);
  }

  return sendAuthResponse(res, 200, assistant);
});

exports.getAssistantWellnessCoachProfile = asyncHandler(async (req, res) => {
  const assistant = await getAssistantWellnessCoachById(req.auth?.sub);
  if (!assistant) {
    throw new AppError("Assistant wellness coach not found", 404);
  }

  const populated = await populateWellnessCoach(assistant);

  return res.status(200).json({
    status: true,
    message: "Assistant wellness coach profile fetched successfully",
    assistant: populated,
  });
});

exports.updateAssistantWellnessCoachProfile = asyncHandler(async (req, res) => {
  const assistant = await getAssistantWellnessCoachById(req.auth?.sub);
  if (!assistant) {
    throw new AppError("Assistant wellness coach not found", 404);
  }

  const { name, phone, phoneCountryCode, designation, profileImage } = req.body;
  const updates = {};

  if (name !== undefined) updates.name = String(name).trim();
  if (phone !== undefined) updates.phone = String(phone).trim();
  if (phoneCountryCode !== undefined) updates.phoneCountryCode = String(phoneCountryCode).trim();
  if (designation !== undefined) updates.designation = String(designation || "").trim() || null;

  if (profileImage !== undefined) {
    const key = parseMediaKeyFromBody(profileImage, "profileImage");
    if (key === null && assistant.profileImage) {
      await deleteStoredMedia(assistant.profileImage);
    }
    updates.profileImage = key;
  }

  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (uploadedKey) {
    if (assistant.profileImage && assistant.profileImage !== uploadedKey) {
      await deleteStoredMedia(assistant.profileImage);
    }
    updates.profileImage = uploadedKey;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  const updated = await updateAssistantWellnessCoach(req.auth.sub, updates);
  const populated = await populateWellnessCoach(updated);

  return res.status(200).json({
    status: true,
    message: "Assistant wellness coach profile updated successfully",
    assistant: populated,
  });
});

exports.changeAssistantWellnessCoachPassword = asyncHandler(async (req, res) => {
  const assistant = await getAssistantWellnessCoachById(req.auth?.sub);
  if (!assistant) {
    throw new AppError("Assistant wellness coach not found", 404);
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError("Current password and new password are required", 400);
  }

  if (String(newPassword).length < 8) {
    throw new AppError("New password must be at least 8 characters", 400);
  }

  if (!assistant.password) {
    throw new AppError("Password login is not set up for this account", 400);
  }

  const isCurrentPasswordValid = await comparePassword(currentPassword, assistant.password);
  if (!isCurrentPasswordValid) {
    throw new AppError("Current password is incorrect", 401);
  }

  const isSamePassword = await comparePassword(newPassword, assistant.password);
  if (isSamePassword) {
    throw new AppError("New password must be different from current password", 400);
  }

  await updateAssistantWellnessCoach(req.auth.sub, { password: await hashPassword(newPassword) });

  return res.status(200).json({
    status: true,
    message: "Password updated successfully",
  });
});

exports.refreshAssistantWellnessCoachToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError("Refresh token is required", 400);
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (_error) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  if (payload.role !== ROLE) {
    throw new AppError("Forbidden", 403);
  }

  const assistant = await getAssistantWellnessCoachById(payload.sub);
  if (!assistant) {
    throw new AppError("Assistant wellness coach not found", 404);
  }

  if (assistant.status === "inactive") {
    throw new AppError("Account is inactive", 403);
  }

  const tokens = createTokenPair({ sub: assistant.id, role: ROLE });

  return res.status(200).json({
    status: true,
    message: "Token refreshed successfully",
    ...tokens,
  });
});
