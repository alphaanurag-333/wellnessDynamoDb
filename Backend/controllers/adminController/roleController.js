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
const { areValidPermissions, getPermissionCatalog } = require("../../config/permissionCatalog");

function assertValidPermissions(permissions) {
  if (permissions === undefined) return;
  if (!Array.isArray(permissions)) {
    throw new AppError("permissions must be an array of permission slugs", 400);
  }
  if (!areValidPermissions(permissions)) {
    throw new AppError("permissions contains one or more unknown permission slugs", 400);
  }
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
  assertValidPermissions(permissions);

  const existing = await getRoleBySlug(slug || name);
  if (existing) {
    throw new AppError("A role with this name/slug already exists", 409);
  }

  const role = await createRole({ name, slug: slug || name, permissions, status });

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
  assertValidPermissions(permissions);

  if (slug !== undefined && slug !== role.slug) {
    const existing = await getRoleBySlug(slug);
    if (existing && existing.id !== role.id) {
      throw new AppError("A role with this slug already exists", 409);
    }
  }

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (slug !== undefined) updates.slug = slug;
  if (permissions !== undefined) updates.permissions = permissions;
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
