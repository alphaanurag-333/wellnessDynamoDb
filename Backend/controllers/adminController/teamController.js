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
  createAccount,
  getAccountById,
  getAccountByEmail,
  updateAccount,
  deleteAccount,
  listAccounts,
  toPublicAccount,
  deriveAccountKindFromRole,
  deriveAccountType,
  TABLE: ACCOUNTS_TABLE,
} = require("../../models/accountModel");
const { getRoleById, listRoles } = require("../../models/roleModel");
const {
  generateUniqueReferralCode,
  registerReferralCode,
  deleteReferralCodeRecord,
  ensureEntityReferralCode,
  updateReferralCodeOwnerCoachId,
} = require("../../models/referralCodeModel");

const S3_FOLDER = "admin";
const STATUS_VALUES = new Set(["active", "inactive"]);
const APPROVAL_VALUES = new Set(["pending", "approved", "rejected"]);
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
  return role;
}

async function getTeamMemberOrThrow(id) {
  const account = await getAccountById(id);
  if (!account || account.isSuperAdmin) {
    throw new AppError("Team member not found", 404);
  }
  return account;
}

async function enrichPublicMember(account) {
  const pub = toPublicAccount(account);
  if (!pub) return null;
  let role = null;
  if (account.roleId) {
    role = await getRoleById(account.roleId);
  }
  pub.accountType = deriveAccountType(account, role);
  pub.roleName = role?.name || null;
  return pub;
}

async function assertParentCoach(parentAccountId, { excludeId } = {}) {
  if (!parentAccountId) return null;
  const parent = await getAccountById(parentAccountId);
  if (!parent || parent.isSuperAdmin) {
    throw new AppError("Reports-to account not found", 404);
  }
  if (excludeId && parent.id === excludeId) {
    throw new AppError("A team member cannot report to themselves", 400);
  }
  if (parent.parentAccountId) {
    throw new AppError("Reports-to must be a coach / top-level team member, not an assistant", 400);
  }
  return parent;
}

function referralEntityTypeForKind(accountKind) {
  if (accountKind === "assistant") return "assistant_wellness_coach";
  if (accountKind === "coach") return "wellness_coach";
  return null;
}

async function assignReferralCodeToAccount(account) {
  if (!account?.id) return account;
  const entityType = referralEntityTypeForKind(account.accountKind);
  if (!entityType) return account;

  const ownerCoachId = account.parentAccountId || account.id;
  const code = await ensureEntityReferralCode({
    tableName: ACCOUNTS_TABLE,
    entityType,
    entityId: account.id,
    ownerCoachId,
    referralCode: account.referralCode,
  });

  if (code && code !== account.referralCode) {
    return { ...account, referralCode: code };
  }
  if (account.referralCode && account.parentAccountId) {
    try {
      await updateReferralCodeOwnerCoachId(account.referralCode, ownerCoachId);
    } catch {
      // Registry row may be missing; ensureEntityReferralCode already handled create path.
    }
  }
  return account.referralCode ? account : { ...account, referralCode: code };
}

exports.listTeamMembersController = asyncHandler(async (req, res) => {
  const { page, limit, status, search, roleId } = req.query;

  const { accounts, pagination } = await listAccounts({
    page,
    limit,
    status,
    search,
    roleId,
    includeSuperAdmins: false,
  });

  const members = await Promise.all(accounts.map((row) => enrichPublicMember(row)));

  return res.status(200).json({
    status: true,
    message: "Team members fetched successfully",
    members,
    pagination,
  });
});

/** Active roles for Team filters / assign dropdown (team.view — not Super Admin only). */
exports.listTeamRoleOptionsController = asyncHandler(async (_req, res) => {
  const { roles } = await listRoles({ page: 1, limit: 200, status: "active" });
  return res.status(200).json({
    status: true,
    message: "Team role options fetched successfully",
    roles: (roles || []).map((role) => ({
      id: role.id,
      name: role.name,
      slug: role.slug,
    })),
  });
});

/** Coaches eligible as "Reports to" parents (no parent of their own). */
exports.listTeamParentsController = asyncHandler(async (req, res) => {
  const { accounts } = await listAccounts({
    page: 1,
    limit: 200,
    status: "active",
    includeSuperAdmins: false,
  });

  const parents = [];
  for (const row of accounts) {
    if (row.parentAccountId) continue;
    const role = row.roleId ? await getRoleById(row.roleId) : null;
    const type = deriveAccountType(row, role);
    // Prefer care/coach accounts; also include any non-assistant without parent.
    if (type === "assistant_wellness_coach") continue;
    parents.push({
      id: row.id,
      name: row.name,
      email: row.email,
      accountType: type,
    });
  }

  return res.status(200).json({
    status: true,
    message: "Team parent options fetched successfully",
    parents,
  });
});

exports.getTeamMemberByIdController = asyncHandler(async (req, res) => {
  const account = await getTeamMemberOrThrow(req.params.id);
  return res.status(200).json({
    status: true,
    message: "Team member fetched successfully",
    member: await enrichPublicMember(account),
  });
});

