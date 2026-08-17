const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { comparePassword, hashPassword } = require("../../utils/password");
const { createTokenPair, verifyRefreshToken } = require("../../utils/jwt");
const { assertPasswordPolicy } = require("../../utils/passwordPolicy");
const {
  uploadFileFromRequest,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const {
  getAccountById,
  getAccountByEmail,
  getAccountByPhone,
  updateAccount,
  toPublicAccount,
  createAccount,
} = require("../../models/accountModel");
const { resolveAccountByEmail } = require("../../services/accountResolver");
const {
  resolveAccountPermissions,
  pickDefaultActiveRole,
  listEligibleRoleKeys,
  isRoleEligibleForActivation,
} = require("../../utils/accountPermissions");
const { normalizeRoleKey, ROLE_KEY_TO_UI } = require("../../config/accountRoles");
const { normalizeEmail, normalizePhone, normalizeCountryCode } = require("../../models/userModel");
const { generateOtp, getOtpExpiryDate, isOtpExpired, deliverOtp } = require("../../utils/otp");
const {
  generateUniqueReferralCode,
  registerReferralCode,
  ensureEntityReferralCode,
} = require("../../models/referralCodeModel");
const config = require("../../config");

const S3_FOLDER = "account";
const REFERRAL_STAFF_ROLES = new Set(["wellness_coach", "assistant_wellness_coach"]);

function withRoleAliases(publicAccount, activeRole) {
  return {
    account: publicAccount,
    admin: activeRole === "admin" ? publicAccount : undefined,
    coach: activeRole === "wellness_coach" ? publicAccount : undefined,
    assistant: activeRole === "assistant_wellness_coach" ? publicAccount : undefined,
  };
}

async function buildAuthPayload(account, activeRoleKey) {
  const roleKey = normalizeRoleKey(activeRoleKey);
  if (!roleKey || !isRoleEligibleForActivation(account, roleKey)) {
    throw new AppError("Selected role is not available for this account", 403);
  }
  const { permissions, isSuperAdmin, roleId, dataScope } = await resolveAccountPermissions(
    account,
    roleKey
  );
  const roles = listEligibleRoleKeys(account);
  return {
    sub: account.id,
    role: roleKey,
    roles,
    isSuperAdmin: roleKey === "admin" ? Boolean(isSuperAdmin) : false,
    roleId: roleId || null,
    permissions,
    dataScope,
  };
}

async function sendAccountAuthResponse(res, statusCode, account, activeRoleKey, message = "Authentication successful") {
  const payload = await buildAuthPayload(account, activeRoleKey);
  const { accessToken, refreshToken } = createTokenPair(payload);
  const publicAccount = {
    ...toPublicAccount(account),
    activeRole: payload.role,
    activeRoleUi: ROLE_KEY_TO_UI[payload.role] || payload.role,
    roles: payload.roles,
    permissions: payload.permissions,
    dataScope: payload.dataScope,
    // Account-level flag (for UI / View As). Session powers follow JWT active role.
    isSuperAdmin: Boolean(account.isSuperAdmin),
  };

  return res.status(statusCode).json({
    status: true,
    message,
    accessToken,
    refreshToken,
    ...withRoleAliases(publicAccount, payload.role),
  });
}

exports.loginAccount = asyncHandler(async (req, res) => {
  const { email, password, activeRole } = req.body || {};
  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  let account = await getAccountByEmail(email);
  if (!account && config.accountDualRead !== false) {
    account = await resolveAccountByEmail(email);
  }
  if (!account?.password) {
    throw new AppError("Invalid credentials", 401);
  }

  const matched = await comparePassword(password, account.password);
  if (!matched) {
    throw new AppError("Invalid credentials", 401);
  }
  if (account.status === "inactive" || account.status === "blocked") {
    throw new AppError("Account is inactive", 403);
  }

  const roleKey = pickDefaultActiveRole(account, activeRole);
  if (!roleKey) {
    throw new AppError("No eligible role available for login", 403);
  }

  return sendAccountAuthResponse(res, 200, account, roleKey);
});

exports.refreshAccountToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    throw new AppError("Refresh token is required", 400);
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const subject = payload?.sub || payload?.id;
  if (!subject) {
    throw new AppError("Invalid token payload", 401);
  }

  const account = await getAccountById(subject);
  if (!account) {
    throw new AppError("Account not found", 401);
  }
  if (account.status === "inactive" || account.status === "blocked") {
    throw new AppError("Account is inactive", 403);
  }

  const requested = normalizeRoleKey(req.body?.activeRole) || normalizeRoleKey(payload.role);
  const roleKey = pickDefaultActiveRole(account, requested);
  if (!roleKey) {
    throw new AppError("No eligible role available", 403);
  }

  return sendAccountAuthResponse(res, 200, account, roleKey, "Token refreshed");
});

