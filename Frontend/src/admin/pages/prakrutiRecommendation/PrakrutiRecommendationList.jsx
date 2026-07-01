import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTableLoaderRow } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MdEditSquare } from "react-icons/md";
import { AiFillDelete, AiOutlineEye } from "react-icons/ai";
import {
  adminDeletePrakrutiRecommendation,
  adminListPrakrutiRecommendations,
  adminUpdatePrakrutiRecommendation,
} from "../../api/adminPrakrutiRecommendations.js";
import { AdminListHeader, AdminStatusBadge, listCountSubtitle } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import { useDebouncedSearch } from "../../../hooks/useDebouncedSearch.js";
import { PRAKRUTI_TYPES, prakrutiTypeLabel } from "../../../components/prakrutiShared.js";
import { formatDate, truncate, TITLE_PREVIEW_LEN, LIST_LIMIT, LIST_SEARCH_MAX_LEN } from "./PrakrutiRecommendationShared.js";

export function PrakrutiRecommendationList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
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
  const [listPrakrutiType, setListPrakrutiType] = useState("");

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const { recommendations, pagination } = await adminListPrakrutiRecommendations(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(listStatus ? { status: listStatus } : {}),
        ...(listPrakrutiType ? { prakrutiType: listPrakrutiType } : {}),
      });
      setRows(recommendations);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load items." });
    } finally {
      setLoading(false);
    }
  }, [adminToken, debouncedSearch, dispatch, listPrakrutiType, listStatus, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, listStatus, listPrakrutiType]);

  const onDelete = async (row) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete recommendation?",
      text: "Coaches will no longer be able to assign this item.",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !adminToken) return;
    try {
      await adminDeletePrakrutiRecommendation(adminToken, row._id);
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
      await adminUpdatePrakrutiRecommendation(adminToken, row._id, { status: nextStatus });
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
  const hasFilters = Boolean(debouncedSearch || listStatus || listPrakrutiType);

  const clearFilters = () => {
    setSearchInput("");
    setListStatus("");
    setListPrakrutiType("");
  };

  return (
    <div className="user-page">
      <div className="page-card">
        <AdminListHeader
          title="Prakruti Recommendations"
          subtitle={subtitle}
          actions={
            <button type="button" className="btn btn--primary" onClick={() => navigate("/admin/prakruti-recommendations/new")}>
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
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search title..."
              maxLength={LIST_SEARCH_MAX_LEN}
            />
          </label>
          <label className="user-field admin-crud-filters__select">
            <span className="user-field__label">Prakruti type</span>
            <select className="user-field__input" value={listPrakrutiType} onChange={(e) => setListPrakrutiType(e.target.value)}>
              <option value="">All</option>
              {PRAKRUTI_TYPES.map((row) => (
                <option key={row.value} value={row.value}>
                  {row.label}
                </option>
              ))}
            </select>
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
                <th>Order</th>
                <th>Prakruti type</th>
                <th>Title</th>
                <th>Status</th>
                <th>Updated</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableLoaderRow colSpan={6} label="Loading…" />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>No items found.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id}>
                    <td className="data-table__muted">{row.sortOrder ?? 0}</td>
                    <td>{prakrutiTypeLabel(row.prakrutiType)}</td>
                    <td>{truncate(row.title, TITLE_PREVIEW_LEN)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button
                          type="button"
                          className={`settings-switch${row.status === "active" ? " settings-switch--on" : ""}`}
                          role="switch"
                          aria-checked={row.status === "active"}
                          onClick={() => onToggleStatus(row)}
                          disabled={togglingId === row._id}
                        >
                          <span className="settings-switch__knob" aria-hidden />
                        </button>
                        <AdminStatusBadge status={row.status} />
                      </div>
                    </td>
                    <td className="data-table__muted">{formatDate(row.updatedAt)}</td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/admin/prakruti-recommendations/${row._id}`} className="icon-btn icon-btn--view" title="View">
                          <AiOutlineEye size={18} />
                        </Link>
                        <button
                          type="button"
                          className="icon-btn icon-btn--edit"
                          title="Edit"
                          onClick={() => navigate(`/admin/prakruti-recommendations/${row._id}/edit`)}
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
