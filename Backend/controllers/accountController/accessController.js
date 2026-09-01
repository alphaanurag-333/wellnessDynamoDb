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
  listAccountsByConsoleRoleId,
  assignedMembershipRoleId,
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
  PERM_CATALOG,
  ALL_CONSOLE_PERMISSIONS,
  isValidConsolePermission,
} = require("../../config/consolePermissionCatalog");
const {
  toPublicAccessRequest,
  createAccessPermissionRequest,
  getAccessPermissionRequestById,
  listAccessPermissionRequests,
  getPendingRequestForTarget,
  listPendingForTarget,
  updateAccessPermissionRequest,
  supersedePendingForTarget,
  supersedeAllPendingForTarget,
} = require("../../models/accessPermissionRequestModel");
const {
  listAccessAuditLogs,
  seedAccessAuditLogSamplesIfEmpty,
} = require("../../models/accessAuditLogModel");
const {
  createAccessPolicy,
  getAccessPolicyById,
  updateAccessPolicy,
  deleteAccessPolicy,
  listAccessPolicies,
  normalizeAttachment,
  policyAppliesToTarget,
} = require("../../models/accessPolicyModel");
const { recordAccessAuditLogAsync } = require("../../services/accessAuditLogService");

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

const WC_REQUESTABLE_ROLES = new Set(["assistant_wellness_coach"]);

function actorDisplayName(req) {
  return String(req.account?.name || req.user?.name || "Staff").trim() || "Staff";
}

function roleDisplayName(roleKey) {
  return ROLE_KEY_META[roleKey]?.name || roleKey || "Role";
}

function accountPrimaryUiRole(account) {
  const roleKeys = Array.isArray(account?.roleKeys) ? account.roleKeys : [];
  const primary =
    (account?.defaultRoleKey && roleKeys.includes(account.defaultRoleKey) && account.defaultRoleKey) ||
    roleKeys[0] ||
    null;
  return primary ? ACCOUNT_TO_UI_ROLE[primary] || primary : null;
}

function accountRoleKeyFromDataScope(dataScope) {
  const scope = String(dataScope || "").toLowerCase();
  if (scope === "assigned") return "wellness_coach";
  if (scope === "team") return "assistant_wellness_coach";
  if (scope === "all") return "support";
  return "wellness_coach";
}

async function resolveAccountRoleKeyFromConsoleRole(startRole) {
  let current = startRole;
  const seen = new Set();
  while (current) {
    if (seen.has(current.id)) break;
    seen.add(current.id);

    const uiKey = String(current.roleKey || "").trim().toLowerCase();
    // Skip admin so custom roles that inherit from Admin still map to a staff account role.
    if (uiKey && uiKey !== "admin") {
      const mapped = UI_TO_ACCOUNT_ROLE[uiKey] || null;
      if (mapped && mapped !== "admin") return mapped;
    }

    if (!current.inheritsFromRoleId) break;
    current = await getRoleById(current.inheritsFromRoleId);
    if (current && current.scope !== CONSOLE_SCOPE) break;
  }
  // Standalone / admin-inherited custom CONSOLE roles: use dataScope as staff persona.
  const startKey = String(startRole?.roleKey || "").trim().toLowerCase();
  if (startRole && (!startKey || !ROLE_KEY_META[startKey])) {
    return accountRoleKeyFromDataScope(startRole.dataScope);
  }
  return null;
}

function isSystemConsoleRole(role) {
  const key = String(role?.roleKey || "").trim().toLowerCase();
  return Boolean(key && ROLE_KEY_META[key]);
}

const CONSOLE_ROLE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isConsoleRoleId(value) {
  return CONSOLE_ROLE_ID_RE.test(String(value || "").trim());
}

function accountMatchesConsoleRole(account, selectedRole, primaryAccountRole) {
  if (!selectedRole) return true;
  const assignedId = assignedMembershipRoleId(account, primaryAccountRole);
  if (assignedId) return assignedId === selectedRole.id;
  if (!isSystemConsoleRole(selectedRole)) return false;
  const uiRole = String(ACCOUNT_TO_UI_ROLE[primaryAccountRole] || primaryAccountRole || "")
    .trim()
    .toLowerCase();
  const selectedKey = String(selectedRole.roleKey || "").trim().toLowerCase();
  return Boolean(uiRole && selectedKey && uiRole === selectedKey);
}

function resolveAssignedConsoleRole(account, primaryAccountRole, consoleRoles, roleByKey) {
  const assignedId = assignedMembershipRoleId(account, primaryAccountRole);
  if (assignedId) {
    const found = (consoleRoles || []).find((role) => role.id === assignedId);
    if (found) return found;
  }
  const uiRole = ACCOUNT_TO_UI_ROLE[primaryAccountRole] || primaryAccountRole;
  return uiRole ? roleByKey[uiRole] || null : null;
}

function paginateAccounts(accounts, page, limit) {
  const total = accounts.length;
  const start = (page - 1) * limit;
  return {
    accounts: accounts.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit) || 1),
    },
  };
}

function isAccessAdmin(req) {
  return Boolean(req.auth?.isSuperAdmin || req.auth?.role === "admin");
}

function flattenGrantKeys(grants) {
  if (grants == null) return new Set(ALL_CONSOLE_PERMISSIONS.map((slug) => slug.replace(/^console\./, "")));
  const keys = new Set();
  for (const [featureId, actions] of Object.entries(grants || {})) {
    for (const action of actions || []) keys.add(`${featureId}.${action}`);
  }
  return keys;
}

function featureLabel(featureId) {
  return PERM_CATALOG.find((row) => row[2] === featureId)?.[1] || featureId;
}

