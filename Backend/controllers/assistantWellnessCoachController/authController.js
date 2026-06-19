const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { comparePassword, hashPassword } = require("../../utils/password");
const {
  uploadFileFromRequest,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const { createTokenPair, verifyRefreshToken } = require("../../utils/jwt");
const { parseFcmIdFromBody } = require("../../utils/parseFcmId");
const {
  getAssistantByEmail,
  getAssistantByPhone,
  getAssistantWellnessCoachById,
  updateAssistantWellnessCoach,
  populateWellnessCoach,
  toPublicAssistant,
} = require("../../models/assistantWellnessCoachModel");
const { normalizePhone, normalizeCountryCode } = require("../../models/userModel");
const { ensureEntityReferralCode } = require("../../models/referralCodeModel");
const config = require("../../config");
const { generateOtp, getOtpExpiryDate, isOtpExpired, deliverOtp } = require("../../utils/otp");

const S3_FOLDER = "assistant-wellness-coach";
const ROLE = "assistant_wellness_coach";

function assertAssistantCanLogin(assistant) {
  if (!assistant) {
    throw new AppError("No account found with this mobile number", 404);
  }
  if (assistant.status === "inactive") {
    throw new AppError("Account is inactive", 403);
  }
}

function otpSendPayload(otp) {
  const payload = {
    status: true,
    message: "OTP sent successfully",
  };
  if (config.nodeEnv !== "production" || config.exposeOtpInResponse) {
    payload.debugOtp = otp;
  }
  return payload;
}

function parsePhoneLoginBody(body) {
  const phone = normalizePhone(body.phone);
  const phoneCountryCode = normalizeCountryCode(body.phoneCountryCode);
  if (!phone) throw new AppError("Mobile number is required", 400);
  if (phone.length !== 10) throw new AppError("Mobile number must be exactly 10 digits", 400);
  return { phone, phoneCountryCode };
}

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

exports.sendAssistantWellnessCoachLoginOtp = asyncHandler(async (req, res) => {
  const { phone, phoneCountryCode } = parsePhoneLoginBody(req.body);
  const assistant = await getAssistantByPhone(phoneCountryCode, phone);
  assertAssistantCanLogin(assistant);

  const otp = generateOtp();
  const otpExpire = getOtpExpiryDate();

  await updateAssistantWellnessCoach(assistant.id, { otp, otpExpire });

  await deliverOtp({ phone, phoneCountryCode, email: assistant.email, otp });

  return res.status(200).json(otpSendPayload(otp));
});

exports.verifyAssistantWellnessCoachLoginOtp = asyncHandler(async (req, res) => {
  const { phone, phoneCountryCode } = parsePhoneLoginBody(req.body);
  const otp = String(req.body.otp ?? "").trim();
  if (!otp) throw new AppError("OTP is required", 400);

  const assistant = await getAssistantByPhone(phoneCountryCode, phone);
  assertAssistantCanLogin(assistant);

  if (!assistant.otp || !assistant.otpExpire) {
    throw new AppError("No OTP requested. Send OTP first.", 400);
  }
  if (isOtpExpired(assistant.otpExpire)) {
    throw new AppError("OTP has expired. Request a new code.", 400);
  }
  if (String(assistant.otp) !== otp) {
    throw new AppError("Invalid OTP", 401);
  }

  await updateAssistantWellnessCoach(assistant.id, { otp: null, otpExpire: null });
  const fresh = await getAssistantWellnessCoachById(assistant.id);
  return sendAuthResponse(res, 200, fresh);
});

exports.getAssistantWellnessCoachProfile = asyncHandler(async (req, res) => {
  let assistant = await getAssistantWellnessCoachById(req.auth?.sub);
  if (!assistant) {
    throw new AppError("Assistant wellness coach not found", 404);
  }

  const parentCoachId = String(assistant.wellnessCoachId || "").trim();
  if (parentCoachId) {
    await ensureEntityReferralCode({
      tableName: "AssistantWellnessCoach",
      entityType: "assistant_wellness_coach",
      entityId: assistant.id,
      ownerCoachId: parentCoachId,
      referralCode: assistant.referralCode,
    });
    assistant = await getAssistantWellnessCoachById(req.auth?.sub);
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

  const fcmId = parseFcmIdFromBody(req.body);
  if (fcmId !== undefined) updates.fcmId = fcmId;

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
