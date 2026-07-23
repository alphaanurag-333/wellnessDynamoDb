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
  createAdmin,
  getAdminById,
  getAdminByEmail,
  updateAdmin,
  deleteAdmin,
  listAdmins,
  toPublicAdmin,
} = require("../../models/adminModel");
const { getRoleById, roleTargetsAccountType } = require("../../models/roleModel");

const S3_FOLDER = "admin";
const STATUS_VALUES = new Set(["active", "inactive"]);
const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

function normalizeRequiredPhone(phone) {
  const trimmed = phone == null ? "" : String(phone).trim();
  if (!trimmed) {
    throw new AppError("Mobile number is required", 400);
  }
  if (!INDIAN_MOBILE_PATTERN.test(trimmed)) {
    throw new AppError("Mobile number must be a 10-digit number starting with 6, 7, 8, or 9", 400);
  }
  return trimmed;
}

async function assertRoleExists(roleId) {
  if (!roleId) {
    throw new AppError("roleId is required", 400);
  }
  const role = await getRoleById(roleId);
  if (!role) {
    throw new AppError("Role not found", 404);
  }
  // Safeguard #4 (Unified Staff RBAC Panel plan): a role only usable by
  // coach/assistant accounts must never be assignable to an admin, and
  // vice versa — checked against `Role.accountTypes` (the unified
  // replacement for the old `Role.scope` ADMIN/COACH split) so this holds
  // even for roles that target multiple account types at once.
  if (!roleTargetsAccountType(role, "admin")) {
    throw new AppError("This role is not assignable to admin accounts", 400);
  }
  return role;
}

async function getSubAdminOrThrow(id) {
  const admin = await getAdminById(id);
  if (!admin || admin.isSuperAdmin) {
    throw new AppError("Sub-admin not found", 404);
  }
  return admin;
}

exports.listSubAdminsController = asyncHandler(async (req, res) => {
  const { page, limit, status, search } = req.query;

  const { admins, pagination } = await listAdmins({
    page,
    limit,
    status,
    search,
    includeSuperAdmins: false,
  });

  return res.status(200).json({
    status: true,
    message: "Sub-admins fetched successfully",
    admins,
    pagination,
  });
});

exports.getSubAdminByIdController = asyncHandler(async (req, res) => {
  const admin = await getSubAdminOrThrow(req.params.id);
  return res.status(200).json({
    status: true,
    message: "Sub-admin fetched successfully",
    admin: toPublicAdmin(admin),
  });
});

exports.createSubAdminController = asyncHandler(async (req, res) => {
  const { name, email, password, phone, roleId, status = "active", profileImage } = req.body;

  if (!name || !email || !password) {
    throw new AppError("Name, email, and password are required", 400);
  }
  const normalizedPhone = normalizeRequiredPhone(phone);
  assertPasswordPolicy(password, { required: true, label: "Password" });
  await assertRoleExists(roleId);

  const existing = await getAdminByEmail(email);
  if (existing) {
    throw new AppError("An admin already exists with this email", 409);
  }

  const passwordHash = await hashPassword(password);
  const parsedProfileImage = parseMediaKeyFromBody(profileImage, "profileImage");
  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);

  const admin = await createAdmin({
    name,
    email,
    password: passwordHash,
    phone: normalizedPhone,
    profileImage: uploadedKey ?? (parsedProfileImage !== undefined ? parsedProfileImage : null),
    status: STATUS_VALUES.has(status) ? status : "active",
    isSuperAdmin: false,
    roleId,
  });

  return res.status(201).json({
    status: true,
    message: "Sub-admin created successfully",
    admin: toPublicAdmin(admin),
  });
});

exports.updateSubAdminController = asyncHandler(async (req, res) => {
  const admin = await getSubAdminOrThrow(req.params.id);

  const { name, phone, roleId, status, password, profileImage } = req.body;
  const updates = {};

  if (name !== undefined) updates.name = String(name).trim();
  if (phone !== undefined) updates.phone = normalizeRequiredPhone(phone);
  if (status !== undefined) {
    if (!STATUS_VALUES.has(status)) {
      throw new AppError("status must be 'active' or 'inactive'", 400);
    }
    updates.status = status;
  }
  if (roleId !== undefined) {
    await assertRoleExists(roleId);
    updates.roleId = roleId;
  }
  if (password !== undefined && password !== "") {
    assertPasswordPolicy(password, { required: true, label: "Password" });
    updates.password = await hashPassword(password);
  }

  if (profileImage !== undefined) {
    const key = parseMediaKeyFromBody(profileImage, "profileImage");
    if (key === null && admin.profileImage) {
      await deleteStoredMedia(admin.profileImage);
    }
    updates.profileImage = key;
  }

  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (uploadedKey) {
    if (admin.profileImage && admin.profileImage !== uploadedKey) {
      await deleteStoredMedia(admin.profileImage);
    }
    updates.profileImage = uploadedKey;
  }

  // isSuperAdmin is intentionally never accepted from the request body — a
  // sub-admin can never be promoted/demoted through this endpoint.
  const updated = await updateAdmin(admin.id, updates);

  return res.status(200).json({
    status: true,
    message: "Sub-admin updated successfully",
    admin: toPublicAdmin(updated),
  });
});

exports.updateSubAdminStatusController = asyncHandler(async (req, res) => {
  const admin = await getSubAdminOrThrow(req.params.id);
  const { status } = req.body;

  if (!STATUS_VALUES.has(status)) {
    throw new AppError("status must be 'active' or 'inactive'", 400);
  }

  const updated = await updateAdmin(admin.id, { status });

  return res.status(200).json({
    status: true,
    message: "Sub-admin status updated successfully",
    admin: toPublicAdmin(updated),
  });
});

exports.deleteSubAdminController = asyncHandler(async (req, res) => {
  const admin = await getSubAdminOrThrow(req.params.id);

  if (req.auth?.sub === admin.id) {
    throw new AppError("You cannot delete your own account", 400);
  }

  if (admin.profileImage) {
    await deleteStoredMedia(admin.profileImage);
  }

  await deleteAdmin(admin.id);

  return res.status(200).json({
    status: true,
    message: "Sub-admin deleted successfully",
  });
});
