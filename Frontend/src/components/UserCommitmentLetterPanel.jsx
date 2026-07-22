import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { AdminPageLoader } from "../admin/components/AdminLoader.jsx";
import { approvalLabel } from "../admin/pages/commitmentLetter/CommitmentLetterShared.js";
import { formatDateTime } from "../admin/utils/formatDate.js";

export function UserCommitmentLetterPanel({ token, userId, fetchLetter, embedded = false }) {
  const [letter, setLetter] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token || !userId) return;
    setLoading(true);
    try {
      const row = await fetchLetter(token, userId);
      setLetter(row);
    } catch (e) {
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Could not load commitment letter." });
      setLetter(null);
    } finally {
      setLoading(false);
    }
  }, [token, userId, fetchLetter]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return embedded ? (
      <AdminPageLoader label="Loading commitment letter…" />
    ) : (
      <div className="page-card">
        <AdminPageLoader label="Loading commitment letter…" />
      </div>
    );
  }

  const content = (
    <>
      {!letter ? (
        <p className="page-card__desc">This client has not submitted a commitment letter yet.</p>
      ) : (
        <div className="form-card">
          <div className="form-card__head">
            <h3 className="form-card__title">Commitment letter</h3>
            <span className="mt-pending-card__badge">{approvalLabel(letter.approvalStatus)}</span>
          </div>
          <p className="page-card__desc">
            Submitted: {formatDateTime(letter.createdAt)}
            {letter.resubmissionCount ? ` · Resubmissions: ${letter.resubmissionCount}` : ""}
          </p>
          {letter.rejectionReason ? (
            <p className="page-card__desc">
              <strong>Rejection reason:</strong> {letter.rejectionReason}
            </p>
          ) : null}
          {letter.pdfUrl ? (
            <a href={letter.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn--primary btn--sm">
              View submitted PDF
            </a>
          ) : null}
        </div>
      )}
    </>
  );

  if (embedded) return content;

  return <div className="page-card">{content}</div>;
}
