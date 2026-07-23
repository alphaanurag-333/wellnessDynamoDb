/**
 * Unified staff account management (Super Admin only) — create/list/update/
 * delete Admin, Wellness Coach and Assistant Wellness Coach accounts through
 * one `StaffAccount` surface. Mounted at `/api/staff/accounts`.
 *
 * This is the M6 replacement for `adminController/subAdminController.js`
 * (admin-only) plus the account-management slice of
 * `adminController/wellnessCoachController.js` and
 * `adminController/assistantWellnessCoachController.js`. Domain-specific
 * admin flows (specialization validation, approval workflow, etc.) still
 * live in those controllers for now and can be folded in during M9 cleanup.
 */
const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { hashPassword } = require("../../utils/password");
const { assertPasswordPolicy } = require("../../utils/passwordPolicy");
const {
  uploadFileFromRequest,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const {
  createStaffAccount,
  getStaffAccountRecordById,
  updateStaffAccount,
  deleteStaffAccount,
  listStaffAccounts,
  assertEmailAvailable,
  assertPhoneAvailable,
  toPublicStaffAccount,
} = require("../../models/staffAccountModel");
const { getRoleById, roleTargetsAccountType } = require("../../models/roleModel");
const { normalizeEmail, normalizePhone, normalizeCountryCode } = require("../../models/userModel");
const { ACCOUNT_TYPES, ADMIN, WELLNESS_COACH, STAFF } = require("../../config/staffPermissionCatalog");

const S3_FOLDER = "staff";
const STATUS_VALUES = new Set(["active", "inactive", "blocked"]);

function parseAccountType(req) {
  const raw = req.params.accountType || req.query.accountType || req.body.accountType;
  const type = String(raw || "").trim();
  if (!ACCOUNT_TYPES.includes(type)) {
    throw new AppError(`accountType must be one of ${ACCOUNT_TYPES.join(", ")}`, 400);
  }
  return type;
}

async function assertValidRoleForAccountType(roleId, accountType) {
  if (!roleId) return;
  const role = await getRoleById(roleId);
  if (!role) throw new AppError("Role not found", 404);
  if (role.status !== "active") throw new AppError("Role is not active", 400);
  if (!roleTargetsAccountType(role, accountType)) {
    throw new AppError("Role is not assignable to this account type", 400);
  }
}

exports.listStaffAccountsController = asyncHandler(async (req, res) => {
  const accountType = req.query.accountType ? parseAccountType(req) : undefined;
  const { page, limit, status, search, roleId } = req.query;
  const { accounts, pagination } = await listStaffAccounts({
    accountType,
    page,
    limit,
    status,
    search,
    roleId,
  });
  return res.status(200).json({ status: true, message: "Staff accounts fetched successfully", accounts, pagination });
});

exports.getStaffAccountByIdController = asyncHandler(async (req, res) => {
  const account = await getStaffAccountRecordById(req.params.id);
  if (!account) throw new AppError("Staff account not found", 404);
  return res.status(200).json({ status: true, account: toPublicStaffAccount(account) });
});

exports.createStaffAccountController = asyncHandler(async (req, res) => {
  const accountType = parseAccountType(req);
  const { name, email, password, roleId, status = "active" } = req.body;

  if (!name || !email || !password) {
    throw new AppError("name, email, and password are required", 400);
  }
  assertPasswordPolicy(password, { required: true, label: "Password" });

  const normalizedEmail = normalizeEmail(email);
  await assertEmailAvailable(normalizedEmail);

  const phone = req.body.phone !== undefined ? normalizePhone(req.body.phone) : "";
  const phoneCountryCode = normalizeCountryCode(req.body.phoneCountryCode);
  if (phone) await assertPhoneAvailable(phoneCountryCode, phone);

  const isSuperAdmin = accountType === ADMIN ? Boolean(req.body.isSuperAdmin) : false;
  if (!isSuperAdmin) await assertValidRoleForAccountType(roleId, accountType);

  if (accountType === STAFF && !roleId) {
    // No legacy full-access precedent for the generic Staff type — a role is
    // always required (resolveStaffPermissions returns zero permissions for
    // a roleless Staff account, so skipping this would silently create a
    // account that can never do anything).
    throw new AppError("roleId is required for Staff accounts", 400);
  }

  if (accountType !== ADMIN && accountType !== STAFF && !isSuperAdmin && !roleId) {
    // Coach/assistant accounts with no role default to full-access (legacy
    // behavior, see resolveStaffPermissions) — allowed, but require an
    // explicit opt-in so it's never accidental from this admin-facing form.
    if (req.body.allowNoRole !== true) {
      throw new AppError("roleId is required (or set allowNoRole=true for full access)", 400);
    }
  }

  if (accountType === WELLNESS_COACH && !req.body.specializationId) {
    throw new AppError("specializationId is required for wellness coaches", 400);
  }
  if (accountType === "assistant_wellness_coach" && !req.body.wellnessCoachId) {
    throw new AppError("wellnessCoachId is required for assistant coaches", 400);
  }

  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  const parsedProfileImage = parseMediaKeyFromBody(req.body.profileImage, "profileImage");

  const account = await createStaffAccount({
    accountType,
    name,
    email: normalizedEmail,
    phone,
    phoneCountryCode,
    password: await hashPassword(password),
    profileImage: uploadedKey ?? (parsedProfileImage !== undefined ? parsedProfileImage : null),
    status: STATUS_VALUES.has(status) ? status : "active",
    isSuperAdmin,
    roleId: isSuperAdmin ? undefined : roleId || undefined,
    specializationId: req.body.specializationId,
    approvalStatus: req.body.approvalStatus,
    bio: req.body.bio,
    country: req.body.country,
    state: req.body.state,
    city: req.body.city,
    wellnessCoachId: req.body.wellnessCoachId,
    designation: req.body.designation,
    webVisible: req.body.webVisible,
    appVisible: req.body.appVisible,
  });

  return res.status(201).json({
    status: true,
    message: "Staff account created successfully",
    account: toPublicStaffAccount(account),
  });
});

exports.updateStaffAccountController = asyncHandler(async (req, res) => {
  const account = await getStaffAccountRecordById(req.params.id);
  if (!account) throw new AppError("Staff account not found", 404);

  const updates = {};
  const body = req.body || {};

  if (body.name !== undefined) updates.name = String(body.name).trim();
  if (body.email !== undefined) {
    const email = normalizeEmail(body.email);
    await assertEmailAvailable(email, account.id);
    updates.email = email;
  }
  if (body.phone !== undefined) {
    const phone = normalizePhone(body.phone);
    const phoneCountryCode =
      body.phoneCountryCode !== undefined ? normalizeCountryCode(body.phoneCountryCode) : account.phoneCountryCode;
    if (phone) await assertPhoneAvailable(phoneCountryCode, phone, account.id);
    updates.phone = phone;
    if (body.phoneCountryCode !== undefined) updates.phoneCountryCode = phoneCountryCode;
  }
  if (body.status !== undefined) {
    if (!STATUS_VALUES.has(body.status)) throw new AppError("Invalid status", 400);
    updates.status = body.status;
  }
  if (body.roleId !== undefined) {
    if (account.isSuperAdmin) throw new AppError("Super Admin accounts do not use roles", 400);
    if (!body.roleId && account.accountType === STAFF) {
      throw new AppError("roleId is required for Staff accounts", 400);
    }
    if (body.roleId) await assertValidRoleForAccountType(body.roleId, account.accountType);
    updates.roleId = body.roleId || null;
  }
  if (body.password !== undefined && body.password !== "") {
    assertPasswordPolicy(body.password, { required: true, label: "Password" });
    updates.password = await hashPassword(body.password);
  }
  if (account.accountType === WELLNESS_COACH) {
    if (body.specializationId !== undefined) updates.specializationId = body.specializationId;
    if (body.approvalStatus !== undefined) updates.approvalStatus = body.approvalStatus;
    if (body.bio !== undefined) updates.bio = body.bio;
    if (body.permissionOverrides !== undefined) updates.permissionOverrides = body.permissionOverrides;
  }
  if (account.accountType === "assistant_wellness_coach" && body.designation !== undefined) {
    updates.designation = body.designation;
  }
  // accountType and isSuperAdmin are intentionally never accepted here —
  // conflict-avoidance safeguards #2/#3 in the migration plan.

  if (body.profileImage !== undefined) {
    const key = parseMediaKeyFromBody(body.profileImage, "profileImage");
    if (key === null && account.profileImage) await deleteStoredMedia(account.profileImage);
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
    message: "Staff account updated successfully",
    account: toPublicStaffAccount(updated),
  });
});

exports.deleteStaffAccountController = asyncHandler(async (req, res) => {
  const account = await getStaffAccountRecordById(req.params.id);
  if (!account) throw new AppError("Staff account not found", 404);

  if (account.isSuperAdmin) {
    throw new AppError("Super Admin accounts cannot be deleted", 400);
  }
  if (req.auth?.sub === account.id) {
    throw new AppError("You cannot delete your own account", 400);
  }
  if (account.profileImage) {
    await deleteStoredMedia(account.profileImage);
  }

  await deleteStaffAccount(account.id);
  return res.status(200).json({ status: true, message: "Staff account deleted successfully" });
});
