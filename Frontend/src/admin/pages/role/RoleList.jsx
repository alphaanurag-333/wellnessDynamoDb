import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTableLoaderRow } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { MdEditSquare } from "react-icons/md";
import { AiFillDelete } from "react-icons/ai";
import { adminDeleteRole, adminListRoles, adminUpdateRole } from "../../api/roleApi.js";
import { logout } from "../../../store/authSlice.js";
import { selectIsSuperAdmin } from "../../../store/authSelectors.js";
import { useDebouncedSearch } from "../../../hooks/useDebouncedSearch.js";
import { AdminListHeader, AdminStatusBadge, listCountSubtitle } from "../../components/AdminCrud.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { LIST_LIMIT, LIST_SEARCH_MAX_LEN, ROLE_SCOPES, getRoleId, getRoleScope } from "./RoleShared.js";

export function RoleList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const listScope = String(searchParams.get("scope") || "ADMIN").toUpperCase() === "COACH" ? "COACH" : "ADMIN";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { searchInput: listSearch, debouncedSearch, onSearchChange, setSearchInput } = useDebouncedSearch("", {
    maxLength: LIST_SEARCH_MAX_LEN,
  });
  const [listStatus, setListStatus] = useState("");

  const setListScope = (scope) => {
    const next = new URLSearchParams(searchParams);
    next.set("scope", scope);
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const { roles, pagination } = await adminListRoles(adminToken, {
        page,
        limit: LIST_LIMIT,
        scope: listScope,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(listStatus ? { status: listStatus } : {}),
      });
      setRows(roles);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      if (e?.status === 403) return;
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load roles." });
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch, debouncedSearch, listStatus, page, listScope]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, listStatus, listScope]);

  if (!isSuperAdmin) {
    return <NotFoundPage />;
  }

  const onDelete = async (row) => {
    const id = getRoleId(row);
    const assignee = getRoleScope(row) === "COACH" ? "coaches" : "sub-admins";
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete role?",
      text: `This will delete "${row.name}". Any ${assignee} assigned to this role must be reassigned first.`,
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !adminToken || !id) return;
    try {
      await adminDeleteRole(adminToken, id);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message || "Could not delete role." });
    }
  };

  const onToggleStatus = async (row) => {
    const id = getRoleId(row);
    if (!adminToken || !id) return;
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setTogglingId(id);
    try {
      await adminUpdateRole(adminToken, id, { status: nextStatus });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Status update failed", text: e.message || "Could not update status." });
    } finally {
      setTogglingId("");
    }
  };

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} roles`, [page, pages, total]);
  const subtitle = listCountSubtitle(loading, total, "role", "roles");
  const hasFilters = Boolean(listSearch.trim() || listStatus);

  const clearFilters = () => {
    setSearchInput("");
    setListStatus("");
  };

  return (
    <div className="user-page">
      <div className="page-card">
        <AdminListHeader
          title="Roles & Permissions"
          subtitle={subtitle}
          actions={
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => navigate(`/admin/roles/new?scope=${encodeURIComponent(listScope)}`)}
            >
              Add role
            </button>
          }
        />
        <div className="role-scope-tabs" role="tablist" aria-label="Role scope">
          {ROLE_SCOPES.map((opt) => {
            const active = listScope === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={active}
                className={`role-scope-tabs__btn${active ? " role-scope-tabs__btn--active" : ""}`}
                onClick={() => setListScope(opt.value)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div className="admin-crud-filters">
          <label className="user-field admin-crud-filters__search">
            <span className="user-field__label">Search</span>
            <input
              className="user-field__input"
              value={listSearch}
              maxLength={LIST_SEARCH_MAX_LEN}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Role name…"
            />
          </label>
          <label className="user-field admin-crud-filters__select">
            <span className="user-field__label">Status</span>
            <select className="user-field__input" value={listStatus} onChange={(e) => setListStatus(e.target.value)}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          {hasFilters ? (
            <button type="button" className="btn btn--ghost" onClick={clearFilters}>
              Clear filters
            </button>
          ) : null}
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>S No.</th>
                <th>Name</th>
                <th>Scope</th>
                <th>Permissions</th>
                <th>Status</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableLoaderRow colSpan={6} label="Loading roles..." />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>No roles found.</td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const id = getRoleId(row);
                  return (
                    <tr key={id || idx}>
                      <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                      <td>{row.name}</td>
                      <td>{getRoleScope(row)}</td>
                      <td>{Array.isArray(row.permissions) ? row.permissions.length : 0} permissions</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <button
                            type="button"
                            className={`settings-switch${row.status === "active" ? " settings-switch--on" : ""}`}
                            role="switch"
                            aria-checked={row.status === "active"}
                            aria-label={`Toggle status for ${row.name || "role"}`}
                            onClick={() => onToggleStatus(row)}
                            disabled={togglingId === id}
                            title={row.status === "active" ? "Deactivate" : "Activate"}
                          >
                            <span className="settings-switch__knob" aria-hidden />
                          </button>
                          <AdminStatusBadge status={row.status} />
                        </div>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn icon-btn--edit"
                            title="Edit"
                            onClick={() => navigate(`/admin/roles/${id}/edit`)}
                          >
                            <MdEditSquare size={18} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn icon-btn--delete"
                            title="Delete"
                            onClick={() => onDelete(row)}
                          >
                            <AiFillDelete size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {pages > 1 ? (
          <div className="user-list-pagination">
            <span className="user-list-pagination__info">{pageInfo}</span>
            <div className="user-list-pagination__btns">
              <button
                type="button"
                className="btn btn--ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
