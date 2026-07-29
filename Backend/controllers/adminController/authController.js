const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { hashPassword, comparePassword } = require("../../utils/password");
const {
  uploadFileFromRequest,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const { verifyRefreshToken } = require("../../utils/jwt");
const {
  createAccount,
  getAccountByEmail,
  getAccountById,
  updateAccount,
  toPublicAccount,
} = require("../../models/accountModel");
const {
  PANEL_JWT_ROLES,
  resolvePanelAuthContext,
  createPanelTokenPair,
} = require("../../utils/panelAuth");
const config = require("../../config");
const { assertPasswordPolicy } = require("../../utils/passwordPolicy");

const S3_FOLDER = "accounts";

function toPanelPublicUser(account, permissions, accountType) {
  return {
    ...toPublicAccount(account),
    accountType,
    permissions,
  };
}

async function sendAuthResponse(res, statusCode, account) {
  const ctx = await resolvePanelAuthContext(account);
  const { accessToken, refreshToken } = createPanelTokenPair(account, ctx);

  return res.status(statusCode).json({
    status: true,
    message: "Authentication successful",
    accessToken,
    refreshToken,
    admin: toPanelPublicUser(account, ctx.permissions, ctx.accountType),
  });
}

exports.registerAdmin = asyncHandler(async (req, res) => {
  if (!config.adminRegistrationEnabled) {
    throw new AppError("Admin registration is disabled", 403);
  }
  const { name, email, password, phone, profileImage } = req.body;

  if (!name || !email || !password) {
    throw new AppError("Name, email, and password are required", 400);
  }

  const existing = await getAccountByEmail(email);
  if (existing) {
    throw new AppError("Account already exists with this email", 409);
  }

  const passwordHash = await hashPassword(password);
  const parsedProfileImage = parseMediaKeyFromBody(profileImage, "profileImage");
  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);

  const account = await createAccount({
    name,
    email,
    password: passwordHash,
    phone,
    profileImage: uploadedKey ?? (parsedProfileImage !== undefined ? parsedProfileImage : null),
    status: "active",
    isSuperAdmin: false,
    accountKind: "admin",
  });

  return sendAuthResponse(res, 201, account);
});

/** Unified panel login — single Accounts table. */
exports.loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const account = await getAccountByEmail(email);
  if (!account) {
    throw new AppError("Invalid credentials", 401);
  }

  const passwordMatched = await comparePassword(password, account.password);
  if (!passwordMatched) {
    throw new AppError("Invalid credentials", 401);
  }

  if (account.status === "inactive") {
    throw new AppError("Account is inactive", 403);
  }
  if (account.status === "blocked") {
    throw new AppError("Account is blocked", 403);
  }

  const { accountType } = await resolvePanelAuthContext(account);
  if (
    (accountType === "wellness_coach" || accountType === "assistant_wellness_coach") &&
    account.approvalStatus === "pending"
  ) {
    throw new AppError("Your account is pending admin approval. Please wait for approval.", 403);
  }
  if (
    (accountType === "wellness_coach" || accountType === "assistant_wellness_coach") &&
    account.approvalStatus === "rejected"
  ) {
    throw new AppError("Your account registration has been rejected. Please contact admin.", 403);
  }

  return sendAuthResponse(res, 200, account);
});

exports.getAdminProfile = asyncHandler(async (req, res) => {
  const account = await getAccountById(req.auth?.sub);
  if (!account) throw new AppError("Account not found", 404);

  const { permissions, accountType } = await resolvePanelAuthContext(account);
  return res.status(200).json({
    status: true,
    message: "Profile fetched successfully",
    admin: toPanelPublicUser(account, permissions, accountType),
  });
});

exports.updateAdminProfile = asyncHandler(async (req, res) => {
  const account = await getAccountById(req.auth?.sub);
  if (!account) throw new AppError("Account not found", 404);

  const { name, phone, profileImage, password } = req.body;
  const updates = {};

  if (name !== undefined) updates.name = String(name).trim();
  if (phone !== undefined) updates.phone = phone ? String(phone).trim() : null;
  if (password !== undefined) updates.password = await hashPassword(password);

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

  const updated = await updateAccount(req.auth.sub, updates);
  const { permissions, accountType } = await resolvePanelAuthContext(updated);
  return res.status(200).json({
    status: true,
    message: "Profile updated successfully",
    admin: toPanelPublicUser(updated, permissions, accountType),
  });
});

exports.changeAdminPassword = asyncHandler(async (req, res) => {
  const account = await getAccountById(req.auth?.sub);
  if (!account) throw new AppError("Account not found", 404);

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new AppError("Current password and new password are required", 400);
  }

  assertPasswordPolicy(newPassword, { required: true, label: "New password" });

  const isCurrentPasswordValid = await comparePassword(currentPassword, account.password);
  if (!isCurrentPasswordValid) {
    throw new AppError("Current password is incorrect", 401);
  }

  const isSamePassword = await comparePassword(newPassword, account.password);
  if (isSamePassword) {
    throw new AppError("New password must be different from current password", 400);
  }

  await updateAccount(req.auth.sub, { password: await hashPassword(newPassword) });

  return res.status(200).json({
    status: true,
    message: "Password updated successfully",
  });
});

exports.refreshAdminToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError("Refresh token is required", 400);

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (_error) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const jwtRole = String(payload.role || payload.accountType || "").trim();
  if (!PANEL_JWT_ROLES.has(jwtRole)) {
    throw new AppError("Forbidden", 403);
  }

  const account = await getAccountById(payload.sub);
  if (!account) throw new AppError("Account not found", 404);

  const ctx = await resolvePanelAuthContext(account);
  const tokens = createPanelTokenPair(account, ctx);

  return res.status(200).json({
    status: true,
    message: "Token refreshed successfully",
    ...tokens,
  });
});