function sanitizeGrantsMap(grants) {
  if (grants == null) return null;
  if (typeof grants !== "object" || Array.isArray(grants)) {
    throw new AppError("grants must be an object", 400);
  }
  const out = {};
  for (const row of PERM_CATALOG) {
    const featureId = row[2];
    const incoming = Array.isArray(grants[featureId]) ? grants[featureId] : [];
    const ordered = row[3].filter((action) => incoming.includes(action));
    if (ordered.length) out[featureId] = ordered;
  }
  return out;
}

function grantsEqual(a, b) {
  const left = flattenGrantKeys(a);
  const right = flattenGrantKeys(b);
  if (left.size !== right.size) return false;
  for (const key of left) {
    if (!right.has(key)) return false;
  }
  return true;
}

function describePermissionChange({ reset, currentGrants, proposedGrants, targetName }) {
  const name = String(targetName || "this member").trim() || "this member";
  if (reset) return `Reset permissions to role default for ${name}`;
  const current = flattenGrantKeys(currentGrants);
  const next = flattenGrantKeys(proposedGrants);
  const added = [...next].filter((key) => !current.has(key));
  const removed = [...current].filter((key) => !next.has(key));
  if (added.length === 1 && removed.length === 0) {
    const [featureId, action] = added[0].split(".");
    return `Grant ${action} on ${featureLabel(featureId)} for ${name}`;
  }
  if (removed.length === 1 && added.length === 0) {
    const [featureId, action] = removed[0].split(".");
    return `Revoke ${action} on ${featureLabel(featureId)} for ${name}`;
  }
  const n = added.length + removed.length;
  return `Update ${n || ""} permission${n === 1 ? "" : "s"} for ${name}`.replace(/\s+/g, " ").trim();
}

function splitPermissionChanges({ reset, currentGrants, proposedGrants, targetName }) {
  const name = String(targetName || "this member").trim() || "this member";
  if (reset) {
    return [
      {
        title: `Reset permissions to role default for ${name}`,
        changeType: "reset",
        reset: true,
      },
    ];
  }
  const current = flattenGrantKeys(currentGrants);
  const next = flattenGrantKeys(proposedGrants);
  const added = [...next].filter((key) => !current.has(key));
  const removed = [...current].filter((key) => !next.has(key));
  const changes = [];
  for (const key of added) {
    const [featureId, action] = key.split(".");
    changes.push({
      title: `Grant ${action} on ${featureLabel(featureId)} for ${name}`,
      changeType: "grant",
      featureId,
      action,
    });
  }
  for (const key of removed) {
    const [featureId, action] = key.split(".");
    changes.push({
      title: `Revoke ${action} on ${featureLabel(featureId)} for ${name}`,
      changeType: "revoke",
      featureId,
      action,
    });
  }
  return changes;
}

function cloneGrantsMap(grants) {
  if (grants == null) return null;
  const out = {};
  for (const [featureId, actions] of Object.entries(grants || {})) {
    out[featureId] = [...(actions || [])];
  }
  return out;
}

function applySinglePermissionChange(currentGrants, change, roleGrants) {
  if (change.reset) return { reset: true };

  let next = cloneGrantsMap(currentGrants);
  if (next == null) next = cloneGrantsMap(roleGrants) || {};

  const featureId = String(change.featureId || "").trim();
  const action = String(change.action || "").trim();
  const changeType = String(change.changeType || "").trim();
  const row = PERM_CATALOG.find((r) => r[2] === featureId);
  const allowed = row?.[3] || [];

  if (changeType === "grant") {
    const set = new Set(next[featureId] || []);
    set.add(action);
    const ordered = allowed.filter((a) => set.has(a));
    if (ordered.length) next[featureId] = ordered;
  } else if (changeType === "revoke") {
    const set = new Set(next[featureId] || []);
    set.delete(action);
    const ordered = allowed.filter((a) => set.has(a));
    if (ordered.length) next[featureId] = ordered;
    else delete next[featureId];
  }

  return { grants: sanitizeGrantsMap(next) };
}

async function safePendingForTarget(targetAccountId) {
  try {
    return await getPendingRequestForTarget(targetAccountId);
  } catch (err) {
    console.error("[access] pending permission request lookup failed", err.message);
    return null;
  }
}

async function safePendingListForTarget(targetAccountId) {
  try {
    const rows = await listPendingForTarget(targetAccountId);
    return rows.map(toPublicAccessRequest);
  } catch (err) {
    console.error("[access] pending permission request list failed", err.message);
    return [];
  }
}

async function safeSupersedePending(targetAccountId) {
  try {
    return await supersedePendingForTarget(targetAccountId);
  } catch (err) {
    console.error("[access] supersede pending request failed", err.message);
    return null;
  }
}

function applyConsoleGrantsToMembership(account, primaryAccountRole, { grants, reset }) {
  const membership = getMembership(account, primaryAccountRole) || {
    roleKey: primaryAccountRole,
    roleId: null,
    status: "active",
    parentAccountId: account.parentAccountId || null,
  };

  let nextOverrides = membership.permissionOverrides ? { ...membership.permissionOverrides } : {};
  if (reset) {
    delete nextOverrides.consoleGrants;
  } else if (grants !== undefined) {
    nextOverrides.consoleGrants = grants == null ? null : sanitizeGrantsMap(grants);
  } else {
    throw new AppError("grants or reset is required", 400);
  }
  if (Object.keys(nextOverrides).length === 0) nextOverrides = null;

  const memberships = (account.memberships || []).map((m) => {
    if (m.roleKey !== primaryAccountRole) return m;
    return { ...m, permissionOverrides: nextOverrides };
  });
  if (!memberships.some((m) => m.roleKey === primaryAccountRole)) {
    memberships.push({ ...membership, permissionOverrides: nextOverrides });
  }
  return memberships;
}