exports.switchAccountRole = asyncHandler(async (req, res) => {
  const account = req.account || req.user;
  if (!account) {
    throw new AppError("Authentication required", 401);
  }

  const activeRole = normalizeRoleKey(req.body?.activeRole || req.body?.role);
  if (!activeRole) {
    throw new AppError("activeRole is required", 400);
  }
  if (!isRoleEligibleForActivation(account, activeRole)) {
    throw new AppError("You cannot switch to this role", 403);
  }

  return sendAccountAuthResponse(res, 200, account, activeRole, "Role switched");
});

exports.getAccountMe = asyncHandler(async (req, res) => {
  let account = req.account || req.user;
  const activeRole = req.auth?.role;

  // Backfill codes for staff created before role-prefixed referral codes existed.
  if (REFERRAL_STAFF_ROLES.has(activeRole) && account?.id && !account.referralCode) {
    try {
      const code = await ensureEntityReferralCode({
        tableName: "Account",
        entityType: activeRole,
        entityId: account.id,
        ownerCoachId:
          activeRole === "wellness_coach" ? account.id : account.parentAccountId || "pending",
        referralCode: null,
      });
      if (code) account = { ...account, referralCode: code };
    } catch (err) {
      console.error("[getAccountMe] ensure referral code failed", err.message);
    }
  }

  const { permissions, isSuperAdmin, dataScope } = await resolveAccountPermissions(
    account,
    activeRole
  );
  const publicAccount = {
    ...toPublicAccount(account),
    activeRole,
    activeRoleUi: ROLE_KEY_TO_UI[activeRole] || activeRole,
    roles: listEligibleRoleKeys(account),
    permissions,
    dataScope,
    isSuperAdmin: Boolean(account.isSuperAdmin || (activeRole === "admin" && isSuperAdmin)),
  };
  return res.json({
    status: true,
    message: "Profile fetched successfully",
    ...withRoleAliases(publicAccount, activeRole),
  });
});

exports.updateAccountProfile = asyncHandler(async (req, res) => {
  const account = req.account || req.user;
  if (!account?.id) throw new AppError("Authentication required", 401);

  const { name, phone, phoneCountryCode, designation, bio, profileImage, password } = req.body || {};
  const updates = {};

  if (name !== undefined) updates.name = String(name).trim();
  if (phone !== undefined) updates.phone = phone ? String(phone).trim() : null;
  if (phoneCountryCode !== undefined) {
    updates.phoneCountryCode = phoneCountryCode ? String(phoneCountryCode).trim() : null;
  }
  if (designation !== undefined) {
    updates.designation = designation ? String(designation).trim() : null;
  }
  if (bio !== undefined) updates.bio = bio == null ? null : String(bio);
  if (password !== undefined) {
    assertPasswordPolicy(password);
    updates.password = await hashPassword(password);
  }

  if (profileImage !== undefined) {
    const key = parseMediaKeyFromBody(profileImage, "profileImage");
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

  const updated = await updateAccount(account.id, updates);
  const activeRole = req.auth?.role;
  const { permissions, isSuperAdmin, dataScope } = await resolveAccountPermissions(
    updated,
    activeRole
  );
  const publicAccount = {
    ...toPublicAccount(updated),
    activeRole,
    activeRoleUi: ROLE_KEY_TO_UI[activeRole] || activeRole,
    roles: listEligibleRoleKeys(updated),
    permissions,
    dataScope,
    isSuperAdmin: Boolean(updated.isSuperAdmin || (activeRole === "admin" && isSuperAdmin)),
  };

  return res.json({
    status: true,
    message: "Profile updated successfully",
    ...withRoleAliases(publicAccount, activeRole),
  });
});

exports.getAccountPermissions = asyncHandler(async (req, res) => {
  const account = req.account || req.user;
  const activeRole = req.auth?.role;
  const resolved = await resolveAccountPermissions(account, activeRole, { req });
  return res.json({
    status: true,
    activeRole,
    permissions: resolved.permissions,
    permissionMap: resolved.permissionMap,
    isSuperAdmin: activeRole === "admin" ? Boolean(resolved.isSuperAdmin) : false,
  });
});

exports.changeAccountPassword = asyncHandler(async (req, res) => {
  const account = req.account || req.user;
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    throw new AppError("currentPassword and newPassword are required", 400);
  }
  assertPasswordPolicy(newPassword);

  const matched = await comparePassword(currentPassword, account.password);
  if (!matched) {
    throw new AppError("Current password is incorrect", 401);
  }

  const passwordHash = await hashPassword(newPassword);
  const updated = await updateAccount(account.id, { password: passwordHash });
  return res.json({
    status: true,
    message: "Password updated",
    account: toPublicAccount(updated),
  });
});

