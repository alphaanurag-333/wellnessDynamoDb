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
const { countAccountsByRoleId } = require("../../models/accountModel");
const {
  isValidPermission,
  getPermissionCatalog,
  normalizePermissionList,
} = require("../../config/permissionCatalog");

function sanitizePermissions(permissions) {
  if (permissions === undefined) return undefined;
  if (!Array.isArray(permissions)) {
    throw new AppError("permissions must be an array of permission slugs", 400);
  }
  return normalizePermissionList(permissions);
}

exports.listRolesController = asyncHandler(async (req, res) => {
  const { page, limit, status, search } = req.query;
  const { roles, pagination } = await listRoles({
    page,
    limit,
    status,
    search,
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
  const { name, slug, permissions = [], status = "active" } = req.body;

  if (!name || !String(name).trim()) {
    throw new AppError("Role name is required", 400);
  }
  const cleanedPermissions = sanitizePermissions(permissions);
  const resolvedSlug = slug || name;

  const existing = await getRoleBySlug(resolvedSlug);
  if (existing) {
    throw new AppError("A role with this name/slug already exists", 409);
  }

  const role = await createRole({
    name,
    slug: resolvedSlug,
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

  const usageCount = await countAccountsByRoleId(role.id);
  if (usageCount > 0) {
    throw new AppError(
      `Cannot delete this role — it is assigned to ${usageCount} account(s). Reassign them first.`,
      409
    );
  }

  await deleteRole(role.id);

  return res.status(200).json({
    status: true,
    message: "Role deleted successfully",
  });
});

exports.getPermissionCatalogController = asyncHandler(async (_req, res) => {
  return res.status(200).json({
    status: true,
    message: "Permission catalog fetched successfully",
    ...getPermissionCatalog(),
  });
});

exports.isValidPermission = isValidPermission;
