const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { hashPassword, comparePassword } = require("../../utils/password");
const { createTokenPair, verifyRefreshToken } = require("../../utils/jwt");
const { generateOtp, getOtpExpiryDate, isOtpExpired, deliverOtp } = require("../../utils/otp");
const config = require("../../config");
const {
  createUser,
  getUserById,
  getUserByEmail,
  getUserByPhone,
  updateUser,
  toPublicUser,
  normalizeEmail,
  normalizePhone,
  normalizeCountryCode,
  normalizeStatus,
  normalizeGender,
  USER_ALLOWED_STATUS,
} = require("../../models/userModel");
const { enrichUser } = require("../adminController/userController");

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
    throw new AppError("Invalid credentials", 401);
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

/** POST /user/auth/register — sign up with password */
exports.registerUser = asyncHandler(async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);
  const phoneCountryCode = normalizeCountryCode(req.body.phoneCountryCode);
  const password = String(req.body.password ?? "").trim();

  if (!name) throw new AppError("name is required", 400);
  if (!email) throw new AppError("email is required", 400);
  if (!phone) throw new AppError("phone is required", 400);
  if (!password) throw new AppError("password is required", 400);
  if (password.length < 8) throw new AppError("password must be at least 8 characters", 400);

  const existingEmail = await getUserByEmail(email);
  if (existingEmail) throw new AppError("A user already exists with this email", 409);

  const existingPhone = await getUserByPhone(phoneCountryCode, phone);
  if (existingPhone) throw new AppError("A user already exists with this phone number", 409);

  const termsAccepted = req.body.termsAccepted === true || String(req.body.termsAccepted).toLowerCase() === "true";

  const user = await createUser({
    name,
    email,
    phone,
    phoneCountryCode,
    passwordHash: await hashPassword(password),
    gender: req.body.gender ? normalizeGender(req.body.gender) : "boy",
    status: "active",
    termsAccepted,
    termsAcceptedAt: termsAccepted ? new Date().toISOString() : null,
    primaryHealthConcern: req.body.primaryHealthConcern
      ? String(req.body.primaryHealthConcern).trim() || null
      : null,
    country: req.body.country ? String(req.body.country).trim() : null,
    state: req.body.state ? String(req.body.state).trim() : null,
    city: req.body.city ? String(req.body.city).trim() : null,
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

  return sendAuthResponse(res, 200, await enrichUser(user));
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

  await updateUser(user.id, { otp: null, otpExpire: null });

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

  return res.status(200).json({
    status: true,
    message: "Profile fetched successfully",
    user: await enrichUser(user),
  });
});

/** POST /user/auth/login — alias for password login (backward-friendly) */
exports.loginUser = exports.loginWithPassword;
