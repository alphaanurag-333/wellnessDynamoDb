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
const { normalizeRoleKey, ROLE_KEY_TO_UI } = require("../../config/accountRoles");
const { normalizeEmail, normalizePhone, normalizeCountryCode } = require("../../models/userModel");
const { UI_TO_ACCOUNT_ROLE } = require("../../config/consolePermissionCatalog");

const DEFAULT_TEMP_PASSWORD = process.env.SEED_STAFF_PASSWORD || "Admin@12345";

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
 * Body: name, email, phone?, phoneCountryCode?, password?, roleKey (ui or account), parentAccountId?
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
    parentAccountId,
  } = req.body || {};

  if (!name || !String(name).trim()) throw new AppError("name is required", 400);
  if (!email || !String(email).trim()) throw new AppError("email is required", 400);

  const uiOrAccount = String(rawRole || "").trim().toLowerCase();
  const accountRoleKey =
    UI_TO_ACCOUNT_ROLE[uiOrAccount] || normalizeRoleKey(uiOrAccount);
  if (!accountRoleKey || accountRoleKey === "admin") {
    throw new AppError("Choose Wellness Coach, Assistant WC, Support, or Trainee", 400);
  }

  const normalized = normalizeEmail(email);
  const existing = await getAccountByEmail(normalized);
  if (existing) throw new AppError("An account already exists with this email", 409);

  const tempPassword = password ? String(password) : DEFAULT_TEMP_PASSWORD;
  assertPasswordPolicy(tempPassword);
  const passwordHash = await hashPassword(tempPassword);

  const { ensureConsoleRolesSeeded } = require("./accessController");
  const { byKey: consoleRoles } = await ensureConsoleRolesSeeded();
  const uiRole = ROLE_KEY_TO_UI[accountRoleKey] || uiOrAccount;
  const consoleRole = consoleRoles[uiRole] || null;

  let parentId = parentAccountId || null;
  if (
    (accountRoleKey === "assistant_wellness_coach" || accountRoleKey === "trainee") &&
    !parentId
  ) {
    throw new AppError("parentAccountId (coach) is required for assistants and trainees", 400);
  }
  if (parentId) {
    const parent = await getAccountById(parentId);
    if (!parent) throw new AppError("Parent coach not found", 404);
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
