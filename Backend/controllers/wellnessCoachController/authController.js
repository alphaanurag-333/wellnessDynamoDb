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
  getWellnessCoachByEmail,
  getWellnessCoachRecordById,
  updateWellnessCoach,
  toPublicWellnessCoach,
} = require("../../models/wellnessCoachModel");

const S3_FOLDER = "wellness-coach";
const ROLE = "wellness_coach";

function sendAuthResponse(res, statusCode, coach) {
  const { accessToken, refreshToken } = createTokenPair({
    sub: coach.id,
    role: ROLE,
  });
  return res.status(statusCode).json({
    status: true,
    message: "Authentication successful",
    accessToken,
    refreshToken,
    coach: toPublicWellnessCoach(coach),
  });
}

exports.loginWellnessCoach = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const coach = await getWellnessCoachByEmail(email);
  if (!coach) {
    throw new AppError("Invalid credentials", 401);
  }

  if (!coach.password) {
    throw new AppError("Password login is not set up for this account. Contact admin.", 400);
  }

  const passwordMatched = await comparePassword(password, coach.password);
  if (!passwordMatched) {
    throw new AppError("Invalid credentials", 401);
  }

  if (coach.status === "inactive") {
    throw new AppError("Account is inactive", 403);
  }

  return sendAuthResponse(res, 200, coach);
});

exports.getWellnessCoachProfile = asyncHandler(async (req, res) => {
  const coach = await getWellnessCoachRecordById(req.auth?.sub);
  if (!coach) {
    throw new AppError("Wellness coach not found", 404);
  }

  return res.status(200).json({
    status: true,
    message: "Wellness coach profile fetched successfully",
    coach: toPublicWellnessCoach(coach),
  });
});

exports.updateWellnessCoachProfile = asyncHandler(async (req, res) => {
  const coach = await getWellnessCoachRecordById(req.auth?.sub);
  if (!coach) {
    throw new AppError("Wellness coach not found", 404);
  }

  const { name, phone, phoneCountryCode, bio, profileImage } = req.body;
  const updates = {};

  if (name !== undefined) updates.name = String(name).trim();
  if (phone !== undefined) updates.phone = String(phone).trim();
  if (phoneCountryCode !== undefined) updates.phoneCountryCode = String(phoneCountryCode).trim();
  if (bio !== undefined) updates.bio = String(bio || "").trim() || null;

  if (profileImage !== undefined) {
    const key = parseMediaKeyFromBody(profileImage, "profileImage");
    if (key === null && coach.profileImage) {
      await deleteStoredMedia(coach.profileImage);
    }
    updates.profileImage = key;
  }

  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (uploadedKey) {
    if (coach.profileImage && coach.profileImage !== uploadedKey) {
      await deleteStoredMedia(coach.profileImage);
    }
    updates.profileImage = uploadedKey;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  const updated = await updateWellnessCoach(req.auth.sub, updates);

  return res.status(200).json({
    status: true,
    message: "Wellness coach profile updated successfully",
    coach: toPublicWellnessCoach(updated),
  });
});

exports.changeWellnessCoachPassword = asyncHandler(async (req, res) => {
  const coach = await getWellnessCoachRecordById(req.auth?.sub);
  if (!coach) {
    throw new AppError("Wellness coach not found", 404);
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError("Current password and new password are required", 400);
  }

  if (String(newPassword).length < 8) {
    throw new AppError("New password must be at least 8 characters", 400);
  }

  if (!coach.password) {
    throw new AppError("Password login is not set up for this account", 400);
  }

  const isCurrentPasswordValid = await comparePassword(currentPassword, coach.password);
  if (!isCurrentPasswordValid) {
    throw new AppError("Current password is incorrect", 401);
  }

  const isSamePassword = await comparePassword(newPassword, coach.password);
  if (isSamePassword) {
    throw new AppError("New password must be different from current password", 400);
  }

  await updateWellnessCoach(req.auth.sub, { password: await hashPassword(newPassword) });

  return res.status(200).json({
    status: true,
    message: "Password updated successfully",
  });
});

exports.refreshWellnessCoachToken = asyncHandler(async (req, res) => {
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

  const coach = await getWellnessCoachRecordById(payload.sub);
  if (!coach) {
    throw new AppError("Wellness coach not found", 404);
  }

  if (coach.status === "inactive") {
    throw new AppError("Account is inactive", 403);
  }

  const tokens = createTokenPair({ sub: coach.id, role: ROLE });

  return res.status(200).json({
    status: true,
    message: "Token refreshed successfully",
    ...tokens,
  });
});