function actorAccountRole(req) {
  const raw = String(req.auth?.role || "").trim().toLowerCase();
  return UI_TO_ACCOUNT_ROLE[raw] || raw;
}

function visibleTeamRoleKeys(req) {
  if (req.auth?.isSuperAdmin || actorAccountRole(req) === "admin") return null;
  return TEAM_DESCENDANT_ROLES[actorAccountRole(req)] || new Set();
}

function teamParentId(account, primaryRole) {
  const fromAccount = String(account?.parentAccountId || "").trim();
  if (fromAccount) return fromAccount;
  return String(getMembership(account, primaryRole)?.parentAccountId || "").trim();
}

async function canViewTeamAccount(req, account, primaryRole) {
  const visibleRoles = visibleTeamRoleKeys(req);
  if (visibleRoles === null) return true;
  const accountRole = UI_TO_ACCOUNT_ROLE[primaryRole] || primaryRole;
  if (!visibleRoles.has(accountRole)) return false;
  if (String(account?.id || "") === String(req.auth?.sub || "")) return false;

  const viewerId = String(req.auth?.sub || "");
  const parentId = teamParentId(account, accountRole);
  if (parentId && parentId === viewerId) return true;

  // A WC also sees trainees attached beneath one of their direct AWCs.
  if (actorAccountRole(req) === "wellness_coach" && accountRole === "trainee" && parentId) {
    const parent = await getAccountById(parentId);
    const parentRoleKeys = Array.isArray(parent?.roleKeys) ? parent.roleKeys : [];
    return (
      parentRoleKeys.includes("assistant_wellness_coach") &&
      teamParentId(parent, "assistant_wellness_coach") === viewerId
    );
  }
  return false;
}

async function collectScopedTeamAccounts(req, { search, accountRoleFilter } = {}) {
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
    actorAccountRole(req) === "wellness_coach" &&
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

  return scopedAccounts;
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
  try {
    if (isSystemConsoleRole(role)) {
      const accountRole = UI_TO_ACCOUNT_ROLE[role.roleKey] || role.roleKey;
      return await countAccountsByConsoleRoleId(role.id, {
        accountRoleKey: accountRole,
        includeUnassigned: true,
      });
    }
    return await countAccountsByConsoleRoleId(role.id);
  } catch {
    return 0;
  }
}

function describePolicyTarget(attachment) {
  if (!attachment) return "target";
  if (attachment.targetType === "role") {
    return attachment.roleName || roleDisplayName(attachment.roleKey);
  }
  return attachment.memberName || attachment.memberEmail || "member";
}

