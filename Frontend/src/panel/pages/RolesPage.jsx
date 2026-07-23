import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { AdminListHeader, AdminPageHeader, AdminStatusBadge, listCountSubtitle } from "../../admin/components/AdminCrud.jsx";
import { fetchStaffPermissionCatalog } from "../api/staffPermissions.js";
import {
  createStaffRole,
  deleteStaffRole,
  fetchStaffRoles,
  updateStaffRole,
} from "../api/staffRoles.js";
import { selectStaffToken } from "../../store/staffAuthSelectors.js";

const ACTION_LABELS = { view: "View", edit: "Edit", delete: "Delete" };

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const EMPTY_FORM = { id: null, name: "", slug: "", status: "active", permissions: [] };

export function RolesPage() {
  const token = useSelector(selectStaffToken);
  const [view, setView] = useState("list");
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [catalogGroups, setCatalogGroups] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchStaffRoles(token, { search: search || undefined, limit: 200 });
      setRoles(data?.roles || []);
    } catch (err) {
      await Swal.fire({ icon: "error", title: "Could not load roles", text: err.message });
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const data = await fetchStaffPermissionCatalog(token);
      setCatalogGroups(data?.groups || []);
    } catch (err) {
      await Swal.fire({ icon: "error", title: "Could not load permission catalog", text: err.message });
    } finally {
      setCatalogLoading(false);
    }
  }, [token]);

  const openCreate = async () => {
    setForm(EMPTY_FORM);
    setSlugTouched(false);
    setView("form");
    if (catalogGroups.length === 0) await loadCatalog();
  };

  const openEdit = async (role) => {
    setForm({
      id: role.id,
      name: role.name,
      slug: role.slug,
      status: role.status,
      permissions: role.permissions || [],
    });
    setSlugTouched(true);
    setView("form");
    if (catalogGroups.length === 0) await loadCatalog();
  };

  const backToList = () => setView("list");

  const permissionSet = useMemo(() => new Set(form.permissions), [form.permissions]);

  const togglePermission = (slug) => {
    setForm((prev) => {
      const set = new Set(prev.permissions);
      if (set.has(slug)) set.delete(slug);
      else set.add(slug);
      return { ...prev, permissions: Array.from(set) };
    });
  };

  const toggleGroupAll = (group, checked) => {
    const groupSlugs = group.items.flatMap((item) => item.permissions.map((p) => p.slug));
    setForm((prev) => {
      const set = new Set(prev.permissions);
      groupSlugs.forEach((slug) => (checked ? set.add(slug) : set.delete(slug)));
      return { ...prev, permissions: Array.from(set) };
    });
  };

  const handleNameChange = (value) => {
    setForm((prev) => ({ ...prev, name: value, slug: slugTouched ? prev.slug : slugify(value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (form.id) {
        await updateStaffRole(token, form.id, {
          name: form.name,
          slug: form.slug,
          status: form.status,
          permissions: form.permissions,
        });
      } else {
        await createStaffRole(token, {
          name: form.name,
          slug: form.slug,
          status: form.status,
          permissions: form.permissions,
        });
      }
      await Swal.fire({ icon: "success", title: form.id ? "Role updated" : "Role created", timer: 1400 });
      setView("list");
      loadRoles();
    } catch (err) {
      await Swal.fire({ icon: "error", title: "Could not save role", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: `Delete role "${role.name}"?`,
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed) return;
    try {
      await deleteStaffRole(token, role.id);
      loadRoles();
    } catch (err) {
      await Swal.fire({ icon: "error", title: "Could not delete role", text: err.message });
    }
  };

  if (view === "form") {
    return (
      <div className="user-page">
        <AdminPageHeader
          title={form.id ? "Edit role" : "New role"}
          subtitle="Assignable to any staff account (Admin, Wellness Coach, Assistant Wellness Coach, or a custom Staff role) — grant view/edit/delete access per module."
          onBack={backToList}
        />
        <div className="page-card">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <label className="user-field col-12 col-md-6">
                <span className="user-field__label">
                  Role name <span className="required-dot">*</span>
                </span>
                <input
                  className="user-field__input"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </label>
              <label className="user-field col-12 col-md-6">
                <span className="user-field__label">
                  Slug <span className="required-dot">*</span>
                </span>
                <input
                  className="user-field__input"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }));
                  }}
                  required
                />
              </label>

              <label className="user-field col-12 col-md-6">
                <span className="user-field__label">Status</span>
                <select
                  className="user-field__input"
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <h3 style={{ fontSize: 15, margin: "22px 0 10px" }}>Permissions</h3>
            {catalogLoading ? (
              <p className="user-page__subtitle">Loading permission catalog…</p>
            ) : (
              <div className="table-scroll" style={{ maxHeight: 420 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, border: "1px solid var(--admin-border-soft)", borderRadius: "var(--admin-radius)", padding: 14 }}>
                  {catalogGroups.map((group) => {
                    const groupSlugs = group.items.flatMap((item) => item.permissions.map((p) => p.slug));
                    const allChecked = groupSlugs.length > 0 && groupSlugs.every((slug) => permissionSet.has(slug));
                    return (
                      <div key={group.id} style={{ borderBottom: "1px solid var(--admin-border-soft)", paddingBottom: 10 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, marginBottom: 6 }}>
                          <input type="checkbox" checked={allChecked} onChange={(e) => toggleGroupAll(group, e.target.checked)} />
                          {group.label}
                        </label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 24 }}>
                          {group.items.map((item) => (
                            <div key={item.to} style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                              <span style={{ minWidth: 200, fontSize: 13, color: "var(--admin-muted)" }}>{item.label}</span>
                              {item.permissions.map((p) => (
                                <label key={p.slug} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 400 }}>
                                  <input
                                    type="checkbox"
                                    checked={permissionSet.has(p.slug)}
                                    onChange={() => togglePermission(p.slug)}
                                  />
                                  {ACTION_LABELS[p.action] || p.action}
                                </label>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="user-form__actions">
              <button type="button" className="btn btn--ghost" onClick={backToList}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? "Saving…" : "Save role"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="user-page">
      <div className="page-card">
        <AdminListHeader
          title="Roles & Permissions"
          subtitle={listCountSubtitle(loading, roles.length, "role", "roles")}
          actions={
            <button type="button" className="btn btn--primary" onClick={openCreate}>
              + New role
            </button>
          }
        />
        <div className="admin-crud-filters">
          <label className="user-field admin-crud-filters__search">
            <span className="user-field__label">Search</span>
            <input
              className="user-field__input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Role name or slug…"
            />
          </label>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Permissions</th>
                <th>Status</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4}>Loading…</td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="data-table__muted">
                    No roles yet.
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.id}>
                    <td>
                      <strong>{role.name}</strong>
                      <div className="data-table__muted">{role.slug}</div>
                    </td>
                    <td className="data-table__muted">{(role.permissions || []).length}</td>
                    <td>
                      <AdminStatusBadge status={role.status} />
                    </td>
                    <td className="data-table__actions-col">
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(role)}>
                          Edit
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm" style={{ color: "#b91c1c" }} onClick={() => handleDelete(role)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
