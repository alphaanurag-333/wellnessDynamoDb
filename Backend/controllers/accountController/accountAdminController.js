const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { hashPassword } = require("../../utils/password");
const { assertPasswordPolicy } = require("../../utils/passwordPolicy");
const {
  listAccounts,
  getAccountById,
  createAccount,
  addMembership,
  removeMembership,
  toPublicAccount,
  getAccountByEmail,
  getAccountByPhone,
  getMembership,
  updateAccount,
  deleteAccount,
} = require("../../models/accountModel");
const { uploadMulterFile, deleteStoredMedia } = require("../../utils/s3");
const {
  normalizeCoachContent,
  introHasMedia,
  letterHasFile,
  asBool,
  asString,
} = require("../../utils/coachContent");
const { getAppConfig, toPublicAppConfig } = require("../../models/appConfigModel");
const { getRoleById, listRoles } = require("../../models/roleModel");
const { normalizeRoleKey, ROLE_KEY_TO_UI } = require("../../config/accountRoles");
const { normalizeEmail, normalizePhone, normalizeCountryCode, listUsersByParentCoachId, listUsersByAssignedCoachId } = require("../../models/userModel");
const { UI_TO_ACCOUNT_ROLE } = require("../../config/consolePermissionCatalog");
const {
  generateUniqueReferralCode,
  registerReferralCode,
} = require("../../models/referralCodeModel");

const DEFAULT_TEMP_PASSWORD = process.env.SEED_STAFF_PASSWORD || "Admin@12345";
const CONSOLE_SCOPE = "CONSOLE";
const REFERRAL_STAFF_ROLES = new Set(["wellness_coach", "assistant_wellness_coach"]);

async function resolveAccountRoleKeyFromConsoleRole(startRole) {
  let current = startRole;
  const seen = new Set();
  while (current) {
    if (seen.has(current.id)) break;
    seen.add(current.id);

    const uiKey = String(current.roleKey || "").trim().toLowerCase();
    if (uiKey) {
      const mapped = UI_TO_ACCOUNT_ROLE[uiKey] || normalizeRoleKey(uiKey);
      if (mapped) return mapped;
    }

    if (!current.inheritsFromRoleId) break;
    current = await getRoleById(current.inheritsFromRoleId);
    if (current && current.scope !== CONSOLE_SCOPE) break;
  }
  return null;
}

/**
 * Resolve Access Control role + Account membership roleKey for team create.
 * Accepts consoleRoleId (preferred) and/or roleKey (ui or account key).
 */
async function resolveCreateRoleTarget({ rawRole, consoleRoleId }) {
  const { ensureConsoleRolesSeeded } = require("./accessController");
  const { byKey } = await ensureConsoleRolesSeeded();

  let consoleRole = null;
  const roleId = String(consoleRoleId || "").trim();
  if (roleId) {
    consoleRole = await getRoleById(roleId);
    if (!consoleRole || consoleRole.scope !== CONSOLE_SCOPE) {
      throw new AppError("Access Control role not found", 404);
    }
    if (consoleRole.status && consoleRole.status !== "active") {
      throw new AppError("Access Control role is not active", 400);
    }
  }

  const uiOrAccount = String(rawRole || "").trim().toLowerCase();
  if (!consoleRole && uiOrAccount) {
    consoleRole = byKey[uiOrAccount] || null;
    if (!consoleRole) {
      const { roles } = await listRoles({
        scope: CONSOLE_SCOPE,
        status: "active",
        page: 1,
        limit: 100,
      });
      consoleRole =
        roles.find((r) => String(r.roleKey || "").toLowerCase() === uiOrAccount) ||
        roles.find((r) => String(r.id) === uiOrAccount) ||
        null;
    }
  }

  let accountRoleKey = null;
  if (consoleRole) {
    accountRoleKey = await resolveAccountRoleKeyFromConsoleRole(consoleRole);
  }
  if (!accountRoleKey && uiOrAccount) {
    accountRoleKey = UI_TO_ACCOUNT_ROLE[uiOrAccount] || normalizeRoleKey(uiOrAccount);
  }

  if (!accountRoleKey || accountRoleKey === "admin") {
    throw new AppError(
      "Choose a non-admin Access Control role (or a custom role that inherits from one)",
      400
    );
  }

  if (!consoleRole) {
    const uiRole = ROLE_KEY_TO_UI[accountRoleKey] || uiOrAccount;
    consoleRole = byKey[uiRole] || null;
  }

  return { accountRoleKey, consoleRole };
}