exports.getAccessCatalog = asyncHandler(async (req, res) => {
  assertTeamsReadAccess(req);
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
  const scopedRoles = [];
  for (const role of roles) {
    if (visibleRoles === null) {
      scopedRoles.push(role);
      continue;
    }
    const accountRole = await resolveAccountRoleKeyFromConsoleRole(role);
    if (accountRole && visibleRoles.has(accountRole)) scopedRoles.push(role);
  }

  const enriched = [];
  for (const role of scopedRoles) {
    let count = 0;
    if (visibleRoles === null) {
      count = await memberCountForConsoleRole(role);
    } else {
      const accountRole = await resolveAccountRoleKeyFromConsoleRole(role);
      const scoped = await collectScopedTeamAccounts(req, { accountRoleFilter: accountRole });
      for (const acc of scoped) {
        const pub = typeof acc.password === "undefined" ? acc : toPublicAccount(acc);
        const roleKeys = Array.isArray(pub.roleKeys) ? pub.roleKeys : [];
        const primaryAccountRole =
          (pub.defaultRoleKey && roleKeys.includes(pub.defaultRoleKey) && pub.defaultRoleKey) ||
          roleKeys[0] ||
          null;
        if (!(await canViewTeamAccount(req, pub, primaryAccountRole))) continue;
        if (!accountMatchesConsoleRole(pub, role, primaryAccountRole)) continue;
        count += 1;
      }
    }
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
  let nextNav = Array.isArray(navSections) ? navSections : [];
  let nextScope = dataScope || "team";
  if (grants !== undefined) {
    permissions = grantsMapToPermissions(grants);
  } else if (inherits) {
    const parent = await getRoleById(inherits);
    if (!parent || parent.scope !== CONSOLE_SCOPE) {
      throw new AppError("inheritFromRoleId must be a CONSOLE role", 400);
    }
    permissions = [...(parent.permissions || [])];
    if (!nextNav.length && Array.isArray(parent.navSections)) nextNav = parent.navSections;
    if (!dataScope && parent.dataScope) nextScope = parent.dataScope;
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
    navSections: nextNav,
    dataScope: nextScope,
    locked: false,
  });

  recordAccessAuditLogAsync({
    kind: "role",
    text: `New role created: ${role.name}`,
    detail: inherits ? "Inherits from another role" : "Standalone role",
    subject: role.name,
    subjectMeta: "Role",
    actor: actorDisplayName(req),
    actorAccountId: req.auth?.sub || null,
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

  if (body.grants !== undefined || body.permissions !== undefined) {
    recordAccessAuditLogAsync({
      kind: "permission",
      text: `Updated permissions for ${updated.name}`,
      detail: `${updated.name} role matrix`,
      subject: updated.name,
      subjectMeta: "Role",
      actor: actorDisplayName(req),
      actorAccountId: req.auth?.sub || null,
    });
  } else if (body.inheritsFromRoleId !== undefined) {
    recordAccessAuditLogAsync({
      kind: "role",
      text: `Inheritance updated for ${updated.name}`,
      detail: body.inheritsFromRoleId ? "Now inherits from parent role" : "Standalone role",
      subject: updated.name,
      subjectMeta: "Role",
      actor: actorDisplayName(req),
      actorAccountId: req.auth?.sub || null,
    });
  }

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

  recordAccessAuditLogAsync({
    kind: "role",
    text: `Deleted role ${role.name}`,
    detail: "Custom console role removed",
    subject: role.name,
    subjectMeta: "Role",
    actor: actorDisplayName(req),
    actorAccountId: req.auth?.sub || null,
  });

  return res.json({ status: true, message: "Role deleted" });
});

exports.listAccessPolicies = asyncHandler(async (req, res) => {
  assertSuperAdmin(req);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
  const search = req.query.search || "";
  const { items, pagination } = await listAccessPolicies({
    page,
    limit,
    search,
    status: "active",
  });
  return res.json({
    status: true,
    policies: items,
    pagination,
  });
});

exports.createAccessPolicy = asyncHandler(async (req, res) => {
  assertSuperAdmin(req);
  const name = String(req.body?.name || "").trim();
  if (!name) throw new AppError("Policy name is required", 400);
  let policy;
  try {
    policy = await createAccessPolicy({
      name,
      description: req.body?.description,
      featureId: req.body?.featureId,
      effect: req.body?.effect,
      rules: req.body?.rules,
    });
  } catch (err) {
    throw new AppError(err.message || "Could not create policy", 400);
  }
  recordAccessAuditLogAsync({
    kind: "permission",
    text: `Created policy ${policy.name}`,
    detail: `${policy.scope} policy · ${policy.desc}`,
    subject: policy.name,
    subjectMeta: "Policy",
    actor: actorDisplayName(req),
    actorAccountId: req.auth?.sub || null,
  });
  return res.json({
    status: true,
    message: "Policy created",
    policy,
  });
});

exports.updateAccessPolicy = asyncHandler(async (req, res) => {
  assertSuperAdmin(req);
  const existing = await getAccessPolicyById(req.params.id);
  if (!existing) throw new AppError("Policy not found", 404);
  let policy;
  try {
    policy = await updateAccessPolicy(req.params.id, {
      name: req.body?.name !== undefined ? String(req.body.name || "").trim() : undefined,
      description: req.body?.description,
      featureId: req.body?.featureId,
      effect: req.body?.effect,
      rules: req.body?.rules,
    });
  } catch (err) {
    throw new AppError(err.message || "Could not update policy", 400);
  }
  recordAccessAuditLogAsync({
    kind: "permission",
    text: `Updated policy ${policy.name}`,
    detail: `${policy.scope} policy · ${policy.desc}`,
    subject: policy.name,
    subjectMeta: "Policy",
    actor: actorDisplayName(req),
    actorAccountId: req.auth?.sub || null,
  });
  return res.json({
    status: true,
    message: "Policy updated",
    policy,
  });
});

exports.deleteAccessPolicy = asyncHandler(async (req, res) => {
  assertSuperAdmin(req);
  const policy = await getAccessPolicyById(req.params.id);
  if (!policy) throw new AppError("Policy not found", 404);
  await deleteAccessPolicy(req.params.id);
  recordAccessAuditLogAsync({
    kind: "permission",
    text: `Deleted policy ${policy.name}`,
    detail: `Removed policy for ${policy.featureName}`,
    subject: policy.name,
    subjectMeta: "Policy",
    actor: actorDisplayName(req),
    actorAccountId: req.auth?.sub || null,
  });
  return res.json({ status: true, message: "Policy deleted" });
});

exports.attachAccessPolicy = asyncHandler(async (req, res) => {
  assertSuperAdmin(req);
  const policy = await getAccessPolicyById(req.params.id);
  if (!policy) throw new AppError("Policy not found", 404);

  let attachment;
  if (String(req.body?.targetType || "").trim().toLowerCase() === "role") {
    const roleKey = String(req.body?.roleKey || "").trim().toLowerCase();
    attachment = normalizeAttachment({
      targetType: "role",
      roleKey,
      roleName: roleDisplayName(roleKey),
    });
    const duplicate = (policy.attachments || []).some(
      (entry) => entry.targetType === "role" && entry.roleKey === attachment.roleKey
    );
    if (duplicate) throw new AppError("This role already has the policy", 409);
  } else {
    const accountId = String(req.body?.accountId || "").trim();
    const account = await getAccountById(accountId);
    if (!account) throw new AppError("Member not found", 404);
    const pub = toPublicAccount(account);
    attachment = normalizeAttachment({
      targetType: "member",
      accountId,
      memberName: pub?.name || account.name || "Member",
      memberEmail: pub?.email || account.email || "",
    });
    const duplicate = (policy.attachments || []).some(
      (entry) => entry.targetType === "member" && entry.accountId === attachment.accountId
    );
    if (duplicate) throw new AppError("This member already has the policy", 409);
  }

  const updated = await updateAccessPolicy(req.params.id, {
    attachments: [...(policy.attachments || []), attachment],
  });
  recordAccessAuditLogAsync({
    kind: "permission",
    text: `Policy attached: ${updated.name}`,
    detail: describePolicyTarget(attachment),
    subject: updated.name,
    subjectMeta: "Policy",
    actor: actorDisplayName(req),
    actorAccountId: req.auth?.sub || null,
  });
  return res.json({
    status: true,
    message: "Policy attached",
    policy: updated,
  });
});

exports.listAccessMembers = asyncHandler(async (req, res) => {
  assertTeamsReadAccess(req);
  const search = req.query.search || req.query.q;
  let roleFilter = String(req.query.roleKey || req.query.role || "").trim();
  let consoleRoleIdFilter = String(req.query.consoleRoleId || "").trim();
  const parentAccountIdFilter = String(
    req.query.parentAccountId || req.query.parent || ""
  ).trim();
  if (!consoleRoleIdFilter && isConsoleRoleId(roleFilter)) {
    consoleRoleIdFilter = roleFilter;
    roleFilter = "";
  }
  let selectedConsoleRole = null;
  if (consoleRoleIdFilter) {
    selectedConsoleRole = await getRoleById(consoleRoleIdFilter);
    if (!selectedConsoleRole || selectedConsoleRole.scope !== CONSOLE_SCOPE) {
      throw new AppError("Access Control role not found", 404);
    }
  }
  const accountRoleFromConsole = selectedConsoleRole
    ? await resolveAccountRoleKeyFromConsoleRole(selectedConsoleRole)
    : null;
  const accountRoleFilter = accountRoleFromConsole
    || (roleFilter ? UI_TO_ACCOUNT_ROLE[roleFilter] || roleFilter : undefined);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
  const listPage = selectedConsoleRole ? 1 : page;
  const listLimit = selectedConsoleRole ? 200 : limit;

  const visibleRoles = visibleTeamRoleKeys(req);
  if (visibleRoles !== null && accountRoleFilter && !visibleRoles.has(accountRoleFilter)) {
    return res.json({
      status: true,
      members: [],
      pagination: { page, limit, total: 0, pages: 1 },
    });
  }

  // Coaches are scoped to their own tree; admins may further filter by parent WC.
  const scopedParentId =
    visibleRoles !== null
      ? req.auth.sub
      : parentAccountIdFilter || undefined;

  let result;
  if (visibleRoles === null) {
    result = await listAccounts({
      status: "active",
      search,
      roleKey: accountRoleFilter,
      parentAccountId: scopedParentId,
      page: listPage,
      limit: listLimit,
    });
  } else {
    result = {
      accounts: await collectScopedTeamAccounts(req, {
        search,
        accountRoleFilter,
        // When WC opens AWCs for their own profile, parent is themselves (already scoped).
        // Ignore a mismatched parent filter from the URL.
      }),
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

  const matchedAccounts = [];
  for (const acc of result.accounts || []) {
    const pub = typeof acc.password === "undefined" ? acc : toPublicAccount(acc);
    const roleKeys = Array.isArray(pub.roleKeys) ? pub.roleKeys : [];
    const primaryAccountRole =
      (pub.defaultRoleKey && roleKeys.includes(pub.defaultRoleKey) && pub.defaultRoleKey) ||
      roleKeys[0] ||
      null;
    if (!(await canViewTeamAccount(req, pub, primaryAccountRole))) continue;
    if (selectedConsoleRole && !accountMatchesConsoleRole(pub, selectedConsoleRole, primaryAccountRole)) {
      continue;
    }
    matchedAccounts.push({ pub, primaryAccountRole, roleKeys });
  }

  if (selectedConsoleRole || visibleRoles !== null) {
    result = paginateAccounts(matchedAccounts, page, limit);
  } else {
    result = {
      accounts: matchedAccounts,
      pagination: result.pagination,
    };
  }

  const { items: activePolicies } = await listAccessPolicies({ page: 1, limit: 200, status: "active" });

  const members = [];
  for (const { pub, primaryAccountRole, roleKeys } of result.accounts || []) {
    const uiRole = ACCOUNT_TO_UI_ROLE[primaryAccountRole] || primaryAccountRole;
    const consoleRole = resolveAssignedConsoleRole(pub, primaryAccountRole, consoleRoles, roleByKey);

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
    let parentAccountId =
      pub.parentAccountId ||
      getMembership(pub, primaryAccountRole)?.parentAccountId ||
      null;

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
        const parentId = parentAccountId;
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
      profileImage: pub.profileImage || null,
      dateOfBirth: pub.dateOfBirth || pub.dob || null,
      country: pub.country || null,
      state: pub.state || null,
      city: pub.city || null,
      bio: pub.bio || null,
      phone: pub.phone || null,
      phoneCountryCode: pub.phoneCountryCode || null,
      status: pub.status,
      displayStatus,
      approvalStatus: pub.approvalStatus || null,
      isSuperAdmin: Boolean(pub.isSuperAdmin),
      totpRequired: Boolean(pub.totpRequired),
      totpConfigured: Boolean(pub.totpConfigured),
      roleKeys,
      primaryRoleKey: uiRole,
      accountRoleKey: primaryAccountRole,
      consoleRoleId: consoleRole?.id || null,
      parentAccountId,
      parentName,
      clientCount,
      awcCount,
      grantedCount,
      totalSlots: TOTAL_PERM_SLOTS,
      hasOverrides: overrides !== undefined,
      policyBundleCount: activePolicies.filter((policy) =>
        policyAppliesToTarget(policy, {
          roleKey: uiRole,
          accountId: pub.id,
        })
      ).length,
      meta,
    });
  }

  return res.json({
    status: true,
    members,
    pagination: result.pagination,
  });
});

function formatCountLabel(count, singular, plural) {
  const n = Number(count) || 0;
  return `${n} ${n === 1 ? singular : plural}`;
}

async function buildMemberContent(accountOrPublic) {
  const coachContent =
    accountOrPublic?.coach_content && typeof accountOrPublic.coach_content === "object"
      ? accountOrPublic.coach_content
      : {};
  const intro = coachContent.intro || {};
  const letter = coachContent.letter || {};
  const videoUrl = String(intro.videoUrl || "").trim();
  const linkUrl = String(intro.linkUrl || "").trim();
  const letterUrl = String(letter.fileUrl || "").trim();
  const hasVideo = Boolean(videoUrl || linkUrl);
  const hasLetter = Boolean(letterUrl);

  const formatDate = (iso) => {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const signedLabel = formatDate(letter.signedAt);
  const uploadedLabel = formatDate(intro.uploadedAt);
  const videoMeta = hasVideo
    ? [
        intro.duration,
        uploadedLabel
          ? `Uploaded ${uploadedLabel}`
          : intro.sourceType === "link"
            ? "Linked video"
            : "Uploaded",
      ]
        .filter(Boolean)
        .join(" · ") || "Uploaded"
    : "Not uploaded";
  const letterMeta = hasLetter
    ? [signedLabel ? `Signed ${signedLabel}` : "Uploaded", "PDF"].filter(Boolean).join(" · ")
    : "Not uploaded";

  return [
    {
      id: "intro",
      kind: "video",
      title: "Intro video",
      live: Boolean(intro.live) && hasVideo,
      hasMedia: hasVideo,
      meta: videoMeta,
      url: videoUrl || linkUrl || null,
      downloadUrl: videoUrl || null,
    },
    {
      id: "letter",
      kind: "letter",
      title: "Commitment letter",
      live: Boolean(letter.live) && hasLetter,
      hasMedia: hasLetter,
      meta: letterMeta,
      url: letterUrl || null,
      downloadUrl: letterUrl || null,
    },
  ];
}

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
  const roleByKey = {};
  for (const r of consoleRoles) {
    if (r.roleKey) roleByKey[r.roleKey] = r;
  }
  const consoleRole = resolveAssignedConsoleRole(pub, primaryAccountRole, consoleRoles, roleByKey);
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
    maintenance: 0,
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
        else if (tier === "maintenance") clientStats.maintenance += 1;
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
      bio: pub.bio || null,
      referralCode,
      joinedAt: pub.createdAt || null,
      status: pub.status,
      approvalStatus: pub.approvalStatus || null,
      displayStatus:
        pub.status === "inactive"
          ? "Inactive"
          : String(pub.approvalStatus || "").toLowerCase() === "pending"
            ? "Pending"
            : "Active",
      isSuperAdmin: Boolean(pub.isSuperAdmin),
      totpRequired: Boolean(pub.totpRequired),
      totpConfigured: Boolean(pub.totpConfigured),
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
          ? `${formatCountLabel(clientCount, "client", "clients")} · ${formatCountLabel(awcCount, "AWC", "AWCs")}`
          : parentName
            ? `under ${parentName}`
            : ROLE_KEY_META[uiRole]?.name || uiRole,
      content:
        primaryAccountRole === "wellness_coach" || primaryAccountRole === "assistant_wellness_coach"
          ? await buildMemberContent(pub)
          : [],
      grants,
      roleGrants,
      hasOverrides: overrideGrants !== undefined,
      grantedCount: pub.isSuperAdmin ? TOTAL_PERM_SLOTS : grantedCount,
      totalSlots: TOTAL_PERM_SLOTS,
      navSections: Array.isArray(consoleRole?.navSections)
        ? consoleRole.navSections
        : DEFAULT_NAV_SECTIONS[uiRole] || [],
      pendingPermissionRequest: toPublicAccessRequest(await safePendingForTarget(pub.id)),
      pendingPermissionRequests: await safePendingListForTarget(pub.id),
    },
  });
});

