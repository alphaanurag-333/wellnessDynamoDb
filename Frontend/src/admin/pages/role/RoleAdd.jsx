import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateRole, adminGetPermissionCatalog, adminUpdateRole } from "../../api/roleApi.js";
import { logout } from "../../../store/authSlice.js";
import { selectIsSuperAdmin } from "../../../store/authSelectors.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { PermissionCheckboxTree } from "../../components/PermissionCheckboxTree.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { NAME_MAX_LEN, emptyForm, getRoleId, validateRoleForm } from "./RoleShared.js";

export function RoleForm({ mode = "create", initialRole = null }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [saving, setSaving] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState(() => {
    if (!initialRole) return emptyForm();
    return {
      name: initialRole.name || "",
      permissions: Array.isArray(initialRole.permissions) ? initialRole.permissions : [],
      status: initialRole.status || "active",
    };
  });
  const editId = isEditMode && initialRole ? getRoleId(initialRole) : "";

  useEffect(() => {
    if (!adminToken) return;
    (async () => {
      setCatalogLoading(true);
      try {
        const catalog = await adminGetPermissionCatalog(adminToken);
        const nextGroups = catalog?.groups || [];
        setGroups(nextGroups);

        // Drop obsolete slugs still stored on older roles (e.g. programs.view).
        const known = new Set();
        for (const group of nextGroups) {
          for (const item of group.items || []) {
            for (const perm of item.permissions || []) {
              if (perm?.slug) known.add(perm.slug);
            }
          }
        }
        setForm((prev) => ({
          ...prev,
          permissions: (prev.permissions || []).filter((slug) => known.has(slug)),
        }));
      } catch (e) {
        if (e?.status === 401) return dispatch(logout());
        await Swal.fire({
          icon: "error",
          title: "Load failed",
          text: e.message || "Failed to load the permission catalog.",
        });
      } finally {
        setCatalogLoading(false);
      }
    })();
  }, [adminToken, dispatch]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const validationError = validateRoleForm(form);
    if (validationError) {
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError });
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await adminUpdateRole(adminToken, editId, form);
        await Swal.fire({ icon: "success", title: "Role updated", timer: 1500 });
      } else {
        await adminCreateRole(adminToken, form);
        await Swal.fire({ icon: "success", title: "Role created", timer: 1500 });
      }
      navigate("/admin/roles");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save role." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="row g-3">
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">
            Role name <span className="required-dot">*</span>
          </span>
          <input
            className="user-field__input"
            value={form.name}
            maxLength={NAME_MAX_LEN}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
        </label>
        <label className="user-field col-12 col-md-6">
          <span className="user-field__label">Status</span>
          <select
            className="user-field__input"
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <div className="col-12">
          <span className="user-field__label">Permissions</span>
          {catalogLoading ? (
            <AdminPageLoader label="Loading permission catalog..." />
          ) : (
            <PermissionCheckboxTree
              groups={groups}
              selectedPermissions={form.permissions}
              onChange={(permissions) => setForm((p) => ({ ...p, permissions }))}
            />
          )}
        </div>
      </div>
      <div className="user-form__actions">
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/roles")}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? "Saving…" : editId ? "Update role" : "Create role"}
        </button>
      </div>
    </form>
  );
}

export function RoleAdd() {
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  if (!isSuperAdmin) return <NotFoundPage />;

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Add role"
        subtitle="Create a role and choose which pages/actions it can access."
        backTo="/admin/roles"
      />
      <div className="page-card">
        <RoleForm mode="create" />
      </div>
    </div>
  );
}
