const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { comparePassword, hashPassword } = require("../../utils/password");
const { createTokenPair, verifyRefreshToken } = require("../../utils/jwt");
const { assertPasswordPolicy } = require("../../utils/passwordPolicy");
const {
  getAccountById,
  getAccountByEmail,
  getAccountByPhone,
  updateAccount,
  toPublicAccount,
  createAccount,
  hasActiveMembership,
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
const config = require("../../config");

async function buildAuthPayload(account, activeRoleKey) {
  const roleKey = normalizeRoleKey(activeRoleKey);
  if (!roleKey || !isRoleEligibleForActivation(account, roleKey)) {
    throw new AppError("Selected role is not available for this account", 403);
  }
  const { permissions, isSuperAdmin, roleId } = await resolveAccountPermissions(account, roleKey);
  const roles = listEligibleRoleKeys(account);
  return {
    sub: account.id,
    role: roleKey,
    roles,
    isSuperAdmin: roleKey === "admin" ? Boolean(isSuperAdmin) : false,
    roleId: roleId || null,
    permissions,
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
    isSuperAdmin: payload.isSuperAdmin,
  };

  return res.status(statusCode).json({
    status: true,
    message,
    accessToken,
    refreshToken,
    account: publicAccount,
    // Compat aliases for updatedadmin / legacy clients
    admin: payload.role === "admin" ? publicAccount : undefined,
    coach: payload.role === "wellness_coach" ? publicAccount : undefined,
    assistant: payload.role === "assistant_wellness_coach" ? publicAccount : undefined,
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
  const account = req.account || req.user;
  const activeRole = req.auth?.role;
  const { permissions, isSuperAdmin } = await resolveAccountPermissions(account, activeRole);
  return res.json({
    status: true,
    account: {
      ...toPublicAccount(account),
      activeRole,
      activeRoleUi: ROLE_KEY_TO_UI[activeRole] || activeRole,
      roles: listEligibleRoleKeys(account),
      permissions,
      isSuperAdmin: activeRole === "admin" ? Boolean(isSuperAdmin) : false,
    },
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

  return res.status(201).json({
    status: true,
    message: "Registration submitted. Await admin approval before coach login.",
    account: toPublicAccount(account),
  });
});

exports.buildAuthPayload = buildAuthPayload;
exports.sendAccountAuthResponse = sendAccountAuthResponse;