exports.setAccessMemberPermissions = asyncHandler(async (req, res) => {
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

  const body = req.body || {};
  if (!body.reset && body.grants === undefined) {
    throw new AppError("grants or reset is required", 400);
  }

  const pub = toPublicAccount(account);
  if (req.auth?.role === "wellness_coach" && !isAccessAdmin(req)) {
    if (!(await canViewTeamAccount(req, pub, primaryAccountRole))) {
      throw new AppError("Team member not found", 404);
    }
    if (!WC_REQUESTABLE_ROLES.has(primaryAccountRole)) {
      throw new AppError("Only Admin can change this member's permissions", 403);
    }

    const { roles: consoleRoles } = await listRoles({
      scope: CONSOLE_SCOPE,
      status: "active",
      page: 1,
      limit: 100,
    });
    const uiRole = ACCOUNT_TO_UI_ROLE[primaryAccountRole] || primaryAccountRole;
    const consoleRole = consoleRoles.find((r) => r.roleKey === uiRole) || null;
    const membership = getMembership(account, primaryAccountRole);
    const roleGrants = consoleRole ? permissionsToGrantsMap(consoleRole.permissions || []) : {};
    const currentGrants =
      membership?.permissionOverrides?.consoleGrants !== undefined
        ? membership.permissionOverrides.consoleGrants
        : roleGrants;
    const proposedGrants = body.reset ? undefined : sanitizeGrantsMap(body.grants);
    if (body.reset && membership?.permissionOverrides?.consoleGrants === undefined) {
      throw new AppError("Permissions are already at the role default", 400);
    }
    if (!body.reset && grantsEqual(currentGrants, proposedGrants)) {
      throw new AppError("No permission changes to request", 400);
    }

    await supersedeAllPendingForTarget(account.id);
    const changes = splitPermissionChanges({
      reset: Boolean(body.reset),
      currentGrants,
      proposedGrants: body.reset ? roleGrants : proposedGrants,
      targetName: pub.name || account.name,
    });
    for (const change of changes) {
      await createAccessPermissionRequest({
        kind: "permission",
        requesterAccountId: req.auth.sub,
        requesterName: actorDisplayName(req),
        targetAccountId: account.id,
        targetName: pub.name || account.name,
        title: change.title,
        reset: Boolean(change.reset),
        featureId: change.featureId || null,
        action: change.action || null,
        changeType: change.changeType || null,
        currentGrants,
      });
    }

    return exports.getAccessMember(req, res);
  }

  assertSuperAdmin(req);
  const memberships = applyConsoleGrantsToMembership(account, primaryAccountRole, {
    grants: body.grants,
    reset: Boolean(body.reset),
  });
  await safeSupersedePending(account.id);
  const updated = await updateAccount(account.id, { memberships });

  recordAccessAuditLogAsync({
    kind: "permission",
    text: body.reset
      ? `Reset permissions for ${pub.name || account.name}`
      : `Updated permissions for ${pub.name || account.name}`,
    detail: body.reset ? "Back to role default" : "Personal override applied",
    subject: pub.name || account.name,
    subjectMeta: pub.referralCode || pub.email || account.email || "Member",
    actor: actorDisplayName(req),
    actorAccountId: req.auth?.sub || null,
  });

  req.params.id = updated.id;
  return exports.getAccessMember(req, res);
});

