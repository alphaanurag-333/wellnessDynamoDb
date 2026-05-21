const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { hashPassword, comparePassword } = require("../../utils/password");
const { createTokenPair, verifyRefreshToken } = require("../../utils/jwt");
const { generateOtp, getOtpExpiryDate, isOtpExpired, deliverOtp } = require("../../utils/otp");
const {
  setRegistrationOtp,
  clearRegistrationOtp,
  verifyRegistrationOtp,
} = require("../../utils/registrationOtpStore");
const config = require("../../config");
const { getHealthConcernById } = require("../../models/healthConcernModel");
const {
  createUser,
  getUserById,
  getUserByEmail,
  getUserByPhone,
  updateUser,
  normalizeEmail,
  normalizePhone,
  normalizeCountryCode,
} = require("../../models/userModel");
const {
  enrichUser,
  parseUserFields,
  parseFcmIdFromBody,
  persistFcmIdIfPresent,
  assertUniqueEmail,
  assertUniquePhone,
  buildUserUpdatesFromBody,
  deleteUserAccountByPhoneOtp,
} = require("./userProfileHelpers");
const { uploadFileFromRequest } = require("../../utils/s3");

function sendAuthResponse(res, statusCode, user, message = "Authentication successful") {
  const { accessToken, refreshToken } = createTokenPair({
    sub: user.id,
    role: "user",
  });
  return res.status(statusCode).json({
    status: true,
    message,
    accessToken,
    refreshToken,
    user,
  });
}

function assertUserCanLogin(user) {
  if (!user) {
    throw new AppError("User Not Registered", 401);
  }
  if (user.status === "blocked") {
    throw new AppError("Account is blocked", 403);
  }
  if (user.status === "inactive") {
    throw new AppError("Account is inactive", 403);
  }
}

async function resolveUserByIdentifier({ email, phone, phoneCountryCode }) {
  const normalizedEmail = email ? normalizeEmail(email) : "";
  const normalizedPhone = phone ? normalizePhone(phone) : "";

  if (normalizedEmail) {
    return getUserByEmail(normalizedEmail);
  }
  if (normalizedPhone) {
    return getUserByPhone(phoneCountryCode, normalizedPhone);
  }
  return null;
}

function assertRegistrationAvailable(email, phoneCountryCode, phone) {
  return Promise.all([
    assertUniqueEmail(email),
    assertUniquePhone(phoneCountryCode, phone),
  ]);
}

async function verifyRegistrationOtpOrThrow(identifiers, otp) {
  const code = String(otp ?? "").trim();
  if (!code) throw new AppError("otp is required", 400);

  const result = await verifyRegistrationOtp(identifiers, code);
  if (result.ok) return;

  if (result.reason === "missing") {
    throw new AppError("No OTP requested. Send registration OTP first.", 400);
  }
  throw new AppError("Invalid OTP", 401);
}

/** POST /user/auth/register/otp/send — send OTP before self-registration */
exports.sendRegisterOtp = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);
  const phoneCountryCode = normalizeCountryCode(req.body.phoneCountryCode);

  if (!email) throw new AppError("email is required", 400);
  if (!phone) throw new AppError("phone is required", 400);

  await assertRegistrationAvailable(email, phoneCountryCode, phone);

  const otp = generateOtp();
  const otpExpire = getOtpExpiryDate();

  await setRegistrationOtp({ email, phone, phoneCountryCode }, { otp, otpExpire });

  await deliverOtp({
    email,
    phone,
    phoneCountryCode,
    otp,
  });

  const payload = {
    status: true,
    message: "Registration OTP sent successfully",
  };
   
  if (config.exposeOtpInResponse && config.nodeEnv !== "production") {
    payload.debugOtp = otp;
  }

  return res.status(200).json(payload);
});

