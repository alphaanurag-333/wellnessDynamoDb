import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTableLoaderRow } from "../../components/AdminLoader.jsx";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MdEditSquare } from "react-icons/md";
import { AiFillDelete, AiOutlineEye } from "react-icons/ai";
import {
  adminDeleteLeadershipNote,
  adminListLeadershipNotes,
  adminUpdateLeadershipNote,
} from "../../api/leadershipNotesController.js";
import { AdminListHeader, AdminStatusBadge, listCountSubtitle, TableCellText } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import { useDebouncedSearch } from "../../../hooks/useDebouncedSearch.js";
import { useResourcePermissions } from "../../hooks/useHasPermission.js";
import { mediaUrl } from "../../../media.js";
import {
  LIST_LIMIT,
  MESSAGE_PREVIEW_LEN,
  SEARCH_MAX_LEN,
  sanitizeSingleLine,
} from "./LeadershipNoteShared.js";

export function LeadershipNoteList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const { canEdit, canDelete } = useResourcePermissions("leadership-notes");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState("");
  const { searchInput: listSearch, debouncedSearch, onSearchChange, setSearchInput } = useDebouncedSearch("", {
    maxLength: SEARCH_MAX_LEN,
  });
  const [listStatus, setListStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const { leadershipNotes, pagination } = await adminListLeadershipNotes(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(listStatus ? { status: listStatus } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      setRows(leadershipNotes);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load leadership notes." });
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch, debouncedSearch, listStatus, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, listStatus]);

  const onDelete = async (row) => {
    const id = row._id || row.id;
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete leadership note?",
      text: "This action cannot be undone.",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !adminToken) return;
    try {
      await adminDeleteLeadershipNote(adminToken, id);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message || "Could not delete." });
    }
  };

  const onToggleStatus = async (row) => {
    if (!adminToken) return;
    const id = row._id || row.id;
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setTogglingId(id);
    try {
      await adminUpdateLeadershipNote(adminToken, id, { status: nextStatus });
      await Swal.fire({ icon: "success", title: "Status updated", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Status update failed", text: e.message || "Could not update status." });
    } finally {
      setTogglingId("");
    }
  };

  const onToggleVisibility = async (row, field) => {
    if (!adminToken || (field !== "webVisible" && field !== "appVisible")) return;
    const id = row._id || row.id;
    const next = !(row[field] !== false);
    setTogglingId(`${id}:${field}`);
    try {
      await adminUpdateLeadershipNote(adminToken, id, { [field]: next });
      setRows((prev) =>
        prev.map((r) => ((r._id || r.id) === id ? { ...r, [field]: next } : r))
      );
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({
        icon: "error",
        title: "Update failed",
        text: e.message || "Could not update visibility.",
      });
    } finally {
      setTogglingId("");
    }
  };

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} notes`, [page, pages, total]);
  const subtitle = listCountSubtitle(loading, total, "leadership note", "leadership notes");
  const hasFilters = Boolean(listSearch.trim() || listStatus);

  const clearFilters = () => {
    setSearchInput("");
    setListStatus("");
  };

  return (
    <div className="user-page">
      <div className="page-card">
        <AdminListHeader
          title="Leadership notes"
          subtitle={subtitle}
          actions={
            canEdit ? (
              <button type="button" className="btn btn--primary" onClick={() => navigate("/admin/leadership-notes/new")}>
                Add leadership note
              </button>
            ) : null
          }
        />
        <div className="admin-crud-filters">
          <label className="user-field admin-crud-filters__search">
            <span className="user-field__label">Search</span>
            <input
              className="user-field__input"
              value={listSearch}
              maxLength={SEARCH_MAX_LEN}
              onChange={(e) => onSearchChange(sanitizeSingleLine(e.target.value, SEARCH_MAX_LEN))}
              placeholder="Name, designation, or message..."
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
                <th>Profile</th>
                <th>Name</th>
                <th>Designation</th>
                <th>Message</th>
                <th>Status</th>
                <th>Web</th>
                <th>App</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableLoaderRow colSpan={9} label="Loading leadership notes..." />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9}>No leadership notes found.</td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const id = row._id || row.id;
                  const webOn = row.webVisible !== false;
                  const appOn = row.appVisible !== false;
                  return (
                    <tr key={id}>
                      <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                      <td>
                        <AdminMediaImage
                          path={row.profileImage}
                          src={row.profileImage ? mediaUrl(row.profileImage) : undefined}
                          round
                          width={48}
                          height={48}
                          alt={row.name || "Profile"}
                        />
                      </td>
                      <td>
                        <TableCellText value={row.name} />
                      </td>
                      <td className="data-table__muted">
                        <TableCellText value={row.designation} />
                      </td>
                      <td className="data-table__muted" title={row.message || ""}>
                        <TableCellText value={row.message} max={MESSAGE_PREVIEW_LEN} />
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {canEdit ? (
                            <button
                              type="button"
                              className={`settings-switch${row.status === "active" ? " settings-switch--on" : ""}`}
                              role="switch"
                              aria-checked={row.status === "active"}
                              aria-label={`Toggle status for leadership note ${idx + 1}`}
                              onClick={() => onToggleStatus(row)}
                              disabled={togglingId === id}
                            >
                              <span className="settings-switch__knob" aria-hidden />
                            </button>
                          ) : null}
                          <AdminStatusBadge status={row.status} />
                        </div>
                      </td>
                      <td>
                        {canEdit ? (
                          <button
                            type="button"
                            className={`settings-switch${webOn ? " settings-switch--on" : ""}`}
                            role="switch"
                            aria-checked={webOn}
                            aria-label={`Toggle web visibility for leadership note ${idx + 1}`}
                            onClick={() => onToggleVisibility(row, "webVisible")}
                            disabled={togglingId === `${id}:webVisible`}
                            title={webOn ? "Hide on web" : "Show on web"}
                          >
                            <span className="settings-switch__knob" aria-hidden />
                          </button>
                        ) : (
                          <span className="data-table__muted">{webOn ? "Yes" : "No"}</span>
                        )}
                      </td>
                      <td>
                        {canEdit ? (
                          <button
                            type="button"
                            className={`settings-switch${appOn ? " settings-switch--on" : ""}`}
                            role="switch"
                            aria-checked={appOn}
                            aria-label={`Toggle app visibility for leadership note ${idx + 1}`}
                            onClick={() => onToggleVisibility(row, "appVisible")}
                            disabled={togglingId === `${id}:appVisible`}
                            title={appOn ? "Hide on app" : "Show on app"}
                          >
                            <span className="settings-switch__knob" aria-hidden />
                          </button>
                        ) : (
                          <span className="data-table__muted">{appOn ? "Yes" : "No"}</span>
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          <Link to={`/admin/leadership-notes/${id}`} className="icon-btn icon-btn--view" title="View">
                            <AiOutlineEye size={18} />
                          </Link>
                          {canEdit ? (
                            <button
                              type="button"
                              className="icon-btn icon-btn--edit"
                              title="Edit"
                              onClick={() => navigate(`/admin/leadership-notes/${id}/edit`)}
                            >
                              <MdEditSquare size={18} />
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button type="button" className="icon-btn icon-btn--delete" title="Delete" onClick={() => onDelete(row)}>
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
        ) : null}
      </div>
    </div>
  );
}
