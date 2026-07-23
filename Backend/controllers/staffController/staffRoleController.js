/**
 * Unified Role management — one Role table drives permissions for every
 * staff account type, via the unified `Backend/config/staffPermissionCatalog.js`.
 * Super Admin only. Mounted at `/api/staff/roles`.
 *
 * Every role is assignable to every staff account type (Admin, Wellness
 * Coach, Assistant Wellness Coach, custom Staff) — the catalog itself has no
 * per-account-type module restriction (see `staffPermissionCatalog.js`), so
 * `Role.accountTypes` is always the full list rather than something a Super
 * Admin picks. A role is just a name + a free choice of permissions; nothing
 * about assigning it is gated by account type.
 */
const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { createRole, getRoleById, getRoleBySlug, updateRole, deleteRole, listRoles } = require("../../models/roleModel");
const { countStaffAccountsByRoleId } = require("../../models/staffAccountModel");
const { isValidPermission, ACCOUNT_TYPES } = require("../../config/staffPermissionCatalog");

function sanitizePermissions(permissions) {
  if (!Array.isArray(permissions)) return [];
  return Array.from(new Set(permissions.filter((slug) => isValidPermission(slug))));
}

exports.listRolesController = asyncHandler(async (req, res) => {
  const { page, limit, status, search } = req.query;
  const { roles, pagination } = await listRoles({ page, limit, status, search });
  return res.status(200).json({ status: true, message: "Roles fetched successfully", roles, pagination });
});

exports.getRoleByIdController = asyncHandler(async (req, res) => {
  const role = await getRoleById(req.params.id);
  if (!role) throw new AppError("Role not found", 404);
  return res.status(200).json({ status: true, message: "Role fetched successfully", role });
});

exports.createRoleController = asyncHandler(async (req, res) => {
  const { name, slug, permissions, status = "active" } = req.body;
  if (!name || String(name).trim() === "") {
    throw new AppError("name is required", 400);
  }

  const cleanedPermissions = sanitizePermissions(permissions);
  const resolvedSlug = String(slug || name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const existing = await getRoleBySlug(resolvedSlug);
  if (existing) {
    throw new AppError("A role with this slug already exists", 409);
  }

  const role = await createRole({
    name,
    slug: resolvedSlug,
    permissions: cleanedPermissions,
    status,
    accountTypes: ACCOUNT_TYPES,
  });

  return res.status(201).json({ status: true, message: "Role created successfully", role });
});

exports.updateRoleController = asyncHandler(async (req, res) => {
  const role = await getRoleById(req.params.id);
  if (!role) throw new AppError("Role not found", 404);

  const { name, slug, permissions, status } = req.body;

  if (slug !== undefined && slug !== role.slug) {
    const existing = await getRoleBySlug(slug);
    if (existing && existing.id !== role.id) {
      throw new AppError("A role with this slug already exists", 409);
    }
  }

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (slug !== undefined) updates.slug = slug;
  if (permissions !== undefined) updates.permissions = sanitizePermissions(permissions);
  if (status !== undefined) updates.status = status;
  // accountTypes is intentionally never accepted here — every role always
  // targets every account type now.

  const updated = await updateRole(role.id, updates);
  return res.status(200).json({ status: true, message: "Role updated successfully", role: updated });
});

exports.deleteRoleController = asyncHandler(async (req, res) => {
  const role = await getRoleById(req.params.id);
  if (!role) throw new AppError("Role not found", 404);

  const usageCount = await countStaffAccountsByRoleId(role.id);
  if (usageCount > 0) {
    throw new AppError(
      `Cannot delete this role — it is assigned to ${usageCount} staff account(s). Reassign them first.`,
      409
    );
  }

  await deleteRole(role.id);
  return res.status(200).json({ status: true, message: "Role deleted successfully" });
});
