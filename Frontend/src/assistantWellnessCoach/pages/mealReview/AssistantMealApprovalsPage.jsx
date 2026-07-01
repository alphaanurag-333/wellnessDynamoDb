import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { CoachPageLoadingState } from "../../../wellnessCoach/components/CoachPageLoader.jsx";
import { logoutAssistant } from "../../../store/authSlice.js";
import {
  assistantListPendingMealLogs,
  assistantReviewMealLog,
} from "../../api/assistantMealReview.js";

const CATEGORY_LABELS = {
  functional_juice: "Functional Juice",
  salad: "Salad",
  meal: "Meal",
  beverage: "Beverage",
  snacks: "Snacks",
  protein: "Protein",
};

function PendingMealReviewCard({ log, onReview, reviewing }) {
  const [proteinGm, setProteinGm] = useState(String(log.proteinGm ?? 20));
  const [fatsGm, setFatsGm] = useState(String(log.fatsGm ?? 10));
  const [carbsGm, setCarbsGm] = useState(String(log.carbsGm ?? 30));
  const [caloriesKcal, setCaloriesKcal] = useState(String(log.caloriesKcal ?? 250));
  const [rejectionReason, setRejectionReason] = useState("");

  return (
    <div className="page-card mt-pending-card">
      <div className="mt-pending-card__header">
        <div>
          <h3 className="mt-pending-card__title">{log.userName || "Client"}</h3>
          <p className="mt-pending-card__meta">
            {CATEGORY_LABELS[log.category] || log.category}
            {log.mealType ? ` · ${log.mealType}` : ""}
            {log.entryTime ? ` · ${log.entryTime}` : ""}
            {log.date ? ` · ${log.date}` : ""}
          </p>
        </div>
        <span className="mt-pending-card__badge">Pending review</span>
      </div>

      {log.description ? <p className="mt-pending-card__desc">{log.description}</p> : null}

      {log.items?.length > 0 ? (
        <div className="mt-log-card__items">
          {log.items.map((item, i) => (
            <span key={i} className="mt-item-chip">
              {item.name}
              {item.quantityGm > 0 ? ` · ${item.quantityGm}g` : ""}
            </span>
          ))}
        </div>
      ) : null}

      {log.photoUrl ? (
        <a
          href={log.photoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-log-card__photo-link"
        >
          View photo
        </a>
      ) : null}

      <div className="mt-macros-section">
        <span className="mt-items-section__label">Review macros</span>
        <div className="mt-macros-inputs">
          {[
            { label: "Protein (g)", val: proteinGm, set: setProteinGm },
            { label: "Fats (g)", val: fatsGm, set: setFatsGm },
            { label: "Carbs (g)", val: carbsGm, set: setCarbsGm },
            { label: "Calories (kcal)", val: caloriesKcal, set: setCaloriesKcal },
          ].map(({ label, val, set }) => (
            <label key={label} className="mt-macro-input">
              <span className="mt-macro-input__label">{label}</span>
              <input
                className="user-field__input"
                type="number"
                min={0}
                step={0.1}
                value={val}
                onChange={(e) => set(e.target.value)}
              />
            </label>
          ))}
        </div>
      </div>

      <label className="mt-form-field mt-form-field--full">
        <span className="mt-form-field__label">Rejection reason (optional)</span>
        <input
          className="user-field__input"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Only used when rejecting"
        />
      </label>

      <div className="mt-pending-card__actions">
        <button
          type="button"
          className="btn btn--primary"
          disabled={reviewing}
          onClick={() =>
            onReview(log, {
              status: "approved",
              proteinGm: parseFloat(proteinGm) || 0,
              fatsGm: parseFloat(fatsGm) || 0,
              carbsGm: parseFloat(carbsGm) || 0,
              caloriesKcal: parseFloat(caloriesKcal) || 0,
            })
          }
        >
          Approve
        </button>
        <button
          type="button"
          className="btn btn--ghost text-danger"
          disabled={reviewing}
          onClick={() =>
            onReview(log, {
              status: "rejected",
              proteinGm: parseFloat(proteinGm) || 0,
              fatsGm: parseFloat(fatsGm) || 0,
              carbsGm: parseFloat(carbsGm) || 0,
              caloriesKcal: parseFloat(caloriesKcal) || 0,
              rejectionReason: rejectionReason.trim() || undefined,
            })
          }
        >
          Reject
        </button>
      </div>
    </div>
  );
}

export function AssistantMealApprovalsPage() {
  const dispatch = useDispatch();
  const assistantToken = useSelector((s) => s.auth.assistantToken);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewingId, setReviewingId] = useState("");

  const load = useCallback(async () => {
    if (!assistantToken) return;
    setError("");
    setLoading(true);
    try {
      const result = await assistantListPendingMealLogs(assistantToken);
      setLogs(result.logs ?? []);
    } catch (e) {
      if (e?.status === 401) dispatch(logoutAssistant());
      else setError(e.message || "Failed to load pending meal logs.");
    } finally {
      setLoading(false);
    }
  }, [assistantToken, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReview = async (log, payload) => {
    const logId = log.id || log._id;
    setReviewingId(logId);
    try {
      await assistantReviewMealLog(assistantToken, logId, payload);
      await Swal.fire({
        icon: "success",
        title: payload.status === "approved" ? "Meal approved" : "Meal rejected",
        timer: 1400,
        showConfirmButton: false,
      });
      await load();
    } catch (e) {
      if (e?.status === 401) dispatch(logoutAssistant());
      else await Swal.fire({ icon: "error", title: "Review failed", text: e.message });
    } finally {
      setReviewingId("");
    }
  };

  if (loading) return <CoachPageLoadingState label="Loading pending meal logs…" />;

  return (
    <div className="user-page">
      <div className="user-page__toolbar">
        <Link to="/assistant/my-users" className="user-back-btn" aria-label="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </Link>
        <div className="user-page__toolbar-text">
          <h2 className="user-page__title">Pending Meal Approvals</h2>
          <p className="user-page__subtitle">Review client meal logs and edit macros before approving.</p>
        </div>
      </div>

      {error ? <p className="user-list-error">{error}</p> : null}

      {!error && logs.length === 0 ? (
        <div className="page-card">
          <p className="table-placeholder">No pending meal logs right now.</p>
        </div>
      ) : null}

      <div className="mt-pending-grid">
        {logs.map((log) => (
          <PendingMealReviewCard
            key={log.id || log._id}
            log={log}
            reviewing={reviewingId === (log.id || log._id)}
            onReview={handleReview}
          />
        ))}
      </div>
    </div>
  );
}