function primaryAccountRoleKey(account) {
  const roleKeys = Array.isArray(account?.roleKeys) ? account.roleKeys : [];
  if (account?.defaultRoleKey && roleKeys.includes(account.defaultRoleKey)) {
    return account.defaultRoleKey;
  }
  return roleKeys[0] || null;
}

async function resolveWellnessCoachId(account) {
  if (!account) return null;
  const roleKeys = Array.isArray(account.roleKeys) ? account.roleKeys : [];
  if (roleKeys.includes("wellness_coach")) return account.id;

  let current = account;
  const seen = new Set();
  while (current?.parentAccountId || getMembership(current, primaryAccountRoleKey(current))?.parentAccountId) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    const parentId =
      current.parentAccountId ||
      getMembership(current, primaryAccountRoleKey(current))?.parentAccountId ||
      null;
    if (!parentId) break;
    current = await getAccountById(parentId);
    if (!current) break;
    const keys = Array.isArray(current.roleKeys) ? current.roleKeys : [];
    if (keys.includes("wellness_coach")) return current.id;
  }
  return null;
}

async function countAssignedClients(account) {
  const role = primaryAccountRoleKey(account);
  if (role === "wellness_coach") {
    const clients = await listUsersByParentCoachId(account.id, { page: 1, limit: 1, scope: "all" });
    return Number(clients.pagination?.total || 0);
  }
  const parentCoachId = await resolveWellnessCoachId(account);
  if (!parentCoachId) return 0;
  const clients = await listUsersByAssignedCoachId(account.id, {
    parentCoachId,
    page: 1,
    limit: 1,
  });
  return Number(clients.pagination?.total || 0);
}

async function countReportingStaff(accountId) {
  const children = await listAccounts({
    parentAccountId: accountId,
    page: 1,
    limit: 1,
  });
  return Number(children.pagination?.total || 0);
}

exports.listAccountsHandler = asyncHandler(async (req, res) => {
  const result = await listAccounts({
    status: req.query.status,
    search: req.query.search || req.query.q,
    page: req.query.page,
    limit: req.query.limit,
    roleKey: req.query.roleKey,
    approvalStatus: req.query.approvalStatus,
    parentAccountId: req.query.parentAccountId,
    specializationId: req.query.specializationId,
  });
  return res.json({
    status: true,
    accounts: result.accounts || [],
    pagination: result.pagination,
  });
});

exports.getAccountHandler = asyncHandler(async (req, res) => {
  const account = await getAccountById(req.params.id);
  if (!account) throw new AppError("Account not found", 404);
  return res.json({ status: true, account: toPublicAccount(account) });
});

/**
 * Create a staff Account (Teams page).
 * Body: name, email, phone?, phoneCountryCode?, password?,
 *       roleKey (ui/account) and/or consoleRoleId (Access Control role id),
 *       parentAccountId?
 */
