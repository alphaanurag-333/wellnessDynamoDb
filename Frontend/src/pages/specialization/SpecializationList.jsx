import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTableLoaderRow } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MdEditSquare } from "react-icons/md";
import { AiFillDelete, AiOutlineEye } from "react-icons/ai";
import {
  adminDeleteSpecialization,
  adminListSpecializations,
  adminUpdateSpecialization,
} from "../../api/adminSpecializations.js";
import { logout } from "../../store/authSlice.js";
import {
  DESCRIPTION_PREVIEW_LEN,
  LIST_LIMIT,
  LIST_SEARCH_MAX_LEN,
  TITLE_PREVIEW_LEN,
  getSpecializationId,
  truncateText,
} from "./SpecializationShared.js";

export function SpecializationList() {
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

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const { specializations, pagination } = await adminListSpecializations(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(listSearch.trim() ? { search: listSearch.trim() } : {}),
        ...(listStatus ? { status: listStatus } : {}),
      });
      setRows(specializations);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({
        icon: "error",
        title: "Load failed",
        text: e.message || "Failed to load specializations.",
      });
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch, listSearch, listStatus, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [listSearch, listStatus]);

  const onDelete = async (row) => {
    const id = getSpecializationId(row);
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete specialization?",
      text: `This will delete "${row.title}".`,
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !adminToken || !id) return;
    try {
      await adminDeleteSpecialization(adminToken, id);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message || "Could not delete." });
    }
  };

  const onToggleStatus = async (row) => {
    const id = getSpecializationId(row);
    if (!adminToken || !id) return;
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setTogglingId(id);
    try {
      await adminUpdateSpecialization(adminToken, id, { status: nextStatus });
      await Swal.fire({
        icon: "success",
        title: nextStatus === "active" ? "Activated" : "Deactivated",
        timer: 1500,
      });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Status update failed", text: e.message || "Could not update status." });
    } finally {
      setTogglingId("");
    }
  };

  const pageInfo = useMemo(
    () => `Page ${page} of ${pages} · ${total} specializations`,
    [page, pages, total]
  );

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Specializations</h2>
          <button type="button" className="btn btn--primary" onClick={() => navigate("/admin/specializations/new")}>
            Add specialization
          </button>
        </div>
        <div className="row g-2" style={{ marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label className="user-field" style={{ flex: "1 1 200px", marginBottom: 0 }}>
            <span className="user-field__label">Search</span>
            <input
              className="user-field__input"
              value={listSearch}
              maxLength={LIST_SEARCH_MAX_LEN}
              onChange={(e) => setListSearch(e.target.value.slice(0, LIST_SEARCH_MAX_LEN))}
              placeholder="Title or description…"
            />
          </label>
          <label className="user-field" style={{ flex: "0 1 160px", marginBottom: 0 }}>
            <span className="user-field__label">Status</span>
            <select className="user-field__input" value={listStatus} onChange={(e) => setListStatus(e.target.value)}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>S No.</th>
                <th>Title</th>
                <th>Description</th>
                <th>Status</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableLoaderRow colSpan={5} label="Loading specializations..." />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5}>No specializations found.</td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const id = getSpecializationId(row);
                  return (
                    <tr key={id || idx}>
                      <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                      <td title={row.title || ""}>{truncateText(row.title, TITLE_PREVIEW_LEN)}</td>
                      <td title={row.description || ""}>
                        {truncateText(row.description, DESCRIPTION_PREVIEW_LEN)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`settings-switch${row.status === "active" ? " settings-switch--on" : ""}`}
                          role="switch"
                          aria-checked={row.status === "active"}
                          aria-label={`Toggle status for ${row.title || "specialization"}`}
                          onClick={() => onToggleStatus(row)}
                          disabled={togglingId === id}
                          title={row.status === "active" ? "Deactivate" : "Activate"}
                        >
                          <span className="settings-switch__knob" aria-hidden />
                        </button>
                      </td>
                      <td>
                        <div className="row-actions">
                          <Link
                            to={`/admin/specializations/${id}`}
                            className="icon-btn icon-btn--view"
                            title="View"
                          >
                            <AiOutlineEye size={18} />
                          </Link>
                          <button
                            type="button"
                            className="icon-btn icon-btn--edit"
                            title="Edit"
                            onClick={() => navigate(`/admin/specializations/${id}/edit`)}
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
