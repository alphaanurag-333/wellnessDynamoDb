import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { CoachPageLoadingState } from "../wellnessCoach/components/CoachPageLoader.jsx";
import { AdminMediaImage } from "../admin/components/AdminMediaImage.jsx";
import { approvalLabel } from "../admin/pages/commitmentLetter/CommitmentLetterShared.js";

function CommitmentLetterCard({ row, onReview, onDelete, reviewing }) {
  return (
    <div className="page-card mt-pending-card">
      <div className="mt-pending-card__header">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <AdminMediaImage path={row.userAvatar || row.profileImage} round width={48} height={48} alt={row.userName || "Profile"} />
          <div>
            <h3 className="mt-pending-card__title">{row.userName || "—"}</h3>
            <p className="mt-pending-card__meta">{row.userEmail || row.user?.email || "—"}</p>
          </div>
        </div>
        <span className="mt-pending-card__badge">{approvalLabel(row.approvalStatus)}</span>
      </div>
      {row.rejectionReason ? (
        <p className="mt-pending-card__desc">
          <strong>Rejection reason:</strong> {row.rejectionReason}
        </p>
      ) : null}
      <div className="mt-pending-card__actions">
        {row.pdfUrl ? (
          <a href={row.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
            View PDF
          </a>
        ) : null}
        {row.approvalStatus === "pending" ? (
          <>
            <button type="button" className="btn btn--primary btn--sm" disabled={reviewing} onClick={() => onReview(row, "approved")}>
              Approve
            </button>
            <button type="button" className="btn btn--ghost btn--sm" disabled={reviewing} onClick={() => onReview(row, "rejected")}>
              Reject
            </button>
          </>
        ) : null}
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDelete(row)}>
          Delete
        </button>
      </div>
    </div>
  );
}

export function PortalCommitmentLettersPage({
  token,
  onUnauthorized,
  listPending,
  listAll,
  reviewLetter,
  deleteLetter,
  title = "Commitment letters",
}) {
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState("");

  const loadRows = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (tab === "pending") {
        const pending = await listPending(token);
        setRows(pending);
      } else {
        const { commitmentLetters } = await listAll(token, { limit: 50 });
        setRows(commitmentLetters);
      }
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message });
    } finally {
      setLoading(false);
    }
  }, [token, tab, listPending, listAll, onUnauthorized]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const onReview = async (row, action) => {
    if (!token) return;
    let rejectionReason = "";
    if (action === "rejected") {
      const result = await Swal.fire({
        title: "Rejection reason",
        input: "textarea",
        inputPlaceholder: "Explain what the client should fix…",
        inputValidator: (value) => {
          if (!String(value || "").trim()) return "Rejection reason is required";
          return undefined;
        },
        showCancelButton: true,
      });
      if (!result.isConfirmed) return;
      rejectionReason = String(result.value || "").trim();
    }
    setReviewingId(row._id || row.id);
    try {
      await reviewLetter(token, row._id || row.id, { action, rejectionReason });
      await Swal.fire({ icon: "success", title: action === "approved" ? "Approved" : "Rejected", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Review failed", text: e.message });
    } finally {
      setReviewingId("");
    }
  };

  const onDelete = async (row) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete commitment letter?",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed || !token) return;
    try {
      await deleteLetter(token, row._id || row.id);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message });
    }
  };

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">{title}</h2>
          <p className="page-card__desc">Review client commitment letter submissions.</p>
        </div>
        <div className="settings-tabs" role="tablist">
          {[
            { id: "pending", label: "Pending" },
            { id: "all", label: "All" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={`settings-tabs__tab${tab === t.id ? " settings-tabs__tab--active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {loading ? (
          <CoachPageLoadingState label="Loading commitment letters…" />
        ) : rows.length === 0 ? (
          <p className="page-card__desc">No commitment letters in this view.</p>
        ) : (
          rows.map((row) => (
            <CommitmentLetterCard
              key={row._id || row.id}
              row={row}
              onReview={onReview}
              onDelete={onDelete}
              reviewing={reviewingId === (row._id || row.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
