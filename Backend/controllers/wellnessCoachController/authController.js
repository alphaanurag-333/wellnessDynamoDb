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
  getWellnessCoachByEmail,
  getWellnessCoachByPhone,
  getWellnessCoachRecordById,
  createWellnessCoach,
  updateWellnessCoach,
  toPublicWellnessCoach,
} = require("../../models/wellnessCoachModel");
const { getSpecializationById } = require("../../models/specializationModel");
const { normalizeEmail, normalizePhone, normalizeCountryCode } = require("../../models/userModel");
const config = require("../../config");
const { generateOtp, getOtpExpiryDate, isOtpExpired, deliverOtp } = require("../../utils/otp");

function assertCoachCanLogin(coach) {
  if (!coach) {
    throw new AppError("No account found with this mobile number", 404);
  }
  if (coach.approvalStatus === "pending") {
    throw new AppError("Your account is pending admin approval. Please wait for approval.", 403);
  }
  if (coach.approvalStatus === "rejected") {
    throw new AppError("Your account registration has been rejected. Please contact admin.", 403);
  }
  if (coach.status === "inactive") {
    throw new AppError("Account is inactive. Please contact admin.", 403);
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

function parseSpecializationId(value) {
  const id = value == null ? "" : String(value).trim();
  return id || null;
}

async function assertValidActiveSpecializationId(specializationId) {
  if (!specializationId) throw new AppError("Specialization is required", 400);
  const spec = await getSpecializationById(specializationId);
  if (!spec) throw new AppError("Specialization not found", 400);
  if (spec.status !== "active") throw new AppError("Specialization is not available", 400);
}

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

exports.registerWellnessCoach = asyncHandler(async (req, res) => {
  const { name, email, phone, phoneCountryCode, password, bio, country, state, city, specializationId } =
    req.body;

  const normEmail = normalizeEmail(email);
  const normPhone = normalizePhone(phone);
  const normCc = normalizeCountryCode(phoneCountryCode);
  const normName = String(name || "").trim();

  if (!normName) throw new AppError("Name is required", 400);
  if (!normEmail) throw new AppError("Email is required", 400);
  if (!normPhone) throw new AppError("Mobile number is required", 400);
  if (!password || String(password).length < 8) {
    throw new AppError("Password must be at least 8 characters", 400);
  }

  const existingByEmail = await getWellnessCoachByEmail(normEmail);
  if (existingByEmail) throw new AppError("An account with this email already exists", 409);

  const existingByPhone = await getWellnessCoachByPhone(normCc, normPhone);
  if (existingByPhone) throw new AppError("An account with this phone number already exists", 409);

  const parsedSpecializationId = parseSpecializationId(specializationId);
  await assertValidActiveSpecializationId(parsedSpecializationId);

  const hashedPassword = await hashPassword(String(password));

  const coach = await createWellnessCoach({
    name: normName,
    email: normEmail,
    phone: normPhone,
    phoneCountryCode: normCc,
    password: hashedPassword,
    bio: bio != null ? String(bio).trim() || null : null,
    specializationId: parsedSpecializationId,
    country: country != null ? String(country).trim() || null : null,
    state: state != null ? String(state).trim() || null : null,
    city: city != null ? String(city).trim() || null : null,
    status: "active",
    _defaultApproval: "pending",
  });

  return res.status(201).json({
    status: true,
    message: "Registration successful. Your account is pending admin approval. You will be able to login once approved.",
    coach,
  });
});

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

  if (coach.approvalStatus === "pending") {
    throw new AppError("Your account is pending admin approval. Please wait for approval.", 403);
  }

  if (coach.approvalStatus === "rejected") {
    throw new AppError("Your account registration has been rejected. Please contact admin.", 403);
  }

  if (coach.status === "inactive") {
    throw new AppError("Account is inactive. Please contact admin.", 403);
  }

  return sendAuthResponse(res, 200, coach);
});

exports.sendWellnessCoachLoginOtp = asyncHandler(async (req, res) => {
  const { phone, phoneCountryCode } = parsePhoneLoginBody(req.body);
  const coach = await getWellnessCoachByPhone(phoneCountryCode, phone);
  assertCoachCanLogin(coach);

  const otp = generateOtp();
  const otpExpire = getOtpExpiryDate();

  await updateWellnessCoach(coach.id, { otp, otpExpire });

  await deliverOtp({ phone, phoneCountryCode, email: coach.email, otp });

  return res.status(200).json(otpSendPayload(otp));
});

exports.verifyWellnessCoachLoginOtp = asyncHandler(async (req, res) => {
  const { phone, phoneCountryCode } = parsePhoneLoginBody(req.body);
  const otp = String(req.body.otp ?? "").trim();
  if (!otp) throw new AppError("OTP is required", 400);

  const coach = await getWellnessCoachByPhone(phoneCountryCode, phone);
  assertCoachCanLogin(coach);

  if (!coach.otp || !coach.otpExpire) {
    throw new AppError("No OTP requested. Send OTP first.", 400);
  }
  if (isOtpExpired(coach.otpExpire)) {
    throw new AppError("OTP has expired. Request a new code.", 400);
  }
  if (String(coach.otp) !== otp) {
    throw new AppError("Invalid OTP", 401);
  }

  await updateWellnessCoach(coach.id, { otp: null, otpExpire: null });
  const fresh = await getWellnessCoachRecordById(coach.id);
  return sendAuthResponse(res, 200, fresh);
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

  const fcmId = parseFcmIdFromBody(req.body);
  if (fcmId !== undefined) updates.fcmId = fcmId;

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
