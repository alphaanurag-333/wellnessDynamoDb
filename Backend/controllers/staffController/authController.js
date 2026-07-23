/**
 * Unified staff auth controller — one login/OTP/refresh/profile surface for
 * every staff account type (admin, wellness_coach, assistant_wellness_coach),
 * backed by `Backend/models/staffAccountModel.js`.
 *
 * Mounted at `/api/staff/auth` (`Backend/routes/staffRoutes/staffAuthRoutes.js`).
 * Issues `{ sub, role: "staff", accountType }` tokens — see
 * `Backend/middleware/auth.js#protectStaff`.
 */
const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { comparePassword, hashPassword } = require("../../utils/password");
const { assertPasswordPolicy } = require("../../utils/passwordPolicy");
const {
  uploadFileFromRequest,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const { createTokenPair, verifyRefreshToken } = require("../../utils/jwt");
const { parseFcmIdFromBody } = require("../../utils/parseFcmId");
const { generateOtp, getOtpExpiryDate, isOtpExpired, deliverOtp } = require("../../utils/otp");
const { normalizePhone, normalizeCountryCode } = require("../../models/userModel");
const {
  getStaffAccountByEmail,
  getStaffAccountByPhoneKey,
  getStaffAccountRecordById,
  updateStaffAccount,
  toPublicStaffAccount,
} = require("../../models/staffAccountModel");
const { getRoleById, roleTargetsAccountType } = require("../../models/roleModel");
const { resolveStaffPermissions } = require("../../utils/permissions");
const { ACCOUNT_TYPES } = require("../../config/staffPermissionCatalog");

const S3_FOLDER = "staff";

function parsePhoneLoginBody(body) {
  const phone = normalizePhone(body.phone);
  const phoneCountryCode = normalizeCountryCode(body.phoneCountryCode);
  if (!phone) throw new AppError("Mobile number is required", 400);
  if (phone.length !== 10) throw new AppError("Mobile number must be exactly 10 digits", 400);
  return { phone, phoneCountryCode };
}

function otpSendPayload(otp) {
  const config = require("../../config");
  const payload = { status: true, message: "OTP sent successfully" };
  if (config.nodeEnv !== "production" || config.exposeOtpInResponse) {
    payload.debugOtp = otp;
  }
  return payload;
}

function assertCanLogin(account) {
  if (!account) {
    throw new AppError("Invalid credentials", 401);
  }
  if (account.accountType === "wellness_coach" && account.approvalStatus === "pending") {
    throw new AppError("Your account is pending admin approval. Please wait for approval.", 403);
  }
  if (account.accountType === "wellness_coach" && account.approvalStatus === "rejected") {
    throw new AppError("Your account registration has been rejected. Please contact admin.", 403);
  }
  if (account.status === "blocked") {
    throw new AppError("Account is blocked", 403);
  }
  if (account.status === "inactive") {
    throw new AppError("Account is inactive. Please contact admin.", 403);
  }
}

/**
 * Mirrors `resolveAdminAuthContext` (`adminController/authController.js`) so
 * every staff login/profile response carries the same effective-permissions
 * shape the Panel's RBAC UI (and `req.auth`) rely on, regardless of
 * account type.
 */
async function resolveStaffAuthContext(account) {
  const isSuperAdmin = Boolean(account.isSuperAdmin);
  let role = !isSuperAdmin && account.roleId ? await getRoleById(account.roleId) : null;
  if (role && !roleTargetsAccountType(role, account.accountType)) {
    role = null;
  }
  const permissions = resolveStaffPermissions({ ...account, isSuperAdmin }, role);
  return { isSuperAdmin, roleId: account.roleId || null, permissions };
}

async function sendAuthResponse(res, statusCode, account) {
  const { accessToken, refreshToken } = createTokenPair({
    sub: account.id,
    role: "staff",
    accountType: account.accountType,
  });
  const { permissions } = await resolveStaffAuthContext(account);
  return res.status(statusCode).json({
    status: true,
    message: "Authentication successful",
    accessToken,
    refreshToken,
    account: { ...toPublicStaffAccount(account), permissions },
  });
}

exports.loginStaff = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const account = await getStaffAccountByEmail(email);
  if (!account || !account.password) {
    throw new AppError("Invalid credentials", 401);
  }

  const matched = await comparePassword(password, account.password);
  if (!matched) {
    throw new AppError("Invalid credentials", 401);
  }

  assertCanLogin(account);
  return sendAuthResponse(res, 200, account);
});

exports.sendStaffLoginOtp = asyncHandler(async (req, res) => {
  const { phone, phoneCountryCode } = parsePhoneLoginBody(req.body);
  const account = await getStaffAccountByPhoneKey(phoneCountryCode, phone);
  assertCanLogin(account);

  const otp = generateOtp();
  const otpExpire = getOtpExpiryDate();
  await updateStaffAccount(account.id, { otp, otpExpire });
  await deliverOtp({ phone, phoneCountryCode, email: account.email, otp });

  return res.status(200).json(otpSendPayload(otp));
});

