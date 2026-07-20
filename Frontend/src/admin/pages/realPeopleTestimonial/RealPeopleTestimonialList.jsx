import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTableLoaderRow } from "../../components/AdminLoader.jsx";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MdEditSquare } from "react-icons/md";
import { AiFillDelete, AiOutlineEye } from "react-icons/ai";
import {
  adminDeleteRealPeopleTestimonial,
  adminListRealPeopleTestimonials,
  adminUpdateRealPeopleTestimonial,
} from "../../api/realPeopleTestimonials.js";
import { AdminListHeader, AdminStatusBadge, listCountSubtitle, TableCellText } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import { useDebouncedSearch } from "../../../hooks/useDebouncedSearch.js";
import { useResourcePermissions } from "../../hooks/useHasPermission.js";
import { mediaUrl } from "../../../media.js";
import {
  REVIEW_PREVIEW_LEN,
  LIST_LIMIT,
  SEARCH_MAX_LEN,
  displayName,
  healthConcernLabel,
  reviewText,
  sanitizeSingleLine,
  starsValue,
  testimonialAvatarPath,
} from "./RealPeopleTestimonialShared.js";

export function RealPeopleTestimonialList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const { canEdit, canDelete } = useResourcePermissions("real-people-testimonials");
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
      const { realPeopleTestimonials, pagination } = await adminListRealPeopleTestimonials(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(listStatus ? { status: listStatus } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      setRows(realPeopleTestimonials);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load testimonials." });
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
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete testimonial?",
      text: "This action cannot be undone.",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !adminToken) return;
    try {
      await adminDeleteRealPeopleTestimonial(adminToken, row._id);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message });
    }
  };

  const onToggleStatus = async (row) => {
    if (!adminToken) return;
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setTogglingId(row._id);
    try {
      await adminUpdateRealPeopleTestimonial(adminToken, row._id, { status: nextStatus });
      await Swal.fire({ icon: "success", title: "Status updated", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Status update failed", text: e.message || "Could not update status." });
    } finally {
      setTogglingId("");
    }
  };

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} testimonials`, [page, pages, total]);
  const subtitle = listCountSubtitle(loading, total, "testimonial", "testimonials");
  const hasFilters = Boolean(listSearch.trim() || listStatus);

  const clearFilters = () => {
    setSearchInput("");
    setListStatus("");
  };

  return (
    <div className="user-page">
      <div className="page-card">
        <AdminListHeader
          title="Real People : Real Healing"
          subtitle={subtitle}
          actions={
            canEdit ? (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => navigate("/admin/real-people-testimonials/new")}
              >
                Add testimonial
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
              placeholder="Name or review..."
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
                <th>Image</th>
                <th>Name</th>
                <th>Health concern</th>
                <th>Stars</th>
                <th>Review</th>
                <th>Status</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableLoaderRow colSpan={8} label="Loading testimonials..." />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8}>No testimonials found.</td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row._id}>
                    <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                    <td>
                      <AdminMediaImage
                        path={testimonialAvatarPath(row)}
                        src={testimonialAvatarPath(row) ? mediaUrl(testimonialAvatarPath(row)) : undefined}
                        round
                        width={48}
                        height={48}
                        alt={displayName(row)}
                      />
                    </td>
                    <td>
                      <TableCellText value={displayName(row)} />
                    </td>
                    <td className="data-table__muted">{healthConcernLabel(row)}</td>
                    <td className="data-table__muted">{starsValue(row)}</td>
                    <td className="data-table__muted" title={reviewText(row)}>
                      <TableCellText value={reviewText(row)} max={REVIEW_PREVIEW_LEN} />
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {canEdit ? (
                          <button
                            type="button"
                            className={`settings-switch${row.status === "active" ? " settings-switch--on" : ""}`}
                            role="switch"
                            aria-checked={row.status === "active"}
                            aria-label={`Toggle status for testimonial ${idx + 1}`}
                            onClick={() => onToggleStatus(row)}
                            disabled={togglingId === row._id}
                          >
                            <span className="settings-switch__knob" aria-hidden />
                          </button>
                        ) : null}
                        <AdminStatusBadge status={row.status} />
                      </div>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link
                          to={`/admin/real-people-testimonials/${row._id}`}
                          className="icon-btn icon-btn--view"
                          title="View"
                        >
                          <AiOutlineEye size={18} />
                        </Link>
                        {canEdit ? (
                          <button
                            type="button"
                            className="icon-btn icon-btn--edit"
                            title="Edit"
                            onClick={() => navigate(`/admin/real-people-testimonials/${row._id}/edit`)}
                          >
                            <MdEditSquare size={18} />
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            className="icon-btn icon-btn--delete"
                            title="Delete"
                            onClick={() => onDelete(row)}
                          >
                            <AiFillDelete size={18} />
                          </button>
                        ) : null}
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
