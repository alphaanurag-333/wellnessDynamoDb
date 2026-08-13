const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createRole,
  getRoleById,
  getRoleBySlug,
  updateRole,
  deleteRole,
  listRoles,
  normalizeSlug,
} = require("../../models/roleModel");
const {
  listAccounts,
  getAccountById,
  updateAccount,
  getMembership,
  countAccountsByRoleKey,
  toPublicAccount,
} = require("../../models/accountModel");
const {
  getConsolePermissionCatalog,
  grantsMapToPermissions,
  permissionsToGrantsMap,
  DEFAULT_CONSOLE_GRANTS,
  DEFAULT_NAV_SECTIONS,
  ROLE_KEY_META,
  UI_TO_ACCOUNT_ROLE,
  ACCOUNT_TO_UI_ROLE,
  TOTAL_PERM_SLOTS,
  isValidConsolePermission,
} = require("../../config/consolePermissionCatalog");

const CONSOLE_SCOPE = "CONSOLE";

function assertSuperAdmin(req) {
  if (!req.auth?.isSuperAdmin) {
    throw new AppError("Only the Super Admin can manage access control", 403);
  }
}

function sanitizeConsolePermissions(permissions) {
  if (!Array.isArray(permissions)) {
    throw new AppError("permissions must be an array", 400);
  }
  return [...new Set(permissions.map((p) => String(p).trim()).filter(isValidConsolePermission))];
}

