import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { IoEyeSharp } from "react-icons/io5";
import { MdEditSquare } from "react-icons/md";
import { AiFillDelete } from "react-icons/ai";
import {
  adminDeleteWellnessCoach,
  adminListWellnessCoaches,
  adminUpdateWellnessCoach,
  resolveCoachId,
} from "../../api/adminWellnessCoaches.js";
import { logout } from "../../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { LIST_LIMIT, formatDate, formatPhone } from "./WellnessCoachShared.js";
import { WellnessCoachTableLoaderRow } from "./WellnessCoachPageLoader.jsx";

export function WellnessCoachList() {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [togglingId, setTogglingId] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoadError("");
    setLoading(true);
    try {
      const { wellnessCoaches, pagination } = await adminListWellnessCoaches(adminToken, {
        page,
        limit: LIST_LIMIT,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
      });
      setRows(wellnessCoaches);
      setTotal(pagination.total ?? 0);
      setPages(pagination.pages ?? 1);
    } catch (e) {
      if (e?.status === 401) {
        dispatch(logout());
        return;
      }
      setLoadError(e.message || "Failed to load wellness coaches.");
    } finally {
      setLoading(false);
    }
  }, [adminToken, debouncedSearch, dispatch, page, statusFilter]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const handleDelete = async (row) => {
    const id = resolveCoachId(row);
    const { isConfirmed } = await Swal.fire({
      title: "Delete wellness coach?",
      html: `Remove <strong>${row.name || row.email}</strong>? Assistants must be removed first.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed || !adminToken) return;
    try {
      await adminDeleteWellnessCoach(adminToken, id);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1500 });
      loadRows();
    } catch (e) {
      if (e?.status === 401) {
        dispatch(logout());
        return;
      }
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message || "Could not delete." });
    }
  };

  const handleToggleStatus = async (row) => {
    if (!adminToken) return;
    const id = resolveCoachId(row);
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setTogglingId(id);
    try {
      await adminUpdateWellnessCoach(adminToken, id, { status: nextStatus });
      await Swal.fire({ icon: "success", title: "Status updated", timer: 1200 });
      loadRows();
    } catch (e) {
      if (e?.status === 401) {
        dispatch(logout());
        return;
      }
      await Swal.fire({ icon: "error", title: "Update failed", text: e.message });
    } finally {
      setTogglingId("");
    }
  };

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} coaches`, [page, pages, total]);

  return (
    <div className="page-card">
      <div className="page-card__head">
        <div>
          <h2 className="page-card__title">Wellness coaches</h2>
        </div>
        <div className="page-card__actions user-list-toolbar">
          <form
            className="user-list-filters"
            onSubmit={(e) => {
              e.preventDefault();
              setDebouncedSearch(searchInput.trim());
              setPage(1);
            }}
          >
            <div className="search-field">
              <input
                type="search"
                placeholder="Search name, email, phone…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search coaches"
              />
            </div>
            <select
              className="user-list-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </form>
          <Link to="new" className="btn btn--accent">
            + Add coach
          </Link>
        </div>
      </div>

      {loadError ? (
        <p className="user-list-error" role="alert">
          {loadError}
        </p>
      ) : null}

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Coach</th>
              <th>Mobile</th>
              <th>Location</th>
              <th>Created</th>
              <th>Status</th>
              <th className="data-table__actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <WellnessCoachTableLoaderRow colSpan={7} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <p className="table-placeholder">No wellness coaches found.</p>
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const id = resolveCoachId(row);
                return (
                  <tr key={id}>
                    <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                    <td>
                      <div className="user-cell">
                        <span className="user-cell__avatar">
                          <AdminMediaImage path={row.profileImage} round width={40} height={40} alt="" />
                        </span>
                        <div>
                          <div className="user-cell__name">{row.name || "—"}</div>
                          <div className="user-cell__id data-table__mono">{row.email || "—"}</div>
                          {row.specializationTitle ? (
                            <div className="user-cell__muted small">{row.specializationTitle}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="data-table__muted">{formatPhone(row)}</td>
                    <td className="data-table__muted">
                      {[row.city, row.state, row.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="data-table__muted">{formatDate(row.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className={`settings-switch${row.status === "active" ? " settings-switch--on" : ""}`}
                        role="switch"
                        aria-checked={row.status === "active"}
                        aria-label={`Toggle status for ${row.name || row.email}`}
                        onClick={() => handleToggleStatus(row)}
                        disabled={togglingId === id}
                        title={row.status === "active" ? "Deactivate coach" : "Activate coach"}
                      >
                        <span className="settings-switch__knob" aria-hidden />
                      </button>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link to={id} className="icon-btn icon-btn--view" title="View">
                          <IoEyeSharp size={18} />
                        </Link>
                        <Link to={`${id}/edit`} className="icon-btn icon-btn--edit" title="Edit">
                          <MdEditSquare size={18} />
                        </Link>
                        <button
                          type="button"
                          className="icon-btn icon-btn--delete"
                          title="Delete"
                          onClick={() => handleDelete(row)}
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
  );
}
