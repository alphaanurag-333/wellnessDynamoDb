import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTableLoaderRow } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MdEditSquare } from "react-icons/md";
import { AiFillDelete, AiOutlineEye } from "react-icons/ai";
import {
  adminDeleteMentalWellbeing,
  adminListMentalWellbeing,
  adminUpdateMentalWellbeing,
} from "../../api/adminMentalWellbeing.js";
import { AdminListHeader, AdminStatusBadge, listCountSubtitle, TableCellText } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import { formatDate, typeLabel, LIST_LIMIT, LIST_SEARCH_MAX_LEN } from "./MentalWellbeingShared.js";

export function MentalWellbeingList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [listSearch, setListSearch] = useState("");
  const [listStatus, setListStatus] = useState("");
  const [listType, setListType] = useState("");

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const { items, pagination } = await adminListMentalWellbeing(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(listSearch.trim() ? { search: listSearch.trim() } : {}),
        ...(listStatus ? { status: listStatus } : {}),
        ...(listType ? { type: listType } : {}),
      });
      setRows(items);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load items." });
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch, listSearch, listStatus, listType, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [listSearch, listStatus, listType]);

  const onDelete = async (row) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete item?",
      text: `This will delete "${row.title}".`,
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !adminToken) return;
    try {
      await adminDeleteMentalWellbeing(adminToken, row._id);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message || "Could not delete." });
    }
  };

  const onToggleStatus = async (row) => {
    if (!adminToken) return;
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setTogglingId(row._id);
    try {
      await adminUpdateMentalWellbeing(adminToken, row._id, { status: nextStatus });
      await Swal.fire({ icon: "success", title: nextStatus === "active" ? "Activated" : "Deactivated", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Status update failed", text: e.message || "Could not update status." });
    } finally {
      setTogglingId("");
    }
  };

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} items`, [page, pages, total]);
  const subtitle = listCountSubtitle(loading, total, "item", "items");
  const hasFilters = Boolean(listSearch.trim() || listStatus || listType);

  const clearFilters = () => {
    setListSearch("");
    setListStatus("");
    setListType("");
  };

  return (
    <div className="user-page">
      <div className="page-card">
        <AdminListHeader
          title="Mental & Emotional Wellbeing"
          subtitle={subtitle}
          actions={
            <button type="button" className="btn btn--primary" onClick={() => navigate("/admin/mental-wellbeing/new")}>
              Add item
            </button>
          }
        />
        <div className="admin-crud-filters">
          <label className="user-field admin-crud-filters__search">
            <span className="user-field__label">Search</span>
            <input
              className="user-field__input"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value.slice(0, LIST_SEARCH_MAX_LEN))}
              placeholder="Title..."
              maxLength={LIST_SEARCH_MAX_LEN}
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
          <label className="user-field admin-crud-filters__select">
            <span className="user-field__label">Type</span>
            <select className="user-field__input" value={listType} onChange={(e) => setListType(e.target.value)}>
              <option value="">All</option>
              <option value="ytlink">YT Link</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
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
                <th>Title</th>
                <th>Type</th>
                <th>Media</th>
                <th>Created</th>
                <th>Status</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableLoaderRow colSpan={7} label="Loading items..." />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>No items found.</td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row._id}>
                    <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                    <td><TableCellText value={row.title} /></td>
                    <td className="data-table__muted">{typeLabel(row.type)}</td>
                    <td>
                      {row.type === "ytlink" ? (
                        row.ytLink ? (
                          <a href={row.ytLink} target="_blank" rel="noreferrer" title={row.ytLink}>
                            Open link
                          </a>
                        ) : (
                          <span className="data-table__muted">—</span>
                        )
                      ) : row.type === "video" ? (
                        row.file ? (
                          <video
                            src={row.file}
                            controls
                            preload="metadata"
                            playsInline
                            style={{ width: 160, maxWidth: "100%", height: 90, objectFit: "cover", borderRadius: 6, display: "block" }}
                          />
                        ) : (
                          <span className="data-table__muted">—</span>
                        )
                      ) : row.type === "audio" ? (
                        row.file ? (
                          <audio src={row.file} controls preload="metadata" style={{ width: 200, maxWidth: "100%" }} />
                        ) : (
                          <span className="data-table__muted">—</span>
                        )
                      ) : (
                        <span className="data-table__muted">—</span>
                      )}
                    </td>
                    <td className="data-table__muted">{formatDate(row.createdAt)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button
                          type="button"
                          className={`settings-switch${row.status === "active" ? " settings-switch--on" : ""}`}
                          role="switch"
                          aria-checked={row.status === "active"}
                          aria-label={`Toggle status for ${row.title}`}
                          onClick={() => onToggleStatus(row)}
                          disabled={togglingId === row._id}
                          title={row.status === "active" ? "Deactivate" : "Activate"}
                        >
                          <span className="settings-switch__knob" aria-hidden />
                        </button>
                        <AdminStatusBadge status={row.status} />
                      </div>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/admin/mental-wellbeing/${row._id}`} className="icon-btn icon-btn--view" title="View">
                          <AiOutlineEye size={18} />
                        </Link>
                        <button
                          type="button"
                          className="icon-btn icon-btn--edit"
                          title="Edit"
                          onClick={() => navigate(`/admin/mental-wellbeing/${row._id}/edit`)}
                        >
                          <MdEditSquare size={18} />
                        </button>
                        <button type="button" className="icon-btn icon-btn--delete" title="Delete" onClick={() => onDelete(row)}>
                          <AiFillDelete size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pages > 1 ? (
          <div className="user-list-pagination">
            <span className="user-list-pagination__info">{pageInfo}</span>
            <div className="user-list-pagination__btns">
              <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </button>
              <button type="button" className="btn btn--ghost" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
