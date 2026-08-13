const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listAccounts,
  getAccountById,
  addMembership,
  removeMembership,
  toPublicAccount,
} = require("../../models/accountModel");
const { normalizeRoleKey } = require("../../config/accountRoles");

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
