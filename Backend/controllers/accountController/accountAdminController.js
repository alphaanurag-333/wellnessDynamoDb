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
} = require("../../models/accountModel");
const { getRoleById, listRoles } = require("../../models/roleModel");
const { normalizeRoleKey, ROLE_KEY_TO_UI } = require("../../config/accountRoles");
const { normalizeEmail, normalizePhone, normalizeCountryCode } = require("../../models/userModel");
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
