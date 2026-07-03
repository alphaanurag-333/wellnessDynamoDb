import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { CoachPageLoadingState } from "../../../wellnessCoach/components/CoachPageLoader.jsx";
import { AdminMediaImage } from "../../../admin/components/AdminMediaImage.jsx";
import { logoutAssistant } from "../../../store/authSlice.js";
import {
  assistantDeleteRealPeopleTestimonial,
  assistantListPendingRealPeopleTestimonials,
  assistantListRealPeopleTestimonials,
  assistantReviewRealPeopleTestimonial,
  assistantUpdateRealPeopleTestimonial,
} from "../../api/assistantRealPeopleTestimonials.js";
import {
  approvalLabel,
  healthConcernLabel,
  reviewText,
  starsValue,
  testimonialAvatarPath,
} from "../../../admin/pages/realPeopleTestimonial/RealPeopleTestimonialShared.js";

function TestimonialCard({ row, onReview, onToggle, onDelete, reviewing }) {
  const concern = healthConcernLabel(row);
  const concernDisplay = concern === "—" ? "No health concern" : concern;

  return (
    <div className="page-card mt-pending-card">
      <div className="mt-pending-card__header">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <AdminMediaImage path={testimonialAvatarPath(row)} round width={48} height={48} alt={row.userName || "Profile"} />
          <div>
            <h3 className="mt-pending-card__title">{row.userName || "—"}</h3>
            <p className="mt-pending-card__meta">
              {concernDisplay} · {starsValue(row)} stars · Member since {row.memberSinceYear ?? "—"}
            </p>
          </div>
        </div>
        <span className="mt-pending-card__badge">{approvalLabel(row.approvalStatus)}</span>
      </div>
      <p className="mt-pending-card__desc" style={{ fontStyle: "italic" }}>{reviewText(row)}</p>
      <div className="mt-pending-card__actions">
        {row.approvalStatus === "pending" ? (
          <>
            <button type="button" className="btn btn--primary btn--sm" disabled={reviewing} onClick={() => onReview(row, "approved")}>
              Approve
            </button>
            <button type="button" className="btn btn--ghost btn--sm" disabled={reviewing} onClick={() => onReview(row, "rejected")}>
              Reject
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onToggle(row)}>
            {row.status === "active" ? "Deactivate" : "Activate"}
          </button>
        )}
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDelete(row)}>
          Delete
        </button>
      </div>
    </div>
  );
}

export function AssistantRealPeopleTestimonialsPage() {
  const dispatch = useDispatch();
  const assistantToken = useSelector((s) => s.auth.assistantToken);
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState("");

  const loadRows = useCallback(async () => {
    if (!assistantToken) return;
    setLoading(true);
    try {
      if (tab === "pending") {
        const pending = await assistantListPendingRealPeopleTestimonials(assistantToken);
        setRows(pending);
      } else {
        const { realPeopleTestimonials } = await assistantListRealPeopleTestimonials(assistantToken, { limit: 50 });
        setRows(realPeopleTestimonials);
      }
    } catch (e) {
      if (e?.status === 401) return dispatch(logoutAssistant());
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message });
    } finally {
      setLoading(false);
    }
  }, [assistantToken, dispatch, tab]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const onReview = async (row, action) => {
    if (!assistantToken) return;
    setReviewingId(row._id);
    try {
      await assistantReviewRealPeopleTestimonial(assistantToken, row._id, { action });
      await Swal.fire({ icon: "success", title: action === "approved" ? "Approved" : "Rejected", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logoutAssistant());
      await Swal.fire({ icon: "error", title: "Review failed", text: e.message });
    } finally {
      setReviewingId("");
    }
  };

  const onToggle = async (row) => {
    if (!assistantToken) return;
    const nextStatus = row.status === "active" ? "inactive" : "active";
    try {
      await assistantUpdateRealPeopleTestimonial(assistantToken, row._id, { status: nextStatus });
      await Swal.fire({ icon: "success", title: "Status updated", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logoutAssistant());
      await Swal.fire({ icon: "error", title: "Status update failed", text: e.message || "Could not update status." });
    }
  };

  const onDelete = async (row) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete testimonial?",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed || !assistantToken) return;
    try {
      await assistantDeleteRealPeopleTestimonial(assistantToken, row._id);
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logoutAssistant());
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message });
    }
  };

  if (loading && rows.length === 0) return <CoachPageLoadingState label="Loading testimonials…" />;

  return (
    <div className="user-page">
      <div className="page-card">
        <h1 className="user-page__title">Real people testimonials</h1>
        <p className="data-table__muted">Review client stories and manage visibility.</p>
        <div className="admin-crud-filters" style={{ marginTop: 12 }}>
          <button type="button" className={`btn ${tab === "pending" ? "btn--primary" : "btn--ghost"}`} onClick={() => setTab("pending")}>
            Pending approval
          </button>
          <button type="button" className={`btn ${tab === "all" ? "btn--primary" : "btn--ghost"}`} onClick={() => setTab("all")}>
            All testimonials
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="data-table__muted" style={{ marginTop: 16 }}>No testimonials in this view.</p>
        ) : (
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {rows.map((row) => (
              <TestimonialCard
                key={row._id}
                row={row}
                onReview={onReview}
                onToggle={onToggle}
                onDelete={onDelete}
                reviewing={reviewingId === row._id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