/** POST /user/auth/register — verify OTP, then create account */
exports.registerUser = asyncHandler(async (req, res) => {
  const otp = req.body.otp;
  const { fields, password } = parseUserFields(req.body, { requirePassword: false });

  await verifyRegistrationOtpOrThrow(
    { email: fields.email, phone: fields.phone, phoneCountryCode: fields.phoneCountryCode },
    otp
  );

  await assertRegistrationAvailable(fields.email, fields.phoneCountryCode, fields.phone);

  if (!fields.termsAccepted) {
    throw new AppError("termsAccepted must be true", 400);
  }
  if (!fields.termsAcceptedAt) {
    fields.termsAcceptedAt = new Date().toISOString();
  }

  if (password) {
    if (password.length < 8) {
      throw new AppError("password must be at least 8 characters", 400);
    }
    fields.passwordHash = await hashPassword(password);
  }

  if (fields.primaryHealthConcern) {
    const concern = await getHealthConcernById(fields.primaryHealthConcern);
    if (!concern) throw new AppError("primaryHealthConcern not found", 400);
  }

  const uploadedProfile = await uploadFileFromRequest(req, "user");
  if (uploadedProfile) fields.profileImage = uploadedProfile;

  const fcmFromBody = parseFcmIdFromBody(req.body);
  if (fcmFromBody !== undefined) fields.fcm_id = fcmFromBody;

  const user = await createUser(fields);

  await clearRegistrationOtp({
    email: fields.email,
    phone: fields.phone,
    phoneCountryCode: fields.phoneCountryCode,
  });

  return sendAuthResponse(res, 201, await enrichUser(user), "Registration successful");
});

/** POST /user/auth/login/password — email+password or phone+password */
exports.loginWithPassword = asyncHandler(async (req, res) => {
  const email = req.body.email;
  const phone = req.body.phone;
  const phoneCountryCode = req.body.phoneCountryCode;
  const password = String(req.body.password ?? "").trim();

  if (!password) throw new AppError("password is required", 400);
  if (!email && !phone) {
    throw new AppError("email or phone is required", 400);
  }

  const user = await resolveUserByIdentifier({ email, phone, phoneCountryCode });
  assertUserCanLogin(user);

  if (!user.passwordHash) {
    throw new AppError("Password login is not set up for this account. Use OTP login.", 400);
  }

  const matched = await comparePassword(password, user.passwordHash);
  if (!matched) throw new AppError("Invalid credentials", 401);

  const updated = (await persistFcmIdIfPresent(user.id, req.body)) || user;
  return sendAuthResponse(res, 200, await enrichUser(updated));
});

/** POST /user/auth/otp/send — request login OTP */
exports.sendLoginOtp = asyncHandler(async (req, res) => {
  const email = req.body.email;
  const phone = req.body.phone;
  const phoneCountryCode = req.body.phoneCountryCode;

  if (!email && !phone) {
    throw new AppError("email or phone is required", 400);
  }

  const user = await resolveUserByIdentifier({ email, phone, phoneCountryCode });
  assertUserCanLogin(user);

  const otp = generateOtp();
  const otpExpire = getOtpExpiryDate();

  await updateUser(user.id, { otp, otpExpire });

  await deliverOtp({
    email: user.email,
    phone: user.phone,
    phoneCountryCode: user.phoneCountryCode,
    otp,
  });

  const payload = {
    status: true,
    message: "OTP sent successfully",
  };

  if (config.exposeOtpInResponse && config.nodeEnv !== "production") {
    payload.debugOtp = otp;
  }

  return res.status(200).json(payload);
});