exports.createAccountHandler = asyncHandler(async (req, res) => {
  if (!req.auth?.isSuperAdmin) {
    throw new AppError("Only the Super Admin can create team members", 403);
  }

  const {
    name,
    email,
    phone,
    phoneCountryCode,
    password,
    roleKey: rawRole,
    consoleRoleId,
    parentAccountId,
  } = req.body || {};

  if (!name || !String(name).trim()) throw new AppError("name is required", 400);
  if (!email || !String(email).trim()) throw new AppError("email is required", 400);

  const { accountRoleKey, consoleRole } = await resolveCreateRoleTarget({
    rawRole,
    consoleRoleId,
  });

  const normalized = normalizeEmail(email);
  const existing = await getAccountByEmail(normalized);
  if (existing) throw new AppError("An account already exists with this email", 409);

  const tempPassword = password ? String(password) : DEFAULT_TEMP_PASSWORD;
  assertPasswordPolicy(tempPassword);
  const passwordHash = await hashPassword(tempPassword);

  let parentId = parentAccountId || null;
  if (
    (accountRoleKey === "assistant_wellness_coach" || accountRoleKey === "trainee") &&
    !parentId
  ) {
    throw new AppError("parentAccountId is required for assistants and trainees", 400);
  }
  if (parentId) {
    const parent = await getAccountById(parentId);
    if (!parent) throw new AppError("Parent team member not found", 404);
    const requiredParentRole =
      accountRoleKey === "assistant_wellness_coach"
        ? "wellness_coach"
        : accountRoleKey === "trainee"
          ? "assistant_wellness_coach"
          : null;
    if (requiredParentRole && !parent.roleKeys?.includes(requiredParentRole)) {
      throw new AppError(
        accountRoleKey === "trainee"
          ? "A trainee must report to an Assistant WC"
          : "An Assistant WC must report to a Wellness Coach",
        400
      );
    }
  }

  let referralCode = null;
  if (REFERRAL_STAFF_ROLES.has(accountRoleKey)) {
    referralCode = await generateUniqueReferralCode({ entityType: accountRoleKey });
  }

  const account = await createAccount({
    name: String(name).trim(),
    email: normalized,
    password: passwordHash,
    phone: phone ? normalizePhone(phone) : null,
    phoneCountryCode: phoneCountryCode ? normalizeCountryCode(phoneCountryCode) : "+91",
    status: "active",
    approvalStatus: accountRoleKey === "wellness_coach" ? "approved" : undefined,
    defaultRoleKey: accountRoleKey,
    parentAccountId: parentId,
    referralCode,
    memberships: [
      {
        roleKey: accountRoleKey,
        roleId: consoleRole?.id || null,
        status: "active",
        parentAccountId:
          accountRoleKey === "assistant_wellness_coach" || accountRoleKey === "trainee"
            ? parentId
            : null,
      },
    ],
  });

  if (referralCode) {
    await registerReferralCode({
      referralCode,
      entityType: accountRoleKey,
      entityId: account.id,
      ownerCoachId: accountRoleKey === "wellness_coach" ? account.id : parentId,
    });
  }

  return res.status(201).json({
    status: true,
    message: "Team member created",
    account: toPublicAccount(account),
    temporaryPassword: password ? undefined : tempPassword,
  });
});

/**
 * Update a staff Account profile (Teams page).
 * Body: name?, email?, phone?, phoneCountryCode?
 */