exports.listAccessApprovals = asyncHandler(async (req, res) => {
  assertSuperAdmin(req);
  const status = String(req.query.status || "pending").trim().toLowerCase() || "pending";
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const { items, pagination } = await listAccessPermissionRequests({ status, page, limit });
  return res.json({
    status: true,
    requests: (items || []).map(toPublicAccessRequest),
    pagination,
  });
});

exports.listAccessAuditLog = asyncHandler(async (req, res) => {
  assertSuperAdmin(req);
  await seedAccessAuditLogSamplesIfEmpty();
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const search = String(req.query.search || "").trim();
  const kind = String(req.query.kind || "").trim().toLowerCase();
  const { items, pagination } = await listAccessAuditLogs({
    page,
    limit,
    search: search || undefined,
    kind: kind || undefined,
  });
  return res.json({
    status: true,
    entries: items,
    pagination,
  });
});

async function reviewAccessRequest(req, res, decision) {
  assertSuperAdmin(req);
  const request = await getAccessPermissionRequestById(req.params.id);
  if (!request) throw new AppError("Request not found", 404);
  if (request.status !== "pending") {
    throw new AppError("This request has already been reviewed", 400);
  }

  if (decision === "approved") {
    const account = await getAccountById(request.targetAccountId);
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

    const { roles: consoleRoles } = await listRoles({
      scope: CONSOLE_SCOPE,
      status: "active",
      page: 1,
      limit: 100,
    });
    const uiRole = ACCOUNT_TO_UI_ROLE[primaryAccountRole] || primaryAccountRole;
    const consoleRole = consoleRoles.find((r) => r.roleKey === uiRole) || null;
    const membership = getMembership(account, primaryAccountRole);
    const roleGrants = consoleRole ? permissionsToGrantsMap(consoleRole.permissions || []) : {};
    const currentGrants =
      membership?.permissionOverrides?.consoleGrants !== undefined
        ? membership.permissionOverrides.consoleGrants
        : roleGrants;

    let memberships;
    if (request.changeType && (request.featureId || request.reset)) {
      const result = applySinglePermissionChange(currentGrants, request, roleGrants);
      memberships = applyConsoleGrantsToMembership(account, primaryAccountRole, result);
    } else {
      memberships = applyConsoleGrantsToMembership(account, primaryAccountRole, {
        grants: request.proposedGrants,
        reset: Boolean(request.reset),
      });
    }
    await updateAccount(account.id, { memberships });
  }

  const updated = await updateAccessPermissionRequest(request.id, {
    status: decision,
    reviewedAt: new Date().toISOString(),
    reviewedByAccountId: req.auth.sub,
    reviewedByName: actorDisplayName(req),
  });

  const reviewer = actorDisplayName(req);
  recordAccessAuditLogAsync({
    kind: request.kind === "role" ? "role" : "permission",
    text:
      decision === "approved"
        ? request.title || "Permission request approved"
        : request.title
          ? `Rejected: ${request.title}`
          : "Permission request rejected",
    detail:
      decision === "approved"
        ? `Approved by ${reviewer}`
        : `Rejected by ${reviewer}`,
    subject: request.targetName || "Member",
    subjectMeta: request.targetAccountId || "Member",
    actor: reviewer,
    actorAccountId: req.auth?.sub || null,
  });

  return res.json({
    status: true,
    message: decision === "approved" ? "Permission request approved" : "Permission request rejected",
    request: toPublicAccessRequest(updated),
  });
}

