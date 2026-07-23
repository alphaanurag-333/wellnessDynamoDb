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
import { getCoachPermissionCheckboxGroups } from "../../../wellnessCoach/data/coachPermissionKeys.js";

function isCoachShapedCatalog(groups) {
  if (!Array.isArray(groups) || groups.length === 0) return false;
  const first = groups[0];
  return first?.id === "nav" || String(first?.label || "").toLowerCase().includes("sidebar");
}

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
      scope: "COACH",
    };
  });
  const editId = isEditMode && initialRole ? getRoleId(initialRole) : "";

  useEffect(() => {
    if (!adminToken) return;
    (async () => {
      setCatalogLoading(true);
      try {
        let nextGroups = getCoachPermissionCheckboxGroups();
        try {
          const catalog = await adminGetPermissionCatalog(adminToken, { scope: "COACH" });
          if (isCoachShapedCatalog(catalog?.groups)) {
            nextGroups = catalog.groups;
          }
        } catch {
          /* keep local coach catalog */
        }
        setGroups(nextGroups);
        const known = new Set(
          nextGroups.flatMap((group) =>
            (group.items || []).flatMap((item) =>
              (item.permissions || []).map((perm) => perm?.slug).filter(Boolean)
            )
          )
        );
        setForm((prev) => ({
          ...prev,
          scope: "COACH",
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
        await adminUpdateRole(adminToken, editId, {
          name: form.name,
          permissions: form.permissions,
          status: form.status,
        });
        await Swal.fire({ icon: "success", title: "Role updated", timer: 1500 });
      } else {
        await adminCreateRole(adminToken, {
          ...form,
          scope: "COACH",
          slug: `coach-${String(form.name || "").trim()}`,
        });
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
          <span className="user-field__label">Scope</span>
          <input className="user-field__input" value="Wellness Coach" disabled readOnly />
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
          <span className="user-field__label">Permissions (Sidebar + Client profile tabs)</span>
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
        title="Add coach role"
        subtitle="Create a coach role covering sidebar items and client-profile tabs."
        backTo="/admin/roles"
      />
      <div className="page-card">
        <RoleForm mode="create" />
      </div>
    </div>
  );
}