exports.updateAccountHandler = asyncHandler(async (req, res) => {
  if (!req.auth?.isSuperAdmin) {
    throw new AppError("Only the Super Admin can edit team members", 403);
  }

  const account = await getAccountById(req.params.id);
  if (!account) throw new AppError("Account not found", 404);
  if (account.isSuperAdmin) {
    throw new AppError("This account cannot be edited here", 403);
  }

  const { name, email, phone, phoneCountryCode } = req.body || {};
  const updates = {};

  if (name !== undefined) {
    if (!String(name).trim()) throw new AppError("name is required", 400);
    updates.name = String(name).trim();
  }

  if (email !== undefined) {
    const normalized = normalizeEmail(email);
    if (!normalized) throw new AppError("email is required", 400);
    const existing = await getAccountByEmail(normalized);
    if (existing && existing.id !== account.id) {
      throw new AppError("An account already exists with this email", 409);
    }
    updates.email = normalized;
  }

  if (phoneCountryCode !== undefined) {
    updates.phoneCountryCode = normalizeCountryCode(phoneCountryCode);
  }

  if (phone !== undefined) {
    const nextPhone = phone ? normalizePhone(phone) : null;
    if (!nextPhone) throw new AppError("phone is required", 400);
    updates.phone = nextPhone;
    const nextCc = updates.phoneCountryCode || account.phoneCountryCode || "+91";
    const existingPhone = await getAccountByPhone(nextCc, nextPhone);
    if (existingPhone && existingPhone.id !== account.id) {
      throw new AppError("An account already exists with this phone number", 409);
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("No profile fields to update", 400);
  }

  const updated = await updateAccount(account.id, updates);
  return res.json({
    status: true,
    message: "Profile updated",
    account: toPublicAccount(updated),
  });
});

/**
 * Delete a staff Account (Teams page).
 * Refuses if any clients are assigned, or if other staff report to this member.
 */
exports.deleteAccountHandler = asyncHandler(async (req, res) => {
  if (!req.auth?.isSuperAdmin) {
    throw new AppError("Only the Super Admin can delete team members", 403);
  }

  const account = await getAccountById(req.params.id);
  if (!account) throw new AppError("Account not found", 404);
  if (account.isSuperAdmin) {
    throw new AppError("This account cannot be deleted", 403);
  }
  if (req.auth?.sub && String(req.auth.sub) === String(account.id)) {
    throw new AppError("You cannot delete your own account", 400);
  }

  const assignedUsers = await countAssignedClients(account);
  if (assignedUsers > 0) {
    const label = assignedUsers === 1 ? "user is" : "users are";
    throw new AppError(
      `Cannot delete: ${assignedUsers} ${label} assigned to this team member. Reassign them first.`,
      400
    );
  }

  const reportingStaff = await countReportingStaff(account.id);
  if (reportingStaff > 0) {
    const label = reportingStaff === 1 ? "team member reports" : "team members report";
    throw new AppError(
      `Cannot delete: ${reportingStaff} ${label} to this person. Reassign them first.`,
      400
    );
  }

  await deleteAccount(account.id);
  return res.json({
    status: true,
    message: "Team member deleted",
    deleted: true,
  });
});

exports.grantMembershipHandler = asyncHandler(async (req, res) => {
  const roleKey = normalizeRoleKey(req.body?.roleKey);
  if (!roleKey) throw new AppError("roleKey is required", 400);

  const account = await addMembership(req.params.id, {
    roleKey,
    roleId: req.body?.roleId || null,
    permissionOverrides: req.body?.permissionOverrides || null,
    status: req.body?.status || "active",
    parentAccountId: req.body?.parentAccountId || null,
  });
  return res.status(201).json({
    status: true,
    message: "Membership granted",
    account: toPublicAccount(account),
  });
});

exports.revokeMembershipHandler = asyncHandler(async (req, res) => {
  const roleKey = normalizeRoleKey(req.params.roleKey);
  if (!roleKey) throw new AppError("roleKey is required", 400);
  const account = await removeMembership(req.params.id, roleKey);
  return res.json({
    status: true,
    message: "Membership revoked",
    account: toPublicAccount(account),
  });
});

const COACH_CONTENT_FOLDER = "coach-content";

const COACH_CONTENT_ROLES = new Set([
  "wellness_coach",
  "assistant_wellness_coach",
  "trainee",
]);

function accountRoleKeys(account) {
  return new Set(
    [
      ...(Array.isArray(account.roleKeys) ? account.roleKeys : []),
      ...(Array.isArray(account.memberships) ? account.memberships.map((row) => row?.roleKey) : []),
    ]
      .map((key) => normalizeRoleKey(key))
      .filter(Boolean)
  );
}

function assertCoachContentRole(account) {
  const roleKeys = accountRoleKeys(account);
  const allowed = [...COACH_CONTENT_ROLES].some((key) => roleKeys.has(key));
  if (!allowed) {
    throw new AppError("Onboarding video and letter apply to coaches", 400);
  }
}

function isPdfMime(mimetype = "") {
  return String(mimetype).toLowerCase() === "application/pdf";
}

async function applyCoachContentPatch(req, account) {
  const current = normalizeCoachContent(account.coach_content);
  const nextIntro = { ...current.intro };
  const nextLetter = { ...current.letter };
  let introTouched = false;
  let letterTouched = false;

  if (req.body.title !== undefined) {
    nextIntro.title = asString(req.body.title);
    introTouched = true;
  }
  if (req.body.description !== undefined) {
    nextIntro.description = asString(req.body.description);
    introTouched = true;
  }
  if (req.body.duration !== undefined) {
    nextIntro.duration = asString(req.body.duration);
    introTouched = true;
  }

  const galleryPickId = asString(req.body.galleryPickId);
  if (galleryPickId) {
    if (galleryPickId === account.id) {
      throw new AppError("Pick a different coach's video from the gallery", 400);
    }
    const source = await getAccountById(galleryPickId);
    if (!source) throw new AppError("Gallery video not found", 404);
    const sourceIntro = normalizeCoachContent(source.coach_content).intro;
    if (!introHasMedia(sourceIntro)) {
      throw new AppError("That gallery item has no video", 400);
    }
    nextIntro.sourceType = "gallery";
    nextIntro.galleryPickId = galleryPickId;
    nextIntro.videoKey = sourceIntro.videoKey;
    nextIntro.linkUrl = sourceIntro.linkUrl;
    nextIntro.coverKey = sourceIntro.coverKey || nextIntro.coverKey;
    nextIntro.duration = sourceIntro.duration || nextIntro.duration;
    if (!nextIntro.title) nextIntro.title = sourceIntro.title;
    if (!nextIntro.description) nextIntro.description = sourceIntro.description;
    nextIntro.version += 1;
    introTouched = true;
  }

  if (req.body.linkUrl !== undefined || asString(req.body.sourceType).toLowerCase() === "link") {
    const linkUrl = asString(req.body.linkUrl);
    if (!linkUrl) throw new AppError("Enter a video link", 400);
    if (nextIntro.videoKey && nextIntro.sourceType === "upload") {
      await replaceMediaKey(nextIntro.videoKey, "");
      nextIntro.videoKey = "";
    }
    nextIntro.sourceType = "link";
    nextIntro.linkUrl = linkUrl;
    nextIntro.galleryPickId = "";
    nextIntro.version += 1;
    introTouched = true;
  }

  const videoFile = req.files?.intro_video?.[0];
  const coverFile = req.files?.intro_cover?.[0];
  let coverReplacedThisPatch = false;

  if (videoFile) {
    if (!isVideoMime(videoFile.mimetype)) {
      throw new AppError("intro_video must be a video file", 400);
    }
    const uploadedKey = await uploadMulterFile(videoFile, COACH_CONTENT_FOLDER);
    if (!uploadedKey) throw new AppError("Failed to upload intro video", 500);
    if (nextIntro.sourceType === "upload") {
      await replaceMediaKey(nextIntro.videoKey, uploadedKey);
    }
    nextIntro.videoKey = uploadedKey;
    nextIntro.sourceType = "upload";
    nextIntro.linkUrl = "";
    nextIntro.galleryPickId = "";
    if (!coverFile && nextIntro.coverKey) {
      await replaceMediaKey(nextIntro.coverKey, "");
      nextIntro.coverKey = "";
    }
    nextIntro.version += 1;
    introTouched = true;
  }

  if (coverFile) {
    if (!isImageMime(coverFile.mimetype)) {
      throw new AppError("intro_cover must be an image file", 400);
    }
    const uploadedKey = await uploadMulterFile(coverFile, COACH_CONTENT_FOLDER);
    if (!uploadedKey) throw new AppError("Failed to upload cover image", 500);
    await replaceMediaKey(nextIntro.coverKey, uploadedKey);
    nextIntro.coverKey = uploadedKey;
    coverReplacedThisPatch = true;
    introTouched = true;
  }

  if (
    (req.body.linkUrl !== undefined || asString(req.body.sourceType).toLowerCase() === "link") &&
    !coverReplacedThisPatch &&
    !coverFile &&
    nextIntro.coverKey
  ) {
    await replaceMediaKey(nextIntro.coverKey, "");
    nextIntro.coverKey = "";
    introTouched = true;
  }

  if (req.body.live !== undefined) {
    const live = asBool(req.body.live, false);
    if (live && !introHasMedia(nextIntro)) {
      throw new AppError("Upload a video or add a link before going live", 400);
    }
    nextIntro.live = live;
    introTouched = true;
  }

  if (!introHasMedia(nextIntro)) {
    nextIntro.live = false;
  }

  const letterFile = req.files?.letter_file?.[0];
  if (letterFile) {
    if (!isPdfMime(letterFile.mimetype)) {
      throw new AppError("letter_file must be a PDF", 400);
    }
    const uploadedKey = await uploadMulterFile(letterFile, COACH_CONTENT_FOLDER);
    if (!uploadedKey) throw new AppError("Failed to upload commitment letter", 500);
    await replaceMediaKey(nextLetter.fileKey, uploadedKey);
    nextLetter.fileKey = uploadedKey;
    nextLetter.signed = true;
    nextLetter.signedAt = new Date().toISOString();
    const config = await getAppConfig();
    nextLetter.signedVersion = Math.max(1, Number(config?.commitment_letter_version) || 1);
    letterTouched = true;
  }

  if (req.body.letter_signed !== undefined) {
    const signed = asBool(req.body.letter_signed, false);
    nextLetter.signed = signed;
    nextLetter.signedAt = signed
      ? asString(req.body.letter_signed_at) || new Date().toISOString()
      : "";
    if (req.body.letter_signed_version !== undefined) {
      nextLetter.signedVersion = Math.max(0, Number(req.body.letter_signed_version) || 0);
    }
    letterTouched = true;
  }

  if (req.body.letter_live !== undefined) {
    const live = asBool(req.body.letter_live, false);
    if (live && !letterHasFile(nextLetter)) {
      throw new AppError("Upload a signed letter before going live", 400);
    }
    nextLetter.live = live;
    letterTouched = true;
  }

  if (!letterHasFile(nextLetter)) {
    nextLetter.live = false;
  }

  if (!introTouched && !letterTouched) {
    throw new AppError("At least one coach content field is required", 400);
  }

  return updateAccount(account.id, {
    coach_content: {
      intro: nextIntro,
      letter: nextLetter,
    },
  });
}

function letterTemplatePayload(config) {
  const pub = toPublicAppConfig(config) || {};
  return {
    text: pub.commitment_letter_text || "",
    version: pub.commitment_letter_version || 1,
    templateUrl: pub.commitment_letter_template || "",
  };
}

function isVideoMime(mimetype = "") {
  return String(mimetype).toLowerCase().startsWith("video/");
}

function isImageMime(mimetype = "") {
  return String(mimetype).toLowerCase().startsWith("image/");
}

async function replaceMediaKey(previousKey, nextKey) {
  if (previousKey && previousKey !== nextKey) {
    await deleteStoredMedia(previousKey);
  }
  return nextKey;
}

exports.patchCoachContentHandler = asyncHandler(async (req, res) => {
  const account = await getAccountById(req.params.id);
  if (!account) throw new AppError("Account not found", 404);
  assertCoachContentRole(account);

  const isAdmin = req.auth?.role === "admin";
  const isSelf = req.auth?.sub === account.id;
  if (!isAdmin && !isSelf) {
    throw new AppError("Forbidden", 403);
  }

  const updated = await applyCoachContentPatch(req, account);
  return res.json({
    status: true,
    message: "Coach content updated",
    account: toPublicAccount(updated),
  });
});

exports.getMyCoachContentHandler = asyncHandler(async (req, res) => {
  const account = req.account || (await getAccountById(req.auth?.sub));
  if (!account) throw new AppError("Account not found", 404);
  const config = await getAppConfig();
  return res.json({
    status: true,
    account: toPublicAccount(account),
    letter: letterTemplatePayload(config),
  });
});

exports.patchMyCoachContentHandler = asyncHandler(async (req, res) => {
  const account = req.account || (await getAccountById(req.auth?.sub));
  if (!account) throw new AppError("Account not found", 404);
  assertCoachContentRole(account);
  const updated = await applyCoachContentPatch(req, account);
  return res.json({
    status: true,
    message: "Coach content updated",
    account: toPublicAccount(updated),
    letter: letterTemplatePayload(await getAppConfig()),
  });
});
