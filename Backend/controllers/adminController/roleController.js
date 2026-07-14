const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createRole,
  getRoleById,
  getRoleBySlug,
  updateRole,
  deleteRole,
  listRoles,
} = require("../../models/roleModel");
const { countAdminsByRoleId } = require("../../models/adminModel");
const { isValidPermission, getPermissionCatalog } = require("../../config/permissionCatalog");

/**
 * Keep only catalog-known slugs. Obsolete entries (e.g. removed `.view` after a
 * catalog change) are dropped so role updates still succeed.
 */
function sanitizePermissions(permissions) {
  if (permissions === undefined) return undefined;
  if (!Array.isArray(permissions)) {
    throw new AppError("permissions must be an array of permission slugs", 400);
  }
  return [...new Set(permissions.map((slug) => String(slug)).filter(isValidPermission))];
}

exports.listRolesController = asyncHandler(async (req, res) => {
  const { page, limit, status, search } = req.query;
  const { roles, pagination } = await listRoles({ page, limit, status, search });

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
  const { name, slug, permissions = [], status = "active" } = req.body;

  if (!name || !String(name).trim()) {
    throw new AppError("Role name is required", 400);
  }
  const cleanedPermissions = sanitizePermissions(permissions);

  const existing = await getRoleBySlug(slug || name);
  if (existing) {
    throw new AppError("A role with this name/slug already exists", 409);
  }

  const role = await createRole({
    name,
    slug: slug || name,
    permissions: cleanedPermissions,
    status,
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

  const { name, slug, permissions, status } = req.body;
  const cleanedPermissions = sanitizePermissions(permissions);

  if (slug !== undefined && slug !== role.slug) {
    const existing = await getRoleBySlug(slug);
    if (existing && existing.id !== role.id) {
      throw new AppError("A role with this slug already exists", 409);
    }
  }

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (slug !== undefined) updates.slug = slug;
  if (cleanedPermissions !== undefined) updates.permissions = cleanedPermissions;
  if (status !== undefined) updates.status = status;

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

  const usageCount = await countAdminsByRoleId(role.id);
  if (usageCount > 0) {
    throw new AppError(
      `Cannot delete this role — it is assigned to ${usageCount} sub-admin(s). Reassign them first.`,
      409
    );
  }

  await deleteRole(role.id);

  return res.status(200).json({
    status: true,
    message: "Role deleted successfully",
  });
});

exports.getPermissionCatalogController = asyncHandler(async (req, res) => {
  return res.status(200).json({
    status: true,
    message: "Permission catalog fetched successfully",
    ...getPermissionCatalog(),
  });
});
