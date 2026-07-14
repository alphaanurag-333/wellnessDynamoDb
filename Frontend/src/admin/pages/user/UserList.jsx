import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useDispatch, useSelector } from "react-redux";
import { IoEyeSharp } from "react-icons/io5";
import { MdEditSquare } from "react-icons/md";
import { AiFillDelete } from "react-icons/ai";
import { adminDeleteUser, adminListUsers, adminUpdateUser, resolveUserId } from "../../api/adminUsers.js";
import { UserTableLoaderRow } from "./UserPageLoader.jsx";
import { logout } from "../../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { AdminListHeader, AdminStatusBadge, listCountSubtitle } from "../../components/AdminCrud.jsx";
import { UserTierBadge } from "../../../components/ReferralAssignmentShared.jsx";
import { useResourcePermissions } from "../../hooks/useHasPermission.js";

function formatJoined(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function csvEscape(value) {
  const raw = value == null ? "" : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export function UserList() {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const { canEdit, canDelete } = useResourcePermissions("users");
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [togglingUserId, setTogglingUserId] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, tierFilter, assignmentFilter]);

  const loadUsers = useCallback(async () => {
    if (!adminToken) return;
    setLoadError("");
    setLoading(true);
    try {
      const { users: rows, pagination: pg } = await adminListUsers(adminToken, {
        page,
        limit,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
        userTier: tierFilter || undefined,
        assignmentStatus: assignmentFilter || undefined,
      });
      setUsers(rows);
      setTotal(pg.total ?? 0);
      setPages(pg.pages ?? 1);
    } catch (e) {
      if (e?.status === 401) {
        dispatch(logout());
        return;
      }
      setLoadError(e.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [adminToken, debouncedSearch, dispatch, limit, page, statusFilter, tierFilter, assignmentFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    setDebouncedSearch(searchInput.trim());
    setPage(1);
  };

  const handleDelete = async (u) => {
    const { isConfirmed } = await Swal.fire({
      title: "Delete user?",
      html: `This will remove <strong>${u.name || u.email}</strong> permanently.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed || !adminToken) return;
    try {
      await adminDeleteUser(adminToken, resolveUserId(u));
      await Swal.fire({ icon: "success", title: "User deleted", timer: 1500 });
      loadUsers();
    } catch (e) {
      if (e?.status === 401) {
        dispatch(logout());
        return;
      }
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message || "Could not delete user." });
    }
  };

  const handleToggleStatus = async (u) => {
    if (!adminToken) return;
    const nextStatus = u.status === "active" ? "inactive" : "active";
    const uid = resolveUserId(u);
    setTogglingUserId(uid);
    try {
      await adminUpdateUser(adminToken, uid, { status: nextStatus });
      await Swal.fire({
        icon: "success",
        title: nextStatus === "active" ? "User activated" : "User deactivated",
        timer: 1500,
      });
      loadUsers();
    } catch (e) {
      if (e?.status === 401) {
        dispatch(logout());
        return;
      }
      await Swal.fire({ icon: "error", title: "Toggle failed", text: e.message || "Could not toggle user status." });
    } finally {
      setTogglingUserId("");
    }
  };

  const handleExportCsv = async () => {
    if (users.length === 0) {
      await Swal.fire({ icon: "info", title: "No data to export", text: "There are no users in the current list." });
      return;
    }

    const headers = ["Name", "Email", "Phone CC", "Phone", "Gender", "Status", "DOB", "Created At", "Updated At", "User ID"];
    const rows = users.map((u) => [
      u.name || "",
      u.email || "",
      u.phoneCountryCode || "",
      u.phone || "",
      u.gender || "",
      u.status || "",
      u.dob ? new Date(u.dob).toISOString().slice(0, 10) : "",
      u.createdAt || "",
      u.updatedAt || "",
      resolveUserId(u),
    ]);

    const csv = [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `users-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} users`, [page, pages, total]);

  return (
    <div className="page-card">
      <AdminListHeader
        title="User management"
        subtitle={listCountSubtitle(loading, total, "user", "users")}
        actions={
          <>
          <form className="user-list-filters" onSubmit={onSearchSubmit}>
            <div className="search-field">
              <span className="search-field__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <input
                type="search"
                placeholder="Search name, email, mobile.."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search users"
              />
            </div>
            <select
              className="user-list-status-select"
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              aria-label="Filter by tier"
            >
              <option value="">All tiers</option>
              <option value="seek">Seek (free)</option>
              <option value="heal">Heal (paid)</option>
            </select>
            <select
              className="user-list-status-select"
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value)}
              aria-label="Filter by assignment"
            >
              <option value="">All assignments</option>
              <option value="pending_admin">Pending admin</option>
              <option value="assigned">Assigned</option>
            </select>
            <select
              className="user-list-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
            </select>
          </form>
          <button type="button" className="btn btn--ghost" onClick={handleExportCsv}>
            Export CSV
          </button>
          {canEdit ? (
            <Link to="new" className="btn btn--accent">
              + Add user
            </Link>
          ) : null}
          </>
        }
      />

      {loadError ? (
        <p className="user-list-error" role="alert">
          {loadError}
        </p>
      ) : null}

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>S No.</th>
              <th>User Info</th>
              <th>Tier</th>
              <th>Mobile Number</th>
              <th>Country & State</th>
              <th>Created At</th>
              <th>Status</th>
              <th className="data-table__actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <UserTableLoaderRow colSpan={8} />
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <p className="table-placeholder">No users match your filters.</p>
                </td>
              </tr>
            ) : (
              users.map((u, idx) => {
                const uid = resolveUserId(u);
                const serialNo = (page - 1) * limit + idx + 1;
                const phcTitle =
                  u.primaryHealthConcern && typeof u.primaryHealthConcern === "object"
                    ? u.primaryHealthConcern.title
                    : null;
                return (
                  <tr key={uid}>
                    <td className="data-table__muted">{serialNo}</td>
                    <td>
                      <div className="user-cell">
                        <span className="user-cell__avatar" aria-hidden="true">
                          <AdminMediaImage path={u.profileImage} round width={40} height={40} alt="" />
                        </span>
                        <div>
                          <div className="user-cell__name">{u.name || "—"}</div>
                          <div className="user-cell__id data-table__mono">{u.email || "—"}</div>
                          {phcTitle ? <div className="user-cell__muted small">{phcTitle}</div> : null}
                        </div>
                      </div>
                    </td>
                    <td>
                      <UserTierBadge tier={u.userTier} assignmentStatus={u.assignmentStatus} />
                    </td>
                    <td>
                      <div className="user-cell__muted">{[u.phoneCountryCode, u.phone].filter(Boolean).join(" ") || "—"}</div>
                    </td>
                    <td>
                      <div className="user-cell__muted"> {u.state || "—"} ({u.country || "—"})</div>
                    </td>
                    <td className="data-table__muted">{formatJoined(u.createdAt)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {canEdit ? (
                          <button
                            type="button"
                            className={`settings-switch${u.status === "active" ? " settings-switch--on" : ""}`}
                            role="switch"
                            aria-checked={u.status === "active"}
                            aria-label={`Toggle status for ${u.name || u.email}`}
                            onClick={() => handleToggleStatus(u)}
                            disabled={togglingUserId === uid}
                            title={u.status === "active" ? "Deactivate user" : "Activate user"}
                          >
                            <span className="settings-switch__knob" aria-hidden />
                          </button>
                        ) : null}
                        <AdminStatusBadge status={u.status} />
                      </div>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link to={uid} className="icon-btn icon-btn--view" title="View">
                          <IoEyeSharp size={18} />
                        </Link>
                        {canEdit ? (
                          <Link to={`${uid}/edit`} className="icon-btn icon-btn--edit" title="Edit">
                            <MdEditSquare size={18} />
                          </Link>
                        ) : null}
                        {canDelete ? (
                          <button type="button" className="icon-btn icon-btn--delete" title="Delete" onClick={() => handleDelete(u)}>
                            <AiFillDelete size={18} />
                          </button>
                        ) : null}
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
      ) : (
       null
      )}
    </div>
  );
}