function toAccessRole(role, memberCount = 0) {
  if (!role) return null;
  const roleKey = role.roleKey || null;
  const meta = ROLE_KEY_META[roleKey] || {};
  const grants = permissionsToGrantsMap(role.permissions || []);
  const grantedCount =
    grants == null ? TOTAL_PERM_SLOTS : Object.values(grants).reduce((n, acts) => n + (acts?.length || 0), 0);

  return {
    id: role.id,
    roleKey,
    name: role.name,
    slug: role.slug,
    description: role.description || meta.description || "",
    locked: Boolean(role.locked ?? meta.locked),
    system: Boolean(roleKey && ROLE_KEY_META[roleKey]),
    dataScope: role.dataScope || meta.dataScope || "all",
    inheritsFromRoleId: role.inheritsFromRoleId || null,
    navSections: Array.isArray(role.navSections)
      ? role.navSections
      : DEFAULT_NAV_SECTIONS[roleKey] || [],
    permissions: role.permissions || [],
    grants,
    grantedCount,
    totalSlots: TOTAL_PERM_SLOTS,
    memberCount,
    color: role.uiMeta?.color || meta.color || "#5e6ad2",
    bg: role.uiMeta?.bg || "#eceefc",
    bd: role.uiMeta?.bd || "#dcdff7",
    status: role.status,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

async function memberCountForRoleKey(roleKey) {
  if (!roleKey) return 0;
  const accountRole = UI_TO_ACCOUNT_ROLE[roleKey] || roleKey;
  try {
    return await countAccountsByRoleKey(accountRole);
  } catch {
    return 0;
  }
}

exports.getAccessCatalog = asyncHandler(async (req, res) => {
  assertSuperAdmin(req);
  return res.json({
    status: true,
    catalog: getConsolePermissionCatalog(),
  });
});

exports.listAccessRoles = asyncHandler(async (req, res) => {
  assertSuperAdmin(req);
  const { roles } = await listRoles({
    scope: CONSOLE_SCOPE,
    status: "active",
    page: 1,
    limit: 100,
  });

  const enriched = [];
  for (const role of roles) {
    const count = await memberCountForRoleKey(role.roleKey);
    enriched.push(toAccessRole(role, count));
  }

  // Stable order: admin, wc, awc, trainee, support, then custom
  const order = ["admin", "wc", "awc", "trainee", "support"];
  enriched.sort((a, b) => {
    const ai = order.indexOf(a.roleKey);
    const bi = order.indexOf(b.roleKey);
    if (ai === -1 && bi === -1) return String(a.name).localeCompare(String(b.name));
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return res.json({ status: true, roles: enriched });
});

exports.createAccessRole = asyncHandler(async (req, res) => {
  assertSuperAdmin(req);
  const { name, inheritFromRoleId, roleKey, description, dataScope, navSections, grants } = req.body || {};
  if (!name || !String(name).trim()) throw new AppError("name is required", 400);

  let permissions = [];
  let inherits = inheritFromRoleId || null;
  if (grants !== undefined) {
    permissions = grantsMapToPermissions(grants);
  } else if (inherits) {
    const parent = await getRoleById(inherits);
    if (!parent || parent.scope !== CONSOLE_SCOPE) {
      throw new AppError("inheritFromRoleId must be a CONSOLE role", 400);
    }
    permissions = [...(parent.permissions || [])];
  }

  const slugBase = normalizeSlug(name);
  const existing = await getRoleBySlug(`console-${slugBase}`, { scope: CONSOLE_SCOPE });
  if (existing) throw new AppError("A role with this name already exists", 409);

  const role = await createRole({
    name: String(name).trim(),
    slug: `console-${slugBase}`,
    scope: CONSOLE_SCOPE,
    permissions: sanitizeConsolePermissions(permissions),
    description: description || null,
    roleKey: roleKey || null,
    inheritsFromRoleId: inherits,
    navSections: navSections || [],
    dataScope: dataScope || "team",
    locked: false,
  });

  return res.status(201).json({
    status: true,
    message: "Role created",
    role: toAccessRole(role, 0),
  });
});

exports.updateAccessRole = asyncHandler(async (req, res) => {
  assertSuperAdmin(req);
  const role = await getRoleById(req.params.id);
  if (!role || role.scope !== CONSOLE_SCOPE) throw new AppError("Role not found", 404);
  if (role.locked || role.roleKey === "admin") {
    // Allow navSections/description updates lightly, but not permission stripping for admin
    const body = req.body || {};
    if (body.grants !== undefined || body.permissions !== undefined) {
      throw new AppError("Admin console role permissions are locked", 400);
    }
  }

  const updates = {};
  const body = req.body || {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.dataScope !== undefined) updates.dataScope = body.dataScope;
  if (body.navSections !== undefined) updates.navSections = body.navSections;
  if (body.inheritsFromRoleId !== undefined) {
    updates.inheritsFromRoleId = body.inheritsFromRoleId || null;
  }
  if (body.grants !== undefined) {
    updates.permissions = sanitizeConsolePermissions(grantsMapToPermissions(body.grants));
  } else if (body.permissions !== undefined) {
    updates.permissions = sanitizeConsolePermissions(body.permissions);
  }

  const updated = await updateRole(role.id, updates);
  const count = await memberCountForRoleKey(updated.roleKey);
  return res.json({
    status: true,
    message: "Role updated",
    role: toAccessRole(updated, count),
  });
});

exports.deleteAccessRole = asyncHandler(async (req, res) => {
  assertSuperAdmin(req);
  const role = await getRoleById(req.params.id);
  if (!role || role.scope !== CONSOLE_SCOPE) throw new AppError("Role not found", 404);
  if (role.locked || role.system || (role.roleKey && ROLE_KEY_META[role.roleKey])) {
    throw new AppError("System roles cannot be deleted", 400);
  }
  const count = await memberCountForRoleKey(role.roleKey);
  if (count > 0) {
    throw new AppError(`Cannot delete — ${count} member(s) still assigned`, 409);
  }
  await deleteRole(role.id);
  return res.json({ status: true, message: "Role deleted" });
});

exports.listAccessMembers = asyncHandler(async (req, res) => {
  assertSuperAdmin(req);
  const search = req.query.search || req.query.q;
  const roleFilter = req.query.roleKey || req.query.role;
  const accountRoleFilter = roleFilter
    ? UI_TO_ACCOUNT_ROLE[roleFilter] || roleFilter
    : undefined;

  const result = await listAccounts({
    status: "active",
    search,
    roleKey: accountRoleFilter,
    page: req.query.page || 1,
    limit: req.query.limit || 100,
  });

  const { roles: consoleRoles } = await listRoles({
    scope: CONSOLE_SCOPE,
    status: "active",
    page: 1,
    limit: 100,
  });
  const roleByKey = {};
  for (const r of consoleRoles) {
    if (r.roleKey) roleByKey[r.roleKey] = r;
  }

  const members = (result.accounts || []).map((acc) => {
    const pub = typeof acc.password === "undefined" ? acc : toPublicAccount(acc);
    const roleKeys = Array.isArray(pub.roleKeys) ? pub.roleKeys : [];
    const primaryAccountRole =
      (pub.defaultRoleKey && roleKeys.includes(pub.defaultRoleKey) && pub.defaultRoleKey) ||
      roleKeys[0] ||
      null;
    const uiRole = ACCOUNT_TO_UI_ROLE[primaryAccountRole] || primaryAccountRole;
    const consoleRole = uiRole ? roleByKey[uiRole] : null;
    const grants = consoleRole ? permissionsToGrantsMap(consoleRole.permissions || []) : {};
    const grantedCount = pub.isSuperAdmin
      ? TOTAL_PERM_SLOTS
      : grants == null
        ? TOTAL_PERM_SLOTS
        : Object.values(grants || {}).reduce((n, acts) => n + (acts?.length || 0), 0);

    return {
      id: pub.id,
      name: pub.name,
      email: pub.email,
      status: pub.status,
      isSuperAdmin: Boolean(pub.isSuperAdmin),
      roleKeys,
      primaryRoleKey: uiRole,
      accountRoleKey: primaryAccountRole,
      consoleRoleId: consoleRole?.id || null,
      grantedCount,
      totalSlots: TOTAL_PERM_SLOTS,
      meta: pub.isSuperAdmin
        ? "Super admin"
        : roleKeys.map((k) => ACCOUNT_TO_UI_ROLE[k] || k).join(", "),
    };
  });

  return res.json({
    status: true,
    members,
    pagination: result.pagination,
  });
});

exports.setAccessMemberRole = asyncHandler(async (req, res) => {
  assertSuperAdmin(req);
  const account = await getAccountById(req.params.id);
  if (!account) throw new AppError("Account not found", 404);
  if (account.isSuperAdmin) {
    throw new AppError("Cannot change the Super Admin primary role this way", 400);
  }

  const uiRole = String(req.body?.roleKey || req.body?.role || "").trim().toLowerCase();
  const accountRoleKey = UI_TO_ACCOUNT_ROLE[uiRole];
  if (!accountRoleKey) throw new AppError("Invalid roleKey", 400);

  const { roles: consoleRoles } = await listRoles({
    scope: CONSOLE_SCOPE,
    status: "active",
    page: 1,
    limit: 100,
  });
  const consoleRole = consoleRoles.find((r) => r.roleKey === uiRole);
  if (!consoleRole) {
    throw new AppError("CONSOLE role template missing for this roleKey — run seed", 400);
  }

  // Replace memberships with the selected primary role (v1 single primary)
  const memberships = [
    {
      roleKey: accountRoleKey,
      roleId: consoleRole.id,
      permissionOverrides: null,
      status: "active",
      parentAccountId:
        accountRoleKey === "assistant_wellness_coach" || accountRoleKey === "trainee"
          ? account.parentAccountId || getMembership(account, accountRoleKey)?.parentAccountId || null
          : null,
    },
  ];

  const updated = await updateAccount(account.id, {
    memberships,
    defaultRoleKey: accountRoleKey,
  });

  return res.json({
    status: true,
    message: "Member role updated",
    account: toPublicAccount(updated),
  });
});

/** Ensure baseline CONSOLE roles exist (idempotent). */
exports.ensureConsoleRolesSeeded = async function ensureConsoleRolesSeeded() {
  const created = [];
  const order = ["admin", "wc", "awc", "trainee", "support"];
  const byKey = {};

  for (const roleKey of order) {
    const meta = ROLE_KEY_META[roleKey];
    const slug = meta.slug;
    let role = await getRoleBySlug(slug, { scope: CONSOLE_SCOPE });
    if (!role) {
      const grants = DEFAULT_CONSOLE_GRANTS[roleKey];
      role = await createRole({
        name: meta.name,
        slug,
        scope: CONSOLE_SCOPE,
        roleKey,
        description: meta.description,
        dataScope: meta.dataScope,
        navSections: DEFAULT_NAV_SECTIONS[roleKey] || [],
        permissions: grantsMapToPermissions(grants),
        locked: Boolean(meta.locked),
        uiMeta: { color: meta.color },
      });
      created.push(roleKey);
    }
    byKey[roleKey] = role;
  }

  // Wire inheritance defaults: trainee → awc, wc stays standalone (UI had wc→awc in DEFAULT_PARENTS oddly)
  // Match UI DEFAULT_PARENTS: wc→awc, trainee→awc
  if (byKey.awc && byKey.trainee && !byKey.trainee.inheritsFromRoleId) {
    await updateRole(byKey.trainee.id, { inheritsFromRoleId: byKey.awc.id });
  }
  if (byKey.awc && byKey.wc && !byKey.wc.inheritsFromRoleId) {
    await updateRole(byKey.wc.id, { inheritsFromRoleId: byKey.awc.id });
  }

  return { created, byKey };
};
