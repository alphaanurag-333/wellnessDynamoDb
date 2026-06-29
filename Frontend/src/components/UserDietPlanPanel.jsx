import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";

function formatPlanDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase()
    .replace(",", ",");
}

function DietPlanCard({ plan, onDelete, deleting, canDelete }) {
  const planId = plan.id || plan._id;
  const fileUrl = plan.fileUrl;

  return (
    <div className="diet-plan-card">
      <div className="diet-plan-card__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <div className="diet-plan-card__body">
        <div className="diet-plan-card__title">{plan.title || "Diet Plan"}</div>
        <div className="diet-plan-card__date">{formatPlanDate(plan.createdAt)}</div>
        {plan.note ? <div className="diet-plan-card__note">{plan.note}</div> : null}
      </div>
      <div className="diet-plan-card__actions">
        {fileUrl ? (
          <>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
              View
            </a>
            <a href={fileUrl} download className="btn btn--primary btn--sm">
              Download
            </a>
          </>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm text-danger"
            onClick={() => onDelete(plan)}
            disabled={deleting}
          >
            Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function UserDietPlanPanel({
  token,
  userId,
  api,
  backTo,
  PageLoader,
  NotFoundPage,
  onUnauthorized,
  readOnly = false,
}) {
  const [recommended, setRecommended] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [title, setTitle] = useState("Diet Plan");
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);

  const loadPlans = useCallback(async () => {
    if (!token || !userId) return;
    setError("");
    setNotFound(false);
    setLoading(true);
    try {
      const result = await api.list(token, userId);
      setRecommended(result.recommended ?? null);
      setHistory(result.history ?? []);
    } catch (e) {
      if (e?.status === 401) {
        onUnauthorized?.();
        return;
      }
      if (e?.status === 404) {
        setNotFound(true);
        return;
      }
      setError(e.message || "Failed to load diet plans.");
    } finally {
      setLoading(false);
    }
  }, [api, onUnauthorized, token, userId]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!token || !userId || !file) {
      await Swal.fire({ icon: "warning", title: "Select a PDF file to upload." });
      return;
    }
    if (file.type !== "application/pdf") {
      await Swal.fire({ icon: "error", title: "Only PDF files are allowed." });
      return;
    }

    setUploading(true);
    try {
      await api.upload(token, userId, { file, title: title.trim() || "Diet Plan", note: note.trim() || undefined });
      await Swal.fire({ icon: "success", title: "Diet plan uploaded", timer: 1500, showConfirmButton: false });
      setFile(null);
      setNote("");
      setTitle("Diet Plan");
      const input = document.getElementById("diet-plan-file-input");
      if (input) input.value = "";
      await loadPlans();
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else await Swal.fire({ icon: "error", title: "Upload failed", text: err.message || "Could not upload diet plan." });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (plan) => {
    const planId = plan.id || plan._id;
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Delete diet plan?",
      text: "This will permanently remove the PDF.",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!confirm.isConfirmed) return;

    setDeletingId(planId);
    try {
      await api.remove(token, userId, planId);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
      await loadPlans();
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else await Swal.fire({ icon: "error", title: "Delete failed", text: err.message || "Could not delete diet plan." });
    } finally {
      setDeletingId("");
    }
  };

  if (notFound && NotFoundPage) return <NotFoundPage />;
  if (loading && PageLoader) return <PageLoader label="Loading diet plans…" />;

  return (
    <div className="page-card diet-plan-page">
      <div className="page-card__head">
        <div>
          <Link to={backTo} className="user-back-link">
            ← Back to clients
          </Link>
          <h2 className="page-card__title">Diet Plan</h2>
          <p className="page-card__desc">Upload and manage PDF diet plans for this client.</p>
        </div>
      </div>

      {error ? (
        <p className="user-list-error" role="alert">
          {error}
        </p>
      ) : null}

      {!readOnly ? (
        <form className="form-card diet-plan-upload" onSubmit={handleUpload}>
          <h3 className="form-card__title">Upload new diet plan</h3>
          <div className="form-grid">
            <label className="user-field">
              <span className="user-field__label">Title</span>
              <input
                className="user-field__input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="Diet Plan"
              />
            </label>
            <label className="user-field">
              <span className="user-field__label">PDF file</span>
              <input
                id="diet-plan-file-input"
                className="user-field__input"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
            </label>
            <label className="user-field user-field--full">
              <span className="user-field__label">Note (optional)</span>
              <textarea
                className="user-field__input"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={2000}
                placeholder="Add instructions or context for this plan"
              />
            </label>
          </div>
          <div className="form-card__actions">
            <button type="submit" className="btn btn--primary" disabled={uploading}>
              {uploading ? "Uploading…" : "Upload diet plan"}
            </button>
          </div>
        </form>
      ) : null}

      <section className="diet-plan-section">
        <h3 className="form-card__title">Recommended diet plan</h3>
        {recommended ? (
          <DietPlanCard
            plan={recommended}
            onDelete={handleDelete}
            deleting={Boolean(deletingId)}
            canDelete={!readOnly}
          />
        ) : (
          <p className="table-placeholder">No diet plan uploaded yet.</p>
        )}
      </section>

      <section className="diet-plan-section">
        <h3 className="form-card__title">History</h3>
        {history.length === 0 ? (
          <p className="table-placeholder">No previous diet plans.</p>
        ) : (
          <div className="diet-plan-list">
            {history.map((plan) => (
              <DietPlanCard
                key={plan.id || plan._id}
                plan={plan}
                onDelete={handleDelete}
                deleting={deletingId === (plan.id || plan._id)}
                canDelete={!readOnly}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
