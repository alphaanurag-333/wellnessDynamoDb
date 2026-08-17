const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { hasPermission } = require("../../utils/permissions");
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
  countAccountsByConsoleRoleId,
  toPublicAccount,
} = require("../../models/accountModel");
const { listUsersByParentCoachId } = require("../../models/userModel");
const { ensureEntityReferralCode } = require("../../models/referralCodeModel");
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
const REFERRAL_STAFF_ROLES = new Set(["wellness_coach", "assistant_wellness_coach"]);

function assertSuperAdmin(req) {
  if (!req.auth?.isSuperAdmin) {
    throw new AppError("Only the Super Admin can manage access control", 403);
  }
}

const TEAM_DESCENDANT_ROLES = {
  wellness_coach: new Set(["assistant_wellness_coach", "trainee"]),
  assistant_wellness_coach: new Set(["trainee"]),
};

function visibleTeamRoleKeys(req) {
  if (req.auth?.isSuperAdmin || req.auth?.role === "admin") return null;
  return TEAM_DESCENDANT_ROLES[String(req.auth?.role || "")] || new Set();
}

async function canViewTeamAccount(req, account, primaryRole) {
  const visibleRoles = visibleTeamRoleKeys(req);
  if (visibleRoles === null) return true;
  if (!visibleRoles.has(primaryRole)) return false;

  const viewerId = String(req.auth?.sub || "");
  const parentId = String(account?.parentAccountId || "");
  if (parentId === viewerId) return true;

  // A WC also sees trainees attached beneath one of their direct AWCs.
  if (req.auth?.role === "wellness_coach" && primaryRole === "trainee" && parentId) {
    const parent = await getAccountById(parentId);
    return (
      Array.isArray(parent?.roleKeys) &&
      parent.roleKeys.includes("assistant_wellness_coach") &&
      String(parent.parentAccountId || "") === viewerId
    );
  }
  return false;
}