/** POST /user/auth/otp/verify — verify OTP and login */
exports.verifyLoginOtp = asyncHandler(async (req, res) => {
  const email = req.body.email;
  const phone = req.body.phone;
  const phoneCountryCode = req.body.phoneCountryCode;
  const otp = String(req.body.otp ?? "").trim();

  if (!otp) throw new AppError("otp is required", 400);
  if (!email && !phone) {
    throw new AppError("email or phone is required", 400);
  }

  const user = await resolveUserByIdentifier({ email, phone, phoneCountryCode });
  assertUserCanLogin(user);

  if (!user.otp || !user.otpExpire) {
    throw new AppError("No OTP requested. Send OTP first.", 400);
  }

  if (isOtpExpired(user.otpExpire)) {
    throw new AppError("OTP has expired. Request a new code.", 400);
  }

  if (String(user.otp) !== otp) {
    throw new AppError("Invalid OTP", 401);
  }

  const otpUpdates = { otp: null, otpExpire: null };
  const fcm_id = parseFcmIdFromBody(req.body);
  if (fcm_id !== undefined) otpUpdates.fcm_id = fcm_id;

  await updateUser(user.id, otpUpdates);

  const fresh = await getUserById(user.id);
  return sendAuthResponse(res, 200, await enrichUser(fresh));
});

/** POST /user/auth/refresh-token */
exports.refreshUserToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError("refreshToken is required", 400);

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  if (payload.role !== "user") {
    throw new AppError("Forbidden", 403);
  }

  const user = await getUserById(payload.sub);
  assertUserCanLogin(user);

  const tokens = createTokenPair({ sub: user.id, role: "user" });

  return res.status(200).json({
    status: true,
    message: "Token refreshed successfully",
    ...tokens,
  });
});

/** GET /user/auth/me */
exports.getUserProfile = asyncHandler(async (req, res) => {
  const user = await getUserById(req.auth?.sub);
  if (!user) throw new AppError("User not found", 404);
  assertUserCanLogin(user);

  return res.status(200).json({
    status: true,
    message: "Profile fetched successfully",
    user: await enrichUser(user),
  });
});

/** PATCH /user/auth/me — update own profile (multipart field: file) */
exports.updateUserProfile = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const current = await getUserById(userId);
  if (!current) throw new AppError("User not found", 404);
  assertUserCanLogin(current);

  const body = req.body || {};
  if (body.status !== undefined) {
    throw new AppError("status cannot be updated via profile", 400);
  }

  const updates = await buildUserUpdatesFromBody(body, current, {
    allowStatus: false,
    req,
  });

  const password = String(body.password ?? body.newPassword ?? "").trim();
  if (password) {
    if (password.length < 8) {
      throw new AppError("password must be at least 8 characters", 400);
    }
    updates.passwordHash = await hashPassword(password);
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let user;
  try {
    user = await updateUser(userId, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException" || err?.name === "NotFoundError") {
      throw new AppError("User not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Profile updated successfully",
    user: await enrichUser(user),
  });
});

/** POST /user/auth/delete/otp/send — OTP to registered mobile before account deletion */
exports.sendDeleteAccountOtp = asyncHandler(async (req, res) => {
  const phone = req.body.phone;
  const phoneCountryCode = req.body.phoneCountryCode;

  if (!phone) throw new AppError("phone is required", 400);

  const user = await resolveUserByIdentifier({ phone, phoneCountryCode });
  if (!user) throw new AppError("User not found", 404);

  const otp = generateOtp();
  const otpExpire = getOtpExpiryDate();

  await updateUser(user.id, { otp, otpExpire });

  await deliverOtp({
    email: user.email,
    phone: user.phone,
    phoneCountryCode: user.phoneCountryCode,
    otp,
  });

  const payload = {
    status: true,
    message: "Delete-account OTP sent successfully",
  };

  if (config.exposeOtpInResponse && config.nodeEnv !== "production") {
    payload.debugOtp = otp;
  }

  return res.status(200).json(payload);
});

/** POST /user/auth/delete — confirm deletion with phone + OTP (no password, no login) */
exports.deleteUserByPhoneOtp = asyncHandler(async (req, res) => {
  await deleteUserAccountByPhoneOtp({
    phone: req.body.phone,
    phoneCountryCode: req.body.phoneCountryCode,
    otp: req.body.otp,
  });

  return res.status(200).json({
    status: true,
    message: "Account deleted successfully",
  });
});

/** POST /user/auth/login — alias for password login (backward-friendly) */
exports.loginUser = exports.loginWithPassword;