exports.createTeamMemberController = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    roleId,
    status = "active",
    profileImage,
    parentAccountId,
    specializationId,
    referralCode,
    approvalStatus,
    bio,
    designation,
  } = req.body;

  if (!name || !email || !password) {
    throw new AppError("Name, email, and password are required", 400);
  }
  const normalizedPhone = normalizeRequiredPhone(phone);
  assertPasswordPolicy(password, { required: true, label: "Password" });
  const role = await assertRoleExists(roleId);

  const existing = await getAccountByEmail(email);
  if (existing) {
    throw new AppError("An account already exists with this email", 409);
  }

  const parentId =
    parentAccountId != null && String(parentAccountId).trim()
      ? String(parentAccountId).trim()
      : null;
  await assertParentCoach(parentId);

  const passwordHash = await hashPassword(password);
  const parsedProfileImage = parseMediaKeyFromBody(profileImage, "profileImage");
  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  const accountKind = deriveAccountKindFromRole(role, { parentAccountId: parentId });

  const fields = {
    name,
    email,
    password: passwordHash,
    phone: normalizedPhone,
    phoneCountryCode: "+91",
    profileImage: uploadedKey ?? (parsedProfileImage !== undefined ? parsedProfileImage : null),
    status: STATUS_VALUES.has(status) ? status : "active",
    isSuperAdmin: false,
    roleId,
    accountKind,
    parentAccountId: parentId,
  };

  if (specializationId != null && String(specializationId).trim()) {
    fields.specializationId = String(specializationId).trim();
  }
  // Auto-generate like users/coaches — do not rely on a manual form field.
  if (accountKind === "coach" || accountKind === "assistant") {
    fields.referralCode =
      referralCode != null && String(referralCode).trim()
        ? String(referralCode).trim().toUpperCase()
        : await generateUniqueReferralCode();
  }
  if (approvalStatus && APPROVAL_VALUES.has(approvalStatus)) {
    fields.approvalStatus = approvalStatus;
  } else if (accountKind === "coach" || accountKind === "assistant") {
    fields.approvalStatus = "approved";
  }
  if (bio != null) fields.bio = bio;
  if (designation != null) fields.designation = designation;

  let account = await createAccount(fields);

  if (account.referralCode) {
    const entityType = referralEntityTypeForKind(account.accountKind);
    if (entityType) {
      await registerReferralCode({
        referralCode: account.referralCode,
        entityType,
        entityId: account.id,
        ownerCoachId: account.parentAccountId || account.id,
      });
    }
  }

  account = await assignReferralCodeToAccount(account);

  return res.status(201).json({
    status: true,
    message: "Team member created successfully",
    member: await enrichPublicMember(account),
  });
});

exports.updateTeamMemberController = asyncHandler(async (req, res) => {
  const account = await getTeamMemberOrThrow(req.params.id);

  const {
    name,
    phone,
    roleId,
    status,
    password,
    profileImage,
    parentAccountId,
    specializationId,
    referralCode,
    approvalStatus,
    bio,
    designation,
  } = req.body;
  const updates = {};

  if (name !== undefined) updates.name = String(name).trim();
  if (phone !== undefined) updates.phone = normalizeRequiredPhone(phone);
  if (status !== undefined) {
    if (!STATUS_VALUES.has(status)) {
      throw new AppError("status must be 'active' or 'inactive'", 400);
    }
    updates.status = status;
  }

  let role = account.roleId ? await getRoleById(account.roleId) : null;
  if (roleId !== undefined) {
    role = await assertRoleExists(roleId);
    updates.roleId = roleId;
  }

  if (password !== undefined && password !== "") {
    assertPasswordPolicy(password, { required: true, label: "Password" });
    updates.password = await hashPassword(password);
  }

  if (parentAccountId !== undefined) {
    const parentId =
      parentAccountId == null || parentAccountId === ""
        ? null
        : String(parentAccountId).trim();
    if (parentId) await assertParentCoach(parentId, { excludeId: account.id });
    updates.parentAccountId = parentId;
  }

  const nextParentId =
    updates.parentAccountId !== undefined ? updates.parentAccountId : account.parentAccountId || null;
  updates.accountKind = deriveAccountKindFromRole(role, { parentAccountId: nextParentId });

  if (specializationId !== undefined) {
    updates.specializationId =
      specializationId == null || specializationId === "" ? null : String(specializationId).trim();
  }
  // Referral code is system-generated — ignore client edits.
  void referralCode;
  if (approvalStatus !== undefined) {
    if (approvalStatus && !APPROVAL_VALUES.has(approvalStatus)) {
      throw new AppError("approvalStatus must be pending, approved, or rejected", 400);
    }
    updates.approvalStatus = approvalStatus || null;
  }
  if (bio !== undefined) updates.bio = bio;
  if (designation !== undefined) updates.designation = designation;

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

  let updated = await updateAccount(account.id, updates);
  updated = await assignReferralCodeToAccount(updated);

  return res.status(200).json({
    status: true,
    message: "Team member updated successfully",
    member: await enrichPublicMember(updated),
  });
});

exports.updateTeamMemberStatusController = asyncHandler(async (req, res) => {
  const account = await getTeamMemberOrThrow(req.params.id);
  const { status } = req.body;

  if (!STATUS_VALUES.has(status)) {
    throw new AppError("status must be 'active' or 'inactive'", 400);
  }

  const updated = await updateAccount(account.id, { status });

  return res.status(200).json({
    status: true,
    message: "Team member status updated successfully",
    member: await enrichPublicMember(updated),
  });
});

exports.deleteTeamMemberController = asyncHandler(async (req, res) => {
  const account = await getTeamMemberOrThrow(req.params.id);

  if (req.auth?.sub === account.id) {
    throw new AppError("You cannot delete your own account", 400);
  }

  if (account.profileImage) {
    await deleteStoredMedia(account.profileImage);
  }

  if (account.referralCode) {
    try {
      await deleteReferralCodeRecord(account.referralCode);
    } catch {
      // Best-effort registry cleanup.
    }
  }

  await deleteAccount(account.id);

  return res.status(200).json({
    status: true,
    message: "Team member deleted successfully",
  });
});
