import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminCreateRole, adminGetPermissionCatalog, adminUpdateRole } from "../../api/roleApi.js";
import { logout } from "../../../store/authSlice.js";
import { selectIsSuperAdmin } from "../../../store/authSelectors.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { PermissionCheckboxTree } from "../../components/PermissionCheckboxTree.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { NAME_MAX_LEN, emptyForm, getRoleId, getRoleScope, validateRoleForm } from "./RoleShared.js";
import { getCoachPermissionCheckboxGroups } from "../../../wellnessCoach/data/coachPermissionKeys.js";

function isCoachShapedCatalog(groups) {
  if (!Array.isArray(groups) || groups.length === 0) return false;
  const first = groups[0];
  return first?.id === "nav" || String(first?.label || "").toLowerCase().includes("sidebar");
}

export function RoleForm({ mode = "create", initialRole = null, defaultScope = "ADMIN" }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const roleScope = isEditMode && initialRole ? getRoleScope(initialRole) : defaultScope === "COACH" ? "COACH" : "ADMIN";

  const [saving, setSaving] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState(() => {
    if (!initialRole) return emptyForm(defaultScope);
    return {
      name: initialRole.name || "",
      permissions: Array.isArray(initialRole.permissions) ? initialRole.permissions : [],
      status: initialRole.status || "active",
      scope: getRoleScope(initialRole),
    };
  });
  const editId = isEditMode && initialRole ? getRoleId(initialRole) : "";

  useEffect(() => {
    if (!adminToken) return;
    (async () => {
      setCatalogLoading(true);
      try {
        // Coach catalog is also built locally — avoids showing the admin tree when
        // the API is stale or ignores ?scope=COACH.
        if (roleScope === "COACH") {
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
            scope: roleScope,
            permissions: (prev.permissions || []).filter((slug) => known.has(slug)),
          }));
          return;
        }

        const catalog = await adminGetPermissionCatalog(adminToken, { scope: roleScope });
        const nextGroups = catalog?.groups || [];
        setGroups(nextGroups);

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
          scope: roleScope,
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
  }, [adminToken, dispatch, roleScope]);

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
          scope: roleScope,
          // Ensure coach roles get a namespaced slug so they never collide with admin role slugs.
          slug:
            roleScope === "COACH"
              ? `coach-${String(form.name || "").trim()}`
              : form.slug || undefined,
        });
        await Swal.fire({ icon: "success", title: "Role created", timer: 1500 });
      }
      navigate(`/admin/roles?scope=${encodeURIComponent(roleScope)}`);
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save role." });
    } finally {
      setSaving(false);
    }
  };

  const scopeLabel = roleScope === "COACH" ? "Wellness Coach" : "Admin / Sub-admin";

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
          <input className="user-field__input" value={scopeLabel} disabled readOnly />
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
          <span className="user-field__label">
            {roleScope === "COACH"
              ? "Permissions (Sidebar + Client profile tabs)"
              : "Permissions"}
          </span>
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
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => navigate(`/admin/roles?scope=${encodeURIComponent(roleScope)}`)}
        >
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
  const [searchParams] = useSearchParams();
  const defaultScope = String(searchParams.get("scope") || "ADMIN").toUpperCase() === "COACH" ? "COACH" : "ADMIN";

  if (!isSuperAdmin) return <NotFoundPage />;

  return (
    <div className="user-page">
      <AdminPageHeader
        title={defaultScope === "COACH" ? "Add coach role" : "Add role"}
        subtitle={
          defaultScope === "COACH"
            ? "Create a coach role covering sidebar items and client-profile tabs."
            : "Create a role and choose which pages/actions it can access."
        }
        backTo={`/admin/roles?scope=${encodeURIComponent(defaultScope)}`}
      />
      <div className="page-card">
        <RoleForm mode="create" defaultScope={defaultScope} />
      </div>
    </div>
  );
}