exports.approveAccessRequest = asyncHandler(async (req, res) => {
  return reviewAccessRequest(req, res, "approved");
});

exports.rejectAccessRequest = asyncHandler(async (req, res) => {
  return reviewAccessRequest(req, res, "rejected");
});

exports.setAccessMemberRole = asyncHandler(async (req, res) => {
  assertSuperAdmin(req);
  const account = await getAccountById(req.params.id);
  if (!account) throw new AppError("Account not found", 404);
  if (account.isSuperAdmin) {
    throw new AppError("Cannot change the Super Admin primary role this way", 400);
  }

  const previousUiRole = accountPrimaryUiRole(account);
  const pub = toPublicAccount(account);
  const uiRole = String(req.body?.roleKey || req.body?.role || "").trim().toLowerCase();
  const consoleRoleId = String(req.body?.consoleRoleId || "").trim();

  let consoleRole = null;
  let accountRoleKey = null;

  if (consoleRoleId) {
    consoleRole = await getRoleById(consoleRoleId);
    if (!consoleRole || consoleRole.scope !== CONSOLE_SCOPE) {
      throw new AppError("Access Control role not found", 404);
    }
    if (consoleRole.status && consoleRole.status !== "active") {
      throw new AppError("Access Control role is not active", 400);
    }
    accountRoleKey = await resolveAccountRoleKeyFromConsoleRole(consoleRole);
    if (!accountRoleKey || accountRoleKey === "admin") {
      throw new AppError("Choose a non-admin Access Control role", 400);
    }
  } else {
    accountRoleKey = UI_TO_ACCOUNT_ROLE[uiRole];
    if (!accountRoleKey) throw new AppError("Invalid roleKey", 400);

    const { roles: consoleRoles } = await listRoles({
      scope: CONSOLE_SCOPE,
      status: "active",
      page: 1,
      limit: 100,
    });
    consoleRole = consoleRoles.find((r) => r.roleKey === uiRole);
    if (!consoleRole) {
      throw new AppError("CONSOLE role template missing for this roleKey — run seed", 400);
    }
  }

  let parentId = null;
  if (accountRoleKey === "assistant_wellness_coach" || accountRoleKey === "trainee") {
    const requestedParent = req.body?.parentAccountId;
    parentId =
      requestedParent !== undefined
        ? String(requestedParent || "").trim() || null
        : account.parentAccountId || getMembership(account, accountRoleKey)?.parentAccountId || null;
    if (!parentId) {
      throw new AppError("parentAccountId is required for assistants and trainees", 400);
    }
    if (parentId === String(account.id)) {
      throw new AppError("A team member cannot report to themselves", 400);
    }
    const parent = await getAccountById(parentId);
    if (!parent) throw new AppError("Parent team member not found", 404);
    const requiredParentRole =
      accountRoleKey === "assistant_wellness_coach" ? "wellness_coach" : "assistant_wellness_coach";
    if (!parent.roleKeys?.includes(requiredParentRole)) {
      throw new AppError(
        accountRoleKey === "trainee"
          ? "A trainee must report to an Assistant WC"
          : "An Assistant WC must report to a Wellness Coach",
        400
      );
    }
  }

  // Replace memberships with the selected primary role (v1 single primary)
  const memberships = [
    {
      roleKey: accountRoleKey,
      roleId: consoleRole.id,
      permissionOverrides: null,
      status: "active",
      parentAccountId: parentId,
    },
  ];

  const updated = await updateAccount(account.id, {
    memberships,
    defaultRoleKey: accountRoleKey,
  });

  const memberName = pub.name || account.name || "Member";
  const newRoleName = roleDisplayName(uiRole);
  const previousRoleName = previousUiRole ? roleDisplayName(previousUiRole) : null;
  recordAccessAuditLogAsync({
    kind: "role",
    text: previousRoleName
      ? `Changed ${memberName} from ${previousRoleName} to ${newRoleName}`
      : `Assigned ${memberName} to ${newRoleName}`,
    detail: `Updated by ${actorDisplayName(req)}`,
    subject: memberName,
    subjectMeta: pub.referralCode || pub.email || account.email || "Member",
    actor: actorDisplayName(req),
    actorAccountId: req.auth?.sub || null,
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
    } else if (roleKey === "admin") {
      const full = grantsMapToPermissions(null);
      const current = Array.isArray(role.permissions) ? role.permissions : [];
      const incomplete = full.some((slug) => !current.includes(slug));
      if (incomplete || !role.locked) {
        role = await updateRole(role.id, {
          permissions: full,
          locked: true,
          navSections: DEFAULT_NAV_SECTIONS.admin,
          dataScope: meta.dataScope,
        });
      }
    } else if (roleKey === "wc") {
      // Revenue analytics is admin-only — strip legacy rev grants from seeded WC roles.
      const baselinePerms = grantsMapToPermissions(DEFAULT_CONSOLE_GRANTS.wc);
      const currentPerms = Array.isArray(role.permissions) ? role.permissions : [];
      const revSlugRe = /^console\.rev\./;
      const nextPerms = [
        ...new Set([
          ...currentPerms.filter((slug) => !revSlugRe.test(String(slug))),
          ...baselinePerms,
        ]),
      ];
      const permsChanged =
        nextPerms.length !== currentPerms.length
        || nextPerms.some((slug) => !currentPerms.includes(slug))
        || currentPerms.some((slug) => !nextPerms.includes(slug));
      if (permsChanged) {
        role = await updateRole(role.id, { permissions: nextPerms });
      }
    } else if (roleKey === "support") {
      // Keep Support aligned with the current baseline (additive for new slugs, drop removed defaults).
      const baselinePerms = grantsMapToPermissions(DEFAULT_CONSOLE_GRANTS.support);
      const baselineNav = DEFAULT_NAV_SECTIONS.support || [];
      const currentPerms = Array.isArray(role.permissions) ? role.permissions : [];
      const currentNav = Array.isArray(role.navSections) ? role.navSections : [];
      const configSlugRe = /^console\.(ct|bn|cf|rp)\./;
      const nextPerms = [
        ...new Set([
          ...currentPerms.filter((slug) => !configSlugRe.test(String(slug))),
          ...baselinePerms,
        ]),
      ];
      const nextNav = [
        ...new Set([
          ...currentNav.filter((id) => id !== "configs"),
          ...baselineNav,
        ]),
      ];
      const permsChanged =
        nextPerms.length !== currentPerms.length
        || nextPerms.some((slug) => !currentPerms.includes(slug))
        || currentPerms.some((slug) => !nextPerms.includes(slug));
      const navChanged =
        nextNav.length !== currentNav.length
        || nextNav.some((id) => !currentNav.includes(id))
        || currentNav.some((id) => !nextNav.includes(id));
      if (permsChanged || navChanged) {
        role = await updateRole(role.id, {
          permissions: nextPerms,
          navSections: nextNav,
        });
      }
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
