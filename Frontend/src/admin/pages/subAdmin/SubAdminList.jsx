import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTableLoaderRow } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MdEditSquare } from "react-icons/md";
import { AiFillDelete } from "react-icons/ai";
import {
  adminDeleteSubAdmin,
  adminListSubAdmins,
  adminUpdateSubAdminStatus,
} from "../../api/subAdminApi.js";
import { adminListRoles } from "../../api/roleApi.js";
import { logout } from "../../../store/authSlice.js";
import { selectIsSuperAdmin } from "../../../store/authSelectors.js";
import { useDebouncedSearch } from "../../../hooks/useDebouncedSearch.js";
import { AdminListHeader, AdminStatusBadge, listCountSubtitle } from "../../components/AdminCrud.jsx";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { LIST_LIMIT, LIST_LIMIT_OPTIONS, LIST_SEARCH_MAX_LEN, getSubAdminId } from "./SubAdminShared.js";

export function SubAdminList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const [rows, setRows] = useState([]);
  const [roleMap, setRoleMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(LIST_LIMIT);
  const { searchInput: listSearch, debouncedSearch, onSearchChange, setSearchInput } = useDebouncedSearch("", {
    maxLength: LIST_SEARCH_MAX_LEN,
  });
  const [listStatus, setListStatus] = useState("");

  const loadRoles = useCallback(async () => {
    if (!adminToken) return;
    try {
      const { roles } = await adminListRoles(adminToken, { limit: 200, scope: "ADMIN" });
      const map = {};
      for (const role of roles) map[role.id] = role.name;
      setRoleMap(map);
    } catch {
      // Role names are a display nicety — ignore failures here.
    }
  }, [adminToken]);

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const { admins, pagination } = await adminListSubAdmins(adminToken, {
        page,
        limit,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(listStatus ? { status: listStatus } : {}),
      });
      setRows(admins);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      if (e?.status === 403) return;
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load sub-admins." });
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch, debouncedSearch, listStatus, page, limit]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, listStatus, limit]);

  if (!isSuperAdmin) {
    return <NotFoundPage />;
  }

  const onDelete = async (row) => {
    const id = getSubAdminId(row);
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete sub-admin?",
      text: `This will permanently delete "${row.name}".`,
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !adminToken || !id) return;
    try {
      await adminDeleteSubAdmin(adminToken, id);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message || "Could not delete." });
    }
  };

  const onToggleStatus = async (row) => {
    const id = getSubAdminId(row);
    if (!adminToken || !id) return;
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setTogglingId(id);
    try {
      await adminUpdateSubAdminStatus(adminToken, id, nextStatus);
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Status update failed", text: e.message || "Could not update status." });
    } finally {
      setTogglingId("");
    }
  };

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} sub-admins`, [page, pages, total]);
  const subtitle = listCountSubtitle(loading, total, "sub-admin", "sub-admins");
  const hasFilters = Boolean(listSearch.trim() || listStatus);

  const clearFilters = () => {
    setSearchInput("");
    setListStatus("");
  };

  return (
    <div className="user-page">
      <div className="page-card">
        <AdminListHeader
          title="Sub-Admins"
          subtitle={subtitle}
          actions={
            <button type="button" className="btn btn--primary" onClick={() => navigate("/admin/sub-admins/new")}>
              Add sub-admin
            </button>
          }
        />
        <div className="admin-crud-filters">
          <label className="user-field admin-crud-filters__search">
            <span className="user-field__label">Search</span>
            <input
              className="user-field__input"
              value={listSearch}
              maxLength={LIST_SEARCH_MAX_LEN}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Name or email…"
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
          {/* <label className="user-field admin-crud-filters__select">
            <span className="user-field__label">Limit</span>
            <select
              className="user-field__input"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || LIST_LIMIT)}
            >
              {LIST_LIMIT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label> */}
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
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableLoaderRow colSpan={6} label="Loading sub-admins..." />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>No sub-admins found.</td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const id = getSubAdminId(row);
                  return (
                    <tr key={id || idx}>
                      <td className="data-table__muted">{(page - 1) * limit + idx + 1}</td>
                      <td>
                        <div className="user-cell">
                          <span className="user-cell__avatar">
                            <AdminMediaImage path={row.profileImage} round width={40} height={40} alt="" />
                          </span>
                          <div>
                            <div className="user-cell__name">{row.name || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td>{row.email}</td>
                      <td>{roleMap[row.roleId] || "—"}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <button
                            type="button"
                            className={`settings-switch${row.status === "active" ? " settings-switch--on" : ""}`}
                            role="switch"
                            aria-checked={row.status === "active"}
                            aria-label={`Toggle status for ${row.name || "sub-admin"}`}
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
                            onClick={() => navigate(`/admin/sub-admins/${id}/edit`)}
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
        {pages > 1 || total > 0 ? (
          <div className="user-list-pagination">
            <span className="user-list-pagination__info">{pageInfo}</span>
            {pages > 1 ? (
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
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
