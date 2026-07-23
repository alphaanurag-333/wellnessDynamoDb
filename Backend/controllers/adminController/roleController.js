const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createRole,
  getRoleById,
  getRoleBySlug,
  updateRole,
  deleteRole,
  listRoles,
  normalizeScope,
} = require("../../models/roleModel");
const { countAdminsByRoleId } = require("../../models/adminModel");
const { countCoachesByRoleId } = require("../../models/wellnessCoachModel");
const { getPermissionCatalog } = require("../../config/permissionCatalog");
const { getCoachPermissionCatalog } = require("../../config/coachPermissionCatalog");
const { remapLegacySlugList } = require("../../config/staffPermissionSlugMap");
const { permissionsForAccountType } = require("../../config/staffPermissionCatalog");

/**
 * Keep only catalog-known slugs for the given scope, always persisted as
 * unified `staffPermissionCatalog` slugs.
 *
 * This form (the pre-M6 admin panel's Role Management UI) still sends slugs
 * in whichever shape its own catalog uses (legacy admin `to.action` or
 * legacy coach `nav.*`/`clientTab.*`). Since M3 already remapped every
 * existing Role row onto unified slugs, this must remap *incoming* slugs the
 * same way before storing — otherwise every edit made through this legacy UI
 * would silently re-write `Role.permissions` back into the legacy shape,
 * which `protectStaff`/`resolveStaffPermissions` (and, post-M5/M6, the
 * `protect*Legacy` fallbacks too) do not recognize, wiping out that role's
 * effective permissions on its very next resolve.
 */
function sanitizePermissions(permissions, scope = "ADMIN") {
  if (permissions === undefined) return undefined;
  if (!Array.isArray(permissions)) {
    throw new AppError("permissions must be an array of permission slugs", 400);
  }
  const unified = remapLegacySlugList(permissions.map((slug) => String(slug)), scope);
  const allowedTypes = scope === "COACH" ? ["wellness_coach", "assistant_wellness_coach"] : ["admin"];
  const allowed = new Set(allowedTypes.flatMap((type) => permissionsForAccountType(type)));
  return unified.filter((slug) => allowed.has(slug));
}

exports.listRolesController = asyncHandler(async (req, res) => {
  const { page, limit, status, search, scope } = req.query;
  const { roles, pagination } = await listRoles({
    page,
    limit,
    status,
    search,
    scope: scope ? normalizeScope(scope, "ADMIN") : undefined,
  });

  return res.status(200).json({
    status: true,
    message: "Roles fetched successfully",
    roles,
    pagination,
  });
});

exports.getRoleByIdController = asyncHandler(async (req, res) => {
  const role = await getRoleById(req.params.id);
  if (!role) {
    throw new AppError("Role not found", 404);
  }

  return res.status(200).json({
    status: true,
    message: "Role fetched successfully",
    role,
  });
});

exports.createRoleController = asyncHandler(async (req, res) => {
  const { name, slug, permissions = [], status = "active", scope = "ADMIN" } = req.body;
  const normalizedScope = normalizeScope(scope, "ADMIN");

  if (!name || !String(name).trim()) {
    throw new AppError("Role name is required", 400);
  }
  const cleanedPermissions = sanitizePermissions(permissions, normalizedScope);

  // Coach slugs are namespaced so they never collide with Admin roles of the same display name.
  let resolvedSlug = slug || name;
  if (normalizedScope === "COACH") {
    const raw = String(resolvedSlug || "").trim();
    const alreadyPrefixed = /^coach[-_]/i.test(raw);
    resolvedSlug = alreadyPrefixed ? raw : `coach-${raw}`;
  }

  const existing = await getRoleBySlug(resolvedSlug, { scope: normalizedScope });
  if (existing) {
    throw new AppError(
      `A ${normalizedScope === "COACH" ? "coach" : "admin"} role with this name/slug already exists`,
      409
    );
  }

  // Defensive: also block exact slug reuse across scopes on shared SlugIndex.
  const anyScope = await getRoleBySlug(resolvedSlug);
  if (anyScope && normalizeScope(anyScope.scope, "ADMIN") !== normalizedScope) {
    // Same slug reserved by the other scope — remint with an explicit coach/admin prefix.
    resolvedSlug =
      normalizedScope === "COACH"
        ? `coach-${String(slug || name).trim()}`
        : `admin-${String(slug || name).trim()}`;
    const again = await getRoleBySlug(resolvedSlug, { scope: normalizedScope });
    if (again) {
      throw new AppError(
        `A ${normalizedScope === "COACH" ? "coach" : "admin"} role with this name/slug already exists`,
        409
      );
    }
  }

  const role = await createRole({
    name,
    slug: resolvedSlug,
    permissions: cleanedPermissions,
    status,
    scope: normalizedScope,
  });

  return res.status(201).json({
    status: true,
    message: "Role created successfully",
    role,
  });
});

exports.updateRoleController = asyncHandler(async (req, res) => {
  const role = await getRoleById(req.params.id);
  if (!role) {
    throw new AppError("Role not found", 404);
  }

  const roleScope = normalizeScope(role.scope, "ADMIN");
  const { name, slug, permissions, status } = req.body;
  const cleanedPermissions = sanitizePermissions(permissions, roleScope);

  if (slug !== undefined && slug !== role.slug) {
    const existing = await getRoleBySlug(slug, { scope: roleScope });
    if (existing && existing.id !== role.id) {
      throw new AppError("A role with this slug already exists for this scope", 409);
    }
  }

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (slug !== undefined) updates.slug = slug;
  if (cleanedPermissions !== undefined) updates.permissions = cleanedPermissions;
  if (status !== undefined) updates.status = status;
  // scope is immutable after create — ignore body.scope

  const updated = await updateRole(role.id, updates);

  return res.status(200).json({
    status: true,
    message: "Role updated successfully",
    role: updated,
  });
});

exports.deleteRoleController = asyncHandler(async (req, res) => {
  const role = await getRoleById(req.params.id);
  if (!role) {
    throw new AppError("Role not found", 404);
  }

  const roleScope = normalizeScope(role.scope, "ADMIN");
  if (roleScope === "COACH") {
    const usageCount = await countCoachesByRoleId(role.id);
    if (usageCount > 0) {
      throw new AppError(
        `Cannot delete this role — it is assigned to ${usageCount} coach(es). Reassign them first.`,
        409
      );
    }
  } else {
    const usageCount = await countAdminsByRoleId(role.id);
    if (usageCount > 0) {
      throw new AppError(
        `Cannot delete this role — it is assigned to ${usageCount} sub-admin(s). Reassign them first.`,
        409
      );
    }
  }

  await deleteRole(role.id);

  return res.status(200).json({
    status: true,
    message: "Role deleted successfully",
  });
});

exports.getPermissionCatalogController = asyncHandler(async (req, res) => {
  const rawScope = Array.isArray(req.query.scope) ? req.query.scope[0] : req.query.scope;
  const scope = normalizeScope(rawScope || "ADMIN", "ADMIN");
  if (scope === "COACH") {
    const catalog = getCoachPermissionCatalog();
    return res.status(200).json({
      status: true,
      message: "Coach permission catalog fetched successfully",
      scope: "COACH",
      groups: catalog.groups,
      permissions: catalog.permissions,
    });
  }

  return res.status(200).json({
    status: true,
    message: "Permission catalog fetched successfully",
    scope: "ADMIN",
    ...getPermissionCatalog(),
  });
});
