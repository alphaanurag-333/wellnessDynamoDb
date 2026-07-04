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
  adminReviewRealPeopleTestimonial,
  adminUpdateRealPeopleTestimonial,
} from "../../api/realPeopleTestimonials.js";
import { AdminListHeader, AdminStatusBadge, listCountSubtitle, TableCellText } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import {
  REVIEW_PREVIEW_LEN,
  LIST_LIMIT,
  SEARCH_MAX_LEN,
  approvalBadgeClass,
  approvalLabel,
  healthConcernLabel,
  reviewText,
  starsValue,
  testimonialAvatarPath,
  truncate,
} from "./RealPeopleTestimonialShared.js";

export function RealPeopleTestimonialList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [listStatus, setListStatus] = useState("");
  const [listApproval, setListApproval] = useState("");
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
        ...(listApproval ? { approvalStatus: listApproval } : {}),
        ...(listSearch.trim() ? { search: listSearch.trim() } : {}),
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
  }, [adminToken, dispatch, listApproval, listSearch, listStatus, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [listSearch, listStatus, listApproval]);

  const onDelete = async (row) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete testimonial?",
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

  const onReview = async (row, action) => {
    if (!adminToken) return;
    let rejectionReason = "";
    if (action === "rejected") {
      const result = await Swal.fire({
        title: "Rejection reason (optional)",
        input: "text",
        showCancelButton: true,
      });
      if (!result.isConfirmed) return;
      rejectionReason = String(result.value || "").trim();
    } else {
      const { isConfirmed } = await Swal.fire({
        icon: "question",
        title: "Approve testimonial?",
        showCancelButton: true,
        confirmButtonText: "Approve",
      });
      if (!isConfirmed) return;
    }
    try {
      await adminReviewRealPeopleTestimonial(adminToken, row._id, { action, rejectionReason });
      await Swal.fire({ icon: "success", title: action === "approved" ? "Approved" : "Rejected", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Review failed", text: e.message });
    }
  };

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} items`, [page, pages, total]);
  const subtitle = listCountSubtitle(loading, total, "testimonial", "testimonials");
  const hasFilters = Boolean(listSearch.trim() || listStatus || listApproval);

  return (
    <div className="user-page">
      <div className="page-card">
        <AdminListHeader
          title="Real people testimonials"
          subtitle={subtitle}
          actions={
            <button type="button" className="btn btn--primary" onClick={() => navigate("/admin/real-people-testimonials/new")}>
              Add testimonial
            </button>
          }
        />
        <div className="admin-crud-filters">
          <label className="user-field admin-crud-filters__search">
            <span className="user-field__label">Search</span>
            <input
              className="user-field__input"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value.slice(0, SEARCH_MAX_LEN))}
              placeholder="Review text…"
              maxLength={SEARCH_MAX_LEN}
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
            <span className="user-field__label">Approval</span>
            <select className="user-field__input" value={listApproval} onChange={(e) => setListApproval(e.target.value)}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          {hasFilters ? (
            <button type="button" className="btn btn--ghost" onClick={() => { setListSearch(""); setListStatus(""); setListApproval(""); }}>
              Clear filters
            </button>
          ) : null}
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Avatar</th>
                <th>Name</th>
                <th>Health concern</th>
                <th>Review</th>
                <th>Stars</th>
                <th>Approval</th>
                <th>Status</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableLoaderRow colSpan={9} label="Loading…" />
              ) : rows.length === 0 ? (
                <tr><td colSpan={9}>No testimonials found.</td></tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row._id}>
                    <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                    <td>
                      <AdminMediaImage
                        path={testimonialAvatarPath(row)}
                        round
                        width={40}
                        height={40}
                        alt={row.userName || "Profile"}
                      />
                    </td>
                    <td><TableCellText value={row.userName} /></td>
                    <td className="data-table__muted">{healthConcernLabel(row)}</td>
                    <td className="data-table__muted" title={reviewText(row) !== "—" ? reviewText(row) : undefined}>
                      <TableCellText value={reviewText(row) !== "—" ? reviewText(row) : ""} max={REVIEW_PREVIEW_LEN} />
                    </td>
                    <td>{starsValue(row)}</td>
                    <td><span className={approvalBadgeClass(row.approvalStatus)}>{approvalLabel(row.approvalStatus)}</span></td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          type="button"
                          className={`settings-switch${row.status === "active" ? " settings-switch--on" : ""}`}
                          role="switch"
                          aria-checked={row.status === "active"}
                          aria-label={`Toggle status for ${row.userName || "testimonial"}`}
                          onClick={() => onToggleStatus(row)}
                          disabled={togglingId === row._id}
                        >
                          <span className="settings-switch__knob" aria-hidden />
                        </button>
                        <AdminStatusBadge status={row.status} />
                      </div>
                    </td>
                    <td>
                      <div className="row-actions">
                        {row.approvalStatus === "pending" ? (
                          <>
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onReview(row, "approved")}>Approve</button>
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onReview(row, "rejected")}>Reject</button>
                          </>
                        ) : null}
                        <Link to={`/admin/real-people-testimonials/${row._id}`} className="icon-btn icon-btn--view" title="View">
                          <AiOutlineEye size={18} />
                        </Link>
                        <button type="button" className="icon-btn icon-btn--edit" title="Edit" onClick={() => navigate(`/admin/real-people-testimonials/${row._id}/edit`)}>
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
              <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
              <button type="button" className="btn btn--ghost" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Next</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