exports.verifyStaffLoginOtp = asyncHandler(async (req, res) => {
  const { phone, phoneCountryCode } = parsePhoneLoginBody(req.body);
  const otp = String(req.body.otp ?? "").trim();
  if (!otp) throw new AppError("OTP is required", 400);

  const account = await getStaffAccountByPhoneKey(phoneCountryCode, phone);
  assertCanLogin(account);

  if (!account.otp || !account.otpExpire) {
    throw new AppError("No OTP requested. Send OTP first.", 400);
  }
  if (isOtpExpired(account.otpExpire)) {
    throw new AppError("OTP has expired. Request a new code.", 400);
  }
  if (String(account.otp) !== otp) {
    throw new AppError("Invalid OTP", 401);
  }

  await updateStaffAccount(account.id, { otp: null, otpExpire: null });
  const fresh = await getStaffAccountRecordById(account.id);
  return sendAuthResponse(res, 200, fresh);
});

exports.refreshStaffToken = asyncHandler(async (req, res) => {
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

  if (payload.role !== "staff" || !ACCOUNT_TYPES.includes(payload.accountType)) {
    throw new AppError("Forbidden", 403);
  }

  const account = await getStaffAccountRecordById(payload.sub);
  if (!account) {
    throw new AppError("Account not found", 404);
  }
  if (account.status === "blocked" || account.status === "inactive") {
    throw new AppError("Account is inactive", 403);
  }

  const tokens = createTokenPair({
    sub: account.id,
    role: "staff",
    accountType: account.accountType,
  });

  return res.status(200).json({ status: true, message: "Token refreshed successfully", ...tokens });
});

exports.getStaffProfile = asyncHandler(async (req, res) => {
  const account = await getStaffAccountRecordById(req.auth?.sub);
  if (!account) {
    throw new AppError("Account not found", 404);
  }
  const { permissions } = await resolveStaffAuthContext(account);
  return res.status(200).json({
    status: true,
    message: "Profile fetched successfully",
    account: { ...toPublicStaffAccount(account), permissions },
    roleId: account.roleId || null,
    isSuperAdmin: Boolean(account.isSuperAdmin),
    permissions,
  });
});

exports.updateStaffProfile = asyncHandler(async (req, res) => {
  const account = await getStaffAccountRecordById(req.auth?.sub);
  if (!account) {
    throw new AppError("Account not found", 404);
  }

  const { name, phone, phoneCountryCode, bio, designation } = req.body;
  const updates = {};

  if (name !== undefined) updates.name = String(name).trim();
  if (phone !== undefined) updates.phone = String(phone).trim();
  if (phoneCountryCode !== undefined) updates.phoneCountryCode = String(phoneCountryCode).trim();
  if (bio !== undefined && account.accountType === "wellness_coach") updates.bio = String(bio || "").trim() || null;
  if (designation !== undefined && account.accountType === "assistant_wellness_coach") {
    updates.designation = String(designation || "").trim() || null;
  }

  const fcmId = parseFcmIdFromBody(req.body);
  if (fcmId !== undefined) updates.fcmId = fcmId;

  if (req.body.profileImage !== undefined) {
    const key = parseMediaKeyFromBody(req.body.profileImage, "profileImage");
    if (key === null && account.profileImage) {
      await deleteStoredMedia(account.profileImage);
    }
    updates.profileImage = key;
  }

  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (uploadedKey) {
    if (account.profileImage && account.profileImage !== uploadedKey) {
      await deleteStoredMedia(account.profileImage);
    }
    updates.profileImage = uploadedKey;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  const updated = await updateStaffAccount(account.id, updates);
  return res.status(200).json({
    status: true,
    message: "Profile updated successfully",
    account: toPublicStaffAccount(updated),
  });
});

exports.changeStaffPassword = asyncHandler(async (req, res) => {
  const account = await getStaffAccountRecordById(req.auth?.sub);
  if (!account) {
    throw new AppError("Account not found", 404);
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new AppError("Current password and new password are required", 400);
  }
  assertPasswordPolicy(newPassword, { required: true, label: "New password" });

  if (!account.password) {
    throw new AppError("Password login is not set up for this account", 400);
  }

  const isCurrentValid = await comparePassword(currentPassword, account.password);
  if (!isCurrentValid) {
    throw new AppError("Current password is incorrect", 401);
  }
  const isSame = await comparePassword(newPassword, account.password);
  if (isSame) {
    throw new AppError("New password must be different from current password", 400);
  }

  await updateStaffAccount(account.id, { password: await hashPassword(newPassword) });
  return res.status(200).json({ status: true, message: "Password updated successfully" });
});
