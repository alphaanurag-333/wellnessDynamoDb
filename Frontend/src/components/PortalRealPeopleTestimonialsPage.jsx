import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { AdminTableLoaderRow } from "../admin/components/AdminLoader.jsx";
import { AdminMediaImage } from "../admin/components/AdminMediaImage.jsx";
import {
  AdminListHeader,
  AdminStatusBadge,
  listCountSubtitle,
  TableCellText,
} from "../admin/components/AdminCrud.jsx";
import { CoachPageLoadingState } from "../wellnessCoach/components/CoachPageLoader.jsx";
import {
  approvalBadgeClass,
  approvalLabel,
  healthConcernLabel,
  LIST_LIMIT,
  REVIEW_PREVIEW_LEN,
  reviewText,
  starsValue,
  testimonialAvatarPath,
} from "../admin/pages/realPeopleTestimonial/RealPeopleTestimonialShared.js";

export function PortalRealPeopleTestimonialsPage({
  token,
  onUnauthorized,
  listAll,
  reviewTestimonial,
  updateTestimonial,
  deleteTestimonial,
  title = "Real people testimonials",
}) {
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState("");
  const [togglingId, setTogglingId] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadRows = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await listAll(token, {
        page,
        limit: LIST_LIMIT,
        ...(tab === "pending" ? { approvalStatus: "pending" } : {}),
      });
      setRows(Array.isArray(data?.realPeopleTestimonials) ? data.realPeopleTestimonials : []);
      const nextPages = data?.pagination?.pages ?? 1;
      const nextTotal = data?.pagination?.total ?? 0;
      setPages(nextPages);
      setTotal(nextTotal);
      if ((data?.realPeopleTestimonials?.length ?? 0) === 0 && page > 1 && page > nextPages) {
        setPage(nextPages);
      }
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message });
    } finally {
      setLoading(false);
    }
  }, [token, tab, page, listAll, onUnauthorized]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const subtitle = useMemo(
    () => listCountSubtitle(loading, total, "testimonial", "testimonials"),
    [loading, total]
  );

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} items`, [page, pages, total]);

  const onReview = async (row, action) => {
    if (!token) return;
    const rowId = row._id || row.id;
    setReviewingId(rowId);
    try {
      await reviewTestimonial(token, rowId, { action });
      await Swal.fire({ icon: "success", title: action === "approved" ? "Approved" : "Rejected", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Review failed", text: e.message });
    } finally {
      setReviewingId("");
    }
  };

  const onToggle = async (row) => {
    if (!token) return;
    const rowId = row._id || row.id;
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setTogglingId(rowId);
    try {
      await updateTestimonial(token, rowId, { status: nextStatus });
      await Swal.fire({ icon: "success", title: "Status updated", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Status update failed", text: e.message || "Could not update status." });
    } finally {
      setTogglingId("");
    }
  };

  const onDelete = async (row) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete testimonial?",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !token) return;
    try {
      await deleteTestimonial(token, row._id || row.id);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message });
    }
  };

  return (
    <div className="user-page portal-testimonials-page">
      <div className="page-card">
        <AdminListHeader
          title={title}
          subtitle={subtitle}
        />

        <p className="page-card__desc portal-testimonials-page__intro">
          Review client success stories, approve or reject submissions, and manage visibility.
        </p>

        <div className="settings-tabs portal-testimonials-page__tabs" role="tablist" aria-label="Testimonial views">
          {[
            { id: "pending", label: "Pending approval" },
            { id: "all", label: "All testimonials" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={`settings-tabs__tab${tab === item.id ? " settings-tabs__tab--active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading && rows.length === 0 ? (
          <CoachPageLoadingState label="Loading testimonials…" />
        ) : (
          <div className="table-scroll portal-testimonials-table-wrap">
            <table className="data-table portal-testimonials-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Avatar</th>
                  <th>Name</th>
                  <th>Health concern</th>
                  <th>Review</th>
                  <th>Stars</th>
                  <th>Member since</th>
                  <th>Approval</th>
                  <th>Status</th>
                  <th className="data-table__actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <AdminTableLoaderRow colSpan={10} label="Loading…" />
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="table-placeholder">
                      No testimonials in this view.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => {
                    const rowId = row._id || row.id;
                    const concern = healthConcernLabel(row);
                    const review = reviewText(row);
                    return (
                      <tr key={rowId}>
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
                        <td>
                          <TableCellText value={row.userName} />
                        </td>
                        <td className="data-table__muted">
                          <TableCellText value={concern === "—" ? "No health concern" : concern} max={40} />
                        </td>
                        <td className="data-table__muted" title={review !== "—" ? review : undefined}>
                          <TableCellText value={review !== "—" ? review : ""} max={REVIEW_PREVIEW_LEN} />
                        </td>
                        <td>{starsValue(row)}</td>
                        <td className="data-table__muted">{row.memberSinceYear ?? "—"}</td>
                        <td>
                          <span className={approvalBadgeClass(row.approvalStatus)}>
                            {approvalLabel(row.approvalStatus)}
                          </span>
                        </td>
                        <td>
                          {row.approvalStatus === "approved" ? (
                            <div className="portal-testimonials-table__status">
                              <button
                                type="button"
                                className={`settings-switch${row.status === "active" ? " settings-switch--on" : ""}`}
                                role="switch"
                                aria-checked={row.status === "active"}
                                aria-label={`Toggle status for ${row.userName || "testimonial"}`}
                                onClick={() => onToggle(row)}
                                disabled={togglingId === rowId}
                              >
                                <span className="settings-switch__knob" aria-hidden />
                              </button>
                              <AdminStatusBadge status={row.status} />
                            </div>
                          ) : (
                            <span className="data-table__muted">—</span>
                          )}
                        </td>
                        <td>
                          <div className="row-actions portal-testimonials-table__actions">
                            {row.approvalStatus === "pending" ? (
                              <>
                                <button
                                  type="button"
                                  className="btn btn--primary btn--sm"
                                  disabled={reviewingId === rowId}
                                  onClick={() => onReview(row, "approved")}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="btn btn--ghost btn--sm"
                                  disabled={reviewingId === rowId}
                                  onClick={() => onReview(row, "rejected")}
                                >
                                  Reject
                                </button>
                              </>
                            ) : null}
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm portal-testimonials-table__delete"
                              onClick={() => onDelete(row)}
                            >
                              Delete
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
        )}

        {pages > 1 ? (
          <div className="user-list-pagination portal-testimonials-page__pagination">
            <span className="user-list-pagination__info">{pageInfo}</span>
            <div className="user-list-pagination__btns">
              <button
                type="button"
                className="btn btn--ghost"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={page >= pages || loading}
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