exports.sendAccountLoginOtp = asyncHandler(async (req, res) => {
  const phoneCountryCode = normalizeCountryCode(req.body?.phoneCountryCode || req.body?.countryCode);
  const phone = normalizePhone(req.body?.phone || req.body?.mobile);
  if (!phone) {
    throw new AppError("Phone is required", 400);
  }

  const account = await getAccountByPhone(phoneCountryCode, phone);
  if (!account) {
    throw new AppError("No account found with this mobile number", 404);
  }
  if (account.status === "inactive") {
    throw new AppError("Account is inactive", 403);
  }

  const otp = generateOtp();
  await updateAccount(account.id, {
    otp,
    otpExpire: getOtpExpiryDate(),
  });
  await deliverOtp({ phoneCountryCode, phone, otp });

  const body = {
    status: true,
    message: "OTP sent",
  };
  if (config.exposeOtpInResponse) {
    body.otp = otp;
  }
  return res.json(body);
});

exports.verifyAccountLoginOtp = asyncHandler(async (req, res) => {
  const phoneCountryCode = normalizeCountryCode(req.body?.phoneCountryCode || req.body?.countryCode);
  const phone = normalizePhone(req.body?.phone || req.body?.mobile);
  const otp = String(req.body?.otp || "").trim();
  const activeRole = req.body?.activeRole;

  if (!phone || !otp) {
    throw new AppError("Phone and OTP are required", 400);
  }

  const account = await getAccountByPhone(phoneCountryCode, phone);
  if (!account) {
    throw new AppError("No account found with this mobile number", 404);
  }
  if (!account.otp || account.otp !== otp || isOtpExpired(account.otpExpire)) {
    throw new AppError("Invalid or expired OTP", 401);
  }

  await updateAccount(account.id, { otp: null, otpExpire: null });

  const roleKey = pickDefaultActiveRole(account, activeRole);
  if (!roleKey) {
    throw new AppError("No eligible role available for login", 403);
  }

  return sendAccountAuthResponse(res, 200, account, roleKey);
});

/**
 * Coach-style self-register → Account with wellness_coach membership (pending).
 */
exports.registerCoachAccount = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    phoneCountryCode,
    specializationId,
    bio,
  } = req.body || {};

  if (!name || !email || !password) {
    throw new AppError("Name, email, and password are required", 400);
  }
  assertPasswordPolicy(password);

  const existing = await getAccountByEmail(email);
  if (existing) {
    throw new AppError("Account already exists with this email", 409);
  }

  const passwordHash = await hashPassword(password);
  const referralCode = await generateUniqueReferralCode({ entityType: "wellness_coach" });
  const account = await createAccount({
    name,
    email: normalizeEmail(email),
    password: passwordHash,
    phone,
    phoneCountryCode,
    specializationId,
    bio,
    status: "active",
    approvalStatus: "pending",
    defaultRoleKey: "wellness_coach",
    sourceLegacyType: "wellness_coach",
    referralCode,
    memberships: [
      {
        roleKey: "wellness_coach",
        roleId: null,
        permissionOverrides: null,
        status: "active",
        parentAccountId: null,
      },
    ],
  });

  await registerReferralCode({
    referralCode,
    entityType: "wellness_coach",
    entityId: account.id,
    ownerCoachId: account.id,
  });

  return res.status(201).json({
    status: true,
    message: "Registration submitted. Await admin approval before coach login.",
    account: toPublicAccount(account),
  });
});

exports.buildAuthPayload = buildAuthPayload;
exports.sendAccountAuthResponse = sendAccountAuthResponse;