/** Teams page + member directory — scoped to roles below the signed-in member. */
function assertTeamsReadAccess(req) {
  if (req.auth?.isSuperAdmin) return;
  if (hasPermission(req.auth, "console.tm.view")) return;
  const role = String(req.auth?.role || "");
  if (role === "admin" || TEAM_DESCENDANT_ROLES[role]) return;
  throw new AppError("Forbidden", 403);
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

async function memberCountForConsoleRole(role) {
  if (!role) return 0;
  if (role.roleKey) {
    const byKey = await memberCountForRoleKey(role.roleKey);
    if (byKey > 0) return byKey;
  }
  try {
    return await countAccountsByConsoleRoleId(role.id);
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
  assertTeamsReadAccess(req);
  const { roles } = await listRoles({
    scope: CONSOLE_SCOPE,
    status: "active",
    page: 1,
    limit: 100,
  });

  const visibleRoles = visibleTeamRoleKeys(req);
  const scopedRoles =
    visibleRoles === null
      ? roles
      : roles.filter((role) => {
          const accountRole = UI_TO_ACCOUNT_ROLE[role.roleKey] || role.roleKey;
          return visibleRoles.has(accountRole);
        });

  const enriched = [];
  for (const role of scopedRoles) {
    const count = await memberCountForConsoleRole(role);
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

  const { roles: consoleRoles } = await listRoles({
    scope: CONSOLE_SCOPE,
    status: "active",
    page: 1,
    limit: 100,
  });
  const children = consoleRoles.filter(
    (r) => String(r.inheritsFromRoleId || "").trim() === String(role.id)
  );
  if (children.length > 0) {
    throw new AppError(
      `Cannot delete — ${children.length} role(s) still inherit from “${role.name}”`,
      409
    );
  }

  const byKeyCount = role.roleKey ? await memberCountForRoleKey(role.roleKey) : 0;
  const byIdCount = await countAccountsByConsoleRoleId(role.id);
  const count = Math.max(byKeyCount, byIdCount);
  if (count > 0) {
    throw new AppError(`Cannot delete — ${count} member(s) still assigned`, 409);
  }

  await deleteRole(role.id);
  return res.json({ status: true, message: "Role deleted" });
});

exports.listAccessMembers = asyncHandler(async (req, res) => {
  assertTeamsReadAccess(req);
  const search = req.query.search || req.query.q;
  const roleFilter = req.query.roleKey || req.query.role;
  const accountRoleFilter = roleFilter
    ? UI_TO_ACCOUNT_ROLE[roleFilter] || roleFilter
    : undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));

  const visibleRoles = visibleTeamRoleKeys(req);
  let result;
  if (visibleRoles === null) {
    result = await listAccounts({
      status: "active",
      search,
      roleKey: accountRoleFilter,
      page,
      limit,
    });
  } else {
    const direct = await listAccounts({
      status: "active",
      search,
      roleKey: accountRoleFilter,
      parentAccountId: req.auth.sub,
      page: 1,
      limit: 200,
    });
    const scopedAccounts = [...(direct.accounts || [])];

    if (
      req.auth.role === "wellness_coach" &&
      (!accountRoleFilter || accountRoleFilter === "trainee")
    ) {
      const directAssistants = await listAccounts({
        status: "active",
        parentAccountId: req.auth.sub,
        roleKey: "assistant_wellness_coach",
        page: 1,
        limit: 200,
      });
      for (const assistant of directAssistants.accounts || []) {
        const trainees = await listAccounts({
          status: "active",
          search,
          parentAccountId: assistant.id,
          roleKey: "trainee",
          page: 1,
          limit: 200,
        });
        scopedAccounts.push(...(trainees.accounts || []));
      }
    }

    const total = scopedAccounts.length;
    const start = (page - 1) * limit;
    result = {
      accounts: scopedAccounts.slice(start, start + limit),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

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

  const members = [];
  for (const acc of result.accounts || []) {
    const pub = typeof acc.password === "undefined" ? acc : toPublicAccount(acc);
    const roleKeys = Array.isArray(pub.roleKeys) ? pub.roleKeys : [];
    const primaryAccountRole =
      (pub.defaultRoleKey && roleKeys.includes(pub.defaultRoleKey) && pub.defaultRoleKey) ||
      roleKeys[0] ||
      null;
    if (!(await canViewTeamAccount(req, pub, primaryAccountRole))) continue;
    const uiRole = ACCOUNT_TO_UI_ROLE[primaryAccountRole] || primaryAccountRole;
    const consoleRole = uiRole ? roleByKey[uiRole] : null;

    const overrides =
      getMembership(pub, primaryAccountRole)?.permissionOverrides?.consoleGrants;
    const roleGrants = consoleRole ? permissionsToGrantsMap(consoleRole.permissions || []) : {};
    const grants = overrides !== undefined ? overrides : roleGrants;
    const grantedCount = pub.isSuperAdmin
      ? TOTAL_PERM_SLOTS
      : grants == null
        ? TOTAL_PERM_SLOTS
        : Object.values(grants || {}).reduce((n, acts) => n + (acts?.length || 0), 0);

    let meta = pub.isSuperAdmin
      ? "Super admin"
      : roleKeys.map((k) => ACCOUNT_TO_UI_ROLE[k] || k).join(", ");
    let clientCount = null;
    let awcCount = null;
    let parentName = null;

    try {
      if (primaryAccountRole === "wellness_coach") {
        const clients = await listUsersByParentCoachId(pub.id, { page: 1, limit: 1, scope: "all" });
        clientCount = clients.pagination?.total || 0;
        const children = await listAccounts({
          parentAccountId: pub.id,
          roleKey: "assistant_wellness_coach",
          page: 1,
          limit: 1,
        });
        awcCount = children.pagination?.total || 0;
        meta = `${clientCount} client${clientCount === 1 ? "" : "s"} · ${awcCount} AWC${awcCount === 1 ? "" : "s"}`;
      } else if (
        primaryAccountRole === "assistant_wellness_coach" ||
        primaryAccountRole === "trainee"
      ) {
        const parentId =
          pub.parentAccountId ||
          getMembership(pub, primaryAccountRole)?.parentAccountId ||
          null;
        if (parentId) {
          const parent = await getAccountById(parentId);
          parentName = parent?.name || null;
          meta = parentName
            ? `under ${parentName}`
            : primaryAccountRole === "trainee"
              ? "Trainee"
              : "Assistant";
        }
      } else if (primaryAccountRole === "support") {
        meta = pub.designation || "Support";
      }
    } catch {
      /* keep fallback meta */
    }

    const approval = String(pub.approvalStatus || "").toLowerCase();
    const displayStatus =
      pub.status === "inactive"
        ? "Inactive"
        : approval === "pending"
          ? "Pending"
          : "Active";

    members.push({
      id: pub.id,
      name: pub.name,
      email: pub.email,
      phone: pub.phone || null,
      phoneCountryCode: pub.phoneCountryCode || null,
      status: pub.status,
      displayStatus,
      approvalStatus: pub.approvalStatus || null,
      isSuperAdmin: Boolean(pub.isSuperAdmin),
      roleKeys,
      primaryRoleKey: uiRole,
      accountRoleKey: primaryAccountRole,
      consoleRoleId: consoleRole?.id || null,
      parentAccountId: pub.parentAccountId || null,
      parentName,
      clientCount,
      awcCount,
      grantedCount,
      totalSlots: TOTAL_PERM_SLOTS,
      hasOverrides: overrides !== undefined,
      policyBundleCount: 0,
      meta,
    });
  }

  return res.json({
    status: true,
    members,
    pagination: result.pagination,
  });
});

exports.getAccessMember = asyncHandler(async (req, res) => {
  assertTeamsReadAccess(req);
  await exports.ensureConsoleRolesSeeded();
  const account = await getAccountById(req.params.id);
  if (!account) throw new AppError("Account not found", 404);

  const pub = toPublicAccount(account);
  const roleKeys = Array.isArray(pub.roleKeys) ? pub.roleKeys : [];
  const primaryAccountRole =
    (pub.defaultRoleKey && roleKeys.includes(pub.defaultRoleKey) && pub.defaultRoleKey) ||
    roleKeys[0] ||
    null;
  if (!(await canViewTeamAccount(req, pub, primaryAccountRole))) {
    throw new AppError("Team member not found", 404);
  }
  const uiRole = ACCOUNT_TO_UI_ROLE[primaryAccountRole] || primaryAccountRole;

  const { roles: consoleRoles } = await listRoles({
    scope: CONSOLE_SCOPE,
    status: "active",
    page: 1,
    limit: 100,
  });
  const consoleRole = consoleRoles.find((r) => r.roleKey === uiRole) || null;
  const membership = getMembership(account, primaryAccountRole);
  const roleGrants = consoleRole ? permissionsToGrantsMap(consoleRole.permissions || []) : {};
  const overrideGrants = membership?.permissionOverrides?.consoleGrants;
  const grants = overrideGrants !== undefined ? overrideGrants : roleGrants;
  const grantedCount =
    grants == null
      ? TOTAL_PERM_SLOTS
      : Object.values(grants || {}).reduce((n, acts) => n + (acts?.length || 0), 0);

  let clientCount = 0;
  let awcCount = 0;
  let parentName = null;
  const clientStats = {
    total: 0,
    seek: 0,
    heal: 0,
    consultancy_only: 0,
    other: 0,
  };
  if (primaryAccountRole === "wellness_coach") {
    try {
      const clients = await listUsersByParentCoachId(pub.id, { page: 1, limit: 200, scope: "all" });
      const users = clients.users || [];
      clientCount = clients.pagination?.total || users.length;
      clientStats.total = clientCount;
      for (const u of users) {
        const tier = String(u.userTier || "seek").toLowerCase();
        if (tier === "seek") clientStats.seek += 1;
        else if (tier === "heal") clientStats.heal += 1;
        else if (tier === "consultancy_only") clientStats.consultancy_only += 1;
        else clientStats.other += 1;
      }
      const children = await listAccounts({
        parentAccountId: pub.id,
        roleKey: "assistant_wellness_coach",
        page: 1,
        limit: 1,
      });
      awcCount = children.pagination?.total || 0;
    } catch {
      /* ignore */
    }
  }
  const parentId =
    pub.parentAccountId || membership?.parentAccountId || null;
  if (parentId) {
    const parent = await getAccountById(parentId);
    parentName = parent?.name || null;
  }

  // Backfill codes for staff created before role-prefixed referral codes existed.
  let referralCode = pub.referralCode || null;
  if (!referralCode && REFERRAL_STAFF_ROLES.has(primaryAccountRole)) {
    try {
      referralCode = await ensureEntityReferralCode({
        tableName: "Account",
        entityType: primaryAccountRole,
        entityId: pub.id,
        ownerCoachId:
          primaryAccountRole === "wellness_coach" ? pub.id : parentId || "pending",
        referralCode: null,
      });
    } catch (err) {
      console.error("[getAccessMember] ensure referral code failed", err.message);
    }
  }

  return res.json({
    status: true,
    member: {
      id: pub.id,
      name: pub.name,
      email: pub.email,
      phone: pub.phone || null,
      phoneCountryCode: pub.phoneCountryCode || null,
      profileImage: pub.profileImage || null,
      dateOfBirth: pub.dateOfBirth || pub.dob || null,
      country: pub.country || null,
      state: pub.state || null,
      city: pub.city || null,
      referralCode,
      joinedAt: pub.createdAt || null,
      status: pub.status,
      displayStatus:
        pub.status === "inactive"
          ? "Inactive"
          : String(pub.approvalStatus || "").toLowerCase() === "pending"
            ? "Pending"
            : "Active",
      isSuperAdmin: Boolean(pub.isSuperAdmin),
      primaryRoleKey: uiRole,
      accountRoleKey: primaryAccountRole,
      consoleRoleId: consoleRole?.id || null,
      parentAccountId: parentId,
      parentName,
      clientCount,
      awcCount,
      clientStats,
      meta:
        primaryAccountRole === "wellness_coach"
          ? `${clientCount} clients · ${awcCount} AWCs`
          : parentName
            ? `under ${parentName}`
            : ROLE_KEY_META[uiRole]?.name || uiRole,
      grants,
      roleGrants,
      hasOverrides: overrideGrants !== undefined,
      grantedCount: pub.isSuperAdmin ? TOTAL_PERM_SLOTS : grantedCount,
      totalSlots: TOTAL_PERM_SLOTS,
      navSections: Array.isArray(consoleRole?.navSections)
        ? consoleRole.navSections
        : DEFAULT_NAV_SECTIONS[uiRole] || [],
    },
  });
});

exports.setAccessMemberPermissions = asyncHandler(async (req, res) => {
  assertSuperAdmin(req);
  const account = await getAccountById(req.params.id);
  if (!account) throw new AppError("Account not found", 404);
  if (account.isSuperAdmin) {
    throw new AppError("Super Admin permissions cannot be overridden", 400);
  }

  const roleKeys = Array.isArray(account.roleKeys) ? account.roleKeys : [];
  const primaryAccountRole =
    (account.defaultRoleKey && roleKeys.includes(account.defaultRoleKey) && account.defaultRoleKey) ||
    roleKeys[0] ||
    null;
  if (!primaryAccountRole) throw new AppError("Account has no role", 400);

  const membership = getMembership(account, primaryAccountRole) || {
    roleKey: primaryAccountRole,
    roleId: null,
    status: "active",
    parentAccountId: account.parentAccountId || null,
  };

  const body = req.body || {};
  let nextOverrides = membership.permissionOverrides
    ? { ...membership.permissionOverrides }
    : {};

  if (body.reset) {
    delete nextOverrides.consoleGrants;
  } else if (body.grants !== undefined) {
    nextOverrides.consoleGrants =
      body.grants == null ? null : body.grants; // null = full access override
  } else {
    throw new AppError("grants or reset is required", 400);
  }

  if (Object.keys(nextOverrides).length === 0) nextOverrides = null;

  const memberships = (account.memberships || []).map((m) => {
    if (m.roleKey !== primaryAccountRole) return m;
    return { ...m, permissionOverrides: nextOverrides };
  });
  if (!memberships.some((m) => m.roleKey === primaryAccountRole)) {
    memberships.push({
      ...membership,
      permissionOverrides: nextOverrides,
    });
  }

  const updated = await updateAccount(account.id, { memberships });
  req.params.id = updated.id;
  return exports.getAccessMember(req, res);
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

  // Inheritance: AWC ← WC, Trainee ← AWC; WC + Support + Admin standalone.
  // Also repair the old inverted WC ← AWC link if present.
  if (byKey.wc?.inheritsFromRoleId) {
    await updateRole(byKey.wc.id, { inheritsFromRoleId: null });
    byKey.wc = { ...byKey.wc, inheritsFromRoleId: null };
  }
  if (byKey.wc && byKey.awc && byKey.awc.inheritsFromRoleId !== byKey.wc.id) {
    await updateRole(byKey.awc.id, { inheritsFromRoleId: byKey.wc.id });
    byKey.awc = { ...byKey.awc, inheritsFromRoleId: byKey.wc.id };
  }
  if (byKey.awc && byKey.trainee && byKey.trainee.inheritsFromRoleId !== byKey.awc.id) {
    await updateRole(byKey.trainee.id, { inheritsFromRoleId: byKey.awc.id });
    byKey.trainee = { ...byKey.trainee, inheritsFromRoleId: byKey.awc.id };
  }
  if (byKey.support?.inheritsFromRoleId) {
    await updateRole(byKey.support.id, { inheritsFromRoleId: null });
    byKey.support = { ...byKey.support, inheritsFromRoleId: null };
  }

  return { created, byKey };
};
